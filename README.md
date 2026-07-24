<div align="center">

# `>_` ShipReady

### Is your AI or dev tool homepage ready to convert?

Paste a URL → get a **free, 10-point GTM readiness audit** in ~60 seconds.
Built for **AI & developer tool** companies who want their homepage to actually sell.

<p>
<a href="https://ship-ready.xyz"><img src="https://img.shields.io/badge/Live-ship--ready.xyz-00E0A4?style=for-the-badge&labelColor=0a0f0e" alt="Live site"/></a>
<img src="https://img.shields.io/badge/audit-10--point-0a0f0e?style=for-the-badge" alt="10-point"/>
<img src="https://img.shields.io/badge/price-free-0a0f0e?style=for-the-badge" alt="Free"/>
</p>

</div>

---

## What it does

ShipReady scans your homepage and scores it across the **10 things that actually move
GTM for a dev/AI tool** — clarity of value prop, ICP fit, proof, differentiation, CTA,
docs/DX signals, social proof, and more. You get:

- **A scorecard** — an overall grade + a per-category breakdown with ratings
- **What's working well** — so you don't break what already converts
- **What needs work** — specific, actionable recommendations, not vague vibes
- **Copy as an AI skill** — export the findings as a ready-to-paste prompt/skill for your coding agent
- **A shareable link + PDF** — send the audit to your team or a client

> Try it on your own site (or a competitor's): **[ship-ready.xyz](https://ship-ready.xyz)**

## How it works

```
your URL  →  fetch + analyze homepage  →  10-point GTM rubric  →  scorecard + fixes
```

The frontend is a single-page app; the analysis runs in a Supabase Edge Function
(`analyze-site`) that evaluates the page against the rubric and returns structured results.

## Tech

`Vite` · `React` · `TypeScript` · `Tailwind` · `shadcn/ui` · `framer-motion` · `Supabase` (Edge Functions + Postgres)

## Run locally

```sh
git clone https://github.com/AIDevGTM/shipready-audit.git
cd shipready-audit
npm install            # or: bun install
cp .env.example .env   # add your Supabase project vars
npm run dev
```

Environment variables (see `.env.example`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...   # anon key — safe for the browser
VITE_SUPABASE_PROJECT_ID=...
```

## Tests

```sh
npm run test           # vitest — PDF export + audit helpers
```

---

<div align="center">
<sub>Built by <a href="https://thedevtoolgtmcompany.com">Shane O'Connor</a> · <a href="https://thedevtoolgtmcompany.com">The DevTool GTM Company</a> · <a href="https://www.linkedin.com/in/devtoolgtm/">LinkedIn</a></sub>
</div>
