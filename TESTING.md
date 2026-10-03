# Verification record

## Real-car demo — October 3, 2026

Pass: 50 Node tests, four arch-profile tests, asset validation and Pages build. Browser checks cover all four real cars at 1440×900, 390×844 and 360×640, all at 2× DPR. The main browser suite verifies rewards, upgrades, tune/paint persistence, manual launch, career, offline income and jobs. Reviewed source snapshots retain their exact bytes across Windows and Linux.

## Test drive lab — October 1, 2026

- `node --test tests/*.test.mjs`: **38 passed, 0 failed**. The 10 added lab checks cover driving beyond a mile, idle/neutral revs and turbo decay, clutch coupling and gated shifts, dry/wet brake stops, pause/step, manual pre-staging and red lights, automatic/assisted launches, stationary driven-wheel burnouts, telemetry and CSV output with explicit units.
- Actual browser: clutch test stayed at 0 km/h with the pedal down and 100% throttle; releasing it moved the car. An attempted shift reported `CLUTCH REQUIRED`; a disengaged-clutch shift selected second. Pause left the gauge/timer/distance unchanged; one step advanced elapsed by 0.009 s after display rounding.
- Practice wet launch turned green, launched automatically with 0.125 s reaction, and continued through the quarter/half mile. Manual pre-stage stayed idle, the second stage started the tree, and launching immediately recorded a red light.
- The 80 km/h wet brake preset stopped at 0 km/h after 41.5 m and retained 80 km/h maximum speed. Export action reported 222 captured telemetry samples. Unit tests validate CSV content; the in-app download-event wait did not return a saved file path.
- Browser tuning rejected a second-gear ratio greater than first gear, accepted 2.2 after correction, and retained the edited input. A Vortex build using demo body/wheel/brake layers enabled component controls, disabled unsupported vector controls, and drove normally.
- Desktop and 390×844 mobile layouts were checked. Mobile content width matched viewport width; no horizontal overflow. The game's shared race HUD rendered all existing readings, Settings linked to the lab, and browser error/warning logs were empty.
- The lab does not import `saveState` or write local storage. Garage build loading uses a read-only copy. Production car manifest remains empty; art archives were preserved.

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
# Layered car setup — 2026-10-01

- 28 automated checks pass: the original 20 simulation/save checks plus native pivot scaling, geometry validation, facing/axle inference, component fallback, distance/slip wheel rotation, actual simulation rotation, legacy/component save compatibility, and atomic catalog retention after missing/corrupt images or dimension mismatch.
- Browser fixture: separate body, open-spoke wheels, calipers and rotors composed in SVG and Canvas. Silver wheels, offset-pivot gold calipers, blue repaint, lowering, and left-facing native geometry were inspected. At a 90° wheel setting the DOM confirmed rims/rotors rotated −90° while calipers stayed at 0°. No browser errors or warnings.
- In-game integration: temporarily bound the geometry fixture to the starter art ID, selected wheel/brake components and paint, reloaded to verify persistence, and completed a quarter-mile race (15.509 s ET, 145 km/h). Production manifest was restored to empty afterward; no unfinished real-car assets or specifications were imported.
- The preview canvas uses its displayed width and device pixel ratio for backing resolution. Desktop and 390×844 mobile previews were inspected; the mobile page had no horizontal overflow. Blue repaint matched between SVG and Canvas. The final manifest remains empty after the temporary in-game fixture check.

## Game interface — 2026-10-02

- All 38 simulation, save, driving-lab and sprite checks pass. The static Pages build includes the pinned Phaser runtime and MIT license.
- The complete optional browser runner passes: races/rewards, upgrades, gearing, appearance persistence, false start, manual launch, career unlocks, offline income, job collection and mobile navigation. Race assists now open in a dialog. The offline fixture is applied before app startup so the previous session's `beforeunload` save cannot overwrite it.
- `tests/interface-browser.mjs` verifies Phaser startup, viewport and detail bounds at 1440×900, 390×844 and 360×640, each car/part/event page, tuning subpanels, settings tabs, garage/build/shop/dyno dialogs, native dialog focus restoration and race controls.
- Actual 60-foot races produce animated two-lane receipts. Additional rendered cases verify one-mile splits with prize cars, false starts and DNFs on the short phone viewport, blank unavailable times, result focus containment, reduced motion and the SVG fallback when the engine request is blocked.
- Garage and timing-slip screenshots at all three sizes are in ignored `tests/artifacts/game-garage-*.png` and `tests/artifacts/game-slip-*.png`. These were visually inspected during development.

## Race speed presentation — 2026-10-02

- Replaced the old 4 px/metre track view with car-scaled chase framing, foreground/skyline parallax, speed trails, launch and shift camera responses, lane-gap feedback, rival edge indicators and visual finish coasting. Simulation timing, finish distance, saves and progression remain independent of presentation.
- All 42 automated checks pass, including four new checks for scale, camera/lane relationships, finish coasting without scoring mutations, and reduced-motion behavior.
- The race browser runner completes quarter-mile races at 1440×900, 390×844 and 360×640. It checks optional audio, staging controls entirely inside the track without internal scrolling, byte-identical paused canvas frames, frozen speed/ET and complete timing slips. Wet/desert continuous-lab rendering also passes.
- A local 120-frame timing probe recorded 90–116 FPS with no frame over 50 ms in the inspected runs. This is a local measurement, not a hardware-independent performance guarantee.
- A real Web Audio signal probe confirmed that air noise increases with speed, shifting reduces engine gain while leaving air noise present, the mixed signal is nonzero and below clipping, and stopping mutes output. Audible sound quality was not independently evaluated.
- Frozen race/staging screenshots are in `tests/artifacts/race-speed-*.png` and `tests/artifacts/race-stage-*.png`. Both desktop and phone captures were visually inspected.

## First playable real-car replacements — 2026-10-03

- Production manifest: two reviewed revision-9 packages, 18 independently decoded native-size WebP images. The Mazda3 replaces Kaze; the Silverado Custom replaces Metro. Source art, package QA and manufacturer research are preserved.
- `npm test`: 46 passing tests, including sourced-vs-modeled specs, one-time save migration, retained custom builds/jobs/records, native axle/component geometry, correct underlay order and stationary calipers with rotating wheels/rotors.
- `npm run test:real-cars`: both playable cars checked at 1440×900, 390×844 and 360×640, each at 2× DPR. Covers actual races/slips, both garage choices, full factory/model/source pagination, repaint persistence, six-/eight-speed tuning and no-scroll layouts.
- `npm run test:interface`: bounded game screens, detail dialogs, timing slips, keyboard focus and Phaser fallback pass with the new production starter.
- `npm run build`: validates two production cars and 18 image paths and prepares the static site. Browser loading verifies image dimensions against metadata.
- Visual evidence: `tests/artifacts/real-mazda-garage-*.png`, `real-kaze-race-*.png` and `real-metro-race-*.png`. Faint alpha dust is excluded from framing only; runtime artwork retains the native pixels.
- Scope: Kia and Rogue remain staged. Silverado unknown factory mass/redline/gearing/tire/aero values remain null in factory data, with explicit gameplay estimates shown separately. Exact OEM identity/paint pixels are inherited from the reviewed illustrated sources, not newly certified by integration tests.

## Four playable real vehicles — 2026-10-03

- Production manifest now contains four cars and 36 independently decoded lossless WebP layers. Forte GT replaces the stable `vortex` model; Rogue is added as `rogue`. Existing progress and customization migrate without resetting ownership, upgrades, jobs or records.
- All 48 automated tests pass. New checks verify the Forte's two final drives preserve overall gearing, legacy FWD saves migrate, Rogue CVT ratios change continuously while RPM follows its power target, no artificial shifts interrupt drive, and CVT rolling/burnout/pause telemetry stays finite.
- Native Forte revision-1 and Rogue revision-2 sprite packages pass hash-bound QA and visual review: rotations, fixed calipers, isolated complete rotors/tires, underlay coverage, four alpha backgrounds and contrasting repaint. Rogue revision 1 remains archived with a failed lamp paint-exclusion observation.
- Actual game checks cover all four vehicles at 1440×900, 390×844 and 360×640 with 2× DPR: garage selection, full Factory/Simulation/Sources pagination, tune/data panels, masked repaint persistence, moving races and animated named timing slips. Rogue shows D and disables fixed-gear shift controls. Forte and Rogue also pass actual rolling driving-lab checks.
- The interface, general browser and race-speed runners pass: career/rewards, upgrades and saves, bounded dialogs/screens, native focus, engine fallback, audio controls, exact pause freezing and quarter-mile finishes.
- Build validates 4 cars / 36 layer files. Native geometry and desktop/phone runtime screenshots were inspected. Evidence is under `tests/car-integration/20261003/` and ignored `tests/artifacts/real-*.png`.
- Simulation limits remain explicit: Rogue SV AWD is provisional; mass/redline/CVT range/final drive are modeled. Nissan D-Step logic is not reproduced. Forte runtime mass is within the sourced equipment-dependent range; redline/losses/aero/shift times/torque curves remain estimates.

## Wheel placement repair after user review — 2026-10-03

- Replaced metadata-only visual acceptance with measured body-opening inspection. Corrected Silverado, Rogue and Kia axle centers/radii in new source-preserving package revisions; body, paint and mechanical image pixels remain byte-identical. Shared road contact lines are explicit.
- New production sources: Silverado `arch-fit-v12` (retaining v11 wheel geometry), Rogue `wheel-fit-v3`, Forte `wheel-fit-v2`. Prior revisions remain archived. Fresh QA, rotations/backgrounds/repaint, native opening and common-ground overlays were visually inspected; reviewed ZIPs bind the corrected manifests.
- The 48 automated checks pass with corrected geometry. Assertions additionally require separate wheel/rotor/caliper file paths and common tire contact lines. SVG/Canvas rendering rotates wheels and rotors while keeping calipers fixed. QA caliper image hashes are identical across 0°, 45°, 90° and 180°.
- The asset/build check still validates 4 cars and 36 native layer files. Physics specifications, saved ownership and career state are independent of these artwork-placement corrections.

## Independent arch profiles — 2026-10-03

- Four Python shape/replay checks pass: flat crowns and rounded corners, straight sides, measured contours, invalid shape rejection, body-edge clipping, bounded lower cutoff and byte preservation of Silverado body/mechanical layers.
- Silverado `arch-fit-v12` changes the backing and arch metadata only. Source fenders remain untouched. Fresh full sprite QA and visual inspection cover four rotations, stationary calipers, isolated parts, wheels hidden, four backgrounds and contrasting repaint. A hash-bound accepted review and full reviewed ZIP accompany it.
