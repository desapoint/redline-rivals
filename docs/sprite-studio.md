# Sprite Studio

Open http://localhost:5173/sprite-workbench.html while `npm start` is running. The asset gallery also links to it. The studio is a local browser editor, included in the static build with no new runtime dependencies.

## Start and edit

- **Load car** opens either of the original realistic examples (Mazda reviewed-v9, Silverado foundation-v16) when their local archives are available, or one of the twelve current game cars. The original examples retain their old measurements; the game entries contain current production geometry and layers.
- **New from master** reads a PNG, WebP or JPEG, creates the native body coordinate system and blank component layers, and retains the master bytes. The master initially remains a merged exterior. Separate its fixtures and remove baked mechanics before acceptance. A JPEG needs background removal to acquire transparency.
- **Blank car** creates a canvas with front/rear hubs, independent wheels, rotors, fixed calipers, an underlay and optional exterior/mask layers. Replace mechanical placeholders with actual images. Remove any unused empty optional layer; the full skill validator rejects empty image layers.
- **Native layer** edits a component in its own pixel coordinates. **Assembled car** edits it through its placement transform. Brush and eraser strokes affect only the selected layer and respect an active selection. Layer locks protect pixels and layer placement fields. Undo/redo keeps twenty edit states, including geometry, extraction and removal.
- **Color select** uses RGB/alpha distance from a clicked seed. Connected selection stays within a single four-connected region. Turn it off to match disconnected regions. **Magnetic lasso** snaps sampled freehand points to nearby color/alpha boundaries with a distance penalty. It needs the cursor near the desired edge; it does not infer semantic panels or compute a global intelligent-scissors path.
- Use Add, Subtract or Intersect to refine selections. Copy/Cut creates a new independent layer at the selected layer's placement and one depth above it. Fill and Erase apply to the selected region. **Use as paint mask** transforms the selection into full body-canvas coordinates.
- **Place hubs** drags centers and square radius handles in the assembly view. A radius change scales all parts attached to that axle together. **Set pivot** records a normalized visual hub inside a mechanical component. Rotors/wheels rotate; calipers (stationary hardware / stators) stay fixed. Numeric fields edit depths, scales, offsets and pivots.
- Save a selected region with **Save rework area**, then write its layer instruction. The native selection mask and instruction accompany the saved project and ZIP so Codex can do focused AI rework. Import the returned image with **Replace layer image**. Changing an image retains its placement; check pivots when the replacement canvas differs.

## Save and hand off

**Save project** downloads a portable `.car-workbench.json` containing images, exact originals, geometry, source metadata and rework notes. **Open project** restores it. IndexedDB retains the most recent autosave, automatically restored on reopening. Save separate project files before switching cars to keep multiple drafts. Browser storage is scoped to origin and browser; files are the portable backup.

**Export sprite ZIP** contains independent RGBA PNG layers, `car-sprite.json`, source bytes with SHA256 hashes, the editable project, saved region masks and edit notes. It uses the installed racing-car-sprites manifest contract. Hidden layers are included; visibility and angle controls are preview settings. Every export is labeled **DRAFT** and carries the editor's checks. It does not carry forward an earlier QA/visual acceptance. The project retains original manifest sample assertions; the edited manifest omits these assertions because manual edits need newly inspected samples. Mask recoloring is a flat diagnostic, not the game's cel shader.

Extract the ZIP into a new directory, run the skill's `sprite_qa.py`, inspect the generated evidence, then use `record_review.py` and `package_sprite_set.py`. The existing game integration/conversion is a separate step; the ZIP is not a gameplay roster or physics change. Hand-painted revisions reopen from the saved raster project; the original preparation plan does not reproduce new brush strokes.

Codex can populate the page without a browser upload by creating a workspace project/package and opening:

```text
http://localhost:5173/sprite-workbench.html?project=docs/art/workbench/my-car.car-workbench.json
http://localhost:5173/sprite-workbench.html?package=docs/art/workbench/my-car/car-sprite.json
```

Paths must be local relative workspace paths. Prepared packages load sources listed in `sources[].archivedFile`; keep those files beside the manifest. No account, API key or online generation request is made by this page. AI image generation runs through Codex.

## Skill audit — October 3, 2026

The installed skill passed all **52** tests: source/hash preservation, deterministic replay, opaque/empty images, invalid metadata, missing layers, pivots, stationary calipers, rotor offsets, depth, paint assertions and stale QA/review rejection. Fresh replay of the Mazda realistic example matched **16** files and the Silverado matched **25**, plus all manifest values except machine-local source paths. Both passed fresh automated QA. Their assembled checkerboard images were inspected; this audit does not issue a new complete visual acceptance for those archived packages.

The actual browser-exported editor ZIP also passed the installed skill's full automated QA. Browser regression checks cover painting, undo/redo, color selection, magnetic lasso/extraction, axle dragging, fixed-caliper animation metadata, saved projects, ZIP download, both realistic sources, runtime import, autosave and phone-width layout. The game/unit suite has 61 passing tests, including six studio algorithm/export tests. Evidence is in `tests/sprite-workbench-audit/20261003/`.

The skill is usable now for measured source preparation, selective repair, reproducible derived layers, validation and review-bound packaging. Its preparation helper handles a body + wheel + combined brake workflow; already-separated parts can be reused through the manifest. It does not automatically identify vehicles, measure hubs, infer semantic contours, prove OEM accuracy or certify paint isolation visually. The studio makes those manual inputs editable. No installed skill files were changed.

Run `npm run test:sprite-studio` with Playwright available (or set `REDLINE_PLAYWRIGHT_PATH` to the bundled package). Run `scripts/audit-sprite-workbench.py` using Python/Pillow after the browser test to verify the installed skill and exported ZIP. New extraction folders preserve previous audit runs.
