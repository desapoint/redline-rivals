The Integra Type S and Mustang Dark Horse previously shared invented Y spokes.
Their native masters instead have ten separate arms, shaded metal, distinct hubs
and a detailed lip. The Boss 302's old cavity masks also crossed its chrome arms.

`native-wheel-plans.json` locks each accepted master/manifest hash, measured
visual hub, rim radius, and spoke/opening angles. `repair-native-wheels.py` maps
that native metal onto the existing component pivot and makes the measured
spoke cavities transparent. Accepted circular tires, axle positions, tire ground
contact, component dimensions and all body/shader/fixture/paint/underlay bytes
remain unchanged. Full rotors/drum and single stationary calipers are drawn
independently at the appropriate illustrated scale. These mechanical details
are visual approximations rather than factory engineering data.

Replay from the source workspace with:

```
python scripts/repair-native-wheels.py --workspace "E:/Coding adventures/Racing Game"
```

The operation refuses an existing output revision or changed source bytes.
Each `wheel-detail-v12` package has fresh assembled/isolation/rotation/repaint QA,
an accepted fingerprint-bound visual review and a reviewed ZIP in the local
art workspace. `import-native-wheels.py` requires that review, validates unchanged
files, and imports just those three cars' six mechanical images and provenance.
`import-additional-cars.py` also selects these repairs when replaying the full
additional roster. Complete native inputs and ZIPs remain local; compact review
records and lossless WebP images accompany the playable demo.
