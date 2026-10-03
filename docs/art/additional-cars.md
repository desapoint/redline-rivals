# Eight additional playable illustrations — 2026-10-03

The production roster contains twelve layered real-car illustrations. This batch adds the 2024 Golf GTI, 1969 Mustang Boss 302, 2024 GR Corolla, 2024 Mustang Dark Horse, 2024 Z NISMO, 2024 Integra Type S, 2024 WRX TR and 2025 CT5-V Blackwing. They can be purchased, repainted, upgraded, tuned, raced and driven in the continuous lab. Stable IDs and existing saves remain compatible; the original four models remain career rivals and prizes.

## Sources and mechanical reconstruction

`source-inventory/20261003/inventory.json` inventories the two supplied ZIP archives by hash. Three explicit `-2d.png` masters and five composite illustrations were selected. The archive's remaining old/rusty variants are not approved production vehicles. Native measurements and semantic polygons are recorded in `additional-car-plans/`. Source images, metadata and failed/superseded revisions remain under `tests/car-integration/20261003-additional/` locally.

Complete tires were reconstructed from clean radial source samples, removing painted fender fragments and incomplete source boundaries. Native rim details survive where usable. The five composite cars contained repeated caliper artwork inside the spokes, so their inner rim/spoke geometry was rebuilt with antialiased standard drawing tools. Complete discs, hubs, bolts and stationary calipers were drawn independently; the Boss uses a rear drum and stationary backing hardware. These are illustrated visual approximations, not OEM CAD or measured factory brake dimensions. No image-generation service was used for this batch.

The body is cut at its actual exterior and wheel openings, with measured fixture exclusions and a dark backing clipped at the rocker. Tires are complete circles behind the fenders. All axle pairs have a common ground contact line. The left-facing GR Corolla is mirrored by the renderer with reversed wheel angles, preserving correct front/rear assignment.

## Native geometry

| Vehicle | Rear hub | Front hub | Tire radius | Ground |
| --- | --- | --- | --- | --- |
| Golf GTI | 299, 639 | 1376, 639 | 139 | 778 |
| Boss 302 | 456, 553 | 1663, 553 | 150 | 703 |
| GR Corolla (faces left) | 1382, 659 | 339, 659 | 133 | 792 |
| Dark Horse | 535, 696 | 1587, 696 | 137 | 833 |
| Z NISMO | 511, 718 | 1510, 718 | 139 | 857 |
| Integra Type S | 505, 718 | 1507, 718 | 142 | 860 |
| WRX TR | 516, 739 | 1509, 739 | 136 | 875 |
| CT5-V Blackwing | 518, 706 | 1600, 706 | 140 | 846 |

All values are native illustration pixels, not physical suspension measurements.

## Layer contract and replay

The accepted mechanical/exterior preparation is `prepared-v6`; the accepted independent paint decomposition is `flat-v7`. The final stack is underlay → rotating rotor/drum → stationary caliper/backing → rotating complete wheel → uniform paint foundation → discrete black/white transparent shading → fixed fixtures → panel linework. Every additional package has fresh hash-bound QA, visual review and a complete `reviewed-flat-v7.zip`. Compact manifest, preparation plan, QA and review snapshots are committed in `runtime-provenance/`.

Preparation is deterministic and refuses changed source hashes or existing output directories. With the original supplied ZIPs and the installed sprite skill available:

```sh
python scripts/stage-additional-car-sources.py
python scripts/prepare-additional-cars.py --revision NEW_REVISION
```

Use a new revision number; existing accepted source/run directories are intentionally protected. `prepare-additional-flat-cars.py` documents the exact approved v6→v7 decomposition, with snapshots of its scripts in each package. Adapting it to another revision requires new QA and visual review. `import-additional-cars.py` verifies accepted fingerprints and source hashes, emits lossless transparent WebP files and retains other runtime manifest entries. It does not import unreviewed archive packs.

## Factory facts versus the game model

`src/additional-cars.js` contains manufacturer references for rated power, torque, engine, drive and transmission configuration. Toyota brochure dimensions/mass are included where verified. Unverified factory gearing, masses, redlines and aerodynamic values remain null in factory data; explicitly labeled estimates supply playable simulation values. Curves are shape estimates normalized to rated power, not manufacturer dyno data. Historical Boss power is labeled SAE gross. The supplied WRX has an accessory spoiler rather than a standard TR wing.

Browser verification uses isolated saves: all eight dealership purchases, native production artwork, paged factory/simulation/source details, repaint persistence, moving races/results and rolling drive-lab gauges. The shared paint inspector verifies exact arbitrary colors and independent layers for all twelve models. See `TESTING.md` for final validation.
