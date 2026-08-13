// Levoila public ticket intake — contact/volunteer/beneficiary forms and the
// concierge fallback post here. No npm deps.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !KEY) { res.status(503).json({ error: 'Not configured yet' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  // Honeypot: bots fill "website"; humans never see it.
  if (b.website) { res.status(200).json({ ok: true }); return; }

  const cut = (s, n) => (s == null ? '' : String(s)).slice(0, n);
  const subject = cut(b.subject, 200).trim();
  if (!subject) { res.status(400).json({ error: 'Subject required' }); return; }

  const cats = ['beneficiary','volunteer','partner','donor','government','press','urgent','general'];
  const row = {
    channel: 'web',
    category: cats.includes(b.category) ? b.category : 'general',
    priority: b.category === 'urgent' ? 'P1' : 'P3',
    status: 'new',
    subject,
    body: cut(b.body, 4000),
    requester_name: cut(b.name, 200) || null,
    requester_email: cut(b.email, 200) || null,
    requester_phone: cut(b.phone, 60) || null,
    language: ['en','fr','ht','es','pt'].includes(b.lang) ? b.lang : 'en',
    country: cut(b.country, 80) || null,
    escalated: b.category === 'urgent',
    source_meta: { ua: cut(req.headers['user-agent'], 200), page: cut(b.page, 200) }
  };

  try {
    const r = await fetch(SB + '/rest/v1/tickets', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });
    if (!r.ok) { res.status(502).json({ error: 'Store failed' }); return; }
    const d = await r.json();
    res.status(200).json({ ok: true, ticket: d && d[0] ? d[0].ticket_no : null });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};
