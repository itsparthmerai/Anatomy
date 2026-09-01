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
- **Anterior / Posterior toggle** — posterior view mirrors the figure
  horizontally, matching the real anatomical convention (the patient's
  right side appears on the viewer's right when viewed from behind).
- **Joint angle display** — a global switch shows the flexion angle
  (0–180°, where 180° is fully extended) at every joint.
- **Isolate a joint** — click any joint to fade everything else out and
  focus on just that joint's two adjoining bones, with its angle shown in
  the side panel regardless of the global toggle. Click empty space or
  press `Esc` to clear the selection.
- **Reset pose** — restores the default standing pose.

## Files

- `index.html` — layout and controls
- `styles.css` — dark, minimalist visual theme
- `app.js` — skeleton data model, forward kinematics, rendering, and
  pointer-based drag/select interaction (plain SVG + vanilla JS, no
  frameworks or build tools)
