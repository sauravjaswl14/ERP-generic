# ERP Suite marketing site

Next.js 15 (App Router) + TypeScript + Tailwind CSS 3 + GSAP. A single-page homepage that advertises the ERP in this repo.

```bash
cd web
npm install
cp .env.example .env.local     # NEXT_PUBLIC_APP_URL = where the ERP client runs
npm run dev                    # http://localhost:3000
npm run build && npm start
```

The "Create a workspace" and "Sign in" buttons link to `NEXT_PUBLIC_APP_URL/signup` and `/login`. Rebrand by editing `src/lib/site.ts`.

`web` is installed on its own, not as a root npm workspace, so the root `package.json` is unchanged.

## Design

The page is built around carbon-copy forms: one entry on the white sheet appears on the yellow warehouse copy and the pink accounts copy, which is what the ERP does when an order is confirmed. Fonts (Archivo, IBM Plex Mono) are self-hosted through fontsource, so builds need no network.

## Motion

| Where | What |
| --- | --- |
| Hero | Typed headline, carbon ghost layers, sheets dropping in, pointer depth, scroll parallax |
| How it works | Pinned, scrubbed timeline: stamp, typewriter fills, copies fan out, balance check |
| Modules | Rules draw in, names drift sideways with scroll |
| Dashboard | Tilts flat on scroll, bars grow, sticky notes move at their own speed |
| Workspaces | Folder tabs spread on scroll, role marquee speeds up with scroll velocity |
| Everywhere | Lenis smooth scroll driven by the GSAP ticker, progress bar, line-mask headings |

Reduced motion: no GSAP animation or smooth scroll runs and the page shows its final state. Below 1024px the pinned scene becomes a normal stacked layout.

Animation code uses `useGSAP` and `gsap.matchMedia`, so everything is cleaned up on unmount.

## Samples

Company names, numbers and the dashboard are made-up samples and are labelled as such on the page.
