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
 * TENANT 001 — EnnobleRise Global Trust. Provisioned 22 Aug 2026.
 * ========================================================================== */
window.TENANT_CONFIG = {
  /* ---- Backend (this tenant's OWN Supabase project — database-per-tenant) ---- */
  supabaseUrl: "https://knsuzpcaatwfevulphhw.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuc3V6cGNhYXR3ZmV2dWxwaGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTkyNTksImV4cCI6MjEwMjk5NTI1OX0.KFszTEu_kCvNNLBLnCvtkzyfSPOdZT0AsHG79buXtBA",

  /* ---- Identity / branding ---- */
  org: {
    name: "EnnobleRise",
    legalName: "EnnobleRise Global Trust",   // used by the audit bundle export
    product: "Mission Control",
    domain: "ennoblerise.org",
    tenantId: "ennoblerise",                 // must match tenant_settings.tenant_id
    tagline: "Youth, educators and women — programs across eight countries.",
    motto: "Every person carries innate worth. Our work is to awaken it.",
    staffOnlyNote: "Authorized EnnobleRise staff only. Every action is recorded.",
    confidentialityNote: "Beneficiary data is held in confidence under the trust's data-stewardship policy."
  },

  /* ---- Finance ---- */
  fundGoal: 150000,                  // their published two-year target
  currency: "USD",

  /* ---- Program taxonomy (drives the ledger "Project" picklist) ---- */
  projects: [
    "Youth Ennoblement",
    "Educator Leadership",
    "Women's Financial Resilience",
    "Michael G. Henry Legacy Scholarship",
    "Headquarters"
  ],

  /* ---- Countries in scope (drives the ledger "Country" picklist) ----
     PLACEHOLDER. EnnobleRise runs programs in 8+ countries; only the ones that
     actually STORE records belong here. Confirm before go-live. */
  countries: ["United States"],

  /* ---- Brand palette — read off ennoblerise.org's own stylesheet 22 Aug 2026:
     --navy-deep #13255E · --navy #1E3A8A · --gold #D9A514
     --gold-bright #FBBF24 · --ink #1F2937 · --ivory #FFFFFF          ---- */
  brand: {
    navy: "#13255E",
    gold: "#D9A514",
    softGold: "#FBBF24",
    limestone: "#F1F4F9",   // cool neutral to match their navy; confirm with client
    cream: "#FAFBFD"
  }
};

/* Back-compat: older code paths read window.LEVOILA_SD_CONFIG. Keep them working. */
window.LEVOILA_SD_CONFIG = window.TENANT_CONFIG;
