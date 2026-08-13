// Levoila careers intake — receives an application and stores it in Supabase.
// Uses fetch only (no npm deps). Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// The service-role key is server-side only and must never be exposed to the browser.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const SB = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !KEY) { res.status(503).json({ error: 'Intake not configured yet' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  const name = (b.name || '').toString().trim();
  const email = (b.email || '').toString().trim();
  if (!name || !email) { res.status(400).json({ error: 'Name and email are required' }); return; }

  const cut = (s, n) => (s || '').toString().slice(0, n);
  const row = {
    role: cut(b.role, 200) || 'General interest',
    name: cut(name, 200),
    email: cut(email, 200),
    phone: cut(b.phone, 60),
    location: cut(b.location, 200),
    language: cut(b.language, 40),
    why: cut(b.why, 5000),
    linkedin: cut(b.linkedin, 300),
    resume_path: cut(b.resumePath, 400),
    status: 'new',
    source: 'careers-portal'
  };

  try {
    const r = await fetch(SB + '/rest/v1/applications', {
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(row)
    });
    if (!r.ok) { const t = await r.text(); res.status(502).json({ error: 'Store failed', detail: t.slice(0, 300) }); return; }
    const data = await r.json();
    const id = (data && data[0] && data[0].id) || null;

    // Best-effort audit log (never block the applicant on this).
    try {
      await fetch(SB + '/rest/v1/audit_log', {
        method: 'POST',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'public', action: 'application.created', entity: 'applications', entity_id: id })
      });
    } catch (e) { /* ignore */ }

    res.status(200).json({ ok: true, id: id });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};
