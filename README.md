# Reign of Doom — Alpha 2.1

**Mobile-First Arcade Recovery.** A physical castle-smashing game for two people sharing one tablet, with desktop and CPU play preserved. The technical-toy visuals, materials, soldiers, six-shot bombardments, repairs and expressive destruction remain intact. No new weapons or gameplay content were added.

## Start playing

Extract `downloads/reign-of-doom-alpha21-browser.zip` (built game) or `reign-of-doom-alpha21-complete.zip` (built game, source, tests and report), then run:

```sh
node scripts/serve.mjs
```

Node 24 is recommended. Open the address printed in the terminal and tap **Two players**. No npm installation is required for a built package.

For an iPad on the same Wi-Fi as your computer, make the static server reachable from the tablet:

```sh
HOST=0.0.0.0 node scripts/serve.mjs
```

On Windows PowerShell, set `$env:HOST="0.0.0.0"` first, then run `node scripts/serve.mjs`. Open the printed **Tablet on the same Wi-Fi** address in iPad Safari. The default server binds only to the computer's loopback address; `HOST` is an explicit opt-in to local-network serving. `PORT` defaults to 8080.

A static web host can also serve `dist/`. Files must be served over HTTP; double-clicking `index.html` is unsupported. After the game has loaded it makes no external requests, and touch matches were tested with the browser set offline. Reloading/evicted tabs require the server again; this is not an installed offline PWA.

## The controls

- **Build:** drag a piece from the tray. Or tap a piece and tap an open spot. Tap a block to select it; **Rotate** turns it. Drag existing blocks to reposition them. Green fits; red overlaps. **Cancel** restores a held block.
- **Soldiers:** drag them onto a clear floor. Initial construction permits free repositioning; repairs allow one successful move. They remain vulnerable to falls, direct hits and heavy rubble.
- **Shoot:** touch the visible **PULL** ring, drag away from the enemy and down, then release. Longer pulls fire harder. Watch the dotted arc and opponent inset. Touching elsewhere pans without firing. Taps, cancelled pulls, viewport changes and two-finger navigation never commit a shot. There are no angle/power sliders in the main interface.
- **Camera:** two fingers move and pinch in every phase. **My fort / Ballista / Follow shot**, **Opponent**, **Both forts**, and **+/−** offer explicit framing. On desktop, wheel, Shift-drag or middle mouse also navigate.
- **Repair:** six supplied pieces, one soldier move and three safe fragment clearances. **Clear** selects a tap-to-clear tool; active or supporting loads cannot be erased. Earlier wreckage remains physical.
- **Turns:** the colored top bar always identifies the player. Each bombardment has three alternating shots per side, then both repair. **Ready / Repair done** advances early. Initial clocks, materials, inventories, victory and existing round ceilings are unchanged. Human aiming never expires into an automatic shot.
- **Menu:** pause/resume, sound, short instructions and return to title. The result screen offers **Again!** for a fresh match with the same settings.

Two players starts immediately in the existing **Skirmish** scale, the smaller tabletop configuration. **Match settings** exposes the retained Siege/Grand scales, five fields, CPU difficulty and seed. No device rotation is required between turns. Both players use the same upright view; there is no automatic 180-degree UI flip.

Desktop controls remain: R rotates, Escape cancels, V toggles the wide view, P pauses, arrows adjust the keyboard firing solution and Space fires. These shortcuts are optional; touch controls cover the normal game and proving-ground tools.

## Screen space and pacing

The slim turn bar and one contextual tray leave approximately 80–84% of primary tablet landscape height for gameplay, including short-height layouts. Footer decorations and duplicated status panels are gone. Fort framing is close, aiming has a live target inset, flight follows the projectile and impact frames the whole affected fort.

Travel is presented at 1.2× speed using the same fixed physics steps. The first impact interval returns to 1×, and later settling remains at 1×; a minimum impact reading window and a motion-aware resolution guard preserve collapse visibility. No damage, material, soldier, ammo or round-limit tuning was used to force shorter matches.

Nine natural machine matches provide a replay timing estimate. Human building/repair time is explicitly assumed in that estimate, not measured. The 3–6-minute goal still needs real shared-iPad playtesting; leaving construction clocks to expire produces longer games.

## Development and checks

Use Node 24 and npm from `/workspace/reignofdoom` or your extracted source folder:

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:browser
npm run test:webkit
npm run audit:arcade
python3 scripts/package.py
```

- The Node suite contains 50 actual physics, rule, camera and gesture checks.
- `test:browser` runs the complete primary touch flow at 1024×768 and 1024×600, plus 1133×744, 1180×820, 1366×1024, 1024×520 and 390×844 touch layouts, rotation/resize checks and desktop/CPU coverage. It uses trusted Chromium touch input, including multi-touch. System Chromium defaults to `/usr/bin/chromium`; `CHROMIUM_PATH` overrides it.
- `test:webkit` is a limited Safari-family engine probe. In this environment the pinned WebKit download was rejected by the network policy, so the command records **not run** and exits 2. It is not counted as a pass. If installed elsewhere, it distinguishes native taps from synthetic pointer drags.
- **Actual iPad Safari and physical iPad hardware were not verified.** Chromium tablet emulation is not sufficient evidence of iPad compatibility. See the report and the real-device checklist before calling that requirement complete.
- Fresh evidence goes to ignored `test-results/alpha21/`; retained evidence is in `docs/verification/alpha21/`. The browser runner starts/stops its own preview on port 4173. The WebKit probe uses port 4174. Python is only needed for release packaging.

The proving ground remains available under Match settings. Its Menu exposes **Drop load**, **Pull supports**, and **Next phase** for touch use. K/L/N remain desktop equivalents. `window.__siege` offers snapshots, fixed-step advancement and coordinate/gesture inspection for tests.

`src/gestures.js` owns pointer arbitration, `interface.js` supplies compact UI markup, `camera.js` supplies viewport-aware framing and conversions, and `main.js` connects controls/rendering. The existing `match.js`, `simulation.js`, `rules.js`, `battlefields.js` and `audio.js` preserve the game's modular mechanics. No new dependency, backend, account or paid service was introduced.

Read [the development and test report](docs/development-report.md) for verification limits, timing assumptions and a real-iPad acceptance checklist. Alpha 1/2 reports and packages remain historical artifacts. Matter.js licensing and reference attribution remain in `public/`.

## Playtest follow-up

The default camera now keeps both forts visible, including during bombardment. My fort/Ballista/Follow shot explicitly requests closer framing. Rotate pieces while holding them: R, right-click or the wheel on desktop, or the visible Rotate button with a second finger. Material durability has been reduced (timber 55, stone 85, steel 200) while preserving density, friction and physical support rules. Flight playback is 1.2× and destruction is 1× for easier tracking. The earlier timing estimates in the Alpha 2.1 report predate this slower playback.
