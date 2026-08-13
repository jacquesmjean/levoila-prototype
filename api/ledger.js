// Levoila Live Ledger — serves real numbers from Supabase's ledger_json().
// Safe default: if Supabase env vars are missing or the call fails, redirect
// to the static /ledger.json so the public page always works.
module.exports = async (req, res) => {
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  if (!SB || !KEY) { res.redirect(302, '/ledger.json'); return; }
  try {
    const r = await fetch(SB + '/rest/v1/rpc/ledger_json', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!r.ok) { res.redirect(302, '/ledger.json'); return; }
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.redirect(302, '/ledger.json');
  }
};
