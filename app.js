(() => {
  "use strict";

  const VBW = 480, VBH = 640;
  const ROOT = { x: 240, y: 300 };

  // ---------------------------------------------------------------
  // Skeleton model: each joint is the END of a bone that starts at
  // its parent's current position. Angles are absolute (world-space,
  // atan2 convention: 0deg = +x/right, 90deg = +y/down, -90deg = up).
  // "draggable" joints can be rotated by the user; anchor joints
  // (shoulders/hips) are fixed offsets from the torso but still show
  // an angle readout. "angleChild" names the next joint down the
  // chain used to compute the flexion angle shown at this joint.
  // ---------------------------------------------------------------
  const BLUEPRINT = {
    pelvis:   { parent: null,      length: 0,   angle: 0,    draggable: "translate", label: "Pelvis" },
    chest:    { parent: "pelvis",  length: 90,  angle: -90,  draggable: true,  label: "Spine",       angleChild: "neck",   thickness: 13 },
    neck:     { parent: "chest",   length: 26,  angle: -90,  draggable: true,  label: "Neck",        angleChild: "head",   thickness: 8 },
    head:     { parent: "neck",    length: 34,  angle: -90,  draggable: true,  label: "Head",        thickness: 8, skull: true },

    shoulderL:{ parent: "chest",   length: 46,  angle: 180,  draggable: false, label: "Shoulder (L)", angleChild: "elbowL", thickness: 7 },
    shoulderR:{ parent: "chest",   length: 46,  angle: 0,    draggable: false, label: "Shoulder (R)", angleChild: "elbowR", thickness: 7 },
    hipL:     { parent: "pelvis",  length: 32,  angle: 180,  draggable: false, label: "Hip (L)",      angleChild: "kneeL",  thickness: 7 },
    hipR:     { parent: "pelvis",  length: 32,  angle: 0,    draggable: false, label: "Hip (R)",      angleChild: "kneeR",  thickness: 7 },

    elbowL:   { parent: "shoulderL", length: 84, angle: 100, draggable: true, label: "Elbow (L)", angleChild: "wristL", thickness: 11 },
    wristL:   { parent: "elbowL",    length: 74, angle: 100, draggable: true, label: "Wrist (L)", angleChild: "handL",  thickness: 9 },
    handL:    { parent: "wristL",    length: 26, angle: 100, draggable: true, label: "Hand (L)",  thickness: 7 },

    elbowR:   { parent: "shoulderR", length: 84, angle: 80,  draggable: true, label: "Elbow (R)", angleChild: "wristR", thickness: 11 },
    wristR:   { parent: "elbowR",    length: 74, angle: 80,  draggable: true, label: "Wrist (R)", angleChild: "handR",  thickness: 9 },
    handR:    { parent: "wristR",    length: 26, angle: 80,  draggable: true, label: "Hand (R)",  thickness: 7 },

    kneeL:    { parent: "hipL",   length: 108, angle: 95,  draggable: true, label: "Knee (L)",  angleChild: "ankleL", thickness: 13 },
    ankleL:   { parent: "kneeL",  length: 98,  angle: 90,  draggable: true, label: "Ankle (L)", angleChild: "footL",  thickness: 10 },
    footL:    { parent: "ankleL", length: 32,  angle: 165, draggable: true, label: "Foot (L)",  thickness: 8 },

    kneeR:    { parent: "hipR",   length: 108, angle: 85,  draggable: true, label: "Knee (R)",  angleChild: "ankleR", thickness: 13 },
    ankleR:   { parent: "kneeR",  length: 98,  angle: 90,  draggable: true, label: "Ankle (R)", angleChild: "footR",  thickness: 10 },
    footR:    { parent: "ankleR", length: 32,  angle: 15,  draggable: true, label: "Foot (R)",  thickness: 8 },
  };

  const JOINT_ORDER = Object.keys(BLUEPRINT);

  // ---------------------------------------------------------------
  // Lateral (side) view: a second, independently-posed blueprint using
  // the same joint hierarchy. The anterior blueprint spreads the
  // shoulders/hips wide left-to-right because that's what's visible
  // from the front; from the side that width isn't visible at all, so
  // here the girdle bones instead project forward a short distance,
  // and the two legs/arms lean slightly fore/aft of each other (rather
  // than left/right) to suggest the near and far limb, exactly the
  // depth cue a flat front view can't show.
  // ---------------------------------------------------------------
  const LATERAL_BLUEPRINT = {
    pelvis:   { parent: null,      length: 0,   angle: 0,    draggable: "translate", label: "Pelvis" },
    chest:    { parent: "pelvis",  length: 90,  angle: -90,  draggable: true,  label: "Spine",       angleChild: "neck",   thickness: 13 },
    neck:     { parent: "chest",   length: 26,  angle: -88,  draggable: true,  label: "Neck",        angleChild: "head",   thickness: 8 },
    head:     { parent: "neck",    length: 34,  angle: -84,  draggable: true,  label: "Head",        thickness: 8, skull: true },

    shoulderL:{ parent: "chest",   length: 14,  angle: -15,  draggable: false, label: "Shoulder (L)", angleChild: "elbowL", thickness: 7 },
    shoulderR:{ parent: "chest",   length: 11,  angle: 12,   draggable: false, label: "Shoulder (R)", angleChild: "elbowR", thickness: 7 },
    hipL:     { parent: "pelvis",  length: 12,  angle: 5,    draggable: false, label: "Hip (L)",      angleChild: "kneeL",  thickness: 7 },
    hipR:     { parent: "pelvis",  length: 10,  angle: 15,   draggable: false, label: "Hip (R)",      angleChild: "kneeR",  thickness: 7 },

    elbowL:   { parent: "shoulderL", length: 84, angle: 100, draggable: true, label: "Elbow (L)", angleChild: "wristL", thickness: 11 },
    wristL:   { parent: "elbowL",    length: 74, angle: 100, draggable: true, label: "Wrist (L)", angleChild: "handL",  thickness: 9 },
    handL:    { parent: "wristL",    length: 26, angle: 100, draggable: true, label: "Hand (L)",  thickness: 7 },

    elbowR:   { parent: "shoulderR", length: 84, angle: 92,  draggable: true, label: "Elbow (R)", angleChild: "wristR", thickness: 11 },
    wristR:   { parent: "elbowR",    length: 74, angle: 92,  draggable: true, label: "Wrist (R)", angleChild: "handR",  thickness: 9 },
    handR:    { parent: "wristR",    length: 26, angle: 92,  draggable: true, label: "Hand (R)",  thickness: 7 },

    kneeL:    { parent: "hipL",   length: 108, angle: 100, draggable: true, label: "Knee (L)",  angleChild: "ankleL", thickness: 13 },
    ankleL:   { parent: "kneeL",  length: 98,  angle: 90,  draggable: true, label: "Ankle (L)", angleChild: "footL",  thickness: 10 },
    footL:    { parent: "ankleL", length: 32,  angle: 8,   draggable: true, label: "Foot (L)",  thickness: 8 },

    kneeR:    { parent: "hipR",   length: 108, angle: 82,  draggable: true, label: "Knee (R)",  angleChild: "ankleR", thickness: 13 },
    ankleR:   { parent: "kneeR",  length: 98,  angle: 90,  draggable: true, label: "Ankle (R)", angleChild: "footR",  thickness: 10 },
    footR:    { parent: "ankleR", length: 32,  angle: 4,   draggable: true, label: "Foot (R)",  thickness: 8 },
  };

  // ---------------------------------------------------------------
  // Anthropometric segment table (Winter, "Biomechanics and Motor
  // Control of Human Movement" — standard adult segment parameters).
  // Each isolatable joint maps to the body segment it forms the
  // proximal or distal end of: massFrac is the segment's mass as a
  // fraction of total body mass; comFrac is the distance from the
  // segment's proximal end to its center of mass, as a fraction of
  // segment length; radGyrFrac is the radius of gyration about the
  // segment's own center of mass, also as a fraction of length;
  // lengthM is a representative adult segment length in meters.
  // ---------------------------------------------------------------
  const SEGMENTS = {
    chest:     { proximal: "pelvis", label: "Trunk",     massFrac: 0.477, comFrac: 0.50, radGyrFrac: 0.50,  lengthM: 0.52 },
    neck:      { proximal: "chest",  label: "Neck",      massFrac: 0.020, comFrac: 0.50, radGyrFrac: 0.50,  lengthM: 0.12 },
    head:      { proximal: "neck",   label: "Head",      massFrac: 0.081, comFrac: 0.55, radGyrFrac: 0.495, lengthM: 0.24 },
    shoulderL: { proximal: "chest",  label: "Clavicle (L)", massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.16 },
    shoulderR: { proximal: "chest",  label: "Clavicle (R)", massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.16 },
    hipL:      { proximal: "pelvis", label: "Pelvic girdle (L)", massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.13 },
    hipR:      { proximal: "pelvis", label: "Pelvic girdle (R)", massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.13 },
    elbowL:    { proximal: "shoulderL", label: "Upper arm (L)", massFrac: 0.028, comFrac: 0.436, radGyrFrac: 0.322, lengthM: 0.29 },
    elbowR:    { proximal: "shoulderR", label: "Upper arm (R)", massFrac: 0.028, comFrac: 0.436, radGyrFrac: 0.322, lengthM: 0.29 },
    wristL:    { proximal: "elbowL", label: "Forearm (L)", massFrac: 0.016, comFrac: 0.430, radGyrFrac: 0.303, lengthM: 0.26 },
    wristR:    { proximal: "elbowR", label: "Forearm (R)", massFrac: 0.016, comFrac: 0.430, radGyrFrac: 0.303, lengthM: 0.26 },
    handL:     { proximal: "wristL", label: "Hand (L)", massFrac: 0.006, comFrac: 0.506, radGyrFrac: 0.297, lengthM: 0.19 },
    handR:     { proximal: "wristR", label: "Hand (R)", massFrac: 0.006, comFrac: 0.506, radGyrFrac: 0.297, lengthM: 0.19 },
    kneeL:     { proximal: "hipL", label: "Thigh (L)", massFrac: 0.100, comFrac: 0.433, radGyrFrac: 0.323, lengthM: 0.42 },
    kneeR:     { proximal: "hipR", label: "Thigh (R)", massFrac: 0.100, comFrac: 0.433, radGyrFrac: 0.323, lengthM: 0.42 },
    ankleL:    { proximal: "kneeL", label: "Shank (L)", massFrac: 0.0465, comFrac: 0.433, radGyrFrac: 0.302, lengthM: 0.43 },
    ankleR:    { proximal: "kneeR", label: "Shank (R)", massFrac: 0.0465, comFrac: 0.433, radGyrFrac: 0.302, lengthM: 0.43 },
    footL:     { proximal: "ankleL", label: "Foot (L)", massFrac: 0.0145, comFrac: 0.50, radGyrFrac: 0.475, lengthM: 0.26 },
    footR:     { proximal: "ankleR", label: "Foot (R)", massFrac: 0.0145, comFrac: 0.50, radGyrFrac: 0.475, lengthM: 0.26 },
  };
  const G = 9.81; // m/s^2

  const BLUEPRINTS = { anterior: BLUEPRINT, lateral: LATERAL_BLUEPRINT };

  function freshState(view) {
    const joints = {};
    const blueprint = BLUEPRINTS[view];
    for (const id of JOINT_ORDER) {
      joints[id] = { ...blueprint[id] };
    }
    joints.pelvis.x = ROOT.x;
    joints.pelvis.y = ROOT.y;
    return joints;
  }

  // each view keeps its own pose, so switching back and forth doesn't
  // lose whatever the user has posed in the other view
  const poseByView = {
    anterior: freshState("anterior"),
    lateral: freshState("lateral"),
  };

  const state = {
    view: "anterior",
    joints: poseByView.anterior,
    selected: null,
    dragging: null,
    bodyMass: 70,
    bio: { force: false, velocity: false, acceleration: false, moment: false, com: false, grf: false },
    kinetics: { v: 0, a: 0, F: 0, dt: 0.2 },
  };

  // ---------------------------------------------------------------
  // Biomechanics: segment mass/inertia, and the v <-> a <-> F coupling
  // ---------------------------------------------------------------
  function getSegmentInfo(jointId) {
    const seg = SEGMENTS[jointId];
    if (!seg) return null;
    const m = seg.massFrac * state.bodyMass;
    const r = seg.comFrac * seg.lengthM;
    const radGyr = seg.radGyrFrac * seg.lengthM;
    const iCom = m * radGyr * radGyr;
    const iJoint = iCom + m * r * r; // parallel axis theorem
    return { ...seg, m, r, iCom, iJoint };
  }

  function setVelocity(v) {
    state.kinetics.v = v;
    state.kinetics.a = v / state.kinetics.dt;
    const info = getSegmentInfo(state.selected);
    state.kinetics.F = info ? info.m * state.kinetics.a : 0;
  }

  function setAcceleration(a) {
    state.kinetics.a = a;
    state.kinetics.v = a * state.kinetics.dt;
    const info = getSegmentInfo(state.selected);
    state.kinetics.F = info ? info.m * a : 0;
  }

  function setForce(F) {
    state.kinetics.F = F;
    const info = getSegmentInfo(state.selected);
    const a = info && info.m > 0 ? F / info.m : 0;
    state.kinetics.a = a;
    state.kinetics.v = a * state.kinetics.dt;
  }

  function resetKinetics() {
    state.kinetics.v = 0;
    state.kinetics.a = 0;
    state.kinetics.F = 0;
  }

  function computeBodyCOM(pos) {
    let sumX = 0, sumY = 0, sumM = 0;
    for (const [jointId, seg] of Object.entries(SEGMENTS)) {
      const proximal = pos[seg.proximal];
      const distal = pos[jointId];
      const comX = proximal.x + (distal.x - proximal.x) * seg.comFrac;
      const comY = proximal.y + (distal.y - proximal.y) * seg.comFrac;
      sumX += comX * seg.massFrac;
      sumY += comY * seg.massFrac;
      sumM += seg.massFrac;
    }
    return { x: sumX / sumM, y: sumY / sumM };
  }

  function computeGRF() {
    const bodyWeight = state.bodyMass * G;
    const info = getSegmentInfo(state.selected);
    if (!info) return bodyWeight;
    // Simplified single-segment model: treats the isolated segment's
    // acceleration as vertical and adds its inertial force to total
    // body weight, the same form as the classic "person on a scale in
    // an accelerating elevator" result, F = W + m*a.
    return bodyWeight + info.m * state.kinetics.a;
  }

  // ---------------------------------------------------------------
  // Forward kinematics
  // ---------------------------------------------------------------
  function computePositions() {
    const pos = {};
    for (const id of JOINT_ORDER) {
      const j = state.joints[id];
      if (j.parent === null) {
        pos[id] = { x: j.x, y: j.y };
      } else {
        const p = pos[j.parent];
        const rad = (j.angle * Math.PI) / 180;
        pos[id] = { x: p.x + j.length * Math.cos(rad), y: p.y + j.length * Math.sin(rad) };
      }
    }
    return pos;
  }

  function jointFlexion(aVec, bVec) {
    const a1 = Math.atan2(aVec.y, aVec.x);
    const a2 = Math.atan2(bVec.y, bVec.x);
    let diff = a2 - a1;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = Math.abs(diff) * (180 / Math.PI);
    return Math.round(180 - turn);
  }

  function getFlexionAngle(id, pos) {
    const j = state.joints[id];
    if (!j.angleChild || !j.parent) return null;
    const incoming = { x: pos[id].x - pos[j.parent].x, y: pos[id].y - pos[j.parent].y };
    const childId = j.angleChild;
    const outgoing = { x: pos[childId].x - pos[id].x, y: pos[childId].y - pos[id].y };
    return jointFlexion(incoming, outgoing);
  }

  // ---------------------------------------------------------------
  // Range of motion: typical adult normal ranges (goniometry
  // references, degrees of flexion from anatomical zero). Our own
  // flexion angle is 180 = fully extended, 0 = fully folded, so it
  // converts to "degrees of flexion" as flex = 180 - angle. That
  // scale can't go negative, so this model has no way to represent
  // hyperextension past neutral -- flagged in the UI copy rather
  // than silently ignored.
  // ---------------------------------------------------------------
  const ROM_RANGES = {
    chest:     { label: "Trunk flexion", max: 80 },
    neck:      { label: "Neck flexion", max: 50 },
    shoulderL: { label: "Shoulder flexion", max: 180 },
    shoulderR: { label: "Shoulder flexion", max: 180 },
    elbowL:    { label: "Elbow flexion", max: 150 },
    elbowR:    { label: "Elbow flexion", max: 150 },
    wristL:    { label: "Wrist flexion", max: 80 },
    wristR:    { label: "Wrist flexion", max: 80 },
    hipL:      { label: "Hip flexion", max: 120 },
    hipR:      { label: "Hip flexion", max: 120 },
    kneeL:     { label: "Knee flexion", max: 135 },
    kneeR:     { label: "Knee flexion", max: 135 },
    ankleL:    { label: "Ankle flexion (dorsi + plantar)", max: 70 },
    ankleR:    { label: "Ankle flexion (dorsi + plantar)", max: 70 },
  };

  function getRomInfo(jointId, pos) {
    const rom = ROM_RANGES[jointId];
    if (!rom) return null;
    const angle = getFlexionAngle(jointId, pos);
    if (angle === null) return null;
    const flex = 180 - angle;
    return { ...rom, flex, exceeds: flex > rom.max };
  }

  // ---------------------------------------------------------------
  // SVG helpers
  // ---------------------------------------------------------------
  const SVG_NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("skeletonSvg");
  const gShapes = document.getElementById("shapesGroup");
  const gBones = document.getElementById("bonesGroup");
  const gMarks = document.getElementById("marksGroup");
  const gBio = document.getElementById("bioGroup");
  const gJoints = document.getElementById("jointsGroup");
  const gLabels = document.getElementById("labelsGroup");

  function el(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function isRelated(id) {
    if (!state.selected) return true; // nothing isolated -> nothing dimmed
    if (id === state.selected) return true;
    const sel = state.joints[state.selected];
    if (sel.parent === id) return true;
    if (sel.angleChild === id) return true;
    return false;
  }

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  function render() {
    const pos = computePositions();
    const screenPos = pos;

    clear(gShapes);
    clear(gBones);
    clear(gMarks);
    clear(gBio);
    clear(gJoints);
    clear(gLabels);

    drawSkeletonBody(screenPos);
    drawBiomechanics(screenPos, pos);
    drawJoints(screenPos, pos);

    renderSidePanel(pos);
    updateRomPanel(pos);
    updateBioPanel(pos);
    syncMassInputs();
  }

  // both the toolbar and the empty-state panel expose a body-mass
  // field; keep whichever one isn't currently being typed into in sync
  function syncMassInputs() {
    MASS_INPUT_IDS.forEach((id) => {
      const input = document.getElementById(id);
      if (document.activeElement !== input) input.value = state.bodyMass;
    });
  }

  // -- isolation helpers for shape rendering -----------------------
  function relatedIds() {
    if (!state.selected) return null;
    const sel = state.joints[state.selected];
    return new Set([state.selected, sel.parent, sel.angleChild].filter(Boolean));
  }

  function shapeClass(base, ids) {
    const rs = relatedIds();
    if (!rs) return base;
    const hit = ids.some((id) => rs.has(id));
    return `${base} ${hit ? "related" : "dimmed"}`;
  }

  function screenAngle(a, b) {
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  }

  // -- long-bone silhouette (shaft with flared, rounded ends) ------
  function longBonePath(L, hs, he, flare) {
    const f = Math.max(4, Math.min(flare, L / 2 - 2));
    return [
      `M 0 ${-he}`,
      `C ${he * 0.6} ${-he} ${f * 0.5} ${-hs} ${f} ${-hs}`,
      `L ${L - f} ${-hs}`,
      `C ${L - f * 0.5} ${-hs} ${L - he * 0.6} ${-he} ${L} ${-he}`,
      `C ${L + he * 0.9} ${-he * 0.3} ${L + he * 0.9} ${he * 0.3} ${L} ${he}`,
      `C ${L - he * 0.6} ${he} ${L - f * 0.5} ${hs} ${L - f} ${hs}`,
      `L ${f} ${hs}`,
      `C ${f * 0.5} ${hs} ${he * 0.6} ${he} 0 ${he}`,
      `C ${-he * 0.9} ${he * 0.3} ${-he * 0.9} ${-he * 0.3} 0 ${-he}`,
      "Z",
    ].join(" ");
  }

  function drawLongBone(group, a, b, hs, he, flare, offset, cls, seamCls) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const nx = -dy / L, ny = dx / L;
    const ox = a.x + nx * offset, oy = a.y + ny * offset;
    const transform = `translate(${ox} ${oy}) rotate(${angleDeg})`;
    group.appendChild(
      el("path", { d: longBonePath(L, hs, he, flare), class: cls, transform })
    );
    if (seamCls) {
      const f = Math.max(4, Math.min(flare, L / 2 - 2));
      group.appendChild(
        el("line", { x1: f * 1.3, y1: 0, x2: L - f * 1.3, y2: 0, class: seamCls, transform })
      );
    }
  }

  // -- pelvis: iliac wings flaring from a narrower hip/pubic waist --
  function drawPelvis(group, holeGroup, screenPos) {
    const pel = screenPos.pelvis, hl = screenPos.hipL, hr = screenPos.hipR;
    const cls = shapeClass("torso-shape", ["pelvis"]);
    const holeCls = shapeClass("bone-hole", ["pelvis"]);
    const topY = pel.y - 22, waistY = pel.y + 2, botY = pel.y + 24;
    const d = `
      M ${pel.x} ${topY - 10}
      C ${hl.x + 6} ${topY - 14} ${hl.x - 10} ${topY - 2} ${hl.x - 8} ${topY + 8}
      C ${hl.x - 6} ${topY + 18} ${hl.x + 4} ${waistY - 4} ${hl.x + 10} ${waistY + 6}
      C ${pel.x - 16} ${botY - 8} ${pel.x - 10} ${botY + 12} ${pel.x} ${botY + 6}
      C ${pel.x + 10} ${botY + 12} ${pel.x + 16} ${botY - 8} ${hr.x - 10} ${waistY + 6}
      C ${hr.x - 4} ${waistY - 4} ${hr.x + 6} ${topY + 18} ${hr.x + 8} ${topY + 8}
      C ${hr.x + 10} ${topY - 2} ${hr.x - 6} ${topY - 14} ${pel.x} ${topY - 10}
      Z`;
    group.appendChild(el("path", { d, class: cls }));

    // obturator foramina: the two characteristic openings in the pubic arch
    for (const side of [-1, 1]) {
      const ox = pel.x + side * (hl.x - pel.x) * 0.42;
      const oy = waistY + 16;
      holeGroup.appendChild(
        el("ellipse", { cx: ox, cy: oy, rx: 8, ry: 12, class: holeCls })
      );
    }
  }

  // -- vertebral column: a stack of small bodies along a segment ----
  function drawVertebrae(group, from, to, count, wStart, wEnd, cls) {
    const ang = screenAngle(from, to) + 90;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const w = wStart + (wEnd - wStart) * t;
      const transform = `translate(${x} ${y}) rotate(${ang})`;
      group.appendChild(
        el("rect", { x: -w / 2, y: -4, width: w, height: 8, rx: 2.5, class: cls, transform })
      );
    }
  }

  // -- ribcage, sternum, costal cartilage, spine column -------------
  function drawTorso(gShapes, gMarks, screenPos) {
    const chest = screenPos.chest, pelvis = screenPos.pelvis;
    const rot = screenAngle(pelvis, chest) + 90;
    const len = Math.hypot(chest.x - pelvis.x, chest.y - pelvis.y);
    const midX = (chest.x + pelvis.x) / 2;
    const midY = (chest.y + pelvis.y) / 2 - len * 0.08;
    const cls = shapeClass("torso-shape", ["chest", "pelvis"]);
    const markCls = shapeClass("detail-mark", ["chest", "pelvis"]);
    const cartCls = shapeClass("cartilage-mark", ["chest", "pelvis"]);

    const rib = el("ellipse", {
      cx: midX, cy: midY, rx: 50, ry: 56,
      class: cls, transform: `rotate(${rot} ${midX} ${midY})`,
    });
    gShapes.appendChild(rib);

    const ribCount = 7;
    for (let i = 0; i < ribCount; i++) {
      const dy = -38 + i * 12.5;
      const rx = 43 - Math.abs(dy) * 0.15;
      gMarks.appendChild(
        el("path", {
          d: `M ${midX - rx} ${midY + dy} A ${rx} 9 0 0 0 ${midX + rx} ${midY + dy}`,
          class: markCls,
          transform: `rotate(${rot} ${midX} ${midY})`,
        })
      );
      // costal cartilage: connects the front of each rib to the sternum
      if (i > 0) {
        gMarks.appendChild(
          el("path", {
            d: `M ${midX - rx * 0.55} ${midY + dy - 3} Q ${midX - 6} ${midY + dy + 4} ${midX - 5} ${midY + dy + 10}`,
            class: cartCls,
            transform: `rotate(${rot} ${midX} ${midY})`,
          })
        );
        gMarks.appendChild(
          el("path", {
            d: `M ${midX + rx * 0.55} ${midY + dy - 3} Q ${midX + 6} ${midY + dy + 4} ${midX + 5} ${midY + dy + 10}`,
            class: cartCls,
            transform: `rotate(${rot} ${midX} ${midY})`,
          })
        );
      }
    }

    // sternum: manubrium (wider) tapering into the narrower body
    gShapes.appendChild(
      el("path", {
        d: `M ${midX - 8} ${midY - 34} L ${midX + 8} ${midY - 34} L ${midX + 6} ${midY - 18}
            L ${midX + 4.5} ${midY - 18} L ${midX + 4.5} ${midY + 16} L ${midX - 4.5} ${midY + 16}
            L ${midX - 4.5} ${midY - 18} L ${midX - 6} ${midY - 18} Z`,
        class: cls,
        transform: `rotate(${rot} ${midX} ${midY})`,
      })
    );

    drawVertebrae(gShapes, pelvis, chest, 5, 15, 12, cls);
    drawVertebrae(gShapes, chest, screenPos.neck, 3, 10, 8, shapeClass("torso-shape", ["chest", "neck"]));
  }

  // -- skull: cranium, jaw, eye sockets, nose, and teeth -------------
  function drawSkull(gShapes, gMarks, screenPos) {
    const head = screenPos.head, neck = screenPos.neck;
    const rot = screenAngle(neck, head) + 90;
    const cx = neck.x + (head.x - neck.x) * 0.55;
    const cy = neck.y + (head.y - neck.y) * 0.55;
    const cls = shapeClass("torso-shape", ["head", "neck"]);
    const markCls = shapeClass("detail-mark", ["head", "neck"]);
    const transform = `translate(${cx} ${cy}) rotate(${rot})`;

    gShapes.appendChild(
      el("path", {
        d: "M -22 4 C -24 -14 -12 -25 0 -25 C 12 -25 24 -14 22 4 C 21 10 15 13 8 14 L -8 14 C -15 13 -21 10 -22 4 Z",
        class: cls, transform,
      })
    );
    gShapes.appendChild(
      el("path", { d: "M -8 14 C -9 22 -5 29 0 30 C 5 29 9 22 8 14 Z", class: cls, transform })
    );
    const socketCls = shapeClass("eye-socket", ["head", "neck"]);
    gMarks.appendChild(el("circle", { cx: -8, cy: 0, r: 4.5, class: socketCls, transform }));
    gMarks.appendChild(el("circle", { cx: 8, cy: 0, r: 4.5, class: socketCls, transform }));
    gMarks.appendChild(el("path", { d: "M -2 6 L 2 6 L 0 11 Z", class: markCls, transform }));
    for (let i = -4; i <= 4; i++) {
      const tx = i * 1.6;
      gMarks.appendChild(
        el("line", { x1: tx, y1: 25, x2: tx, y2: 28.5, class: markCls, transform })
      );
    }
  }

  // -- lateral (side-view) torso: an asymmetric profile silhouette --
  // -- deeper at the front (chest/belly) than the back (spine curve) --
  function drawPelvisLateral(group, screenPos) {
    const pel = screenPos.pelvis, chest = screenPos.chest;
    const rot = screenAngle(pel, chest) + 90;
    const cls = shapeClass("torso-shape", ["pelvis"]);
    const transform = `translate(${pel.x} ${pel.y}) rotate(${rot})`;
    const d = `
      M -14 -8
      C -21 -3 -21 10 -14 16
      C -7 22 7 24 17 18
      C 25 13 25 1 18 -7
      C 12 -15 -4 -15 -14 -8
      Z`;
    group.appendChild(el("path", { d, class: cls, transform }));
  }

  function drawTorsoLateral(gShapes, gMarks, screenPos) {
    const chest = screenPos.chest, pelvis = screenPos.pelvis;
    const rot = screenAngle(pelvis, chest) + 90;
    const len = Math.hypot(chest.x - pelvis.x, chest.y - pelvis.y);
    const midX = (chest.x + pelvis.x) / 2;
    const midY = (chest.y + pelvis.y) / 2;
    const cls = shapeClass("torso-shape", ["chest", "pelvis"]);
    const markCls = shapeClass("detail-mark", ["chest", "pelvis"]);
    const transform = `translate(${midX} ${midY}) rotate(${rot})`;
    const h = len * 0.6;

    const d = `
      M 0 ${-h}
      C -10 ${-h + 6} -16 ${-h * 0.5} -15 ${-h * 0.1}
      C -14 ${h * 0.25} -10 ${h * 0.55} -3 ${h * 0.78}
      L 6 ${h * 0.82}
      C 34 ${h * 0.6} 40 ${h * 0.15} 38 ${-h * 0.15}
      C 36 ${-h * 0.45} 26 ${-h * 0.7} 14 ${-h * 0.86}
      C 8 ${-h * 0.95} 4 ${-h} 0 ${-h}
      Z`;
    gShapes.appendChild(el("path", { d, class: cls, transform }));

    const ribCount = 6;
    for (let i = 0; i < ribCount; i++) {
      const t = (i + 0.5) / ribCount;
      const y = -h * 0.78 + t * h * 1.15;
      const backX = -13 + t * 5;
      const frontX = 20 + t * 12;
      gMarks.appendChild(
        el("path", {
          d: `M ${backX} ${y - 4} Q ${(backX + frontX) / 2} ${y + 4} ${frontX} ${y}`,
          class: markCls,
          transform,
        })
      );
    }

    drawVertebrae(gShapes, pelvis, chest, 5, 15, 12, cls);
    drawVertebrae(gShapes, chest, screenPos.neck, 3, 10, 8, shapeClass("torso-shape", ["chest", "neck"]));
  }

  // -- lateral skull: cranium, jaw, one eye, ear, and a nose in profile
  function drawSkullLateral(gShapes, gMarks, screenPos) {
    const head = screenPos.head, neck = screenPos.neck;
    const rot = screenAngle(neck, head) + 90;
    const cx = neck.x + (head.x - neck.x) * 0.55;
    const cy = neck.y + (head.y - neck.y) * 0.55;
    const cls = shapeClass("torso-shape", ["head", "neck"]);
    const markCls = shapeClass("detail-mark", ["head", "neck"]);
    const transform = `translate(${cx} ${cy}) rotate(${rot})`;

    gShapes.appendChild(
      el("path", {
        d: `M 0 -25
            C -13 -25 -19 -15 -18 -3
            C -17 4 -14 8 -10 11
            L -10 15
            C -10 20 -6 23 -1 23
            L 8 23
            C 12 23 14 19 15 15
            C 18 11 21 6 19 0
            C 18 -4 15 -4 14 -8
            C 17 -13 15 -20 10 -23
            C 7 -25 3 -25 0 -25
            Z`,
        class: cls, transform,
      })
    );
    const socketCls = shapeClass("eye-socket", ["head", "neck"]);
    gMarks.appendChild(el("circle", { cx: 7, cy: -4, r: 3.2, class: socketCls, transform }));
    gMarks.appendChild(el("circle", { cx: -12, cy: 0, r: 3.2, class: markCls, transform }));
    gMarks.appendChild(el("path", { d: "M 15 -2 L 19 1 L 15 4", class: markCls, transform }));
    gMarks.appendChild(el("line", { x1: 8, y1: 17, x2: 13, y2: 16, class: markCls, transform }));
  }

  function drawClavicle(group, chest, shoulder, side, cls, fillCls) {
    const dx = shoulder.x - chest.x, dy = shoulder.y - chest.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = -dy / len, uy = dx / len;
    const bow = Math.min(7, len * 0.35) * side;
    const c1x = chest.x + dx * 0.3 + ux * bow, c1y = chest.y + dy * 0.3 + uy * bow;
    const c2x = chest.x + dx * 0.7 - ux * bow, c2y = chest.y + dy * 0.7 - uy * bow;
    const d = `M ${chest.x} ${chest.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${shoulder.x} ${shoulder.y}`;
    group.appendChild(el("path", { d, class: cls, style: "stroke-width:9px" }));
    group.appendChild(el("path", { d, class: fillCls, style: "stroke-width:5px" }));
  }

  function drawHand(group, wrist, hand, cls) {
    const dx = hand.x - wrist.x, dy = hand.y - wrist.y;
    const L = Math.hypot(dx, dy) || 1;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const g = el("g", { transform: `translate(${wrist.x} ${wrist.y}) rotate(${angleDeg})` });
    g.appendChild(
      el("path", {
        d: `M 0 -6 C ${L * 0.4} -8 ${L * 0.68} -7 ${L * 0.72} -4 L ${L * 0.72} 4 C ${L * 0.68} 7 ${L * 0.4} 8 0 6 Z`,
        class: cls,
      })
    );
    for (let i = -1.5; i <= 1.5; i++) {
      const fy = i * 3.2;
      const flen = L * 0.32 - Math.abs(i) * L * 0.05;
      g.appendChild(
        el("line", {
          x1: L * 0.72, y1: fy * 0.9, x2: L * 0.72 + flen, y2: fy,
          class: cls, "stroke-width": 2.4, "stroke-linecap": "round",
        })
      );
    }
    group.appendChild(g);
  }

  function drawFoot(group, ankle, toe, cls) {
    const dx = toe.x - ankle.x, dy = toe.y - ankle.y;
    const L = Math.hypot(dx, dy) || 1;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const g = el("g", { transform: `translate(${ankle.x} ${ankle.y}) rotate(${angleDeg})` });
    g.appendChild(
      el("path", {
        d: `M -8 -6 C 4 -8 ${L * 0.7} -7 ${L * 0.88} -3 L ${L} 0 L ${L * 0.88} 3 C ${L * 0.7} 7 4 8 -8 6 C -13 3 -13 -3 -8 -6 Z`,
        class: cls,
      })
    );
    for (let i = 0; i < 4; i++) {
      const fy = -4.2 + i * 2.8;
      g.appendChild(
        el("line", {
          x1: L * 0.9, y1: fy * 0.55, x2: L * 0.98 + (i === 0 ? 4 : 2), y2: fy * 0.55,
          class: cls, "stroke-width": 2, "stroke-linecap": "round",
        })
      );
    }
    group.appendChild(g);
  }

  function drawSkeletonBody(screenPos) {
    if (state.view === "lateral") {
      drawPelvisLateral(gShapes, screenPos);
      drawTorsoLateral(gShapes, gMarks, screenPos);
      drawSkullLateral(gShapes, gMarks, screenPos);
    } else {
      drawPelvis(gShapes, gShapes, screenPos);
      drawTorso(gShapes, gMarks, screenPos);
      drawSkull(gShapes, gMarks, screenPos);
    }

    for (const side of ["L", "R"]) {
      const chest = screenPos.chest;
      const shoulder = screenPos["shoulder" + side];
      const elbow = screenPos["elbow" + side];
      const wrist = screenPos["wrist" + side];
      const hand = screenPos["hand" + side];
      const hip = screenPos["hip" + side];
      const knee = screenPos["knee" + side];
      const ankle = screenPos["ankle" + side];
      const foot = screenPos["foot" + side];

      drawClavicle(
        gBones, chest, shoulder, side === "L" ? -1 : 1,
        shapeClass("clavicle", ["shoulder" + side]),
        shapeClass("clavicle-fill", ["shoulder" + side])
      );
      drawLongBone(gBones, shoulder, elbow, 6, 10, 16, 0, shapeClass("bone-shape", ["elbow" + side]), shapeClass("bone-seam", ["elbow" + side]));
      drawLongBone(gBones, elbow, wrist, 4.5, 7, 12, 3, shapeClass("bone-shape", ["wrist" + side]), shapeClass("bone-seam", ["wrist" + side]));
      drawLongBone(gBones, elbow, wrist, 3.5, 6, 10, -3, shapeClass("bone-shape-thin", ["wrist" + side]));
      drawHand(gBones, wrist, hand, shapeClass("bone-shape", ["hand" + side]));

      drawLongBone(gBones, hip, knee, 8, 14, 18, 0, shapeClass("bone-shape", ["knee" + side]), shapeClass("bone-seam", ["knee" + side]));
      drawLongBone(gBones, knee, ankle, 6, 10, 14, -3, shapeClass("bone-shape", ["ankle" + side]), shapeClass("bone-seam", ["ankle" + side]));
      drawLongBone(gBones, knee, ankle, 3, 5, 8, 6, shapeClass("bone-shape-thin", ["ankle" + side]));
      drawFoot(gBones, ankle, foot, shapeClass("bone-shape", ["foot" + side]));

      gMarks.appendChild(el("circle", { cx: knee.x, cy: knee.y, r: 6, class: shapeClass("detail-mark", ["knee" + side]) }));
    }
  }

  function drawJoints(screenPos, modelPos) {
    for (const id of JOINT_ORDER) {
      const j = state.joints[id];
      const p = screenPos[id];
      const related = isRelated(id);
      const selected = state.selected === id;
      const draggable = j.draggable === true || j.draggable === "translate";

      const cls = ["joint-handle"];
      if (draggable) cls.push("draggable");
      if (selected) cls.push("selected");
      if (state.dragging === id) cls.push("dragging");
      if (!related) cls.push("dimmed");

      const r = j.draggable === false ? (selected ? 7 : 4) : selected ? 11 : 6.5;

      const circle = el("circle", {
        cx: p.x, cy: p.y, r,
        class: cls.join(" "),
        "data-joint": id,
      });
      gJoints.appendChild(circle);

      const dot = el("circle", {
        cx: p.x, cy: p.y, r: 2,
        class: `joint-dot ${selected ? "selected" : ""} ${!related ? "dimmed" : ""}`.trim(),
      });
      gJoints.appendChild(dot);

      // angle label
      const angle = getFlexionAngle(id, modelPos);
      if (angle !== null) {
        const showLabel = selected;
        const labelCls = ["angle-label"];
        if (selected) labelCls.push("selected");
        if (!showLabel) labelCls.push("dimmed");
        const text = el("text", {
          x: p.x + 12, y: p.y - 10,
          class: labelCls.join(" "),
        });
        text.textContent = `${angle}°`;
        gLabels.appendChild(text);
      }
    }
  }

  // -- biomechanics markers: vectors, moment arc, COM, GRF ----------
  function drawVector(group, x, y, dirX, dirY, value, pxPerUnit, maxLen, cls, label, unit) {
    let len = value * pxPerUnit;
    const sign = len < 0 ? -1 : 1;
    len = Math.min(Math.abs(len), maxLen) * sign;
    if (Math.abs(len) < 3) return;

    const dx = dirX * len, dy = dirY * len;
    const tipX = x + dx, tipY = y + dy;
    const ang = Math.atan2(dy, dx);
    const headLen = 9, headWidth = 5;
    const backX = tipX - Math.cos(ang) * headLen, backY = tipY - Math.sin(ang) * headLen;
    const leftX = backX - Math.sin(ang) * headWidth, leftY = backY + Math.cos(ang) * headWidth;
    const rightX = backX + Math.sin(ang) * headWidth, rightY = backY - Math.cos(ang) * headWidth;

    group.appendChild(el("line", { x1: x, y1: y, x2: backX, y2: backY, class: `vec-line ${cls}` }));
    group.appendChild(el("path", { d: `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`, class: `vec-head ${cls}` }));

    const text = el("text", { x: tipX + dirX * 12, y: tipY + dirY * 12, class: `vec-label ${cls}` });
    text.textContent = `${label} ${value.toFixed(1)}${unit}`;
    group.appendChild(text);
  }

  function drawMomentArc(group, center, info) {
    const alpha = info.r > 0 ? state.kinetics.a / info.r : 0; // angular acceleration, rad/s^2
    const M = info.iJoint * alpha;
    if (Math.abs(M) < 0.05) return;

    const radius = 26;
    const sweepDeg = Math.min(30 + Math.abs(M) * 6, 260);
    const dir = M >= 0 ? 1 : -1; // positive M sweeps counter-clockwise
    const startDeg = -90;
    const endDeg = startDeg + dir * sweepDeg;
    const startRad = (startDeg * Math.PI) / 180, endRad = (endDeg * Math.PI) / 180;
    const startX = center.x + radius * Math.cos(startRad), startY = center.y + radius * Math.sin(startRad);
    const endX = center.x + radius * Math.cos(endRad), endY = center.y + radius * Math.sin(endRad);
    const largeArc = sweepDeg > 180 ? 1 : 0;
    const sweepFlag = dir > 0 ? 1 : 0;

    group.appendChild(
      el("path", { d: `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${endX} ${endY}`, class: "moment-arc" })
    );

    const radialX = Math.cos(endRad), radialY = Math.sin(endRad);
    const tangentX = -radialY * dir, tangentY = radialX * dir;
    const tipX = endX + tangentX * 4, tipY = endY + tangentY * 4;
    const backX = endX - tangentX * 6, backY = endY - tangentY * 6;
    const leftX = backX + radialX * 5, leftY = backY + radialY * 5;
    const rightX = backX - radialX * 5, rightY = backY - radialY * 5;
    group.appendChild(el("path", { d: `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`, class: "moment-head" }));

    const label = el("text", { x: center.x + radius + 6, y: center.y - radius, class: "vec-label", fill: "#b5852f" });
    label.textContent = `M ${M.toFixed(1)} N·m`;
    group.appendChild(label);
  }

  function drawComMarker(group, modelPos) {
    const com = computeBodyCOM(modelPos);
    const r = 9;
    group.appendChild(el("circle", { cx: com.x, cy: com.y, r, class: "com-marker" }));
    group.appendChild(el("line", { x1: com.x - r - 5, y1: com.y, x2: com.x + r + 5, y2: com.y, class: "com-crosshair" }));
    group.appendChild(el("line", { x1: com.x, y1: com.y - r - 5, x2: com.x, y2: com.y + r + 5, class: "com-crosshair" }));
    const label = el("text", { x: com.x + r + 8, y: com.y + 4, class: "com-label" });
    label.textContent = "COM";
    group.appendChild(label);
  }

  function drawGrfArrow(group, screenPos) {
    const fl = screenPos.footL, fr = screenPos.footR;
    const baseX = (fl.x + fr.x) / 2;
    const baseY = Math.max(fl.y, fr.y) + 16;
    const grf = computeGRF();
    const pxPerN = 0.16;
    const len = Math.min(Math.abs(grf) * pxPerN, 110);
    const tipY = baseY - len;

    group.appendChild(el("line", { x1: baseX, y1: baseY, x2: baseX, y2: tipY + 9, class: "grf-line" }));
    group.appendChild(el("path", { d: `M ${baseX} ${tipY} L ${baseX - 6} ${tipY + 9} L ${baseX + 6} ${tipY + 9} Z`, class: "grf-head" }));

    const label = el("text", { x: baseX + 10, y: baseY - len / 2, class: "grf-label" });
    label.textContent = `GRF ${grf.toFixed(0)} N`;
    group.appendChild(label);
  }

  function drawBiomechanics(screenPos, modelPos) {
    if (state.bio.com) drawComMarker(gBio, modelPos);
    if (!state.selected) return;

    const info = getSegmentInfo(state.selected);
    if (!info) return;

    if (state.bio.grf) drawGrfArrow(gBio, screenPos);

    const jointPos = screenPos[state.selected];
    const proxPos = screenPos[info.proximal];
    const dx = jointPos.x - proxPos.x, dy = jointPos.y - proxPos.y;
    const boneLen = Math.hypot(dx, dy) || 1;
    const ux = dx / boneLen, uy = dy / boneLen;
    const tangentX = -uy, tangentY = ux;
    const comX = proxPos.x + dx * info.comFrac;
    const comY = proxPos.y + dy * info.comFrac;

    if (state.bio.velocity) {
      drawVector(gBio, comX - ux * 14, comY - uy * 14, tangentX, tangentY, state.kinetics.v, 14, 80, "vec-velocity", "v", " m/s");
    }
    if (state.bio.acceleration) {
      drawVector(gBio, comX, comY, tangentX, tangentY, state.kinetics.a, 4, 80, "vec-accel", "a", " m/s²");
    }
    if (state.bio.force) {
      drawVector(gBio, comX + ux * 14, comY + uy * 14, tangentX, tangentY, state.kinetics.F, 0.4, 80, "vec-force", "F", " N");
    }
    if (state.bio.moment) {
      // the moment acts about the segment's pivot (its proximal joint),
      // not the isolated joint itself, which is the segment's far end
      drawMomentArc(gBio, proxPos, info);
    }
  }

  function renderSidePanel(modelPos) {
    const empty = document.getElementById("panelEmpty");
    const filled = document.getElementById("panelSelected");
    if (!state.selected) {
      empty.hidden = false;
      filled.hidden = true;
      return;
    }
    empty.hidden = true;
    filled.hidden = false;
    const j = state.joints[state.selected];
    document.getElementById("selJointName").textContent = j.label;
    const angle = getFlexionAngle(state.selected, modelPos);
    const angleEl = document.getElementById("selJointAngle");
    const caption = document.getElementById("selJointCaption");
    if (angle === null) {
      angleEl.textContent = "—";
      caption.textContent = "This joint has no further bone beyond it, so no flexion angle applies. Drag it to change the limb's orientation.";
    } else {
      angleEl.textContent = `${angle}°`;
      caption.textContent = "Angle between the two adjoining bones. 180° is fully extended, smaller values mean more flexed.";
    }
  }

  function updateRomPanel(modelPos) {
    const romSection = document.getElementById("romSection");
    const rom = state.selected ? getRomInfo(state.selected, modelPos) : null;

    if (!rom) {
      romSection.hidden = true;
      return;
    }
    romSection.hidden = false;

    document.getElementById("romLabel").textContent = rom.label;
    document.getElementById("romValueNum").textContent = `${Math.round(rom.flex)}°`;
    document.getElementById("romValueOf").textContent = `of 0–${rom.max}°`;

    const displayMax = rom.max * 1.3;
    const normalPct = Math.min(100, (rom.max / displayMax) * 100);
    document.getElementById("romNormalZone").style.width = `${normalPct}%`;
    const exceedZone = document.getElementById("romExceedZone");
    exceedZone.style.left = `${normalPct}%`;
    exceedZone.style.width = `${100 - normalPct}%`;

    const markerPct = Math.min(100, (rom.flex / displayMax) * 100);
    const marker = document.getElementById("romMarker");
    marker.style.left = `${markerPct}%`;
    marker.classList.toggle("exceeds", rom.exceeds);

    const caption = document.getElementById("romCaption");
    caption.classList.toggle("exceeds", rom.exceeds);
    caption.textContent = rom.exceeds
      ? `Exceeds the typical normal range by ${Math.round(rom.flex - rom.max)}°.`
      : "Within the typical normal range.";
  }

  // -- biomechanics side-panel readouts (updates existing DOM nodes -
  // -- values only - so a focused text input never loses the caret) --
  function setIfNotFocused(el, value) {
    if (document.activeElement !== el) el.value = value;
  }

  function updateBioPanel(modelPos) {
    const bioSection = document.getElementById("bioSection");
    const info = state.selected ? getSegmentInfo(state.selected) : null;

    if (!info) {
      bioSection.hidden = true;
      return;
    }
    bioSection.hidden = false;

    const pivotLabel = state.joints[info.proximal].label;
    document.getElementById("bioSegmentLabel").textContent =
      `Segment: ${info.label} · mass ≈ ${info.m.toFixed(2)} kg · pivots at ${pivotLabel}`;

    document.getElementById("fieldForce").hidden = !state.bio.force;
    document.getElementById("fieldVelocity").hidden = !state.bio.velocity;
    document.getElementById("fieldAcceleration").hidden = !state.bio.acceleration;
    document.getElementById("readoutMoment").hidden = !state.bio.moment;
    document.getElementById("readoutCom").hidden = !state.bio.com;
    document.getElementById("readoutGrf").hidden = !state.bio.grf;

    setIfNotFocused(document.getElementById("inputForce"), Math.round(state.kinetics.F * 100) / 100);
    setIfNotFocused(document.getElementById("inputVelocity"), Math.round(state.kinetics.v * 100) / 100);
    setIfNotFocused(document.getElementById("inputAcceleration"), Math.round(state.kinetics.a * 100) / 100);

    if (state.bio.moment) {
      const alpha = info.r > 0 ? state.kinetics.a / info.r : 0; // angular accel, rad/s^2
      const M = info.iJoint * alpha;
      document.getElementById("readoutMoment").innerHTML = `${M.toFixed(2)} N&middot;m`;
    }

    if (state.bio.com) {
      const com = computeBodyCOM(modelPos);
      document.getElementById("readoutCom").textContent = `x ${com.x.toFixed(0)}, y ${com.y.toFixed(0)} px`;
    }

    if (state.bio.grf) {
      const grf = computeGRF();
      document.getElementById("readoutGrf").textContent = `${grf.toFixed(0)} N`;
    }
  }

  // ---------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------
  function svgPointFromEvent(evt) {
    const rect = svg.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * VBW;
    const y = ((evt.clientY - rect.top) / rect.height) * VBH;
    return { x, y };
  }

  let activePointerId = null;

  const BIO_INPUT_IDS = ["inputForce", "inputVelocity", "inputAcceleration"];

  function selectJoint(id) {
    if (state.selected !== id) {
      resetKinetics();
      // clicking the SVG doesn't naturally blur a focused text field here
      // (pointerdown below calls preventDefault to stop drag-selection),
      // so drop focus explicitly or the reset value won't get displayed
      const active = document.activeElement;
      if (active && BIO_INPUT_IDS.includes(active.id)) active.blur();
    }
    state.selected = id;
  }

  function onPointerDown(evt) {
    const target = evt.target.closest("[data-joint]");
    if (!target) {
      // clicked empty space -> clear selection
      selectJoint(null);
      render();
      return;
    }
    const id = target.getAttribute("data-joint");
    selectJoint(id);

    const j = state.joints[id];
    if (j.draggable === true || j.draggable === "translate") {
      state.dragging = id;
      activePointerId = evt.pointerId;
      svg.setPointerCapture(evt.pointerId);
    }
    render();
    evt.preventDefault();
  }

  function onPointerMove(evt) {
    if (!state.dragging || evt.pointerId !== activePointerId) return;
    const modelPt = svgPointFromEvent(evt);
    const j = state.joints[state.dragging];

    if (j.draggable === "translate") {
      j.x = clamp(modelPt.x, 40, VBW - 40);
      j.y = clamp(modelPt.y, 40, VBH - 40);
    } else {
      const pos = computePositions();
      const p = pos[j.parent];
      const dx = modelPt.x - p.x;
      const dy = modelPt.y - p.y;
      j.angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    }
    render();
  }

  function onPointerUp(evt) {
    if (evt.pointerId === activePointerId) {
      try { svg.releasePointerCapture(evt.pointerId); } catch (e) {}
    }
    state.dragging = null;
    activePointerId = null;
    render();
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerUp);

  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      selectJoint(null);
      render();
    }
  });

  // ---------------------------------------------------------------
  // Toolbar wiring
  // ---------------------------------------------------------------
  document.getElementById("resetBtn").addEventListener("click", () => {
    poseByView[state.view] = freshState(state.view);
    state.joints = poseByView[state.view];
    selectJoint(null);
    render();
  });

  function setView(view) {
    if (state.view === view) return;
    state.view = view;
    state.joints = poseByView[view];
    document.getElementById("viewAnteriorBtn").classList.toggle("active", view === "anterior");
    document.getElementById("viewLateralBtn").classList.toggle("active", view === "lateral");
    selectJoint(null);
    render();
  }
  document.getElementById("viewAnteriorBtn").addEventListener("click", () => setView("anterior"));
  document.getElementById("viewLateralBtn").addEventListener("click", () => setView("lateral"));

  document.getElementById("clearSelectionBtn").addEventListener("click", () => {
    selectJoint(null);
    render();
  });

  const MASS_INPUT_IDS = ["bodyMassInput", "bodyMassInput2"];

  function setBodyMass(val) {
    if (!Number.isFinite(val) || val <= 0) return;
    state.bodyMass = val;
    // mass changed -> re-derive force from the current acceleration
    const info = getSegmentInfo(state.selected);
    if (info) {
      state.kinetics.F = info.m * state.kinetics.a;
    }
    render();
  }

  MASS_INPUT_IDS.forEach((id) => {
    document.getElementById(id).addEventListener("input", (evt) => {
      setBodyMass(parseFloat(evt.target.value));
    });
  });

  function wireBioToggle(checkboxId, key) {
    document.getElementById(checkboxId).addEventListener("change", (evt) => {
      state.bio[key] = evt.target.checked;
      render();
    });
  }
  wireBioToggle("toggleForce", "force");
  wireBioToggle("toggleVelocity", "velocity");
  wireBioToggle("toggleAcceleration", "acceleration");
  wireBioToggle("toggleMoment", "moment");
  wireBioToggle("toggleCom", "com");
  wireBioToggle("toggleGrf", "grf");

  document.getElementById("inputForce").addEventListener("input", (evt) => {
    const val = parseFloat(evt.target.value);
    if (Number.isFinite(val)) {
      setForce(val);
      render();
    }
  });
  document.getElementById("inputVelocity").addEventListener("input", (evt) => {
    const val = parseFloat(evt.target.value);
    if (Number.isFinite(val)) {
      setVelocity(val);
      render();
    }
  });
  document.getElementById("inputAcceleration").addEventListener("input", (evt) => {
    const val = parseFloat(evt.target.value);
    if (Number.isFinite(val)) {
      setAcceleration(val);
      render();
    }
  });

  render();
})();
