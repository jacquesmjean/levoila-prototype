// TechFides Core — AI Concierge (multilingual intake coordinator).
// No npm deps. Requires env: ANTHROPIC_API_KEY (chat), and for ticket routing:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Safe default: if ANTHROPIC_API_KEY is missing, returns { fallback: true }
// and the widget shows email contact options instead. Nothing breaks.
//
// TENANT CONFIG (all optional; Levoila is the built-in reference default):
//   TENANT_ORG_NAME      short name, e.g. "Levoila"
//   TENANT_ORG_LONG      long name, e.g. "Levoila, The Global Heritage Trust"
//   TENANT_SITE          site domain, e.g. "levoila.org"
//   TENANT_CONTACT_EMAIL general inbox, e.g. "heritage@levoila.org"
//   TENANT_LANGUAGES     CSV of ISO codes the concierge answers in, e.g. "en,fr,ht,es,pt"
//   TENANT_KB            the organization's knowledge base (overrides DEFAULT_KB below)
// To productize for a new client: set TENANT_KB + the identity vars in Vercel. No code change.

const ORG_NAME    = process.env.TENANT_ORG_NAME || 'Levoila';
const ORG_LONG    = process.env.TENANT_ORG_LONG || 'Levoila, The Global Heritage Trust';
const SITE        = process.env.TENANT_SITE || 'levoila.org';
const CONTACT     = process.env.TENANT_CONTACT_EMAIL || 'heritage@levoila.org';
const LANG_CODES  = (process.env.TENANT_LANGUAGES || 'en,fr,ht,es,pt')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const LANG_NAMES  = { en:'English', fr:'French', ht:'Haitian Creole', es:'Spanish', pt:'Portuguese',
                      de:'German', it:'Italian', ar:'Arabic', zh:'Chinese', sw:'Swahili' };
const LANG_LIST   = LANG_CODES.map(c => LANG_NAMES[c] || c).join(', ');

const DEFAULT_KB = `
ABOUT LEVOILA
Levoila (legal name: Levoila Foundation, Inc., d/b/a Levoila, The Global Heritage Trust) is a
citizen-led global heritage trust founded by Jacques M. Jean, headquartered in Texas, USA.
Tagline: "When the governments forget, the world remembers."
501(c)(3) status: application in process. If approved, tax deductibility is retroactive to
June 3, 2026. Do not promise deductibility as certain; say it is pending.

HOW IT WORKS
Anyone can nominate an at-risk historic site. Stewards (members) vote quarterly. Winning sites
enter a Sovereignty Compact negotiation with the host nation. Levoila restores and operates the
site with 75-85% local hiring, then pays the host nation a Heritage Royalty. Standard timeline:
24 months from adoption to Grand Opening. A public Live Ledger shows every dollar in and out,
with a dual-signature rule on all outflows.

PHASE ONE SITES (HAITI)
1. Citadelle Henri Christophe (Milot) — first act is a permanent memorial to the April 11, 2026
   crowd-crush victims (the Zero-Tragedy Clause is Levoila's security standard).
2. Palais Sans-Souci (Milot).
3. Fort Liberte (Nord-Est).

STEWARD TIERS (memberships, via the Become a Steward buttons on the site)
Bronze $150 (1 vote) | Silver $1,000 (10 votes) | Gold $5,000 (100 votes) |
Heritage Patron $25,000+ (advisory access). The first 10,000 Stewards are engraved on the
Wall of Founders at the Citadelle entrance.

WAYS TO ENGAGE
- Become a Steward or donate: use the Become a Steward / Donate buttons on levoila.org.
- Volunteer or mentor: we onboard volunteers with background checks, an NDA, and a code of conduct.
- Beneficiaries and local partners (Haiti programs, site employment, partner agencies): we take
  intake requests and a coordinator follows up.
- Governments and institutions: governments@levoila.org.
- Press: press@levoila.org. General: heritage@levoila.org.
- Careers: the Careers section on levoila.org.

LANGUAGES: English, French, Kreyol Ayisyen, Spanish, Portuguese. Reply in the user's language.
`;

const KB = process.env.TENANT_KB || DEFAULT_KB;

const SYSTEM = `You are the ${ORG_NAME} Concierge, the welcoming intake coordinator for ${ORG_LONG}
(${SITE}). You are warm, concise, and human. You speak ${LANG_LIST}; always answer in the language
the visitor uses (or the site language passed to you) unless they switch.

Rules:
- Answer ONLY from the knowledge below. If you don't know, say so and offer to connect them
  with the team (${CONTACT}) or open a request for follow-up.
- Never invent numbers, dates, deadlines, promises, or legal/financial outcomes. If the knowledge
  base marks something as pending or uncertain, present it that way — never as settled.
- Keep replies short: 2-4 sentences, then one clear next step.
- If the visitor wants to: request services/partnership as a beneficiary, volunteer, discuss a
  government matter, press inquiry, a major gift, or anything needing human follow-up — collect
  their name and email (and country if relevant), then call the create_ticket tool ONCE with a
  clear summary. Tell them a coordinator will follow up within one business day.
- CRISIS: if the visitor describes an emergency, danger to life, or acute distress at a site or
  community, respond with care, advise contacting local emergency services immediately, and call
  create_ticket with priority P1 and category urgent.
- Do not discuss internal operations, non-public finances, or personal data.

KNOWLEDGE:
${KB}`;

const TOOLS = [{
  name: 'create_ticket',
  description: 'Create a follow-up ticket for the Levoila team. Call at most once per conversation, only when the visitor wants human follow-up and has given contact info.',
  input_schema: {
    type: 'object',
    properties: {
      subject:  { type: 'string', description: 'Short subject line' },
      summary:  { type: 'string', description: 'What the visitor needs, in 2-5 sentences' },
      category: { type: 'string', enum: ['beneficiary','volunteer','partner','donor','government','press','urgent','general'] },
      priority: { type: 'string', enum: ['P1','P2','P3'], description: 'P1 only for emergencies' },
      name:     { type: 'string' }, email: { type: 'string' },
      phone:    { type: 'string' }, country: { type: 'string' }
    },
    required: ['subject','summary','category']
  }
}];

async function createTicket(input, lang, history) {
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !KEY) return null;
  const crisis = input.priority === 'P1' || input.category === 'urgent';
  const row = {
    channel: 'concierge',
    category: input.category || 'general',
    priority: crisis ? 'P1' : (input.priority || 'P3'),
    status: 'new',
    subject: String(input.subject || 'Concierge inquiry').slice(0, 200),
    body: String(input.summary || '').slice(0, 4000),
    requester_name: String(input.name || '').slice(0, 200) || null,
    requester_email: String(input.email || '').slice(0, 200) || null,
    requester_phone: String(input.phone || '').slice(0, 60) || null,
    language: lang || 'en',
    country: String(input.country || '').slice(0, 80) || null,
    escalated: crisis,
    transcript: history
  };
  try {
    const r = await fetch(SB + '/rest/v1/tickets', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d[0] ? d[0].ticket_no : null;
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const API = process.env.ANTHROPIC_API_KEY;
  if (!API) { res.status(200).json({ fallback: true }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const lang = LANG_CODES.includes(b.lang) ? b.lang : (LANG_CODES[0] || 'en');

  // Sanitize history: cap 20 turns, 2000 chars each, strict roles.
  const msgs = (Array.isArray(b.messages) ? b.messages : [])
    .slice(-20)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') {
    res.status(400).json({ error: 'No user message' }); return;
  }

  const call = async (messages) => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.CONCIERGE_MODEL || 'claude-haiku-4-5',
        max_tokens: 700,
        system: SYSTEM + `\n\nCurrent site language: ${lang}.`,
        tools: TOOLS,
        messages
      })
    });
    if (!r.ok) throw new Error('upstream ' + r.status);
    return r.json();
  };

  try {
    let data = await call(msgs);
    let ticketNo = null;

    if (data.stop_reason === 'tool_use') {
      const toolUse = data.content.find(c => c.type === 'tool_use');
      if (toolUse && toolUse.name === 'create_ticket') {
        ticketNo = await createTicket(toolUse.input, lang, msgs);
        const followup = [...msgs,
          { role: 'assistant', content: data.content },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id,
            content: ticketNo ? `Ticket #${ticketNo} created. Confirm to the visitor that the team will follow up within one business day.`
                              : `Ticket system unavailable. Ask the visitor to email ${CONTACT} directly.` }] }
        ];
        data = await call(followup);
      }
    }

    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    res.status(200).json({ reply: text || '…', ticket: ticketNo });
  } catch (e) {
    res.status(200).json({ fallback: true });
  }
};
