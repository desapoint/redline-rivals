# Additional source artwork found on 2026-10-03

**Current status:** all eight selected illustrations below are now reviewed, converted and playable, bringing the production roster to twelve cars. See [the final preparation record](../../additional-cars.md). The remaining text records the initial inventory findings; archive counts do not imply that the other old/rusty packs are approved production cars.

The playable demo has four reviewed real cars. The supplied Downloads archives
contain additional artwork; the earlier four-car count covered staged project
sources only. `inventory.json` records both archive hashes and preserved image
hashes. Replay with `scripts/inventory-car-sources.py` and the two original ZIPs.

## Existing named `-2d` masters — next preparation batch

| Source vehicle | Preserved image | Inspection finding |
| --- | --- | --- |
| 2024 Volkswagen Golf GTI | `racinggame-layered-sprite-review/volkswagen-golf-gti-2024-2d.png` | Red, faces right; assembled body/wheels/brakes, not an independently animated runtime body. |
| 1969 Ford Mustang Boss 302 | `racinggame-layered-sprite-review/ford-mustang-boss302-1969-2d.png` | Red, faces right; assembled body/wheels, including the original black stripe. |
| 2024 Toyota GR Corolla | `racinggame-layered-sprite-review/toyota-gr-corolla-2024-2d.png` | Blue, faces left; orientation and independent mechanical layers need reviewed preparation. |

These three source images have been inspected, but their layered archive packs
are not yet approved for the game. Verify native axle centers, complete tire/rim
extraction, transparent spokes, separate rotors and stationary calipers, body
fender contours, underlay coverage and paint exclusions before importing.
Do not substitute the complete assembled image for an animated layered car.

## Five additional composite/sheet candidates

The other archive contains 2024 Nissan Z NISMO, 2024 Ford Mustang Dark Horse,
2024 Acura Integra Type S, 2024 Subaru WRX TR and 2025 Cadillac CT5-V Blackwing
composites and sprite sheets. Their composites have visible colored fringes,
rectangular source artifacts and/or shadows outside the vehicle. They need
cleanup, sheet inspection and measured geometry; metadata alone does not
establish correct placement. Factory identity and specifications have not been
independently verified in this inventory.

## Counts and work order

There are 60 metadata packs in `racinggame-layered-sprite-review.zip` and five in
`racinggame_asset_batch_001.zip`. This is 65 packs including used/rusty variants,
not 65 reviewed new models. The first archive marks three entries as generated
2D and contains their explicit `-2d` masters; the other entries require visual
inspection and cannot be counted as finished real-car artwork.

The user authorized making missing sprites **after the current cars are fixed**.
Finish verification of the current four, prepare these three existing masters,
then inspect the five composite/sheet candidates and identify the actual missing
masters. Prefer source-based scripted processing; generate artwork only for
missing or irreparable components. The deferred flat-paint/fixture/shading
redesign remains separate from this inventory.
