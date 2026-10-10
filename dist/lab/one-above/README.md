# The One Above: interactive study

Isolated prototype at `/lab/one-above/`. The main landing page is not changed.

This is a 2.5D portrait rig, not a full 3D character. One original illustration
is mapped onto a triangulated, depth-shaped surface. WebGL is preferred; a smaller Canvas 2D
mesh provides the same controls when WebGL is unavailable. Pointer/touch input drives
a limited yaw/pitch rotation of the head with a soft neck attachment. A separate
weighted torso region breathes subtly. Iris vertices move independently with a faster response, and
Anime.js closes/reopens the eyelid vertices. Show rig exposes the actual mesh.
There is no image sequence, pose crossfade, video playback or simulated input.

## Controls

- Mouse: move within the portrait; leaving returns the head to center.
- Touch: drag within the portrait; lifting holds the last gaze. Scrolling is
  native outside this explicitly bounded interaction surface.
- Keyboard: focus the portrait, use arrows, Home to center, B to blink.
- Direction buttons, Blink, Center, Pause/Enable motion and Show/Hide rig.
- System reduced motion starts paused. Enabling motion is an explicit opt-in.
- Rendering and blinks pause offscreen or when the document is hidden.

## Source and construction

The source is the user's original September 30 portrait:
`093A02B4-66D2-471A-9974-BCBA111BC44F(20260930-173250).jpeg`,
Library ID `libfile_68e8cca7978481919929310cd628f227`.
Only resize and WebP compression are applied to the stored artwork. It has not
been repainted, mirrored or extracted from video. Facial landmark coordinates
plus a surrounding grid produce the triangulated mesh. The synthetic depth
profile is an approximation of the face; the nose has separate depth and the
neck blends into the fixed body. No depth scan or anatomical 3D model is implied.

The existing nine angle drawings were also evaluated. Interpolating them caused
double armor/ear edges due to differences between drawings, so that approach
was rejected. Those images and experimental optical-flow data are not shipped.

The browser loads one portrait and its small JSON mesh, plus the site's existing
Anime.js library and mono font. All assets are same-origin. There is no camera,
microphone, remote model or tracking request.

MediaPipe Face Landmarker ran offline during asset preparation. The reproducible
`scripts/prepare-head-rig.py` requires Python, MediaPipe, Pillow, NumPy and SciPy,
the source image and a Face Landmarker task model. The model is not shipped.
Model guide: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python

## Limits and fallback

The limited turn deforms the original drawing. It cannot expose unseen anatomy,
make a clean side profile, or support unrestricted rotation. Eyelids are mesh
deformations, not separate painted lid artwork. This is a proof of direct
interaction, with visible approximation at extreme angles. It does not animate
arms, clothing, satellites or the full body.

The original portrait remains visible if JavaScript, image/data loading or both
canvas rendering modes are unavailable. Context loss returns to the static portrait. The implementation
works offline once its same-origin files are available.

## Verification

Checked responsive layouts at 1440, 1280, 768 and 390 pixels: no page exceptions,
local request failures, horizontal overflow, duplicate IDs or text collisions.
The page retains the marketing system's container hooks and uses normal
anchor navigation. Targeted Playwright
checks cover pointer input, native touch tap/drag, blink deformation, pause,
reduced motion and Canvas 2D fallback. Browser emulation is not physical-device QA.

## Independent breathing and isolation controls

The second pass extends the existing prototype rather than replacing it. Four
checkboxes independently enable head tracking, iris tracking, automatic blinks
and local breathing. Manual Blink remains available when automatic blinks are off.
Turn off all but one channel to inspect its contribution; Show rig displays the
actual deformed triangles and highlights iris, lid and chest vertices.

Breathing is a 5.8-second cosine envelope applied only to a weighted region below
the jaw. It raises shoulder/chest vertices by at most 0.004 of image height and
expands them locally by 1.2% about the sternum. Its weights are exactly zero on
the head and image perimeter. This is local mesh deformation, not whole-image
bobbing or scaling. The illustration remains one texture: **no separated painted
layers, anatomical skeleton, hidden-side artwork or full 3D model are claimed.**

Head yaw/pitch is now limited to approximate ±15°/±9° to constrain distortion.
These are synthetic mesh angles, not recovered anatomical camera angles.
The eyes lead the head; disabling head tracking eases the head to neutral while
iris tracking continues. Disabling breathing eases the chest to rest.

The September 30 head study is a separately drawn close-up, not a frame extracted
from the full-body performance. It is reused as the existing interaction study
without repainting the character or replacing the production artwork.

### Rendering and accessibility

The WebGL mesh contains 3,240 vertices and 6,250 triangles. The Canvas 2D fallback
renders 454 triangles. Head depths and deformation weights are precomputed.
Rendering is capped at 60 fps for WebGL and 24 fps for Canvas 2D, with no upload
or draw when the state is unchanged. The technical disclosure shows measured
average CPU draw time (not GPU time or a guaranteed device frame rate).

Reduced motion starts fully paused, with an explicit Enable motion button.
Changing the system setting to Reduce pauses the study; changing it back does
not override a user's pause. Offscreen and hidden-tab gates are combined so a
visibility callback cannot restart an offscreen blink. The paused/static stage
allows native vertical scrolling. Direction controls have 44px touch targets.

### Reproduce the targeted browser checks

Install Playwright and pngjs in your test environment, and install its Chromium
browser. From the repository root run:

```sh
node scripts/verify-head-rig.cjs
```

The script starts its own temporary HTTP server. `WEBDEV_CHROMIUM_PATH` can point
to a compatible Chromium binary. Optionally supply a preview URL as the first
argument and a screenshots/report directory as the second argument. It checks
both renderers, compares real rendered eye/chest/head pixels, exercises mouse,
keyboard and native emulated touch events, verifies reduced motion and offscreen
suspension, and checks static image fallbacks. It is not physical iPhone QA.

### Current source and deployment audit

The production Netlify deployment reported commit
`53d499d0c5c8d0b62bf93232bcca40e91b6ec08b`. HTTP byte comparisons of its `index.html`,
`js/scene-motion.js` and `js/editorial-motion.js` matched the repository files.
The production scene controller still sets character MP4s to loop; Anime.js
handles page transitions and satellite effects. This branch changes none of them.

The repository contains the full-body JPEG, character MP4s, poster JPEGs, and
this prototype's original portrait texture with prepared facial landmarks.
No PSD/PSB/ORA/KRA/Blend/FBX/GLTF/GLB/Spine/MOC3 source is present in the inspected
repository. A Library search also located a raster “Six-view cybernetic head
study.png”; that is a drawing sheet, not evidence of a layered rig. No additional
rig-ready layered source was found in the accessible search results.

### Artwork needed for the next level

- Separate eye sockets, eyeballs/irises, upper/lower lids and painted closed eyes.
- Head/neck/shoulder overlap with hidden areas filled in for clean rotation.
- Consistent front, ±15° and ±30° views, or a sculpted and textured 3D head.
- Face controls or blend shapes for expression, jaw motion and natural blinking.
- Body/fabric/satellite rigs and choreographed keyframes for cinematic actions.

Those assets would replace the approximation where needed. The current browser
input, accessibility and visibility controls can remain.
