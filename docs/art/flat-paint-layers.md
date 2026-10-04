# Flat paint, solid shading and line art

Current production shading preserves native source reflections for all twelve cars. See [source shading restoration](native-source-shading.md) for the selected revisions and replay parameters. The cartoon classifier and its selections below describe the superseded preparation history.

The body uses separate, native-size RGBA images in this order:

| Role | Content | Recolor behavior |
| --- | --- | --- |
| `body.webp` | Uniform white silhouette, opaque inside the body and transparent outside it and inside the native wheel openings | Filled with any chosen RGB paint color |
| `shading.webp` | Solid black/white shapes with discrete transparency | Normal alpha composition darkens or lightens the paint beneath |
| `fixtures.webp` | Glass, lamps, fixed trim and other protected source details | Retains its own colors |
| Optional `lights.webp` | Measured lamp lenses separated from the other fixtures; currently supplied for Silverado | Retains its own colors; contains no grille, bumper or painted surround |
| `linework.webp` | Black silhouette, fender edges, panel seams, handles and fine details | Independent ink above the other body layers |

The paint image contains no original paint hue or shading. The cartoon shading image uses broad, hard-edged black and white polygons: shadow alpha values 72 and 140, and highlight alpha 56. Empty regions have alpha zero. There are no interpolated shading gradients or rendered blur. Antialiasing at the exterior and wheel-opening boundaries keeps the native contours smooth; the base interior is fully opaque so source opacity noise cannot alter the selected paint color.

Canvas fills the white silhouette using `source-in`, then draws shading, fixtures and linework with normal alpha composition. SVG uses the same silhouette as an alpha mask on a solid paint rectangle and overlays those same images. Factory paint goes through this same stack. The paint cache contains only the colored foundation; changing colors does not bake or modify the other layers.

For assembled dark finishes, the shared renderer adds a uniform reflected-light tone until the largest RGB channel reaches 56. This retains channel differences while giving black paint a charcoal midtone that the existing cel shadows can darken and highlights can lighten. Pure black renders panel tones of approximately 25, 40, 56 and 100, rather than losing all shadows at zero. It uses no spatial gradients and applies equally to SVG showrooms and Canvas garages/races. Saved RGB paint and the isolated paint layer remain exact; brighter colors need no lighting lift. The cache keys the effective displayed color so switching between exact paint and assembled lighting cannot reuse the wrong foundation.

The underlay, separate wheels and rotors, and stationary calipers remain below the body. Native axle geometry and mechanical image pixels are retained. Silhouette and fender linework use the actual source alpha openings, including rounded rectangular, sloped or irregular arches.

## Inspect and reproduce

[Open the layer inspector](http://localhost:5173/asset-preview.html?car=chevrolet-silverado-1500-custom-crew-short-2025-black&layer=paint). Use **Body layers** to isolate the paint, shading, linework or fixtures; **Complete car** assembles them. The color picker accepts any RGB color. The background picker exposes transparency on checkerboard, white, gray and black. Both SVG and Canvas use the game's renderer.

Opening a car directly starts with its factory paint; `&paint=000000` opens a pure-black lighting preview. An explicit paint query also works with isolated layers.

`scripts/flat_car_layers.py` supplies the common deterministic decomposition. For original native-input packages, replay one source into a fresh output revision:

```sh
python scripts/flat_car_layers.py --source SOURCE_PACKAGE --output NEW_PACKAGE --revision NEW_REVISION --color "#009cff"
```

Alternatively select original runtime art IDs with repeated `--car` arguments and `--revision-offset`. The complete selection is checked before creating outputs. `scripts/prepare-additional-flat-cars.py` adapts the eight additional packages' reviewed native body and semantic paint-region masks to the same decomposition function. The original source images and semantic masks stay archived separately from the new continuous foundation mask. An assembled composite containing baked wheels cannot substitute for the prepared native body.

`scripts/cartoon_car_shading.py` traces broad source-lit regions into simplified polygons and removes small islands. The source is averaged only for classification; each rendered polygon has a constant opacity. The result is clipped to the original painted regions and ink exclusions. `scripts/prepare-cartoon-shading.py` makes fresh shading-only revisions for the current production selection (or repeated `--car` IDs), asserts that every other layer and mask is unchanged, and records source hashes and settings in `docs/art/cartoon-shading-plans.json`. Earlier decomposition settings remain available to replay archived revisions.

Every new revision requires fresh sprite QA, actual visual inspection, a hash-bound accepted review and a new reviewed ZIP before import. `scripts/import-reviewed-cars.py` imports the original four (or repeated `--car` IDs); `scripts/import-additional-cars.py` imports the additions. Rejected and superseded revisions remain archived. The accepted packages are Mazda `reference-fit-v18`, Silverado `trim-v26`, Kia `cartoon-v10`, Rogue `cartoon-v11`, and `cartoon-v8` for each of the eight additions. The Mazda uses a separately selected source-contour shading variant. The cartoon revisions preserved all non-shading layers; Silverado's subsequent trim revision changes only its semantic painted regions, fixtures and dependent shading.

## Silverado lamp correction

Black paint reduced contrast in the illustrated source, but the failure was semantic: the old broad lamp mask and combined fixture view included non-light parts. `docs/art/fixture-plans/chevrolet-silverado-1500-custom-crew-short-2025-black.json` supplies source-hashed native contours for the amber lens, upper white lens, C-shaped white lens and rear lamp. `scripts/repair-body-fixtures.py PLAN.json` applies contours in a new revision without changing unrelated body, linework, wheel, brake or underlay bytes. The lamp correction restored the measured painted surrounds to grayscale shading above flat paint; the grille stays fixed trim.

The optional lamp mask uses RGBA alpha, including transparency in the hollow C interior. `decompose(..., lights_mask=mask)` removes the lamps from the other fixtures and emits `body/lights.png`. Runtime SVG and Canvas draw `lights.webp` above fixtures and below linework. **Lights only** in the inspector is available where a pack provides that separate image; the other cars retain their combined fixture layer. The original fused source stays archived.

The native repair checks include actual lens pixels and exclusions on the bumper, grille, between the lamps and inside the C. A preserved reference luminance kept shading outside the lamp repair byte-identical. Earlier failed/draft revisions remain in the local run; lamp revision 22 has inspected lens crops, accepted review and a reviewed ZIP. Cartoon revision 23 changes only shading and preserves that lamp correction.

## Silverado fixed-trim correction

The source black bumper shells and lower rocker were incorrectly protected as fixed trim. Chevrolet's [2025 trim descriptions](https://www.chevrolet.ca/byo-vc/client/en/CA/chevrolet/silverado/2025/silverado-1500/summary/moreviews?isExterior=true) specify body-colour front and rear bumpers for Custom. `docs/art/fixture-plans/silverado-fixed-trim-v26.json` restores those painted surfaces and adjacent source-painted fragments to the paint/cel stack. Measured exclusions keep the grille, rear step pad/recess, front lower insert and valance fixed. The glass, mirrors, handles, bed rail, separate lamp image, foundation, linework, arches, anchors and mechanical image bytes remain unchanged.

Native crop inspection rejected draft revision 24 for residual thin paint strips. Revision 25 corrected the artwork but mislabeled a grille-edge regression sample as paint. Revision 26 corrects that metadata and has fresh full QA, inspected native/isolated/assembled previews, hash-bound acceptance and its own reviewed ZIP. The repair helper retains the current cartoon settings, avoids duplicate lamp-layer entries and archives new processing scripts separately so earlier source hashes remain valid.

Verification includes deterministic source replay, uniform foundation RGB/opacity, preserved native alpha boundaries, discrete grayscale shading and isolated ink, renderer ordering, arbitrary exact RGB colors in the browser, and races/repaint persistence at desktop and phone sizes. Run:

```sh
python -m unittest discover -s tests -p test_flat_car_layers.py
node tests/flat-paint-browser.mjs
```

The browser runner needs the local server and optional Playwright setup described in README. The derived shapes and linework retain the illustrated source design; they are source-derived raster art rather than newly drawn OEM vectors.
