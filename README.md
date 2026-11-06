# Reign of Doom — Alpha 1

**Little forts. Loud consequences.** A standalone browser game about building toy fortifications, protecting three tiny soldiers, and knocking the other side over. Local two-player hot-seat and single-player versus CPU. No accounts, backend, paid services, remote assets or API keys.

## Run from source

Use Node.js 24 and npm 11 (validated with 24.22.1 / 11.9.0).

```sh
npm ci
npm run dev
```

Open the address printed by Vite in your local browser. Pick **Play against CPU** or **Two players**. Choose one of three mirrored battlefields, a seed, and CPU difficulty on the title screen. The environment's checkout is `/workspace/reignofdoom`.

For a production build:

```sh
npm run build
node scripts/serve.mjs
```

The server binds to your computer's loopback interface on port 8080 (`PORT` can override it). You can also host `dist/` on any static HTTP server. The downloadable browser package contains the built game and a Node static server; it needs no npm installation. ES modules require HTTP: do not double-click `index.html` as a file URL.

## Play

- **Build, 45 seconds per side:** drag a piece from the tray onto your fort. Alternatively, select it and click the battlefield. Green previews fit; red previews overlap. Edges snap. R, right-click, or Rotate turns the piece. Click and drag your existing blocks to reposition them. Escape cancels and restores a held block. “Fort ready” advances early.
- **Fire, one shot per side:** pull away from the enemy and slightly downward, then release. Longer drags fire harder. You can drag anywhere on the battlefield or use the Angle / Power sliders and Fire button (Space). A dotted arc predicts unobstructed flight. Firing times out after 35 seconds with an automatic shot.
- **Repair, 15 seconds per side:** fit five supplied pieces into the wreckage, including a compound elbow. Existing debris remains physical and soldiers never respawn. Finish early with “Repair done.” A Breaker or Burst charge replenishes on alternating repair rounds, capped at three.
- **Win:** eliminate the opposing three soldiers. Debris, falls, explosions and sustained crushing count. Ten rounds is the siege limit; survivors decide, with ties declared a draw. The starting shooter alternates each round. Rematch resets the world.
- **View / pause:** V toggles overview and fort framing; Auto camera restores phase/impact framing. P pauses. Field manual opens detailed controls. Sound starts after interaction and can be toggled.

Touch supports tray dragging, Rotate, slingshot gestures and sliders. Desktop landscape gives the clearest view of the full battlefield. There is no network multiplayer or match persistence.

## Materials and ammunition

| Material | Physical role |
| --- | --- |
| Timber | Moderate mass, high grip, reliable building; splits under large impacts |
| Stone | Dense, high friction, brittle under concentrated energy; dangerous falling load |
| Steel | Very dense, strong, less grippy; can survive hits and crush what's below |
| Cork | Very light and springy; dissipates momentum through motion, weak under fracture |

Pieces: timber brick, beam and pillar; stone block; steel slab; cork wedge; timber elbow in repair drops. Three separate starter bays reduce shared-roof failures. All are dynamic bodies: snapping does not weld blocks together.

The standard **Bolt** is unlimited and precise. **Breaker** is slower, denser and transfers more momentum. **Burst** detonates on contact, kicking and damaging bodies within its radius. Each ammo type has its own previewed trajectory. Ballista positions are fixed on the inner flanks to keep firing readable.

## Test and tune

```sh
npm test                     # 24 rule, match and physical regression tests
npm run build
npm run test:browser          # 14 production-browser checks, including touch
node scripts/audit-matches.mjs # 12 seeded, automated complete matches
```

The browser runner uses `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to a Chrome/Chromium executable on other systems; Playwright is installed by `npm ci`. The runner starts and stops its own production preview on port 4173. Results and screenshots go to ignored `test-results/`; retained release evidence is in `docs/verification/`. Tests use the same simulation as the game. Artificial victory and load fixtures are identified in the test source.

**Proving ground** on the title screen starts a hot-seat test session. K drops a stone load over Ember's shelter; L withdraws Tide's lower supports; N advances a build/repair phase. You can place, fire and rematch normally. `window.__siege` exposes the live match, snapshots, fixed-step advancement and world/screen conversion for inspection. These fixture keys only work in the proving ground.

Tune `src/rules.js` (stock, materials, launch scale), `src/match.js` (rounds, CPU, timing), and `src/simulation.js` (damage, compression, fracture). Canvas rendering and DOM controls live in `src/main.js`; synthesized audio is in `src/audio.js`. No art asset pipeline is required.

Read [the development report](docs/development-report.md) for decisions, validation limits and next playtests. Matter.js licensing and reference attribution are in `public/third-party-notices.txt`.
