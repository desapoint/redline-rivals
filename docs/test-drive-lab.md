# Test drive lab

Open `http://localhost:5173/test-drive.html` with the development server running. The page is also included in the GitHub Pages build. The game's Settings page and car asset gallery link to it.

The lab uses the game's vehicle builder, 120 Hz physics, shifts, engine audio, car layers, scenery and digital drag HUD. It adds analog speed/RPM/boost gauges, a brake input and tools for continuous tests. There is one car, no opponent or finish limit, and no race payout. It never writes the garage save. Loading the selected garage build copies it into the test session; all cars and upgrade stages are available for testing regardless of career locks.

## Drive and inspect

- **Start driving** begins a continuous session. Supply throttle with W/↑, the touch/mouse pedal, a slider, or **Latch full throttle**. Automatic transmission manages shifts; throttle remains an independent input in the lab.
- **C** holds the clutch pedal down. Manual + clutch requires disengagement to shift. The slider and **Hold clutch down** make exact coupling and shift tests repeatable.
- **S/↓** applies the bench brake. Q/← and E/→ shift, N selects neutral, R blips the throttle, and Space launches. Inputs from multiple pointers can be held together. Releasing or cancelling a pointer clears that pedal. Keyboard driving is suspended while editing form inputs.
- **Pause** freezes physics, timers and wheel angles and releases latched pedals. **Step** advances exactly one 1/120-second tick while paused; inputs can be set with sliders or latches first. Simulation speed ranges from 0.25× to 2×. Hiding the tab or losing window focus pauses the session.
- **Reset session** creates a fresh vehicle from the current build, resets phase and timing, and clears traces and the event log. **Restore factory build** resets car parts/tuning; it does not edit saved progress.

## Practice launches

Stage the car to start the amber sequence and green light. Manual pre-staging uses two clicks. Starting the tree after a drive returns the car to the line. Manual launch waits for Space, assisted launch waits for throttle after green, and automatic launch responds about 0.12 seconds after green. The throttle is still supplied separately. Launching early records a red light; reset or start continuous driving to try again. Reaction is reported separately from elapsed time. Splits are recorded at 60 ft, ⅛, ¼, ½ and 1 mile, with driving continuing afterward.

**Burnout** is a stationary preparation test. Hold throttle to spin the driven wheels and heat the tires; calipers stay fixed. The wheel rotation uses engine speed and first-gear gearing. This is a bench extension rather than the race's instant warm-tire action.

Quick tests set up free revving, automatic acceleration, a disengaged clutch, an 80 km/h brake stop, a wet launch with traction assistance off, or an 80 km/h rolling start. **Apply speed** seeds the chosen speed and a suitable gear for a rolling test.

## Configure the car

Choose any existing model or copy the selected garage build. Test all performance part stages, condition, pressure, differential, boost, launch/shift RPM, final drive and individual ratios. Validated build changes restart the session so metrics don't mix different builds. Gear ratios must decrease from first gear to the last.

The art menu uses the loaded production pack plus the isolated layered geometry fixture. Art changes affect rendering, not the vehicle's researched or modeled specifications. Test independent wheel/brake parts, paint masks and ride height. Vector artwork also supports rim color, finishes, stripe, spoiler and tint. Unsupported controls are disabled for layered art. The game roster and production manifest are unchanged by test selections.

## Telemetry

Digital readings and analog needles share the same live state. Inspect speed, RPM, gear, boost, torque/power, throttle/clutch/brake position, acceleration, distance, reaction, tire temperature/wear, shift interruption and engine stress. Shift suggestions use the same torque crossover calculation as the game.

The plot shows the last 60 simulated seconds with separate scales for speed, RPM, boost and slip. Capture is 10 Hz with a bounded 6,000-sample buffer. CSV exports use explicit unit-bearing column names and blank unknown values. Input and feedback logs retain the latest 100 entries. Clearing traces removes recorded samples/log entries while the vehicle continues.

The lab's brake model is a generic 0.9 g dry grip-limited stop, reduced by surface and wet conditions. It is not measured vehicle-specific brake performance, does not implement ABS or brake fade, and does not add a brake upgrade to the drag career. Physics limitations of the base game's engine, tire and clutch model still apply.

Run `npm test` for simulation, launch, braking, pause/step, layer, save and CSV checks. Run `npm run build` to include the lab and local assets in the static site.
