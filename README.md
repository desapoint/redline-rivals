# REDLINE — Drag Club

A playable, single-player 2D drag racing game for the browser. No build step, accounts, or runtime npm dependencies.

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

Start with a Kaze S13 and $4,500. Hit the strip for a free race, or enter Career. Stage the car and watch the lights. Easy difficulty starts with automatic launch and transmission.

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

- 10 fictional vehicles covering F, E, D, C, B, A and S performance classes.
- 28 career events: qualifications, open races, restrictions and seven named rivals. Win a qualification and open challenge to face each rival. Rival wins unlock the next class and award prize cars on first completion.
- Free races at 60 ft, ⅛, ¼, ½ and 1 mile; three surfaces, day/night, dry/wet, selected or matched opponents.
- Five difficulty presets and independently configurable launch, transmission, traction, rev matching, staging, shift hints and mechanical damage.
- Engine torque interpolation, derived power, individual gear ratios, torque interruption, clutch coupling, turbo spool, tire slip, driven-wheel load and weight transfer, aerodynamic drag and rolling resistance. AI uses this same simulation.
- Ten upgrade families, increasing purchase costs, reputation gates, tradeoffs, condition and servicing.
- Live stock/current dyno graphs; adjustable launch RPM, shift target, tire pressure, differential, boost and final drive. Individual ratios unlock with a transmission upgrade. Tune presets persist with each car.
- Paint, finishes, wheels, stripe, spoiler, window tint and ride height rendered as layered vector car artwork.
- Garage business: six levels, capped offline earnings and three customer jobs that temporarily reserve assigned cars.
- Automatic local saving, validated save import, downloadable export and explicit reset confirmation.
- Responsive layouts, touch pedals, optional engine audio and automatic pausing when the tab is hidden.

## Data and simulation limits

Cars and dyno curves are fictional gameplay models, not licensed vehicles or measured dyno curves. Factory reference data is kept separately and shown in Technical data:

- Hikari Roadster: [2016 Mazda MX-5 manufacturer press kit](https://news.mazdausa.com/download/2016_Mazda_MX-5_Press_Kit.pdf), 155 HP, approximately 201 Nm, approximately 1,058 kg.
- Stallion 5.0: [2024 Mustang GT manufacturer power announcement](https://media.ford.com/content/fordmedia/fna/mx/es/news/2022/12/16/iho-ho-ho--el-nuevo-mustang-dark-horse-ofrece-500-caballos-de-fu.html), 480 HP.

Other parameters are gameplay estimates. Performance points are calibrated from simulated quarter-mile time, so they reflect grip, mass, power curves and gearing together. The simulation uses a fixed 120 Hz step. Race estimates use dry Harbor Run, automatic optimized shifts and medium traction assistance.

Income accrues from wall-clock timestamps with a bank cap. Because saves are local, this is not a tamper-proof competitive economy. Saves belong to the browser and origin; export before clearing site data or moving browsers. Google Fonts is an optional online enhancement; system fonts are available as fallbacks.

The referenced conversation was returned truncated at 20,000 characters, ending during section 38 (Garage Upgrades). This implementation follows the accessible design and original requirements. Eventual engine swaps, the full catalog of individual body panels and later racing modes are extension points.

## Verify

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
- `src/views.js`: garage, tuning, career, business and race interface.
- `src/app.js`: input, race state machine, progression and persistence.
- `src/audio.js`: synthesized engine audio.
- `server.mjs`: small local static server.
