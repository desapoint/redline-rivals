# Flat paint, solid shading and line art

The body uses separate, native-size RGBA images in this order:

| Role | Content | Recolor behavior |
| --- | --- | --- |
| `body.webp` | Uniform white silhouette, opaque inside the body and transparent outside it and inside the native wheel openings | Filled with any chosen RGB paint color |
| `shading.webp` | Solid black/white shapes with discrete transparency | Normal alpha composition darkens or lightens the paint beneath |
| `fixtures.webp` | Glass, lamps, fixed trim and other protected source details | Retains its own colors |
| `linework.webp` | Black silhouette, fender edges, panel seams, handles and fine details | Independent ink above the other body layers |

The paint image contains no original paint hue or shading. The shading image uses black and white only, with shadow alpha values 40, 88, 132 and 176 and highlight alpha values 40 and 80. Empty regions have alpha zero. There are no interpolated shading gradients. Antialiasing at the exterior and wheel-opening boundaries keeps the native contours smooth; the base interior is fully opaque so source opacity noise cannot alter the selected paint color.

Canvas fills the white silhouette using `source-in`, then draws shading, fixtures and linework with normal alpha composition. SVG uses the same silhouette as an alpha mask on a solid paint rectangle and overlays those same images. Factory paint goes through this same stack. The paint cache contains only the colored foundation; changing colors does not bake or modify the other layers.

The underlay, separate wheels and rotors, and stationary calipers remain below the body. Native axle geometry and mechanical image pixels are retained. Silhouette and fender linework use the actual source alpha openings, including rounded rectangular, sloped or irregular arches.

## Inspect and reproduce

[Open the layer inspector](http://localhost:5173/asset-preview.html?car=chevrolet-silverado-1500-custom-crew-short-2025-black&layer=paint). Use **Body layers** to isolate the paint, shading, linework or fixtures; **Complete car** assembles them. The color picker accepts any RGB color. The background picker exposes transparency on checkerboard, white, gray and black. Both SVG and Canvas use the game's renderer.

`scripts/flat_car_layers.py` supplies the common deterministic decomposition. For original native-input packages, replay one source into a fresh output revision:

```sh
python scripts/flat_car_layers.py --source SOURCE_PACKAGE --output NEW_PACKAGE --revision NEW_REVISION --color "#009cff"
```

Alternatively select original runtime art IDs with repeated `--car` arguments and `--revision-offset`. The complete selection is checked before creating outputs. `scripts/prepare-additional-flat-cars.py` adapts the eight additional packages' reviewed native body and semantic paint-region masks to the same decomposition function. The original source images and semantic masks stay archived separately from the new continuous foundation mask. An assembled composite containing baked wheels cannot substitute for the prepared native body.

Every new revision requires fresh sprite QA, actual visual inspection, a hash-bound accepted review and a new reviewed ZIP before import. `scripts/import-reviewed-cars.py` imports the original four; `scripts/import-additional-cars.py` imports the additions. Rejected and superseded revisions remain archived. The accepted flat packages are Mazda `flat-paint-v16`, Silverado `flat-paint-v19`, Kia `flat-paint-v9`, Rogue `flat-paint-v10`, and `flat-v7` for each of the eight additions.

Verification includes deterministic source replay, uniform foundation RGB/opacity, preserved native alpha boundaries, discrete grayscale shading and isolated ink, renderer ordering, arbitrary exact RGB colors in the browser, and races/repaint persistence at desktop and phone sizes. Run:

```sh
python -m unittest discover -s tests -p test_flat_car_layers.py
node tests/flat-paint-browser.mjs
```

The browser runner needs the local server and optional Playwright setup described in README. The derived shapes and linework retain the illustrated source design; they are source-derived raster art rather than newly drawn OEM vectors.
