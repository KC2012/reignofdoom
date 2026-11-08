# Alpha 3 working plan

Baseline: Alpha 2.2 commit 9d4568b, preserved as `preserve/alpha-2.2-9d4568b`. Uploaded Reign of Doom source matches this checkout. Development stays on `development/alpha3-chaos`; no remote publication is part of this assignment.

1. Compare repeatable tower/bunker impacts under baseline, larger-projectile, exaggerated-momentum and hybrid physics. Record displacement, intact pieces, collapse, soldier survival and step cost before selecting tuning.
2. Integrate the selected physical toy: substantial intact movement, bounded fracture, readable soldier injuries and continued crushing. Improve launch tension, shot identity, impact timing and explicit camera control.
3. Build a small coherent projectile library: unlimited Wrecker, existing focused Piercer and Burst, plus persistent Fire and a displacement-focused Vortex. Give effects bounded lifetimes and common collision/material/reactive-object hooks.
4. Introduce a small destruction-reward meter with per-target credit, diminishing per-shot rewards, stock caps and an equal repair refill. Preserve multiple ways back into a match and avoid debris farming.
5. Improve contextual construction, large structural assemblies, soldier placement and fair sequential repair decisions. Integrate one understandable spring mechanism with existing powder and hanging arenas if tests support it.
6. Run physics, reward, persistent-effect, gesture, CPU, complete-match, touch browser and rubble regressions. Inspect screenshots/recordings, refine observed failures, create working checkpoints and package built game plus source.

Quality gate: cohesive playable mechanics, no missing essential touch actions, physical causal chains, no random shot deviation or spontaneous environment damage, honest hardware/playtest limitations. Automated results can support physical behavior and usability; enjoyment remains a human playtest hypothesis.

## Completed checkpoints

- 2163ba6: integrated toy physics, five shots, rewards, constructor assistance, test rigs and first regressions.
- a412597: final integration: static-mechanism settling and live-fragment budgeting fixed; physically supported hanging beams, charged-load springs, causal chain recording, useful CPU shot choices and camera persistence verified.
- Delivery: all 83 Node tests, 47 browser checks, 36 natural matches, four rubble/effect workloads, 16 comparison runs, native-touch gameplay recording and extracted-package validation. Human fun, competitive equilibrium and actual iPad Safari remain unverified.

The final local commit contains the report, source and runnable packages. No stage was used as a permission checkpoint; no remote publication was performed.
