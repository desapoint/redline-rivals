# Mazda reference appearance and grounded shadows

The Mazda uses reviewed `reference-fit-v18`. The uniform white paint foundation, native fender openings, fixtures, panel ink, hub positions and mechanical image bytes are retained. Its shading is a static black RGBA layer derived directly from the original red master's red-channel illumination. Source panel/reflection boundaries survive without blurred classification, coarse tracing or polygon simplification. Alpha retains the source's subtle variations; arbitrary repaint still affects only the uniform foundation.

The wheel images have transparent safety margins. Their visible tire radius is 504 source pixels, while previous placement metadata used 600. The corrected placement scale is 140/504, preserving the native axle centers and fitting complete tires into the original arches. Rotor and stationary caliper placement stays unchanged.

`prepare-mazda-reference.py` snapshots this targeted revision and rejects existing output directories and changed archived sources. Fresh full sprite QA, actual visual review, four rotations, isolated parts/layers, contrasting repaint and background checks accompany the local reviewed ZIP. Compact manifest, QA and review records are committed in `runtime-provenance/`.

All layered cars measure the visible tire contact once during asset installation, using opaque pixels in a narrow center strip. Rendering performs no frame-time pixel scan. Framing aligns these contacts to the ground plane; SVG and Canvas share thin ground shadows plus a darker patch beneath each tire. Transparent source padding no longer determines the shadow location. Suspension pitch transforms the body and wheel-well backing while wheels, rotors, calipers and shadows remain grounded. Ride-height changes move the body rather than the tires.

Artwork URLs carry the reviewed package fingerprint, allowing changed sprites to replace cached older versions. Factory specifications, saved paint, physics, career progression and the other eleven artwork packages are unchanged by this release.

`tests/shadow-browser.mjs` checks all twelve actual image contact points, SVG shadows, fixed tire-foot pixels under body pitch, changing body pixels, versioned image URLs, and Mazda garage/race/lab views at desktop and phone sizes. It uses isolated saves and accepts `REDLINE_TEST_ORIGIN` for local or Pages verification.
