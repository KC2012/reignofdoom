# Reign of Doom — Alpha 2

**The Great Siege Update.** Build physical fortifications, protect three soldiers, bombard the opposing castle, and repair the wreckage. Local hot-seat and single-player versus CPU. Self-contained browser game; no accounts, backend, paid services, external assets or API keys.

## Play the packaged game

Extract `downloads/reign-of-doom-alpha2-browser.zip`, open a terminal in its extracted folder, and run:

```sh
node scripts/serve.mjs
```

Open the local address printed by the server. Node 24 is recommended. No npm install is needed for this package. The complete ZIP also includes `dist/`, source, tests and documentation; the same server command runs its built game. Opening `index.html` as a file URL is unsupported because browsers require HTTP for modules.

## Develop and validate

From `/workspace/reignofdoom` (or your extracted source directory), use Node 24 and npm:

```sh
npm ci
npm run dev
```

For production: `npm run build`, then `node scripts/serve.mjs`. Vite's dev server listens on port 5173; the packaged server binds to your local loopback interface on port 8080 (`PORT` overrides it). Any static HTTP host can serve `dist/`.

```sh
npm test                            # 42 actual rule, physics and match tests
npm run build
npm run test:browser                 # 18 production Chromium checks
node scripts/audit-matches.mjs       # 45 complete Siege duels: 5 fields × 3 difficulties × 3 seeds
node scripts/audit-matches.mjs --quick --scales # 6 complete Skirmish/Grand duels
node scripts/measure-debris.mjs      # heavy collision/debris simulation timing
python3 scripts/package.py          # regenerate downloadable ZIPs after building
```

Browser tests use `/usr/bin/chromium`; set `CHROMIUM_PATH` for another Chromium installation. They start/stop their own preview on port 4173. Fresh results go to ignored `test-results/alpha2/`. Retained release evidence lives in `docs/verification/alpha2/`. Python is only used for optional ZIP packaging, not building or playing the game.

## Match rhythm

Choose a field, match scale, seed and CPU difficulty at the title screen. Each side starts with three independently roofed, double-walled bunkers. They are fully dynamic structures: placement never welds blocks together.

**Build → six alternating shots (three each) → repair → repeat.** The starting shooter alternates each bombardment. Initial build/repair timers are 55/24 seconds in Skirmish, 70/30 in Siege and 90/40 in experimental Grand Siege. “Fort ready” and “Repair done” advance early. Each shot has a 35-second aiming window; expiry fires an automatically ranged shot.

Eliminate the other side's three soldiers. At the limit (8 bombardments for Skirmish/Siege, 10 for Grand), surviving soldiers decide; ties draw. There are no early-victory protections or global castle health. Falling structures, direct hits, explosions and sustained compression can kill soldiers. Repairs never revive them.

## Controls

- **Construction:** drag a tray piece to the battlefield, or select and click. R, right-click or Rotate turns it. Green fits; red overlaps. Click and drag your existing blocks to reposition them. Escape cancels a held piece. Materials differ in density, grip, rebound and fracture resistance.
- **Soldiers:** drag a soldier to a clear, supported surface in your territory. Ground, floors and platforms work; midair placement does not. Initial placement is unlimited. Each repair permits one successful soldier move. They remain physical, vulnerable bodies.
- **Artillery:** drag back from the ballista, or anywhere on the battlefield, then release. Use Angle / Power sliders plus Fire (Space) for fine control. **Range target** calculates useful starting power for the chosen angle and ammunition; refine it to attack a particular breach. The arc predicts free flight, not penetration through blocks.
- **Ammunition:** Bolt is unlimited, concentrates damage; Breaker is slower and transfers more momentum into supports and rubble; Burst applies a smaller radial blast, attenuated by intervening blocks. Specials replenish on alternating repairs, capped at three.
- **Repairs:** six seeded supply pieces, including an elbow assembly. “Clear rubble” gives three removals of settled, unsupported fragments per side. Active hazards, intact blocks and load-bearing fragments cannot be cleared through this tool. Small, old, harmless chips can also settle out automatically; substantial wreckage persists.
- **Camera:** V toggles overview/own fort. Enemy fort inspects the other side. Auto camera restores activity framing. Pan mode supports one-finger dragging; Shift-drag or middle mouse also pans. Wheel, +/- buttons or two-finger pinch zoom. Aiming includes a live enemy inset; flight follows the projectile; impact frames the damaged fort. Construction framing cuts to the active territory so placement is immediately usable.
- **Pause:** P or the pause button. Opening the manual pauses play. Losing browser focus pauses play. Sound unlocks after interaction and can be toggled.

Landscape desktop/tablet gives the clearest tactical view. Portrait touch construction, pan/zoom, phase handoff and slingshot firing are verified at 390 px width. Placement still needs a pointer; this is not a fully keyboard-operated game.

## Fields and scales

Lowlands offers open ground; The Divide has a central ridge; Terraces adds mirrored foundation shelves; The Chasm removes the central ground; High Ground raises both fort foundations. Fields are authored and mirrored. Seeds vary stock and CPU decisions, not the terrain geometry.

Skirmish spans 4,000 world units, Siege 4,800, and Grand Siege 6,400. Siege build territories are 900 units wide and 560 high (versus Alpha 1's 410 × 330). Elevated launch pads keep the fixed ballistae outside normal fort interiors. Ballistae cannot be destroyed; moving them was deferred to preserve straightforward firing and avoid a launcher-loss softlock.

## Proving ground and tuning

The proving ground uses the same simulation and offers all map scales. K drops a real stone load over Ember, L withdraws Tide's lower supports, and N advances a phase. The footer shows body/fragment counts. `window.__siege` exposes the live match, snapshots, fixed-step advancement and coordinate conversion for inspection and automated fixtures.

`src/rules.js` contains materials, stock and shared ballistic prediction/solver. `battlefields.js` defines scalable mirrored maps. `simulation.js` owns rigid bodies, damage, recursive fracture, supported soldier placement, contact-transmitted compression and safe rubble cleanup. `match.js` owns turn rules, resources and CPU decisions. `camera.js` supplies testable framing and coordinate transforms. `main.js`, `style.css` and `audio.js` present the game.

Read [the development report](docs/development-report.md) for measured balance, decisions, limitations and next human playtests. Automated checks validate mechanics, not fun. Alpha 1's historical report and verification remain available separately. Matter.js licensing/reference attribution is in `public/third-party-notices.txt`.
