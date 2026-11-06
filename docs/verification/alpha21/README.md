# Alpha 2.1 verification

`unit-tests.txt`: 49 passing Node checks. `browser-report.json`: 36 passing Chromium checks with trusted multi-touch, viewport/DPR measurements and explicit false flags for Safari/hardware verification. `pacing-audit.json`: nine natural machine matches with clearly stated presentation/Ready-time estimates. `webkit-report.json` and `safari-status.json`: unavailable WebKit and actual-device limitations, not passing tests. Screenshots are Chromium emulation, not actual iPads.

The full touch flow is exercised offline after loading. Result and clearance fixtures are identified in the browser script. Real iPad Safari acceptance is still open; use the checklist in the development report.
