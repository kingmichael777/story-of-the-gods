# One Above browser study: verification

## Result

45 targeted checks passed across WebGL, Canvas 2D, touch emulation, reduced
motion and static fallbacks. Four layout checks passed at 1440, 1280, 768 and
390 pixels with zero page exceptions, failed local requests, horizontal
overflow, duplicate IDs or detected text collisions. Desktop and phone
screenshots were visually inspected.

Pixel comparisons confirm that eyes can move with the head locked, chest
pixels stay fixed during isolated gaze, and head pixels stay fixed during
isolated breathing. A coarse-mesh jaw displacement discovered in the Canvas
fallback was corrected by moving the breathing weights below face-adjacent
triangles. Damping now converges exactly to rest to prevent residual drift.

Checks also cover eyelid closure/reopening, head deformation, frozen paused
pixels, pointer/keyboard input, native emulated touch drag, offscreen stop and
resume, reduced-motion default/opt-in, no-JavaScript display, and missing mesh
asset fallback. The live production controller and page are unchanged.

## Performance evidence and limits

Chromium 153 with software WebGL in a shared environment. Short runs observed
WebGL at approximately 24–60 rendered fps; final WebGL sample: 62 draws in
2.57 seconds with 0.7 ms average CPU draw work. Canvas fallback: 50 draws in
2.50 seconds, approximately 20 fps, with 2.7 ms average CPU draw work. These
measurements do not include GPU completion time and are not a guarantee for
physical mobile hardware. Wireframe is a diagnostic view with extra drawing
overhead.

The renderer limits pixel density and stops animation while offscreen, hidden
or paused. The fallback is capped at 24 fps (about 20 on this 60Hz test clock).
The source image is 216 KiB and mesh JSON 156 KiB, plus existing same-origin
Anime.js and font assets. No video or runtime inference model is loaded.

## Remaining production validation

Physical iPhone/iPad Safari and low-end Android testing remain unverified.
The head is a limited 2.5D deformation of an existing illustration; side-profile
turns, anatomically clean eyelids, expressions, arms and fabric are not
completed articulated animation. See the prototype README for required art.

## Reproduction

Run `node scripts/verify-head-rig.cjs` with Playwright, pngjs and a compatible
Chromium installed. The script starts a local server. Set RIG_RENDERERS to
webgl or canvas2d to isolate a renderer. Exact check names and short-run
measurements are in one-above-verification.json.
