# Game interface and engine choice

Updated October 2, 2026.

The main game now occupies the viewport. The garage is a Phaser scene with an industrial bay, shared car artwork, an arrival tween and ambient dust. The HUD and menus remain semantic HTML layered over the scene so buttons, forms, keyboard focus and touch controls remain usable. Career events, cars, upgrades and customer jobs use explicit pages rather than scrolling. Extra garage details, the dyno, car service, race assists and shop management open in native dialogs. Settings and narrow-screen tuning use bounded tab panels.

Race results feed from an animated printer as a paper timing slip. The two lanes report reaction, recorded splits, elapsed time, finish trap speed and ET plus reaction. Unreached splits and invalid player finish times show a dash. Rewards and prize cars are included. Reduced-motion preferences disable presentation animations.

## Library research

| Library | Relevant capabilities | Fit here |
| --- | --- | --- |
| [Phaser](https://phaser.io/why-phaser) | 2D scenes, asset loading, cameras, tweens, input, audio and WebGL/Canvas rendering; custom physics can be retained | Selected: provides a path from the garage scene to richer race presentation without replacing the existing drivetrain simulation |
| [PixiJS](https://pixijs.com/8.x/guides/getting-started/intro) | 2D rendering, WebGL/WebGPU, SVG drawing, filters, textures and pointer interaction | Good rendering alternative, but scene/game lifecycle would require additional project code |
| [KAPLAY](https://kaplayjs.com/) | JavaScript/TypeScript web game library with component-oriented game creation | An alternative for a fresh arcade game; this project already has its own physics and progression |

An engine alone does not fix a website-like interface. The visible changes come from scene composition, fixed screens, compact HUD overlays, game navigation, dialogs and the timing-slip presentation.

## Runtime and boundaries

- Phaser **3.90.0** is pinned and vendored in `src/vendor/phaser-3.90.0.min.js`, from [the versioned npm distribution](https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js). Its [MIT license](https://cdn.jsdelivr.net/npm/phaser@3.90.0/LICENSE.md) is included alongside it. This is an intentional pinned integration, not a claim about the latest release.
- The engine loads from the local project when the garage is visited. No runtime CDN or npm installation is required. The static Pages build copies the entire `src` directory, including the engine and license.
- `src/garage-scene.js` owns the engine lifecycle. Leaving or rebuilding the garage destroys its previous engine and disconnects its resize observer. Late engine loads cannot attach a scene to an obsolete screen. If the engine fails to load, the existing SVG car remains visible.
- `src/game-views.js` renders the shell, garage and slip; `src/screen-ui.js` handles dialogs, tab panels and paged grids; `src/game-ui.css` defines bounded layouts.
- Racing uses a Canvas chase renderer in `src/race-scene.js` and the existing fixed 120 Hz physics. `src/race-presentation.js` scales road motion to the car's visible length, frames both lanes, adds launch/shift kicks and continues visual coasting beyond the timing beam. Near barriers and pavement move faster than the distant skyline. Reduced motion removes camera kicks, pitch and trails.
- The engine synthesizer adds lower engine harmonics, a shift torque-cut envelope and air/tire noise driven by actual road speed. The race's **AUDIO ON/OFF** button controls the saved sound preference. Phaser continues to own the garage presentation.

## Verification

Run `npm test`, `npm run build`, `npm run test:browser`, `npm run test:interface`, and `npm run test:race-feel` with the optional Playwright setup described in the main README. The interface suite checks engine startup, screen/dialog bounds, dialog focus restoration, menu details, race controls and the slip at 1440×900, 390×844 and 360×640. The race suite runs actual quarter-mile races at those sizes, checks staging bounds, audio controls and exact pause freeze, and exercises the shared renderer on the wet/desert driving lab. Screenshots are written to ignored `tests/artifacts/`.
