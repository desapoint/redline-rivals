# Verification record

Verified October 1, 2026 with the bundled Node.js 24 runtime and the Codex in-app browser.

## Automated simulation and save checks

`node --test tests/game.test.mjs`: **20 passed, 0 failed**.

Coverage includes every factory car and race distance; F–S class coverage; power, tire and weather effects; drivetrain traction differences; clutch coupling and required clutch use; rev matching and money shifts; condition and boost; deterministic estimates; offline caps, repeated claims and clock rollback; corrupted saves, export-shaped round trips and validated imports; job reservations and career restrictions.

## Actual browser play-through

- Finished an automatic quarter-mile free race. Stock Kaze: 15.509 s ET, 0.120 s reaction, 145 km/h trap. Received $350, 3 reputation and 25 XP.
- Bought intake, ECU, tires and transmission upgrades. Power rose from 132 to 155 HP; estimated quarter-mile fell from 15.51 to approximately 14.56 s before gearing changes.
- Edited first gear to 3.5 and saved a tune preset. Reload verified the ratio, preset availability, upgrades, paint, bronze wheels and racing stripe.
- Launched before green: red light, no currency, reputation or XP reward.
- Launched manually on green with automatic transmission: 60 ft finished in 2.437 s, with reaction recorded separately.
- Won the F-class qualifier, open challenge and rival showdown. Unlocks changed after wins. Rival first win awarded a Metro RS, $2,700 and 40 reputation.
- Paused and resumed the countdown without restarting the race.
- Imported a generated offline-return fixture into the separate `127.0.0.1` origin. Twenty hours away credited the eight-hour $800 cap. Claimed the bank and $750 completed job; the reserved car returned. Shop expansion changed income to $180/hour and capacity to 12 hours / $2,160.
- Bought a Zenith Z for $32,000. Assigned it to a dyno job and verified race entry was disabled while reserved.
- Simulation preset and independent automatic launch selected correctly. A wet daytime Desert Airfield race rendered and shifting without the clutch reported “CLUTCH REQUIRED”. Leaving that unfinished race awarded no reward.
- Manual staging required a pre-stage action followed by staging. An assisted launch using the on-screen throttle completed a wet 60 ft race with 3.090 s ET and 0.625 s reaction; the slower reaction correctly produced a loss and the reduced $70 consolation reward.
- Tested garage and settings at 390 × 844. No horizontal overflow; navigation and settings remained accessible. Restored the normal viewport afterward.
- Browser console checks found no warnings or errors in the inspected test session.

Screenshots are in `tests/artifacts/`: `garage.jpg`, `mobile-garage.jpg`, `career-result.jpg`, and `clutch-gate.jpg`.

Browser testing found and fixed gear-field input commits, tune-preset persistence, factory tire/class calibration, and mobile settings access. Completed-job status now redraws only when its state changes.

## Repeatable browser runner

`tests/browser.mjs` provides an optional Playwright suite for an isolated headless context. Its syntax was checked; browser interactions during this implementation were performed directly through the Codex browser tools. Follow README instructions to install the optional dependency and run it.

The full 28-event campaign, prolonged real-time job durations, every keyboard/touch combination and audible sound quality have not been exhaustively play-tested. Physics and economy coverage is automated; browser verification covers the flows above.
