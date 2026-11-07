# Reign of Doom — Alpha 2.2

**Chaos Engine.** A physical castle game for two people sharing a tablet, with desktop and CPU play. Build unusual forts, knock their supports away, then improvise with a sequential repair queue.

## Play the complete download

Extract `downloads/reign-of-doom-alpha22-complete.zip` (built game, source, tests and report), or the smaller `reign-of-doom-alpha22-browser.zip`, then run:

```sh
node scripts/serve.mjs
```

Node 24 is recommended. Open the printed address and choose **Two players**. The built game needs no npm installation. For an iPad on the same Wi-Fi, serve on the local network:

```sh
HOST=0.0.0.0 node scripts/serve.mjs
```

In Windows PowerShell, set `$env:HOST="0.0.0.0"` first, then run the Node command. Use the printed tablet address. Default serving is loopback only; `PORT` defaults to 8080. A static host can also serve `dist/`. Serve over HTTP; double-clicking `index.html` is unsupported.

Once loaded, the game makes no external requests. Reloading or an evicted browser tab requires the server again; this is not an installed offline PWA.

## Controls and physical choices

- **Build:** drag from the tray, or tap a piece then tap a location. Rotate while holding using the visible Rotate button with another finger, or R/right-click/wheel on desktop. Tap existing blocks to select; drag to move. Cancel restores a held block. Green fits; red overlaps.
- **Build upward:** Tower frame and Raised deck place three independent timbers in one gesture. Their floors depend on real supports. Pieces can be rearranged separately. Three seeded starter silhouettes provide floors and space to expand; bunkers remain legal.
- **Soldiers:** tap a soldier, then tap a clear floor, or drag them there. Initial moves are free; repairs allow one successful move. Soldiers fall and can be crushed when their supports fail.
- **Shoot:** pull the ballista ring away from the enemy and down, then release. Smash displaces structures, Piercer concentrates damage into narrow supports, and Burst distributes force. The fading prediction shows roughly the first 75% of ground flight. The opponent inset has no precise-impact overlay.
- **Repair:** both players receive the same seeded six-piece sequence, one piece at a time. Place the current piece or **Skip −2s**; the next is shown. Simple beams and bricks surround a more demanding piece. At most one powder crate is dealt. Discarding never permanently locks the queue. Three safe fragment clearances remain available.
- **Reactions:** orange **!** crates detonate from hard impacts or accumulated damage. Gold **×** posts are breakaway supports. Hanging Works has visible ropes and heavy teal weights; breaking a post releases its weight. These objects share normal collisions, gravity and damage.
- **Camera:** both forts are the default in every phase. My fort / Ballista / Follow shot, Opponent, Both forts and +/− give explicit views. Two fingers pan/pinch anywhere. Desktop wheel, Shift-drag and middle-drag also work. Navigation cannot commit an armed shot.
- **Turns:** three alternating shots each, then repairs. Ready ends building early. The colored bar names the active player. Human aiming has no automatic timeout shot. Menu pauses; Again! starts a fresh match with the same settings.

Match settings includes The Flats, Powder Yard and Hanging Works, the four retained terrain variants, three scales, CPU difficulty and seed. Grand Siege remains experimental. Both players use the same upright interface. R/Escape/V/P/arrows/Space remain optional desktop shortcuts.

## Development and verification

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:browser
npm run test:webkit
npm run audit:arcade
node scripts/audit-chaos.mjs
python3 scripts/package.py
```

The Node suite has 63 physics, queue, rules, camera and gesture checks. Browser checks exercise trusted Chromium multi-touch, complete matches through rematch, the new arenas, tablet/short-height/phone layouts, and desktop/CPU controls. `CHROMIUM_PATH` overrides `/usr/bin/chromium`. Browser test previews use ports 4173 and 4174.

**Actual iPad hardware and iPad Safari were not verified.** The pinned WebKit engine download was blocked by network policy; `test:webkit` records not-run and exits 2. Chromium tablet emulation does not establish Safari compatibility. Cloud CPU workload timings do not establish iPad frame rates. Fun, strategic balance and real-device acceptance need human playtests.

See [the development report](docs/development-report.md) for evidence, limits and recommended playtests. Current retained evidence is in `docs/verification/alpha22/`; ignored fresh output goes to `test-results/alpha22/`. Earlier reports are historical.

`simulation.js` owns physics, `reactive.js` handles damage-driven activation, `chaos.js` defines assemblies/queue/prediction truncation, `match.js` owns turns and CPU, and `gestures.js`, `camera.js`, `interface.js` and `main.js` connect input and presentation. No new dependency or external service was added. Third-party attribution is in `public/`.
