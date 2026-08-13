// Levoila — publish an APPROVED content_calendar post to its social platform.
// Staff-only: verifies the caller's Supabase session token against the staff table.
// No npm deps. Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// If BLOTATO_API_KEY is set and the platform account is connected, posts immediately
// via Blotato and marks the row 'posted'. Otherwise it QUEUES the row (status
// 'approved', scheduled now) so the daily Social Agent posts it on its next run —
// nothing is lost, nothing fabricated.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3ZocWRsamZqamt1ZGVpc2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTcyNzAsImV4cCI6MjA5OTQ5MzI3MH0.hsQCo-THdMXt0AyUoyJgdYwyzjn6rye0Gwz33DwuhCg';

async function requireStaff(req, SB, KEY) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const u = await fetch(SB + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
    if (!u.ok) return null;
    const user = await u.json();
    if (!user || !user.id) return null;
    const s = await fetch(SB + '/rest/v1/staff?id=eq.' + user.id + '&active=eq.true&select=id,email,role',
      { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    if (!s.ok) return null;
    const rows = await s.json();
    return rows && rows[0] ? rows[0] : null;
  } catch (e) { return null; }
}

async function patchRow(SB, KEY, id, patch) {
  await fetch(SB + '/rest/v1/content_calendar?id=eq.' + id, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch)
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !KEY) { res.status(503).json({ error: 'Not configured' }); return; }

  const staff = await requireStaff(req, SB, KEY);
  if (!staff) { res.status(401).json({ error: 'Sign in as staff to publish' }); return; }

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const id = b && b.id;
  if (!id) { res.status(400).json({ error: 'Missing post id' }); return; }

  // Load the row (service role).
  const g = await fetch(SB + '/rest/v1/content_calendar?id=eq.' + id + '&select=*', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  const rows = g.ok ? await g.json() : [];
  const row = rows[0];
  if (!row) { res.status(404).json({ error: 'Post not found' }); return; }
  if (row.platform === 'dispatch') { res.status(400).json({ error: 'Dispatches publish to the site, not social.' }); return; }

  const BKEY = process.env.BLOTATO_API_KEY;
  const BASE = process.env.BLOTATO_API_BASE || 'https://backend.blotato.com';

  // No Blotato key → queue for the scheduled agent (honest fallback).
  if (!BKEY) {
    await patchRow(SB, KEY, id, { status: 'approved', scheduled_at: new Date().toISOString() });
    res.status(200).json({ ok: true, queued: true, message: 'Approved and queued — the Social Agent posts it on its next run.' });
    return;
  }

  // Find the connected account for this platform.
  let account = null;
  try {
    const a = await fetch(BASE + '/v2/accounts', { headers: { 'blotato-api-key': BKEY } });
    if (a.ok) {
      const d = await a.json();
      const list = Array.isArray(d) ? d : (d.accounts || d.data || []);
      account = list.find(x => ((x.platform || x.type || '').toLowerCase()) === (row.platform || '').toLowerCase());
    }
  } catch (e) {}
  if (!account) {
    await patchRow(SB, KEY, id, { status: 'approved', scheduled_at: new Date().toISOString() });
    res.status(200).json({ ok: true, queued: true, message: 'No connected ' + row.platform + ' account yet — approved and queued for the agent.' });
    return;
  }

  // Post via Blotato.
  try {
    const post = await fetch(BASE + '/v2/posts', {
      method: 'POST',
      headers: { 'blotato-api-key': BKEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id || account.accountId,
        content: { text: row.body || '', mediaUrls: row.media_url ? [row.media_url] : [] },
        platform: row.platform
      })
    });
    if (!post.ok) {
      const t = await post.text();
      await patchRow(SB, KEY, id, { status: 'failed', notes: 'Publish failed: ' + t.slice(0, 200) });
      res.status(502).json({ error: 'Blotato rejected the post', detail: t.slice(0, 200) });
      return;
    }
    const pd = await post.json();
    const postId = pd.id || pd.postId || (pd.data && pd.data.id) || null;
    await patchRow(SB, KEY, id, { status: 'posted', blotato_post_id: postId, scheduled_at: new Date().toISOString() });
    res.status(200).json({ ok: true, posted: true, blotato_post_id: postId });
  } catch (e) {
    res.status(500).json({ error: 'Publish error' });
  }
};
