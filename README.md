# Kinesis — Interactive 3D Skeleton

A dependency-free, single-page app for posing a real 3D skeleton (Three.js /
WebGL) and reading the angle at each joint from any camera angle — front,
side, or anywhere in between.

## Run it

No build step — just open `index.html` in a browser, or serve the folder
with any static file server, e.g.:

```
python3 -m http.server 8080
```

then visit `http://localhost:8080`.

## Features

- **A real, poseable 3D rig** — simplified capsule/sphere bone shapes (not
  photorealistic anatomy) arranged in an anatomically-correct hierarchy,
  rendered with Three.js. Drag empty space to orbit the camera freely
  around the model and scroll to zoom, so you can inspect any joint from
  the front, the side, or any angle between — including a true lateral
  view, which a flat 2D drawing can't offer.
- **Drag any joint handle** (vertical mouse motion) to bend the bone it
  controls — forward-kinematics chain, so rotating a shoulder carries the
  whole arm with it, rotating an elbow only moves the forearm/hand.
- **Body mass** — set it from either the toolbar or the side panel (the
  two fields stay in sync); it scales every segment's mass in the
  biomechanics calculations below.
- **Isolate a joint** — click any joint to fade everything else out and
  focus on just that joint's two adjoining bones, with its flexion angle
  shown both in 3D and in the side panel. 0° is anatomical neutral (fully
  extended); positive values are flexion, negative values are extension
  past neutral — this signed convention can represent hyperextension,
  which the old 2D model's 0–180° scale couldn't. Click empty space or
  press `Esc` to clear the selection.
- **Range of motion, when a joint is isolated** — a gauge compares the
  joint's current flexion against typical adult normal ranges from
  goniometry references (e.g., knee flexion 0–135°), now shown on a
  bidirectional scale with a neutral tick, flagging when the pose exceeds
  the normal flexion or extension range.
- **Biomechanics, when a joint is isolated** — toggle Force, Velocity,
  Acceleration, Moment, Center of Mass, and Ground Reaction Force for the
  segment that joint controls, drawn as 3D arrows/markers on the model.
  Segment mass, center-of-mass location, and moment of inertia come from
  standard anthropometric tables (Winter) scaled by an editable body mass.
  Velocity, acceleration, and force are entered in text boxes and kept
  mutually consistent — edit any one and the other two update via
  `a = Δv/Δt` and Newton's second law `F = m·a`. Center of mass is
  computed body-wide from every segment's current 3D pose (the segmental
  method); ground reaction force adds the isolated segment's inertial
  contribution to total body weight.
- **Reset pose** — restores the default standing pose.

## Files

- `index.html` — layout and controls
- `styles.css` — visual theme for the page chrome and side panel
  (the 3D model itself is rendered by WebGL, not styled with CSS)
- `app.js` — skeleton data model, 3D forward kinematics, Three.js scene
  and rendering, raycasting-based drag/select interaction, and the
  biomechanics model
- `vendor/three.min.js`, `vendor/OrbitControls.js` — the only external
  dependency (Three.js r128), vendored directly so the app stays
  offline-capable with no build step
