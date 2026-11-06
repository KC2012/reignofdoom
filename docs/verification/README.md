# Alpha 1 verification evidence

Validated in the prepared cloud environment with Node 24.22.1, npm 11.9.0 and system Chromium. These are current-instance results; no fresh environment restore or publication is claimed.

- `unit-tests.txt`: `npm test` — 24 passing tests, zero failures/skips.
- `browser-report.json`: `npm run build` then `npm run test:browser` — 14 passing production Chromium checks. The script starts/stops its own preview, checks real pointer/touch gestures and records page errors and external runtime requests.
- `match-audit.json`: `node scripts/audit-matches.mjs` — 12 complete seeded machine duels, each through round 2. Accurate machine play is not human balance evidence.
- `install-validation.txt`: clean `npm ci`, tests and production build using the exact saved installer.
- `package-smoke.txt`: extracted browser ZIP serves HTML, bundled JavaScript and notices with no npm dependencies; saved dev startup serves its HTML and main module.
- Screenshots: title, construction, impact, repair, result, mobile title and mobile construction. Taken by the browser suite against the production bundle.

The browser result-screen test uses an explicitly controlled elimination fixture. The separate audit plays complete matches with ordinary CPU construction, aiming, collision damage and match transitions. The proving-ground fixtures withdraw supports and drop loads, rather than changing the runtime damage algorithm.

The first iterations exposed sleeping-contact compression, delayed elimination, high-angle firing and touch-cancellation defects. Regression tests now cover those paths. Reports here correspond to the final source and build, not the failed iterations.
