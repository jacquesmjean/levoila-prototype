// Levoila 24/7 Voice Front Desk — post-call webhook receiver.
// Works with Retell AI (TechFides standard) and is Vapi-compatible.
// Point the vendor's post-call webhook at:
//   https://www.levoila.org/api/voice-intake?key=YOUR_SECRET
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOICE_WEBHOOK_SECRET.

const CRISIS_WORDS = [
  'emergency','urgent','danger','collapse','injured','injury','accident','fire',
  'flood','earthquake','violence','threat','crush','stampede','death','dying',
  'ijans','danje','malad','aksidan','tranblemanntè',                 // Kreyòl
  'urgence','danger','blessé','effondrement','accident',            // French
  'emergencia','urgente','peligro','herido','derrumbe',             // Spanish
  'emergência','urgente','perigo','ferido','desabamento'            // Portuguese
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SECRET = process.env.VOICE_WEBHOOK_SECRET;
  if (!SB || !KEY) { res.status(503).json({ error: 'Not configured' }); return; }

  const qKey = (req.query && req.query.key) || req.headers['x-webhook-secret'];
  if (!SECRET || qKey !== SECRET) { res.status(401).json({ error: 'Unauthorized' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  // Retell shape: { event: 'call_analyzed', call: { transcript, call_analysis: { call_summary, user_sentiment }, from_number, ... } }
  // Vapi shape:   { message: { type: 'end-of-call-report', summary, transcript, call: { customer: { number } } } }
  const call = b.call || (b.message && b.message.call) || {};
  const transcript = b.transcript || (b.call && b.call.transcript) || (b.message && b.message.transcript) || '';
  const summary = (b.call && b.call.call_analysis && b.call.call_analysis.call_summary)
    || (b.message && b.message.summary) || '';
  const fromNumber = call.from_number || (call.customer && call.customer.number) || '';

  const text = ((summary || '') + ' ' + (transcript || '')).toLowerCase();
  const crisis = CRISIS_WORDS.some(w => text.includes(w));

  const row = {
    channel: 'voice',
    category: crisis ? 'urgent' : 'general',
    priority: crisis ? 'P1' : 'P2',
    status: 'new',
    subject: crisis ? 'URGENT voice call — review immediately'
                    : ('Voice call' + (fromNumber ? ' from ' + String(fromNumber).slice(0, 20) : '')),
    body: String(summary || 'No summary provided. See transcript.').slice(0, 4000),
    requester_phone: String(fromNumber).slice(0, 60) || null,
    escalated: crisis,
    transcript: typeof transcript === 'string' ? { text: transcript.slice(0, 20000) } : transcript,
    source_meta: { vendor: b.event ? 'retell' : (b.message ? 'vapi' : 'unknown') }
  };

  try {
    const r = await fetch(SB + '/rest/v1/tickets', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });
    if (!r.ok) { res.status(502).json({ error: 'Store failed' }); return; }
    const d = await r.json();
    res.status(200).json({ ok: true, ticket: d && d[0] ? d[0].ticket_no : null, crisis });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};
