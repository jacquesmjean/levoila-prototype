// Scheduled publisher. Vercel Cron calls this once a day (14:10 UTC, ten minutes
// after the 09:00 Central slots the weekly cadence plans). It posts every row in
// social_due — approved and past its scheduled time — through the connected
// publisher, and records exactly what happened on each row. Nothing is ever
// posted that a person has not approved.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET.
// Optional env: BLOTATO_API_KEY (without it the run reports what is waiting and posts nothing).
const BASE = process.env.BLOTATO_API_BASE || 'https://backend.blotato.com';

async function sbGet(SB, KEY, path) {
  const r = await fetch(SB + '/rest/v1/' + path, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  return r.ok ? r.json() : [];
}
async function sbPatch(SB, KEY, id, patch) {
  await fetch(SB + '/rest/v1/content_calendar?id=eq.' + id, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch)
  });
}

module.exports = async (req, res) => {
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY, SECRET = process.env.CRON_SECRET;
  if (!SB || !KEY) { res.status(503).json({ error: 'Not configured' }); return; }
  const auth = req.headers['authorization'] || '';
  if (!SECRET || auth !== 'Bearer ' + SECRET) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const due = await sbGet(SB, KEY, 'social_due?select=*&order=scheduled_at.asc&limit=50');
  const BKEY = process.env.BLOTATO_API_KEY;
  if (!BKEY) { res.status(200).json({ ok: true, posted: 0, waiting: due.length, reason: 'No publisher key configured' }); return; }

  let accounts = [];
  try {
    const a = await fetch(BASE + '/v2/accounts', { headers: { 'blotato-api-key': BKEY } });
    if (a.ok) { const d = await a.json(); accounts = Array.isArray(d) ? d : (d.accounts || d.data || []); }
  } catch (e) { /* treated as no accounts */ }
  const forPlatform = p => accounts.find(x => ((x.platform || x.type || '').toLowerCase()) === (p || '').toLowerCase());

  const out = { ok: true, posted: 0, skipped: 0, failed: 0, details: [] };
  for (const row of due) {
    const account = row.blotato_account_id ? { id: row.blotato_account_id } : forPlatform(row.platform);
    if (!account) { out.skipped++; out.details.push({ id: row.id, platform: row.platform, result: 'no connected account' }); continue; }
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
        await sbPatch(SB, KEY, row.id, { status: 'failed', notes: 'Scheduled publish failed: ' + t.slice(0, 200) });
        out.failed++; out.details.push({ id: row.id, platform: row.platform, result: 'rejected', detail: t.slice(0, 120) });
        continue;
      }
      const pd = await post.json();
      const postId = pd.id || pd.postId || (pd.data && pd.data.id) || null;
      await sbPatch(SB, KEY, row.id, { status: 'posted', blotato_post_id: postId });
      out.posted++; out.details.push({ id: row.id, platform: row.platform, result: 'posted', blotato_post_id: postId });
    } catch (e) {
      out.failed++; out.details.push({ id: row.id, platform: row.platform, result: 'error' });
    }
  }
  res.status(200).json(out);
};
