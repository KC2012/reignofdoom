# Reign of Doom — Alpha 3: Chaos Edition

A competitive physical toy for two people sharing a landscape iPad, with desktop and CPU play. Build something ridiculous, hit it with a heavy ball, improvise repairs, and see what survives.

## Play

Extract `downloads/reign-of-doom-alpha3-complete.zip` for the built game, source, tests, report and gameplay recording. A preserved Alpha 2.2 browser ZIP is also included under `preserved/` for comparison or rollback. The smaller `reign-of-doom-alpha3-browser.zip` contains just the runnable game. From the extracted folder:

```sh
node scripts/serve.mjs
```

Node 24 is recommended. Open the printed address and tap **Two players**. The built game requires no npm installation or external requests after loading.

For an iPad on the same Wi-Fi:

```sh
HOST=0.0.0.0 node scripts/serve.mjs
```

In Windows PowerShell, first set `$env:HOST="0.0.0.0"`, then run the Node command. Use the printed tablet address. Default serving is loopback only; `PORT` defaults to 8080. A static host can also serve `dist/`. Serve over HTTP; double-clicking `index.html` is unsupported. Reloading or an evicted browser tab needs the server again; this is not an installed offline PWA.

## The toy

- **Build:** drag from the tray or tap a piece then a place. Tap an existing block or soldier, then its destination, or drag it. **Rotate** works while holding, including with a second finger. **Cancel** restores the piece. R/right-click/wheel also rotate on desktop. Green fits; red overlaps. Falling bodies pause while you manipulate construction, while the build clock keeps running. Battle physics never stays suspended.
- **Build upward:** each player starts with two wide Tower frames and two Raised decks. One gesture places three independent load-bearing timbers. Rearrange them separately afterward. Soldiers can stand on floors and fall when supports break. There are no height bonuses or minimum tower requirements; bunkers remain legal.
- **Fire:** pull the ballista ring away from the enemy and down, then release. The ring leaves room for a full pull even in the wide view. More pull gives more power. A shortened, fading arc helps aiming without showing the exact impact. Shots have no random deviation.
- **Five shots:** unlimited **Wrecker** moves whole structures; **Piercer** concentrates damage; **Burst** spreads force; **Fire** burns touching timber and cork; **Vortex** lifts and twists loose construction. Heavy materials resist lifting. Springs, powder and your own structures can turn a shot against you.
- **Chaos:** meaningful destruction of original enemy structures earns progress toward a special shot at 40. Fragments and friendly damage do not count. Each target has bounded credit, stocks are capped, rewards slow while ahead, and at most one is awarded per bombardment. Both players receive a repair refill too. No persistent currency or shop.
- **Repairs:** three alternating shots each, then both players get the same six-piece sequence. Place the current piece or **Skip −2s**; the next is shown. At most one powder crate is dealt, surrounded by utility pieces. An occasional spring is preloaded for one hard-contact release. One soldier move and three safe fragment clearances remain available.
- **Reactions:** orange **!** powder detonates from hard damage, a sufficiently heavy moving block, or burning through its shell. Gold **×** beams support visible ropes and weights. Green **∿** pads launch once after a hard collision, then show **—**. These objects share real collisions, gravity and damage.
- **Camera:** both forts are the default. Choose **My fort / Ballista / Follow shot**, **Opponent**, **Both forts**, or +/−. The chosen aiming view stays through the shot and collapse, then the next turn returns to the wide view. Two fingers always pan/pinch and cancel a pending shot. Desktop wheel, Shift-drag and middle-drag navigate too.
- **Turns:** the colored bar names the active player. Ready advances building early; Menu pauses; Again! rematches with the same settings. Human aiming never times out into an automatic shot. Desktop arrows/Space and P remain optional shortcuts.

**Match settings** includes the three retained scales, CPU difficulty, seed, four featured arenas and older terrain variants. The Flats is clean competition; Powder Yard adds volatile cover; Hanging Works uses real timber-supported suspended weights; Scrapworks combines charged pads and powder. Grand Siege remains experimental.

**Toy lab / proving ground** under Match settings offers Tower, Bunker and Chain rigs through Menu. Each rig starts ready to fire, with three of every special shot. Reset a rig to compare ammunition immediately. The Chain rig permits an actual shot → broken beam → falling weight → powder → spring sequence. Drop load, Pull supports and Next phase remain available by touch; K/L/N are desktop equivalents.

## Development and checks

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:browser
npm run compare:physics
npm run audit:arcade
npm run audit:chaos
npm run test:webkit
python3 scripts/package.py
npm run test:package
```

System Chromium defaults to `/usr/bin/chromium`; `CHROMIUM_PATH` overrides it. The browser runner tests trusted touch, multi-touch, phone/tablet layouts, all five real shots, construction, repairs, CPU and rematches. It starts its own preview on port 4173. The package smoke test uses 4176.

`npm run record:chaos` records native touch gameplay at port 4178. It needs Playwright FFmpeg (`npx playwright install ffmpeg`) as well as Chromium. This cloud recording used the already-installed system FFmpeg through a temporary `PLAYWRIGHT_BROWSERS_PATH`. The silent recording uses deterministic aiming to compare toy-lab shots; no impacts or explosions are injected.

**Actual iPad hardware and iPad Safari were not verified.** WebKit's pinned engine is unavailable because its download was blocked by network policy; the probe records not-run and exits 2. Chromium viewport simulation does not establish Safari compatibility, iPad frame rate, thermal behavior, ergonomics or fun.

See the [development report](docs/development-report.md), [gameplay recording](docs/verification/alpha3/alpha3-gameplay.webm) and evidence in `docs/verification/alpha3/`. Fresh test output goes to ignored `test-results/alpha3/`. Alpha 2.2 is preserved at commit `9d4568b` and branch `preserve/alpha-2.2-9d4568b`; Alpha 3 work stays on `development/alpha3-chaos` until separately approved for publication.

No new dependency, account, backend or paid service was added. Third-party notices are in `public/`. The preserved Alpha 2.2 simulation in `experiments/alpha22/` makes physics comparisons reproducible.
