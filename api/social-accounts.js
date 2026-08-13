// Levoila — list connected social accounts from Blotato so the service desk can
// map each content draft to its platform account.
// No npm deps. Requires env: BLOTATO_API_KEY (and optional BLOTATO_API_BASE).
// Safe default: returns { configured:false, accounts:[] } if no key — the UI then
// shows "Connect accounts in Blotato" and posting stays with the scheduled agent.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const KEY = process.env.BLOTATO_API_KEY;
  const BASE = process.env.BLOTATO_API_BASE || 'https://backend.blotato.com';
  if (!KEY) { res.status(200).json({ configured: false, accounts: [] }); return; }
  try {
    const r = await fetch(BASE + '/v2/accounts', { headers: { 'blotato-api-key': KEY } });
    if (!r.ok) { res.status(200).json({ configured: true, accounts: [], error: 'blotato ' + r.status }); return; }
    const data = await r.json();
    const list = Array.isArray(data) ? data : (data.accounts || data.data || []);
    // Normalize to { id, platform, name, username }
    const accounts = list.map(a => ({
      id: a.id || a.accountId || a.account_id,
      platform: (a.platform || a.type || '').toLowerCase(),
      name: a.displayName || a.name || a.title || '',
      username: a.username || a.handle || ''
    })).filter(a => a.id && a.platform);
    res.status(200).json({ configured: true, accounts });
  } catch (e) {
    res.status(200).json({ configured: true, accounts: [], error: 'unreachable' });
  }
};
