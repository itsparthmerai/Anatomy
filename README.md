# Kinesis — Interactive 2D Skeleton

A dependency-free, single-page app for posing a 2D skeleton and reading the
angle at each joint.

## Run it

No build step — just open `index.html` in a browser, or serve the folder
with any static file server, e.g.:

```
python3 -m http.server 8080
```

then visit `http://localhost:8080`.

## Features

- **Drag any joint** to rotate the bone that ends there (forward-kinematics
  chain — rotating a shoulder carries the whole arm with it, rotating an
  elbow only moves the forearm/hand).
- **Body mass** — set it from either the toolbar or the side panel (the
  two fields stay in sync); it scales every segment's mass in the
  biomechanics calculations below.
- **Joint angle display** — a global switch shows the flexion angle
  (0–180°, where 180° is fully extended) at every joint.
- **Isolate a joint** — click any joint to fade everything else out and
  focus on just that joint's two adjoining bones, with its angle shown in
  the side panel regardless of the global toggle. Click empty space or
  press `Esc` to clear the selection.
- **Biomechanics, when a joint is isolated** — toggle Force, Velocity,
  Acceleration, Moment, Center of Mass, and Ground Reaction Force for the
  segment that joint controls. Segment mass, center-of-mass location, and
  moment of inertia come from standard anthropometric tables (Winter)
  scaled by an editable body mass. Velocity, acceleration, and force are
  entered in text boxes and kept mutually consistent — edit any one and
  the other two update via `a = Δv/Δt` and Newton's second law `F = m·a`.
  Center of mass is computed body-wide from every segment's current pose
  (the segmental method); ground reaction force adds the isolated
  segment's inertial contribution to total body weight.
- **Reset pose** — restores the default standing pose.

## Files

- `index.html` — layout and controls
- `styles.css` — light, coloring-book-style visual theme
- `app.js` — skeleton data model, forward kinematics, rendering,
  pointer-based drag/select interaction, and the biomechanics model
  (plain SVG + vanilla JS, no frameworks or build tools)
