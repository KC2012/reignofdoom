# Alpha 2.1 — Mobile-First Arcade Recovery

This pass changes how Reign of Doom is operated and presented. The same material physics, layered bunkers, three soldiers, ammunition, construction resources, six-shot bombardments, repairs and victory rules remain. No new weapons, materials, troops, maps or progression were added.

## Implemented experience

**Shared-tablet first.** One tap on Two players starts the retained Skirmish configuration. Existing Siege/Grand settings and CPU mode remain under a compact Match settings disclosure. A slim colored turn bar identifies the army, player, activity, surviving soldiers and remaining build time or shot number. There is no decorative footer, full-size header, redundant army panel or angle/power dashboard. Both players keep the same upright interface without physically rotating the device. An opposite-seat automatic flip was deferred to avoid disorienting mandatory rotations.

**Direct construction.** The supply is one compact row with material silhouettes, names and stock counts. Drag from it or tap a piece then tap an open spot. Existing blocks and soldiers have forgiving selection; a tap selects without immediately removing a support. Movement starts after a small drag threshold. Rotate is visible in the contextual construction tray. Cancel restores a held block. Soldier previews still require actual clear floors; initial moves remain free and repairs retain the one-move limit. Safe-fragment clearance and its three-removal quota remain intact.

**Deliberate artillery.** The visible PULL ring is the only touch origin that arms a shot. Pull away from the enemy and down, then release. Dragging elsewhere pans. Tiny taps, wrong-way pulls, pointer cancellation, lost capture, leaving the play area, viewport changes and two-finger takeover do not launch. A second finger permanently cancels the pending one-finger action until the gesture has ended. Human aiming no longer expires into an automatic shot. Ammunition buttons remain, and desktop arrows/Space provide precision without a slider panel.

**Camera and presentation.** Close fort framing uses the viewport aspect ratio and physical structure bounds. Every phase has two-finger pan/pinch, explicit My fort/Ballista/Follow shot, Opponent, Both forts and zoom controls. Mouse wheel and Shift/middle dragging remain. Aiming includes a live opponent inset. Flight follows the projectile; impact frames the affected fort, including unstable towers and debris near it. Distant incidental fragments do not force the entire battlefield into a tiny view. Construction/handoff framing is immediately usable; manual navigation persists within a phase until an explicit return or the next activity.

**Brisk playback with readable destruction.** Travel uses 2.4× presentation speed through the same fixed simulation steps. The first impact interval is 1×, later settling is 1.4×, with a minimum 0.95-second impact reading window. The old long-flight fallback cannot resolve while meaningful falling, rotation, fracture or crushing is active. This does not weaken damage, erase debris or force an earlier match result. Build/repair clocks, special-ammo resources and existing round ceilings are unchanged. Ready and Again! keep voluntary transitions short.

**Touch lifecycle and responsive layout.** Pointer IDs/capture are arbitrated in `gestures.js`; pinch takeover, cancellation and release ordering have dedicated regressions. Safe-area padding, dynamic viewport height, ResizeObserver/visual viewport changes, capped DPR backing size, contained scrolling and canvas touch-action are handled explicitly. A resize cancels an armed input. Title/settings content can scroll internally on short displays. All normal play and proving-ground actions have touch buttons. Menu pauses, sound unlocks from user interaction, and focus loss pauses safely. Reduced-motion preferences suppress shake and transitions. Unknown audio events no longer allocate unused connected audio nodes.

## Measured screen space

These are CSS viewport measurements in Chromium, not photographs or measurements from physical iPads. DPR 3 is capped to a 2× canvas backing store for rendering cost.

| Emulated viewport | Gameplay canvas / screen height | Device pixel ratio |
| --- | ---: | ---: |
| 1024x768 | 83.6% | 2 |
| 1024x600 | 80.3% | 2 |
| 1133x744 | 83.1% | 2 |
| 1180x820 | 84.6% | 2 |
| 1366x1024 | 87.7% | 2 |
| 1024x520 | 77.3% | 2 |
| 390x844 | 85.5% | 3 |
| desktop-resize | 80.3% | 1 |

The primary 1024×768 and 1024×600 layouts devote roughly 80–84% of height to the battlefield. The large Pro-sized viewport uses more than 85% rather than reserving unused space.

## Verification results and limits

- **49 Node tests passed**, with no skipped, cancelled or expected-failure cases. Existing physical/rule regressions remain, with new pointer arbitration, idle aiming, viewport framing and active-collapse resolution checks.
- **36 Chromium browser checks passed.** Full touch flows at 1024×768 and 1024×600 cover menus, both players' construction, moving/rotating blocks, cancelling captured drags, soldier floors, pinch/pan, explicit camera return, sound/help/resume, protected slingshot input, viewport-change cancellation, special ammunition, all six firing turns, repair placement/relocation/clearance, result and rematch. Additional viewports and desktop keyboard/CPU operation are covered. The proving ground's phase/load tools also work from touch menus.
- The primary touch flows run **offline after loading**, and the browser recorded zero page errors and zero external runtime requests. Reloading or restoring an evicted browser tab still needs the static server; no service worker/PWA installation was added.
- Browser result-screen checks use an explicitly identified soldier-elimination fixture. Safe-clearance checks create a real fragment that settles under the normal physics before touching Clear. Natural full matches are tested separately; fixtures are not claimed as natural victories.
- **Nine natural machine matches completed** across Skirmish, Siege and Grand. The fixed-step rules are exercised through complete bombardment/repair cycles, not replaced by UI fixtures.
- **WebKit was not verified.** `npx playwright install webkit` was attempted with Playwright 1.57.0 / WebKit build 2227. The configured network policy returned HTTP 403 “Domain forbidden” for the official `cdn.playwright.dev` and `playwright.download.prss.microsoft.com` downloads. TLS verification remained enabled. `npm run test:webkit` records not-run and exits 2 rather than reporting a pass. The optional probe can run when that engine is available; it distinguishes native taps from synthetic pointer drags.
- **Actual iPad Safari and physical iPad hardware were not tested.** No device was available in this execution environment. Chromium tablet/touch emulation is not sufficient evidence of Safari compatibility. Real touch latency, Safari browser chrome/safe-area behavior, thermal/frame performance, audio interruption and physical orientation behavior remain unverified. This acceptance requirement remains open.

## Pacing findings

The three-to-six-minute target was pursued through interaction and playback speed, not a new duration cap or reduced physical depth. The following estimates replay actual machine match trajectories with the presentation speeds above. They **assume 20 seconds per player for initial construction and 8 seconds per player per repair**. Those are stated Ready-button assumptions, not observed human times. They do not include pauses or players spending extra time aiming.

| Scale | Seed | Shots | Bombardments | Estimated total minutes with those Ready times |
| --- | ---: | ---: | ---: | ---: |
| Skirmish | 17 | 48 | 8 | 4.80 |
| Skirmish | 71 | 48 | 8 | 4.74 |
| Skirmish | 1042 | 48 | 8 | 4.91 |
| Siege | 17 | 48 | 8 | 4.90 |
| Siege | 71 | 48 | 8 | 4.96 |
| Siege | 1042 | 48 | 8 | 4.96 |
| Grand | 17 | 34 | 6 | 4.00 |
| Grand | 71 | 60 | 10 | 6.30 |
| Grand | 1042 | 60 | 10 | 6.21 |

Default Skirmish runs estimate roughly 4.7–5.0 minutes under those assumptions. Letting all construction/repair clocks expire or spending longer on aiming increases duration. The bot duels still often reach the retained round ceiling; this pass does not claim to have solved Alpha 2's strategic balance target or proven fun. Human shared-device matches must establish actual duration and whether each shot/repair feels worthwhile.

## Actual-iPad acceptance checklist

1. Load the built game in Safari on an iPad over the same Wi-Fi/static host. Test landscape on a standard iPad and a shorter-height layout with visible browser chrome. After initial load, disconnect networking and play while the tab remains loaded.
2. Give two new players the tablet without opening instructions. Confirm that Two players, Ready, turn ownership and Again! are understood immediately.
3. Drag every piece type, select/rotate a block, move a soldier onto a platform, reject a midair soldier, pinch while holding a piece, cancel a drag and resume after changing orientation. Check for scroll/bounce, magnification or lost capture.
4. Pull from both ballista rings, pinch halfway through aiming, release fingers in either order, pan around and return. Confirm that only a deliberate valid pull releases ammunition.
5. Watch an entire tall collapse and inspect both forts. Check that menus, toast messages, target preview and controls do not cover the important action.
6. Complete six alternating shots, repair with the touch tray, relocate one soldier, clear a fragment, finish naturally and rematch. Record actual minutes, accidental actions, aiming/repair hesitation and requests to play again.
7. Test sound after locking/unlocking the device, backgrounding Safari and reopening the tab. Profile on a less powerful iPad, not only an emulator or desktop WebKit.

## Delivery and next improvements

Both ZIPs include a built game runnable with `node scripts/serve.mjs`; the complete ZIP includes source, tests and evidence. `HOST=0.0.0.0` makes the static server reachable on the same Wi-Fi and prints tablet URLs. The default remains computer-local. This report describes the validated release artifacts prepared before the owner-authorized GitHub push; GitHub publication does not establish Safari or physical iPad verification.

Next work should be driven by physical iPad Safari testing: correct any native capture/scroll/audio issues, refine pull sensitivity from first-time players' shots, check comfortable repair pacing, and profile real-device rendering. Existing siege balance and more varied CPU designs remain later tuning opportunities; no new content was added here. The prior Alpha 2 report is retained in `alpha2-report.md` and earlier evidence remains historical.
