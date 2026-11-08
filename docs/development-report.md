# Alpha 3 — Chaos Edition

Alpha 3 develops the supplied Alpha 2.2 game on `development/alpha3-chaos`. Alpha 2.2 commit `9d4568b` is preserved on `preserve/alpha-2.2-9d4568b`, with its runnable packages retained. The uploaded Reign of Doom source matched that baseline. The autonomous development cycle covered experimentation, implementation, complete-match integration, regressions, visual inspection and packaging. No remote push or deployment was performed.

## Decisions and experiments

The central change is stronger displacement with survivable consequences, rather than fragile blocks or artificial soldier immunity. The Wrecker is now a blunt 15-unit-radius ball, with a larger physical mass, a bounded impact kick and less concentrated fracture damage. Structural friction is lower, and independent beams can tumble intact. Weighted, rounded toy soldiers can survive a light timber collapse; heavy steel, direct shots, fire exposure, falling and sustained compression still injure or eliminate them. Their physical mass and health changed; no invulnerability window, automatic escape or minimum-survival rule was added.

The controlled experiment uses identical three-room tower and bunker fixtures, fixed launch position/velocity, and three shots with 240 fixed steps after each. Alpha 2.2 runs its preserved source. The first pass compared larger balls, exaggerated momentum and a hybrid with the old soldier bodies: impressive movement often killed every defender immediately. The refined pass changed the soldiers' mass, impact response and health and repeated the comparison.

| Refined profile | Tower: intact pieces moved after one shot | Tower survivors | Bunker: mean intact movement | Bunker survivors |
| --- | ---: | ---: | ---: | ---: |
| Alpha 2.2 | 8 of 9 original pieces | 2/3 | about 16 units | 2/3 |
| Larger ball | 8 of 9 | 2/3 | about 95 units | 3/3 |
| Cartoon momentum | 9 of 9 | 2/3 | about 27 units | 3/3 |
| Selected hybrid | 8 of 9 | 2/3 | about 94 units | 2/3 |

A moved piece travels more than 35 units. Fracture and soldier losses are recorded separately. These are physical measurements, not a fun score or a strategic win-rate test. The hybrid generated roughly six times the baseline intact bunker movement in this fixture while leaving defenders alive. The larger ball alone and the momentum-only approach showed useful tradeoffs; the hybrid best combined displacement, progressive breakup and survival for this pass. Full results include both passes in `physics-comparison.json` and can be reproduced with `npm run compare:physics`.

## The integrated game

| Shot | Physical role | Useful distinction |
| --- | --- | --- |
| Wrecker | Unlimited, heavy blunt impact with bounded knockback | Pushes supports and tumbles intact construction |
| Piercer | Narrow, concentrated damage; retains reduced incoming motion after structural penetration | Breaks a chosen support rather than applying broad blast force |
| Burst | Shield-attenuated radial force and damage | Separates clustered loose pieces; cover still matters |
| Fire | Contact-activated ignition, timed damage and short-range spread through touching wood/cork | Can burn a beam or powder shell; steel and stone do not ignite |
| Vortex | Short-lived inward, rotational and upward forces | Lifts loose construction; force is capped for heavy bodies; no direct explosion damage |

Effects are modular in `projectile-effects.js`, with contact scheduling outside the Matter solver. Fire has finite burn lifetimes, once-burned material cannot be repeatedly ignited, and a limited ignition frontier controls spread. Fragments inherit remaining burn time; all physical fragments share the 160-body budget. Vortex uses a 190-unit field for 1.7 simulated seconds. Force scaling accounts for the two solver substeps. Pending effects and chain events keep the shot open through their consequences.

Chaos rewards observe original enemy bodies present at launch. Health loss, meaningful movement, structural failure and eliminations grant bounded per-target credit. Friendly bodies, terrain and fragments grant none. Repeated movement at an already-credited tier and stationary inactive debris cannot be farmed. Progress is capped at 28 base points per shot, reduced to 65% while ahead and increased to 115% while behind. Forty points grant a seeded special shot, limited to one award per player per bombardment, three of any kind and eight specials total. Both players share the same preferred reward sequence and receive a repair refill; stock-cap fallback can differ if their inventories differ. This limits snowballing without adding an economy. It still needs competitive playtesting.

Construction now provides two wider Tower frames and two Raised decks per player. One gesture places actual independent timbers; floors depend on supports and can fall. Skirmish territory is wider to leave room for construction and mechanisms. Tap-select/tap-place now works for blocks as well as soldiers; dragging remains available. During one-finger construction manipulation the simulation pauses falling bodies while the turn clock continues. Cancellation, pinch takeover and time expiry restore the held piece. Battle physics is unaffected.

Repairs retain the matched seeded six-piece queue, current/next presentation and two-second skip. Utility pieces bracket one volatile crate, breakaway post or charged spring. At most one crate is forced into a queue, never a run of explosives. Crowded wreckage may make a placement impossible, so skipping never permanently locks progress. Bunkers remain legal; no height bonus or mandatory tower requirement was introduced. CPU uses the same placement and queue rules, can move a soldier upstairs, chooses useful special ammunition and targets structural or reactive opportunities.

Hanging Works now suspends weights from real dynamic beams resting on posts. Its ropes have visible body anchors, and breaking either supporting construction or the marked beam has physical consequences. Spring pads store one visible charge: hard contact launches touching loads once, including loaded objects when a projectile strikes the pad. Spent pads display a dash. Powder also reacts to a sufficiently heavy moving block, so a falling weight can detonate it before the timber shell's health is exhausted. This is a measured collision condition, not a hidden time-based event. Scrapworks combines the pads with volatile cover. All featured arena/starter combinations remain idle without spontaneous damage.

The ballista visibly draws back with the pull, recoils on release, and launches distinct projectile silhouettes. A 65ms presentation hit-stop, restrained shake, synthesized sound and effect-specific markings support impact readability. Travel remains 1.2× and destruction 1×, with the existing minimum impact-view window. Both-fort framing remains the default. Explicit opponent/follow/manual views persist through firing and collapse; the next turn resets to the wide default. Impact framing leaves extra headroom and anticipates airborne pieces so the camera can follow their rise smoothly. An offset pull handle leaves room for full-strength release near screen edges and shows its connection to the launcher. A shortened fading prediction has no replacement exact-impact overlay.

## Integration bugs found and fixed

- Blast impulses could assign velocity to a fixed mechanism. The turn then waited forever for that nonexistent motion to settle. Fixed bodies still receive damage but no impulse; settling ignores static velocity.
- A fragment counter could overshoot at odd counts after secondary fractures. The budget now derives from actual live fragments and checks the projected replacement count; removed fragment space can be reused.
- The selected opponent camera previously reset on launch, pulling away from the target. Aiming view choice now persists into flight.
- Full-strength pulls could leave the viewport when the wide camera put the launcher near an edge. The on-screen pull handle now reserves the full pull distance.
- Fire spread now checks actual body edges after a bounds rejection, so the empty corners of a rotated beam cannot transmit heat across an air gap.
- Construction could drop other supports while a piece was being adjusted. Manipulation assistance holds physics while preserving the deadline and all cancellation paths.

## Verification and evidence

**83/83 Node tests and 47/47 browser checks passed. All 36 complete machine matches finished: 35 reached another bombardment, 1 reached the existing round ceiling, and peak live entity count was 287.** All five ammunition types were used, with 218 Chaos awards across the audit. This is machine-play coverage, not a human balance verdict.

Four rubble/effect workloads each simulated 15 seconds with deliberately fractured blocks, fire and a Vortex. The physical fragment count stayed within 160 and positions remained finite. Cloud-CPU p95 physics-step times were approximately 1.50–2.00 ms, excluding rendering. Full timing distributions, peaks and cleanup counts are retained. Match-time estimates use stated assumptions of 20 seconds initial building and eight seconds per repair per player; they are not measured human session times.

Current evidence is in [verification/alpha3](verification/alpha3/). `unit-tests.txt` contains the complete Node result. `browser-report.json` lists native input checks and viewport measurements. `pacing-audit.json` covers natural machine matches. `physics-workload.json` records CPU step times under rubble, fire and a Vortex. `physics-comparison.json` preserves the controlled experiments. `package-smoke.txt` records extracted-package startup.

Node coverage includes material-specific ignition/spread/expiry, powder ignited by fire, Vortex lift without direct blast damage, effect-aware settling, charged pads with real hard contacts and resting loads, a support → weight → powder → spring chain, bounded rewards and supply, stock enforcement, persistent-effect pause, construction assistance, fragment-budget edge cases and stable toy-lab rigs. Earlier physics, compression, camera, touch gesture, repair, CPU, match and rematch regressions remain covered.

Browser coverage uses trusted Chromium CDP touch and Playwright native taps, with complete matches through rematch at 1024×768 and 1024×600. It also covers 1133×744, 1180×820, 1366×1024, 1024×520, 390×844 and desktop resize. Every shot type hits real rig bodies through a native pull and completes its effects at tablet and phone sizes. Current/next/skip, block/soldier tap placement, captured drag cancellation, construction assistance, pinch takeover, viewport cancellation, touch-only menus, all featured arenas and desktop/CPU operation are exercised. Contextual controls are checked for clipping and 44px minimum targets. No runtime external requests are required.

The silent [gameplay recording](verification/alpha3/alpha3-gameplay.webm) captures all five shots and a real support-break → weight → powder → spring chain. These are repeatable toy-lab rigs with deterministic aiming, operated through native touch. No impact, damage, deletion or explosion is injected after the shot. This demonstrates physical operation and presentation; it is not human playtesting.

The production build and both ZIPs are checked for CRC/checksum integrity. The extracted browser package starts its own static server, loads its assets without npm installation, and reaches artillery through native touch with the browser offline after initial loading. The complete package includes the built game, source, baseline experiment snapshot, tests, report, selected screenshots, video, notices and a preserved Alpha 2.2 browser ZIP for comparison or rollback. The source package excludes node_modules and Git internals.

## Limits, human playtests and next work

**Actual iPad hardware and iPad Safari were not verified.** The pinned WebKit engine was unavailable and its download was blocked by network policy with HTTP 403. The probe records not-run and is not counted as a pass. Desktop Chromium touch simulation cannot establish Safari behavior, actual iPad frame rate, thermal endurance, safe-area/browser-toolbar handling or shared-device ergonomics. Cloud CPU timings exclude rendering and are not an iPad performance claim.

The new PlushSiege ZIP exceeded the environment's 32 MiB file-transfer limit. The earlier supplied, already-extracted PlushSiege 0.5.0 reference remained available. Reviewed its impact/damage, queued reaction, constraint and debris approaches selectively. No campaign, asset set, single-player puzzle rules or full mechanism framework was imported.

Automated metrics support stronger displacement, coherent chains, survivor resilience and functional controls. They cannot establish enjoyment or that towers and bunkers have balanced win rates. The CPU uses heuristics, not deep construction planning. Soldier snapping is most forgiving on flat prefabricated floors; sharply angled rubble can require a more deliberate drag and needs particular attention in human usability testing. 1 of the final 36 machine matches reached the retained round ceiling, and some strong chains end a match early. Human strategies and timing may differ. Grand Siege remains experimental, and sustained heavy debris on real mobile hardware needs measurement. The live world is finite and bounded, but exact cross-browser replay identity is not guaranteed by Matter.js.

Recommended human session:

1. Two unfamiliar players on a landscape iPad: build, place soldiers upstairs, aim, repair, finish and rematch without coaching. Try full pulls from wide view, opponent view through a collapse, pinch during aiming, rotation while holding, Safari toolbar changes and background/resume.
2. Compare Alpha 2.2 and Alpha 3 ordinary shots in the same tower and bunker arrangements. Rate impact weight, intact movement, ability to follow the collapse, survivability and the desire to fire again.
3. Alternate low bunkers and distributed upper floors over ten paired matches. Watch whether either becomes automatic and whether weighted soldiers survive in understandable ways rather than feeling immune.
4. Compare Fire, Vortex, Piercer and Burst for visibly different useful outcomes. Ask players to predict what a shot at a rope beam, charged pad or powder crate will cause.
5. Record Chaos awards, unused special stock, repair skips and comeback outcomes. Check whether the reward message and refill are understood without a lesson, and whether a two-second skip feels fair.
6. Play several rematches with rubble accumulating. Measure actual iPad frame rate and total match time, including human building/repair time. Record camera misses and accidental inputs.

The most promising next improvements are driven by those results: tune soldier injury and field strength, refine spring placement and repair choices, improve CPU construction where it makes poor decisions, and investigate installable offline caching only after the physical game and actual Safari experience are validated. Extra weapons and larger content libraries should wait.
