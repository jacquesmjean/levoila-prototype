// Gifts arrive here from the payment platform (Zeffy via Zapier, or any other
// processor that can POST JSON). Each gift becomes a donation, opens a
// thank-you ticket so a person follows up, and a recurring gift enrols the
// giver as a steward. Idempotent on (source, external_id): a retried webhook
// never double-counts.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DONATION_WEBHOOK_SECRET.
// Call with header  x-webhook-secret: <DONATION_WEBHOOK_SECRET>
// Body (JSON): { source, external_id, donor_name, donor_email, amount, currency,
//                recurring, designation, country, dedication, note, raised_at }

function num(v){ const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; }
function bool(v){ return v === true || /^(true|yes|1|monthly|recurring)$/i.test(String(v ?? '')); }
function tierFor(a){ return a >= 5000 ? 'founder' : a >= 1000 ? 'patron' : a >= 250 ? 'sustainer' : 'friend'; }

async function sb(SB, KEY, path, init = {}) {
  const r = await fetch(SB + '/rest/v1/' + path, {
    ...init,
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) }
  });
  const text = await r.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { ok: r.ok, status: r.status, body };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY, SECRET = process.env.DONATION_WEBHOOK_SECRET;
  if (!SB || !KEY) { res.status(503).json({ error: 'Not configured' }); return; }
  if (!SECRET || (req.headers['x-webhook-secret'] || '') !== SECRET) { res.status(401).json({ error: 'Unauthorized' }); return; }

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const amount = num(b.amount);
  const email = String(b.donor_email || b.email || '').trim().toLowerCase();
  const name = String(b.donor_name || b.name || [b.first_name, b.last_name].filter(Boolean).join(' ') || 'Anonymous').trim();
  const source = String(b.source || 'zeffy').toLowerCase();
  const externalId = String(b.external_id || b.id || b.payment_id || b.transaction_id || '').trim();
  if (!amount || amount <= 0) { res.status(400).json({ error: 'amount is required and must be positive' }); return; }
  if (!externalId) { res.status(400).json({ error: 'external_id is required so a retried webhook cannot double-count' }); return; }

  // Already recorded? Say so and stop.
  const dup = await sb(SB, KEY, `donations?source=eq.${encodeURIComponent(source)}&external_id=eq.${encodeURIComponent(externalId)}&select=id`);
  if (dup.ok && Array.isArray(dup.body) && dup.body.length) { res.status(200).json({ ok: true, duplicate: true, donation_id: dup.body[0].id }); return; }

  const recurring = bool(b.recurring) || bool(b.frequency);
  const designation = String(b.designation || b.fund || b.campaign || 'greatest').toLowerCase();
  const ins = await sb(SB, KEY, 'donations', { method: 'POST', body: JSON.stringify({
    source, external_id: externalId, donor_name: name, donor_email: email || null, amount_usd: amount,
    tier: tierFor(amount), recurring, site: designation, country: b.country || null,
    engrave_name: b.dedication || null, public_optin: bool(b.public_optin)
  }) });
  if (!ins.ok) { res.status(502).json({ error: 'Could not record the donation', detail: ins.body }); return; }
  const donation = Array.isArray(ins.body) ? ins.body[0] : ins.body;

  // A person says thank you. The ticket is how that gets tracked.
  const subject = `Gift · $${amount.toLocaleString('en-US')}${recurring ? '/month' : ''} — ${name}`;
  const body = `Received via ${source}${b.raised_at ? ' on ' + b.raised_at : ''}.\nDesignation: ${designation}`
    + (b.dedication ? `\nDedication: ${b.dedication}` : '') + (b.note ? `\nNote: ${b.note}` : '')
    + `\n\nThank them within 48 hours. ${recurring ? 'This is a recurring gift — they are now a steward.' : ''}`.trim();
  await sb(SB, KEY, 'tickets', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
    channel: 'web', category: 'giving', priority: 'P3', status: 'new', subject, body,
    requester_name: name, requester_email: email || null, language: 'en', country: b.country || null,
    source_meta: { kind: 'donation', source, external_id: externalId, donation_id: donation.id, amount, recurring }
  }) });

  // Recurring givers are stewards.
  let steward = null;
  if (recurring) {
    const st = await sb(SB, KEY, 'stewards', { method: 'POST', body: JSON.stringify({
      tier: tierFor(amount), country: b.country || null, engrave_name: b.dedication || name, donation_id: donation.id
    }) });
    steward = st.ok && Array.isArray(st.body) ? st.body[0] : null;
  }

  res.status(200).json({ ok: true, donation_id: donation.id, tier: tierFor(amount), recurring, steward_no: steward ? steward.steward_no : null });
};
