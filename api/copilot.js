// Levoila — Executive Copilot. Staff-only chat grounded in a live Mission
// Control snapshot. No npm deps.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional env: ANTHROPIC_API_KEY (enables free-form answers). If absent, the
// API returns { fallback:true, snapshot } and the client renders a briefing
// from the same data — nothing breaks, no numbers are invented.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3ZocWRsamZqamt1ZGVpc2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTcyNzAsImV4cCI6MjA5OTQ5MzI3MH0.hsQCo-THdMXt0AyUoyJgdYwyzjn6rye0Gwz33DwuhCg';
const ORG_NAME = process.env.TENANT_ORG_NAME || 'Levoila';

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
    return rows && rows[0] ? { staff: rows[0], token } : null;
  } catch (e) { return null; }
}

async function getSnapshot(SB, token) {
  // Call the RPC AS THE STAFF USER so is_staff() passes inside exec_snapshot().
  const r = await fetch(SB + '/rest/v1/rpc/exec_snapshot', {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: '{}'
  });
  if (!r.ok) return null;
  return r.json();
}

const SYSTEM = `You are the ${ORG_NAME} Executive Copilot — a sharp, trusted chief-of-staff for the leadership of ${ORG_NAME}, a heritage trust operating in Haiti.

You are speaking with authorized staff. Answer their questions about operations using ONLY the live SNAPSHOT provided below. Rules:
- Never invent, estimate, or extrapolate numbers. If the snapshot does not contain the answer, say so plainly and suggest where in Mission Control to look (Records, Presence, Ledger, Tickets, Content).
- All money figures are USD. Be precise with the numbers given.
- Lead with the answer. Be brief and decisive — two or three sentences, or a short list. You are briefing a busy executive, not writing a report.
- When useful, add one concrete next step ("3 vendors are waiting on approval — clear them under Records → Vendors").
- No preamble, no "based on the data". Just answer.
- Do not reveal donor personal data beyond what the executive already has access to here.`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !KEY) { res.status(503).json({ error: 'Not configured' }); return; }

  const who = await requireStaff(req, SB, KEY);
  if (!who) { res.status(401).json({ error: 'Staff sign-in required' }); return; }

  const snapshot = await getSnapshot(SB, who.token);
  if (!snapshot || snapshot.ok === false) { res.status(200).json({ error: 'Could not load snapshot' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  const API = process.env.ANTHROPIC_API_KEY;
  // No LLM key: hand the snapshot back so the client renders a deterministic briefing.
  if (!API) { res.status(200).json({ fallback: true, snapshot }); return; }

  const msgs = (Array.isArray(b.messages) ? b.messages : [])
    .slice(-16)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') {
    res.status(400).json({ error: 'No question' }); return;
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.COPILOT_MODEL || 'claude-haiku-4-5',
        max_tokens: 800,
        system: SYSTEM + '\n\nLIVE SNAPSHOT (as of ' + (snapshot.generatedAt || 'now') + '):\n' + JSON.stringify(snapshot),
        messages: msgs
      })
    });
    if (!r.ok) { res.status(200).json({ fallback: true, snapshot }); return; }
    const data = await r.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    res.status(200).json({ reply: text || '…', snapshot });
  } catch (e) {
    res.status(200).json({ fallback: true, snapshot });
  }
};
