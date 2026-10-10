# The One Above: interactive study

Isolated prototype at `/lab/one-above/`. The main landing page is not changed.

This is a 2.5D portrait rig, not a full 3D character. One original illustration
is mapped onto a triangulated, depth-shaped surface. Pointer/touch input drives
a limited yaw/pitch rotation of the head with a soft neck attachment; the torso
stays anchored. Iris vertices move independently with a faster response, and
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

The original portrait remains visible if JavaScript, image/data loading or WebGL
is unavailable. Context loss returns to the static portrait. The implementation
works offline once its same-origin files are available.

## Verification

Checked responsive layouts at 1440, 1280, 768 and 390 pixels: no page exceptions,
local request failures, horizontal overflow, duplicate IDs or text collisions.
The marketing-site harness's Barba-container expectation is inapplicable to this
standalone interaction page, which uses normal navigation. Targeted Playwright
checks cover pointer input, native touch tap/drag, blink deformation, pause,
reduced motion and WebGL fallback. Browser emulation is not physical-device QA.
