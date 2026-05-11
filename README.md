# Levoila — Prototype Site

The static prototype of [levoila.com](https://levoila.com). Single-file HTML, hash-routed across all sections (Home, Founder, Team, Advisory, Phase One, Nominate, Vote, Donate Crypto, Steward signup, Dashboard, Live Ledger).

This is a **prototype**. It has no backend. Forms do not submit, payments do not process. Use it to demo the experience, share with advisors, and pitch the engineering build.

## Stack

- One file: `index.html`
- Tailwind CSS via CDN
- EB Garamond + Inter via Google Fonts
- Vanilla JS for hash routing and the multilingual switcher

No build step. No bundler. Open in any browser.

## Run Locally

Just open the file:

```
open index.html
```

Or serve over HTTP if you prefer:

```
python3 -m http.server 4000
# then visit http://localhost:4000
```

## Deploy

Pushed to Vercel via this repo. Production: [levoila.com](https://levoila.com).

Configuration in `vercel.json` — static-only, security headers, clean URLs.
