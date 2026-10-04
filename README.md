# REDLINE — Drag Club

A playable, single-player 2D drag racing game for the browser. No build step, accounts, or runtime npm dependencies.

The game uses a viewport-sized interface with a Phaser-powered garage, HUD, bottom game menu, paged collections and native detail dialogs. Race results print as animated two-lane timing slips. See [the interface and engine research](docs/web-game-interface.md) for the library comparison, included Phaser license and verification coverage.

## Run

Use Node.js 18 or newer:

```sh
npm start
```

Open **http://localhost:5173**. `PORT=…` can select another port. The server binds to your computer only. Use an HTTP server; loading `index.html` directly from disk will not load the ES modules.

## GitHub Pages

The published game is available at **https://desapoint.github.io/redline-rivals/**.

With the repository's Pages source set to **GitHub Actions**, pushes to `main` run the simulation/save tests, prepare the browser files in `dist/`, and deploy with the official Pages actions. The workflow can also be started manually from the Actions tab. No npm installation or application server is needed for hosting.

Run `npm run build` to prepare the static site locally. Relative asset and module paths support the `/redline-rivals/` project path. Browser saves on the published site are separate from your localhost saves; use Export / Import to transfer progress.

## Play

Start with a 2021 Mazda3 GT Turbo and $4,500. Hit the strip for a free race, or enter Career. Stage the car and watch the lights. Easy difficulty starts with automatic launch and transmission.

- **W / ↑**: hold throttle
- **Space**: launch / engage first gear
- **E / →**: shift up
- **Q / ←**: shift down
- **C**: hold the clutch pedal to disengage it; release to transmit torque
- **R**: throttle blip for a manual downshift
- **Esc**: pause / resume

Mouse and touch controls are on the race screen. Launch control and transmission are independent. Manual sequential keeps the throttle open after launch. Manual + clutch requires throttle input and clutch use. Automatic mode handles shifts, throttle and launch. Manual launch engages first gear with Space after green. Assisted launch starts when throttle is held after green. Space before green is a false start.

The winning lane is determined by **reaction + elapsed time**. Personal bests and timing slips report elapsed time separately. Burnouts warm tires. Wet tracks reduce traction. Watch the slip percentage, RPM bar and optimal shift marker.

## Included

- Twelve real-car demo vehicles: Mazda3 GT Turbo, Silverado Custom, Forte GT, Rogue, Golf GTI, Boss 302, GR Corolla, Mustang Dark Horse, Z NISMO, Integra Type S, WRX TR and CT5-V Blackwing. All are available in the garage, dealership, free races and driving lab; career rivals and prizes use the original four.
- 28 career events: qualifications, open races, restrictions and seven named rivals. Win a qualification and open challenge to face each rival. Rival wins unlock the next class and award prize cars on first completion.
- Free races at 60 ft, ⅛, ¼, ½ and 1 mile; three surfaces, day/night, dry/wet, selected or matched opponents.
- Five difficulty presets and independently configurable launch, transmission, traction, rev matching, staging, shift hints and mechanical damage.
- Engine torque interpolation, derived power, individual gear ratios, torque interruption, clutch coupling, turbo spool, tire slip, driven-wheel load and weight transfer, aerodynamic drag and rolling resistance. AI uses this same simulation.
- Ten upgrade families, increasing purchase costs, reputation gates, tradeoffs, condition and servicing.
- Live stock/current dyno graphs; adjustable launch RPM, shift target, tire pressure, differential, boost and final drive. Individual ratios unlock with a transmission upgrade. Tune presets persist with each car.
- Separate flat paint, grayscale shading, fixed fixtures and panel line art for all twelve real vehicles, with native fender contours, measured wheel positions, rotating wheels/rotors, stationary calipers and ride height. The Mazda retains its source reflection contours; the other cars use simplified cel shading. See [the paint-layer contract](docs/art/flat-paint-layers.md).
- Garage business: six levels, capped offline earnings and three customer jobs that temporarily reserve assigned cars.
- Automatic local saving, validated save import, downloadable export and explicit reset confirmation. Older fictional-car saves migrate to real vehicles while retaining owned UIDs, upgrades, paint, records and career progress.
- Responsive layouts, touch pedals, optional engine audio and automatic pausing when the tab is hidden.

## Data and simulation limits

All twelve real vehicles separate sourced factory ratings from estimated torque curves and playable assumptions. Unknown factory measurements stay null. **Factory specs & sources** dialogs show both datasets without scrolling. The Forte's seven-speed DCT preserves both factory final drives through equivalent overall gearing. The Rogue uses continuous CVT gearing with a modeled RPM target and ratio range; factory CVT ratios remain unknown. Its SV AWD configuration is provisional. Shift buttons and fixed-gear transmission upgrades are unavailable on the CVT. The eight additions use modeled gearing, masses and losses where no factory value was verified. The Boss 302's historical SAE gross power rating is explicitly labeled and is not directly comparable to modern net ratings.

Vehicle artwork is supplied illustration, with complete tires, rims, rotors and calipers repaired using deterministic scripts. Reconstructed mechanical details are visual approximations, not OEM CAD. The Boss uses rear drum/backing hardware, and the WRX illustration includes an accessory spoiler. Original sources, rejected revisions and reviewed packages remain in the local art workspace; compact hashes, native geometry, source-manifest and review snapshots ship with the game.

Other parameters are gameplay estimates. Performance points are calibrated from simulated quarter-mile time, so they reflect grip, mass, power curves and gearing together. The simulation uses a fixed 120 Hz step. Race estimates use dry Harbor Run, automatic optimized shifts and medium traction assistance.

Income accrues from wall-clock timestamps with a bank cap. Because saves are local, this is not a tamper-proof competitive economy. Saves belong to the browser and origin; export before clearing site data or moving browsers. Google Fonts is an optional online enhancement; system fonts are available as fallbacks.

The referenced conversation was returned truncated at 20,000 characters, ending during section 38 (Garage Upgrades). This implementation follows the accessible design and original requirements. Eventual engine swaps, the full catalog of individual body panels and later racing modes are extension points.

## Verify

The **[Sprite Studio](http://localhost:5173/sprite-workbench.html)** creates and edits layered car art with brush/eraser, magnetic lasso, connected color selection, part extraction, wheel hubs/pivots, rotor/caliper previews and metadata export. It loads the realistic source examples and current game layers, preserves original images and saves editable projects. See [studio controls and the sprite-skill audit](docs/sprite-studio.md).

The **[Test Drive Lab](http://localhost:5173/test-drive.html)** provides continuous driving, the shared drag HUD plus analog gauges, keyboard/touch pedals, manual/automatic shifting, neutral/rev blips, a practice launch tree, burnouts, braking, rolling starts, tuning, layered artwork, telemetry plots and CSV export. It reads garage builds without saving test changes. See [lab controls and behavior](docs/test-drive-lab.md). The page is bundled for Pages and linked from Settings and the asset gallery.

All twelve reviewed real-car packages are playable in the garage, races, dealership and test-drive lab. Open **http://localhost:5173/asset-preview.html** to inspect each body layer independently, arbitrary paint colors, geometry and rotation. See [the integration contract](docs/car-layer-integration.md) for source provenance, native pivots and save compatibility. Factory specs and explicit simulation assumptions are available in paged **Factory specs & sources** dialogs.

`npm run check:assets` validates production metadata and image file availability. The Pages build runs the same validation and includes registered runtime assets and the preview page.

```sh
npm test
```

Tests exercise all vehicles and distances, traction and tire effects, upgrades, clutch and rev matching, condition, income caps and rollback, save validation/persistence, job reservations, and career restrictions. Browser play-through checks are recorded in `TESTING.md`.

For repeatable browser automation, install the optional dev dependency and keep the server running:

```sh
npm install --no-save playwright
npm run test:browser
```

The browser test launches an isolated headless Chrome/Edge context; it does not change your normal browser's save. If Chrome is not installed, set `REDLINE_BROWSER_CHANNEL=msedge` or install Playwright Chromium with `npx playwright install chromium` and set `REDLINE_BROWSER_CHANNEL=chromium`.

## Structure

- `src/data.js`: cars, parts, tracks, career, jobs and difficulty definitions.
- `src/physics.js`: shared driver/AI simulation and performance estimation.
- `src/storage.js`: save validation and offline economy.
- `src/graphics.js`: car layers and track rendering.
- `src/car-assets.js`, `src/sprite-geometry.js`, `src/sprite-renderer.js`: validated layered assets, native attachment transforms, cached SVG/Canvas compositing and component swaps.
- `asset-preview.html`: isolated artwork preview with the shared renderer.
- `src/views.js`: garage, tuning, career, business and race interface.
- `src/app.js`: input, race state machine, progression and persistence.
- `src/audio.js`: synthesized engine audio.
- `server.mjs`: small local static server.
