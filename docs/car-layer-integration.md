# Integrating layered car packs

The production manifest is `src/assets/cars/manifest.json`. All twelve production cars now use a uniform recolorable paint foundation, discrete grayscale shading shapes, fixed fixtures and independent black line art, plus separate underlay, wheels, rotors and stationary calipers. See [the current flat-paint contract](art/flat-paint-layers.md) for compositing, source preservation, replay and isolated previews. The implementation history below records earlier revisions; the flat-paint contract supersedes the former baked-body tint approach. Lossless WebP runtime copies retain native dimensions and mechanical attachment scales.

Open `/asset-preview.html` on the development server to inspect the shared SVG/Canvas renderer. The hand-authored vector demo is a geometry fixture, not a real car. Once production records exist, they appear in the same gallery. Controls demonstrate offset component pivots, independent paint masks, ride height, both facing directions, wheel slip and a geometry overlay.

The [eight-car preparation record](art/additional-cars.md) documents the supplied sources, complete mechanical reconstruction, native hub measurements, revision history and factory/model distinction. All twelve cars are available in the dealership and driving lab. Career rivals and prizes currently use the original four. The current build contains 144 independent image files.

## Pack format

The manifest has `schemaVersion: 1`, a `cars` map keyed by stable art IDs, and optional `components.wheels` / `components.brakes` maps. See `src/demo-sprite-pack.js` for a complete runnable example. Each car record retains the native `width`, `height`, measured alpha `bounds: [x,y,width,height]`, `facing`, `paintColor` and two native wheel attachment circles. Reference URLs, realistic-reference paths and other provenance fields may be retained on the record.

```json
{
  "schemaVersion": 1,
  "cars": {
    "my-car-art-id": {
      "width": 2172,
      "height": 724,
      "bounds": [32, 21, 2107, 687],
      "facing": "right",
      "paintColor": "#c91420",
      "wheels": [
        { "axle": "rear", "x": 447, "y": 527, "radius": 159 },
        { "axle": "front", "x": 1728, "y": 528, "radius": 159 }
      ],
      "layers": {
        "body": { "file": "my-car/body-2d.png", "width": 2172, "height": 724 },
        "wheel": { "file": "my-car/wheel.png", "width": 400, "height": 400, "pivot": [200, 200], "radius": 190 },
        "brake": { "file": "my-car/brake.png", "width": 300, "height": 300, "pivot": [150, 150], "radius": 190 }
      }
    }
  },
  "components": { "wheels": {}, "brakes": {} }
}
```

The numbers above are an example, not inspected geometry for a finished car. Image dimensions are checked against decoded files. PNG, WebP, SVG and AVIF are supported. Files are local paths relative to `src/assets/cars/`; absolute URLs, parent-directory paths and script URLs are rejected. The Pages build includes the entire `src` directory and validates production metadata/file availability before publishing. Archives and unfinished source art are not bundled.

For a square or cropped component, `pivot` is the native wheel center, and `radius` is the car's tire radius expressed in that component's coordinate system. A brake's radius is its **attachment reference radius**, not its smaller visible disc radius. This gives `scale = target tire radius / component reference radius`. Store the correct reference radius and pivot when trimming layer canvases; independently fitting a brake's visible diameter to the tire would make it too large.

`layers.wheel` and `layers.brake` supply shared defaults. Either wheel attachment can override `wheel`, `brake`, or `rotor` with a complete layer descriptor for different front/rear art. Wheel arrays may omit `axle`; it is inferred from native x coordinates and `facing`. Explicit axle labels are recommended. A `layers.paintMask` can use the full native body canvas to identify only recolorable painted pixels. Preserve transparent windows, trim and wheel openings; without a paint mask the body retains its original color.

## Rendering and customization

Layer order is shadow → local underlay → rotor → fixed brake/caliper → tire/rim → body and optional paint mask. The body must have transparent wheel openings and no baked wheel or brake art. Open spokes must be transparent. A combined disc/caliper sprite remains fixed; supply a separate rotor image if the disc should rotate. The body occludes the tops of wheels. Ride height moves the body and underlay; wheel centers remain on the road. Art facing left is mirrored at draw time so cars travel right. Native attachment points must match that left-facing image.

Game model records in `src/data.js` can add `artId: 'my-car-art-id'`. `buildCar` carries that property into the garage and race automatically. Omitting it uses the existing model ID as an art lookup. No physics measurements are inferred from image pixels. Keep real specification research and modeled physics separate. Existing model IDs, owned-car `model` values and career mappings should remain stable during an artwork-only replacement.

Reusable wheel/brake components use stable IDs and the same layer descriptor, plus an optional `name`. The appearance page exposes `Wheel design` / `Brake appearance` when a registered car and component choices are available. Saves retain `visual.wheelAsset` and `visual.brakeAsset`; unknown or temporarily unavailable IDs fall back to factory components while retaining the saved choice. Legacy `visual.wheels` silver/black/bronze remains the vector renderer's rim color. Brake selection is cosmetic; this drag iteration has no braking pedal or braking performance upgrade.

The existing vector stripe, spoiler, finish and tint controls apply to vector cars and are hidden for layered packs. A layered pack exposes paint only where it supplies a paint mask; additional body overlays require separate future assets.

The manifest and images load once from the same site. A complete decoded pack is installed atomically; an absent/corrupt layer keeps the previous catalog. A missing car art ID renders the existing vector car. Static images are cached, and painted bodies are prepared once per paint choice with a bounded cache. Rotation uses traveled distance divided by physical tire radius; slip increases only driven-axle rotation. Pausing stops physics and rotation. There are no frame-time pixel scans or image downloads.

## Validate

Run `npm test`, `npm run check:assets`, and `npm run build`. Then inspect each selected pack in the preview and the game at desktop/mobile sizes. Check transparent wheel wells, fixed calipers, rotating spokes/rotors, paint masks, differing front/rear pivots and high-DPI output. A flattened assembled-preview image is for review only; it cannot substitute for the independently rotating layers.

## First playable real-car replacements — 2026-10-03

The Mazda3 GT Turbo replaces Kaze (`kaze`); the Silverado Custom replaces Metro (`metro`). Stable gameplay IDs preserve UIDs, selected vehicles, jobs, records, rewards and saved upgrades. `vehicleRevision` migrates the former factory paint/final-drive/launch/ratio defaults once. Custom choices remain; incompatible six-speed ratio arrays on the eight-speed truck fall back to its current modeled gearbox. The entry restricted event now accepts AWD so the starter can enter it.

Run `scripts/import-reviewed-cars.py` with Python/Pillow to replay the selected runtime conversion. It verifies each source package against its current visual-review fingerprint and QA-report hash, merges the exterior partitions, retains the underlay and independent axle parts, and emits lossless native-size WebP copies. `bounds` retains the exact alpha extent; `displayBounds` frames alpha ≥ 8 and measured tires so faint source dust does not shrink the car. Every native pixel is retained. Source paths, hashes and review fingerprints are recorded per vehicle.

`src/real-cars.js` separates factory facts from the playable model. The Mazda uses premium-fuel power, factory mass, redline, six-speed ratios, final drive and tire size. Its aero, losses and shift behavior remain modeled. Silverado factory mass, redline, ratios, final drive and tire size remain unknown in the archived research. Explicit playable estimates enable racing; its provisional 4WD is represented by both driven axles. Game credits, performance grades and estimated times are simulation values. Kia and Rogue remain staged; neither has been silently substituted with another model.

`npm run test:real-cars` checks all four playable real cars at desktop and phone sizes. Factory/source pages use bounded dialogs and pagination, and both SVG menus and Canvas race/garage rendering share the same native attachment geometry.

## Forte and Rogue integration — 2026-10-03

The Forte GT replaces Vortex using its stable `vortex` ID. The one-time migration preserves owned UIDs, custom paint, upgrades, records and jobs while replacing old factory defaults. The Rogue is an additional `rogue` entry; the roster now contains four real and seven fictional vehicles. Tire compounds use stable model IDs instead of array positions.

The Forte uses researched 201 HP/FWD/7DCT data and an equipment-dependent factory mass range. Runtime mass is explicitly modeled at 1,380 kg. Each effective gear ratio is `factory ratio × gear-specific final drive / 4.643`, preserving overall wheel reduction. The original ratios and both final drives remain visible in factory data.

The Rogue uses a continuous ratio between modeled 0.5 and 2.6 limits, following a modeled 6,000 RPM full-throttle target. It has no fixed forward ratio array or shift interruptions. Race/lab HUDs show D, shift buttons are disabled, and the workshop exposes a CVT power target rather than fixed gear inputs. This does not reproduce Nissan D-Step logic. Factory mass, redline, CVT ratio range and final drive remain unknown; the playable estimates are documented separately.

Source-preserving preparation plans and reviewed ZIPs are under `tests/car-integration/20261003/`. Forte revision 1 and Rogue revision 2 pass visual/automated sprite review. The failed Rogue revision 1 remains archived: coarse lamp contours protected painted hood and lamp-surround areas; revision 2 follows the actual lenses/housings. Replay preparation with `scripts/prepare-next-real-cars.py`, record a fresh visual review after any asset change, then run `scripts/import-reviewed-cars.py`. The production manifest now contains 4 cars and 36 lossless native-size WebP layer files.

## Wheel placement corrections after user review — 2026-10-03

Matching the previous metadata did not establish correct visual placement. Native alpha-opening measurements exposed high Rogue/Silverado hubs, the truck's front axle too far back, and smaller Kia offsets/radius errors. The illustrated openings are not perfectly circular; visual refinement preserves their source pixels and a common tire contact line.

| Vehicle | Rear hub / tire radius (native px) | Front hub / tire radius (native px) | Current reviewed package |
| --- | --- | --- | --- |
| Silverado | (464, 660) / 145 | (1750, 660) / 145 | `contour-fit-v13` |
| Rogue | (499, 675) / 172 | (1673, 675) / 172 | `contour-fit-v4` |
| Forte GT | (464, 665) / 134 | (1487, 665) / 134 | `contour-fit-v3` |

`scripts/repair-wheel-placement.py` creates source-preserving geometry revisions. Body, paint masks, underlays and native mechanical pixels remain byte-identical to the previous packs. Only axle anchors and dependent wheel/rotor/caliper placement scales change. Revisions receive fresh full QA and visual review before the runtime converter accepts them. Measurement diagnostics, before/after images, corrected ground-line overlays and reviewed ZIPs are under `tests/car-integration/20261003/`.

Each axle has separate `*-wheel.webp`, `*-rotor.webp` and `*-caliper.webp` images. The runtime `brake` descriptor refers to the stationary caliper; the separate `rotor` descriptor rotates with the wheel. Both SVG and Canvas draw rotor → fixed caliper → tire/rim → exterior, with shared native hub placement. Geometry tests require separate file paths, a common ground line and framing that preserves the taller corrected tires.

## Source contours for arbitrary arches — 2026-10-03

Tire circles describe tire placement only. `scripts/wheel_arch_profiles.py` uses `source-opening` profiles to trace the connected transparent opening selected by a native-coordinate seed. It follows the original alpha contour rather than fitting a circle, rectangle or curve. A bounded region selects the well and its lower rocker cutoff; reaching its top or sides is rejected instead of silently truncating the arch. Original antialiasing is retained on the traced edge. Unrelated transparent regions are excluded, and original body pixels remain unchanged.

All four production cars use the same tracing method, driven by source-hashed plans in `docs/art/arch-plans/`. Current reviewed sources are Mazda `contour-fit-v10`, Silverado `contour-fit-v13`, Forte `contour-fit-v3` and Rogue `contour-fit-v4`. Their wheel anchors, body, paint masks and mechanical image bytes are unchanged from the preceding accepted revisions. Arch profiles are retained in the runtime manifest. Explicit rounded rectangles and measured polygon contours remain supported for manually supplied envelopes; the earlier Silverado rectangle experiment is archived, superseded by source tracing.

Replay all plans using the bundled Pillow runtime: `python scripts/repair-wheel-arches.py`. For a new source/target, use `python scripts/wheel_arch_profiles.py PLAN.json NEW_OUTPUT_DIRECTORY`. Changed body hashes, opaque seeds, cropped contours and existing target directories are rejected. Source tracing requires a transparent native opening; a baked or opaque master needs explicit preparation rather than guessed fender geometry. Full QA, actual visual review and packaging precede runtime import. The installed skill remains unchanged.

`python -m unittest discover -s tests -p test_wheel_arch_profiles.py -v` checks round, squared, sloped and concave contours, selected-region isolation, original alpha edges, invalid/cropped profiles, bounded lower cutoff, source preservation and deterministic replay of all four cars. Review evidence and full reviewed ZIPs are beside each new package under `tests/car-integration/20261003/`.

## Real-car demo deployment — 2026-10-03

The active roster now contains exactly the four staged real cars. Career opponents and first-win rewards use this roster, with upgrade stages providing progression; an already-owned prize instead awards bonus credits. Legacy fictional-car ownership migrates to these vehicles while keeping UIDs, upgrades, custom paint, condition, job links, timing records and completed events. The promotion job now accepts AWD, available in the demo roster.

Runtime `body.webp` is a lossless copy of each selected `body-2d.png`, preserving the complete existing exterior. The named `<vehicle>-2d.png` files are assembled previews with baked wheels, so they are not drawn underneath independently animated mechanical layers. No shader/fixture redesign is included. Initial loading waits for decoded production assets before showing the game.

Compact source-manifest and review snapshots live in `docs/art/runtime-provenance/`; runtime provenance records the original source hashes and local package paths. Large art experiments and intermediate packages remain in the local workspace and are not deployed. The Pages build includes the production pack, game, drive lab and asset viewer.
