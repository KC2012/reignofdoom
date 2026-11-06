# Alpha 1 development report

## What was built

Reign of Doom is a new standalone game. The supplied PlushSiege project was inspected for physics and damage architecture; its contact-space impact function informed `src/impact.js`. No campaign, UI, rendering framework, artwork or audio assets from that application were carried over. Matter.js is the sole runtime dependency; Vite bundles it into static output.

The full playable cycle supports timed initial construction, alternating artillery, short randomized repair drops, surviving wreckage, soldier elimination, a finite siege limit, result and rematch. A deterministic seed drives CPU variation, aim error and repair supplies. Three mirrored ground layouts supply flat ground, a center ridge or intervening steps. Terrain layouts are authored, not procedurally generated.

Construction supports click placement and tray dragging, quarter-turn rotation, repositioning existing blocks, cancellation, shape-accurate previews, bounds checking, overlap rejection and edge snapping. CPU uses the same stock and placement validation. Its starter designs use seeded variations of front armor and rear fortifications; repairs seek supported flank positions. Difficulty changes target error, not body health or damage.

The visual design uses a dark survey-grid battlefield, angular silhouettes, restrained timber/stone/steel/cork textures, two army accent colors, tiny geometric soldiers, live-transform debris, trajectory dots and bounded particles. The ballista tracks the shot angle and recoils. Web Audio synthesizes placement, release, impact, fracture, blast, defeat and victory sounds. There are no remote fonts, assets, analytics or runtime service calls.

## Decisions and refinements

- **Repair after each two-shot exchange, not after four shots.** Accurate automated duels were ending before repairs mattered. Fifteen-second repairs now arrive after each player has fired once. The opener alternates by round. Specials replenish on alternating repairs so unlimited bolts retain a role.
- **Three independent starter bays.** A single broad roof made one support failure threaten all soldiers. Separate short roof pieces permit localized breaches and more interesting surviving structures. Nothing is welded or protected by scripted structural immunity.
- **Physical fracture, not disappearing walls.** A failed large piece splits into two solid fragments after a short delay, preserving mass and inherited translational/angular velocity. Smaller pieces stay cracked. One fracture generation and a 60-fragment production limit contain growth; soldiers and support debris are not swept away to meet a cosmetic budget.
- **Contact energy, not arbitrary hit checks.** Damage uses closing velocity along the contact normal, reduced mass and angular motion. Tangential sliding does not fracture blocks. Material density, grip, restitution and resistance all differ. Pinned soldiers can take a descending load's impulse and sustained compression.
- **Settled compression needs geometry checks.** Testing found that Matter's sleeping pairs no longer emitted active contacts, leaving a soldier alive under steel. Current collision geometry and brief contact-flicker tolerance now maintain compression while the load rests. Turn resolution also waits for ongoing crushing; elimination between volleys cannot leave an empty army taking a turn.
- **Readable artillery over realism.** Pull/release, sliders and a full free-flight prediction make the wide field approachable. Touch pull sensitivity is normalized for narrow screens. Ballista placement is fixed; moving it added little to this first ruleset.
- **Timing and cleanup favor a fast match.** Fixed 60 Hz simulation, bounded render catch-up, sleeping bodies, bounded damage history and capped effects. Shots wait for quiet motion or finish at a 12-second pacing ceiling; structural bodies keep simulating afterwards. Only spent ammunition is removed between turns. Relevant subsequent elimination is still detected.

## Validation

The final validation commands and retained reports are listed in `verification/README.md`. The Node suite contains 24 actual rule/physics/match tests with no skipped or expected-failure cases. The production Chromium suite contains 14 checks and uses real DOM controls and pointer/touch gestures. Its victory fixture deliberately removes soldiers through the damage API; complete natural duels are validated separately by the match audit.

Automated checks cover shelter stability, waking unsupported sleeping roofs, falling-stone kills, settled crushing, fracture mass conservation, material response, blast impulse, fragment budgets, asymmetric placement bounds, inventory enforcement, turns, repairs, pause, CPU construction/firing, deterministic outcomes and clean rematches. Browser checks cover real drag/rotate/place, invalid overlap, firing and impacts, repair supply, result/rematch UI, manual/pause lifecycle, proving-ground fixtures, mobile touch and absence of page errors/external requests.

The final seeded duel audit completed all 12 matches across three terrain layouts and four seeds. All reached round 2, with 3–4 fired shots and a peak of 52 dynamic entities. This is a deliberately accurate machine duel, not a measurement of human match duration, fairness or fun. CPU fortifications were separately left armed and idle for six seconds in three seeds without spontaneous soldier loss.

## Remaining limits and next improvements

- Human playtesting is still needed for aiming satisfaction, the 45-second/15-second timers, how well silhouettes teach material properties, and whether repeated accurate hits end matches too quickly. Automated agents are more accurate than new players.
- CPU uses a small family of flank designs and a ballistic formula. It does not learn from misses or simulate candidate shots. More deliberately varied layouts and debris-aware targeting are the most promising CPU work.
- Burst damage has radial falloff but no wall occlusion. Test whether timber and cork screens should shield explosions before adding ammunition types.
- Fractures halve the long axis; compound elbows become rectangular fragments. This conserves mass but simplifies their broken geometry. Fragment-budget saturation leaves a cracked body instead of deleting it.
- Very thin contacts can jitter before sleeping. Near-zero placement tolerance and short contact-flicker grace help; a larger stability/performance sweep would be useful for elaborate human castles.
- Narrow portrait touch play works, but distant soldiers are small in overview. Landscape desktop/tablet remains the preferred playtest format. Keyboard can aim/fire, rotate, pause and switch view; placement still needs a pointer.
- No saved matches, online play, progression, music, procedural terrain, freely movable ballistae, or browser-engine compatibility claim beyond the tested Chromium build. Those are intentional scope limits for this alpha.

The next session should observe two first-time players building and firing without explanation, record their first three matches, and tune construction assistance and repair timing before adding content.
