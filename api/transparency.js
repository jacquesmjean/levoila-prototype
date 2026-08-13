// Levoila Public Transparency feed — serves the full breakdown from
// Supabase's transparency_json() RPC. If env vars are missing or the call
// fails, it falls back to the lighter /api/ledger endpoint so the public
// page always renders something truthful.
module.exports = async (req, res) => {
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  if (!SB || !KEY) { res.redirect(302, '/api/ledger'); return; }
  try {
    const r = await fetch(SB + '/rest/v1/rpc/transparency_json', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!r.ok) { res.redirect(302, '/api/ledger'); return; }
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.redirect(302, '/api/ledger');
  }
};
