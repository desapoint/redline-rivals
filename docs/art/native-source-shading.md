# Source shading restoration

The simplified cartoon classifier removed body reflections and replaced them with coarse patches. All twelve runtime cars now use source-native shading; the previously approved Mazda revision 18 stays unchanged.

`scripts/prepare-native-shading.py` makes source-preserving shading-only revisions. The shader contains only black or white RGB plus alpha. Native maximum-channel intensity retains source reflection contours without averaging, tracing, island removal or polygon simplification. A source-pigment reference normalizes colored masters independently from the chosen repaint; neutral cars use the stock midtone. `referenceValue` records the exact replay parameter. White reflection alpha is allowed where source intensity exceeds the reference, while shadows darken it. This is a recolorable illustration, not a claim of exact photographic material reproduction.

Rejected candidate revisions remain in the local art workspace: normalization against the chosen stock paint washed bright painted areas toward white, and the next candidate misclassified the black Silverado's tinted reflections. The final selection normalizes against source pigment only for chromatic paint, with a 255 ceiling for bright pigment references.

Selected revisions are Silverado `native-detail-v29`, Forte `native-detail-v13`, Rogue `native-detail-v14`, and `native-detail-v11` for the eight additional cars. `docs/art/native-shading-plans.json` binds original inputs, settings and every unchanged image/mask hash. Preparation preserves the complete paint foundation, fixtures, lights, linework, underlay, alpha edges, anchors, pivots, scales, wheels, rotors and calipers.

Each selected revision has fresh full QA, inspected source/stock/blue/white/black compositions, isolated layers, four wheel rotations, wheels-hidden views and alpha backgrounds. Hash-bound visual reviews and full reviewed ZIPs stay beside the local native packages. Compact current manifests, QA/reviews and processing plans accompany the runtime assets.

`scripts/import-native-shading.py` validates all selected reviews and source hashes before replacing only runtime shading and its provenance. It asserts that every unrelated runtime image is unchanged. The normal full importers select these source revisions for later replay.

```sh
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.mjs
node tests/flat-paint-browser.mjs
```
