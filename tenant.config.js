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
    confidentialityNote: "Beneficiary data is held in confidence under the trust's data-stewardship policy.",
    // The mark as it appears on ennoblerise.org
    wordmark: "EnnobleRise™",
    wordmarkSub: "GLOBAL TRUST",
    logoUrl: "https://ennoblerise.org/images/emblem.png",
    blogLabel: "Insights",
    // Accounts are provisioned by an administrator; nobody self-registers.
    allowSelfSignup: false,
    /* ---- Public pages (transparency ledger, donor portal, signing) ---- */
    footerLine: "Ennobling youth, educators and women across eight countries",
    description: "a 501(c)(3) public charity",
    contactEmail: "engage@ennoblerise.org",
    scholarshipUrl: "https://ennoblerise.org/en/scholarship",
    programsUrl: "https://ennoblerise.org/en/programs",
    programsLabel: "Programs",
    publicIntro: "Trust is the only currency a charity really has. So we show the books. Every dollar raised and every dollar spent, sorted by country and by pillar, updated as the money moves. No summaries you have to take on faith, no numbers behind a login.",
    publicLocalNoteTitle: "Every country, its own record",
    publicLocalNote: "Programme spending in each of the eight countries is logged by the team doing the work. Restricted gifts, scholarship funds among them, are tracked separately and spent only on what they were given for.",
    pendingNote: "The first programme dollars move in FY2027. The moment they do, every gift and every payment will appear here, line by line. This page is the promise, published before there is anything to hide.",
    donateUrl: "https://ennoblerise.org/en/donate"
  },

  /* ---- Insights (the blog) and social ---- */
  blogUrl: "https://ennoblerise.org/en/blog",
  blogCategories: ["Foundational Wealth", "Insights", "Youth", "Educators", "Women", "Announcement"],
  languages: ["en", "fr", "es"],

  /* ---- Navigation labels in the organization's own vocabulary ---- */
  labels: {
    overview: "Command Center",
    tickets: "Front Desk",
    beneficiaries: "Participants",
    donors: "Donors & Stewards",
    content: "Content Calendar",
    blog: "Insights",
    board: "Advisory Board",
    people: "People & Resources"
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
     Fallback only. tenant_settings.countries is authoritative and an admin can
     edit it from Settings without a deploy. This list mirrors country_programs
     as of 3 Nov 2026. */
  countries: ["Belize", "Cameroon", "Haiti", "India", "Nigeria", "South Africa", "Sri Lanka", "United Kingdom"],

  /* ---- Brand palette — read off ennoblerise.org's own stylesheet 22 Aug 2026:
     --navy-deep #13255E · --navy #1E3A8A · --gold #D9A514
     --gold-bright #FBBF24 · --ink #1F2937 · --ivory #FFFFFF          ---- */
  brand: {
    navy: "#1E3A8A",        // --navy on the site: primary
    deep: "#13255E",        // --navy-deep: sidebar, hero, sign-in
    deeper: "#0B1640",      // the darkest stop in those gradients
    gold: "#D9A514",
    softGold: "#FBBF24",    // --gold-bright
    ink: "#1F2937",
    limestone: "#F1F4F9",   // cool neutral to sit with their navy
    cream: "#FAFBFD",
    // Typography follows lib/fonts.ts on the public site.
    displayFont: "Fraunces",
    bodyFont: "Karla"
  }
};

/* Back-compat: older code paths read window.LEVOILA_SD_CONFIG. Keep them working. */
window.LEVOILA_SD_CONFIG = window.TENANT_CONFIG;
