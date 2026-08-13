/* ============================================================================
 * tenant.config.js — TechFides Core · Sovereign Operating System for Non-Profits
 * ----------------------------------------------------------------------------
 * SINGLE SOURCE OF TENANT IDENTITY. One file per client instance.
 * Everything the front end needs to brand and scope itself lives here, so the
 * application code (servicedesk.html) ships identically to every tenant and
 * only this file changes.
 *
 * The anon key is safe in the browser: Row-Level Security means it can read
 * NOTHING unless the signed-in user is on the staff allowlist, and every
 * SECURITY DEFINER RPC re-checks the caller's role server-side.
 *
 * TO PROVISION A NEW TENANT: copy this file, replace the values below with the
 * client's own Supabase project + brand, deploy. Nothing else changes.
 * (See PROVISIONING_RUNBOOK.md.)
 * ========================================================================== */
window.TENANT_CONFIG = {
  /* ---- Backend (this tenant's OWN Supabase project — database-per-tenant) ---- */
  supabaseUrl: "https://igkvhqdljfjjkudeisbs.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3ZocWRsamZqamt1ZGVpc2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTcyNzAsImV4cCI6MjA5OTQ5MzI3MH0.hsQCo-THdMXt0AyUoyJgdYwyzjn6rye0Gwz33DwuhCg",

  /* ---- Identity / branding ---- */
  org: {
    name: "Levoila",                 // wordmark, shown top-left everywhere
    product: "Mission Control",      // overline label under the wordmark
    domain: "levoila.org",           // staff email domain (auth placeholder)
    tagline: "Phase One · Haiti — three heritage sites in the 24-month window.",
    motto: "When the governments forget, the world remembers.",
    // Shown on the sign-in card + denied card:
    staffOnlyNote: "Authorized Levoila staff only. Every action is recorded.",
    confidentialityNote: "Beneficiary data is held in confidence under the trust's data-stewardship policy."
  },

  /* ---- Finance ---- */
  fundGoal: 1000000,                 // campaign / annual goal used by the command-center gauge
  currency: "USD",

  /* ---- Program taxonomy (drives the ledger "Project" picklist) ---- */
  projects: ["Phase One", "Citadelle", "Sans-Souci", "Fort Liberte", "Headquarters"],

  /* ---- Countries in scope (drives the ledger "Country" picklist; HQ is always first) ---- */
  countries: ["Haiti"],

  /* ---- Brand palette (optional; falls back to the app's default navy/gold) ---- */
  brand: {
    navy: "#0B2545",
    gold: "#B6862C",
    softGold: "#D4A857",
    limestone: "#F4F1EA",
    cream: "#FAF7F0"
  }
};

/* Back-compat: older code paths read window.LEVOILA_SD_CONFIG. Keep them working. */
window.LEVOILA_SD_CONFIG = window.TENANT_CONFIG;
