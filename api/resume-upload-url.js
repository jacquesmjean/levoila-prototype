// Mints a one-time signed upload URL for a resume into the private "resumes" bucket.
// The browser uploads the file directly to the signed URL (the file never passes
// through this function, and the service-role key never reaches the browser).
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const SB = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !KEY) { res.status(503).json({ error: 'Not configured' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  const raw = (b.filename || 'resume').toString();
  const safe = raw.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80) || 'resume';
  const rand = Math.random().toString(36).slice(2, 10);
  const path = 'applications/' + Date.now() + '-' + rand + '-' + safe;

  try {
    const r = await fetch(SB + '/storage/v1/object/upload/sign/resumes/' + encodeURI(path), {
      method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!r.ok) { const t = await r.text(); res.status(502).json({ error: 'Sign failed', detail: t.slice(0, 300) }); return; }
    const j = await r.json();
    // j.url looks like: /object/upload/sign/resumes/<path>?token=...
    const uploadUrl = SB + '/storage/v1' + j.url;
    res.status(200).json({ path: path, uploadUrl: uploadUrl });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};
