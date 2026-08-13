// Levoila Dispatches — public blog feed for levoila.org.
// Reads only PUBLISHED dispatch rows via the SECURITY DEFINER dispatches_public().
// No npm deps. Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Safe default: returns [] if not configured, so the site shows its fallback.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !KEY) { res.status(200).json({ dispatches: [] }); return; }
  const slug = (req.query && req.query.slug) ? String(req.query.slug).slice(0, 120) : null;
  try {
    const r = await fetch(SB + '/rest/v1/rpc/dispatches_public', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug })
    });
    if (!r.ok) { res.status(200).json({ dispatches: [] }); return; }
    const data = await r.json();
    res.status(200).json({ dispatches: Array.isArray(data) ? data : [] });
  } catch (e) {
    res.status(200).json({ dispatches: [] });
  }
};
