(() => {
  "use strict";

  const VBW = 480, VBH = 640;
  const ROOT = { x: 240, y: 360 };

  // ---------------------------------------------------------------
  // Skeleton model: each joint is the END of a bone that starts at
  // its parent's current position. Angles are absolute (world-space,
  // atan2 convention: 0deg = +x/right, 90deg = +y/down, -90deg = up).
  // "draggable" joints can be rotated by the user; anchor joints
  // (shoulders/hips) are fixed offsets from the torso but still show
  // an angle readout. "angleChild" names the next joint down the
  // chain used to compute the flexion angle shown at this joint.
  // r0/r1 are the tube radii (start/end) used for the cartoon bone
  // rendering, tapering from the wide end (r0, at the parent) to the
  // narrow end (r1, at this joint).
  // ---------------------------------------------------------------
  const BLUEPRINT = {
    pelvis:   { parent: null,      length: 0,   angle: 0,    draggable: "translate", label: "Pelvis" },
    chest:    { parent: "pelvis",  length: 104, angle: -90,  draggable: true,  label: "Spine",       angleChild: "neck",   r0: 15, r1: 11 },
    neck:     { parent: "chest",   length: 26,  angle: -90,  draggable: true,  label: "Neck",        angleChild: "head",   r0: 9,  r1: 9 },
    head:     { parent: "neck",    length: 30,  angle: -90,  draggable: true,  label: "Head",        r0: 9, r1: 9, skull: true },

    shoulderL:{ parent: "chest",   length: 58,  angle: 172,  draggable: false, label: "Shoulder (L)", angleChild: "elbowL", r0: 15, r1: 14 },
    shoulderR:{ parent: "chest",   length: 58,  angle: 8,    draggable: false, label: "Shoulder (R)", angleChild: "elbowR", r0: 15, r1: 14 },
    hipL:     { parent: "pelvis",  length: 40,  angle: 180,  draggable: false, label: "Hip (L)",      angleChild: "kneeL",  r0: 14, r1: 14 },
    hipR:     { parent: "pelvis",  length: 40,  angle: 0,    draggable: false, label: "Hip (R)",      angleChild: "kneeR",  r0: 14, r1: 14 },

    elbowL:   { parent: "shoulderL", length: 68, angle: 105, draggable: true, label: "Elbow (L)", angleChild: "wristL", r0: 13, r1: 9 },
    wristL:   { parent: "elbowL",    length: 62, angle: 100, draggable: true, label: "Wrist (L)", angleChild: "handL",  r0: 9,  r1: 7 },
    handL:    { parent: "wristL",    length: 34, angle: 105, draggable: true, label: "Hand (L)",  r0: 7,  r1: 4 },

    elbowR:   { parent: "shoulderR", length: 68, angle: 75,  draggable: true, label: "Elbow (R)", angleChild: "wristR", r0: 13, r1: 9 },
    wristR:   { parent: "elbowR",    length: 62, angle: 80,  draggable: true, label: "Wrist (R)", angleChild: "handR",  r0: 9,  r1: 7 },
    handR:    { parent: "wristR",    length: 34, angle: 75,  draggable: true, label: "Hand (R)",  r0: 7,  r1: 4 },

    kneeL:    { parent: "hipL",   length: 92, angle: 92,  draggable: true, label: "Knee (L)",  angleChild: "ankleL", r0: 16, r1: 12 },
    ankleL:   { parent: "kneeL",  length: 84, angle: 89,  draggable: true, label: "Ankle (L)", angleChild: "footL",  r0: 12, r1: 9 },
    footL:    { parent: "ankleL", length: 42, angle: 165, draggable: true, label: "Foot (L)",  r0: 9,  r1: 5 },

    kneeR:    { parent: "hipR",   length: 92, angle: 88,  draggable: true, label: "Knee (R)",  angleChild: "ankleR", r0: 16, r1: 12 },
    ankleR:   { parent: "kneeR",  length: 84, angle: 91,  draggable: true, label: "Ankle (R)", angleChild: "footR",  r0: 12, r1: 9 },
    footR:    { parent: "ankleR", length: 42, angle: 15,  draggable: true, label: "Foot (R)",  r0: 9,  r1: 5 },
  };

  const JOINT_ORDER = Object.keys(BLUEPRINT);

  function freshState() {
    const joints = {};
    for (const id of JOINT_ORDER) {
      joints[id] = { ...BLUEPRINT[id] };
    }
    joints.pelvis.x = ROOT.x;
    joints.pelvis.y = ROOT.y;
    return joints;
  }

  const state = {
    joints: freshState(),
    view: "anterior",
    showAllAngles: false,
    selected: null,
    dragging: null,
  };

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

  function toScreen(pt) {
    return state.view === "posterior" ? { x: VBW - pt.x, y: pt.y } : { x: pt.x, y: pt.y };
  }

  function toModel(pt) {
    // mirroring is self-inverse
    return toScreen(pt);
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
  // SVG helpers
  // ---------------------------------------------------------------
  const SVG_NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("skeletonSvg");
  const gShapes = document.getElementById("shapesGroup");
  const gBones = document.getElementById("bonesGroup");
  const gMarks = document.getElementById("marksGroup");
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
    const screenPos = {};
    for (const id of JOINT_ORDER) screenPos[id] = toScreen(pos[id]);

    clear(gShapes);
    clear(gBones);
    clear(gMarks);
    clear(gJoints);
    clear(gLabels);

    drawSkeletonBody(screenPos);
    drawJoints(screenPos, pos);

    document.getElementById("viewTag").textContent =
      state.view === "anterior" ? "Anterior view" : "Posterior view";

    renderSidePanel(pos);
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

  // -- cartoon bone tube: a simple tapered capsule, rounded at both ends --
  function tubePath(L, r0, r1) {
    return [
      `M 0 ${-r0}`,
      `L ${L} ${-r1}`,
      `A ${r1} ${r1} 0 0 1 ${L} ${r1}`,
      `L 0 ${r0}`,
      `A ${r0} ${r0} 0 0 1 0 ${-r0}`,
      "Z",
    ].join(" ");
  }

  function drawBoneTube(group, a, b, r0, r1, cls) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const transform = `translate(${a.x} ${a.y}) rotate(${angleDeg})`;

    group.appendChild(el("path", { d: tubePath(L, r0, r1), class: cls, transform }));

    // a lighter strip along one edge, suggesting a rounded, lit surface
    const hr0 = r0 * 0.42, hr1 = r1 * 0.42;
    const hOffset = -((r0 + r1) / 2 - (hr0 + hr1) / 2) * 0.5;
    const hTransform = `translate(${a.x} ${a.y}) rotate(${angleDeg}) translate(0 ${hOffset})`;
    group.appendChild(
      el("path", { d: tubePath(L, hr0, hr1), class: shapeClassSwap(cls, "bone-highlight"), transform: hTransform })
    );
  }

  // swaps the base class name in an already-computed "base [dimmed|related]"
  // string, keeping whichever isolation state suffix was already applied
  function shapeClassSwap(cls, newBase) {
    const parts = cls.split(" ");
    parts[0] = newBase;
    return parts.join(" ");
  }

  // -- pelvis: a rounded blob with the four characteristic openings --
  function drawPelvis(group, holeGroup, screenPos) {
    const pel = screenPos.pelvis, hl = screenPos.hipL, hr = screenPos.hipR;
    const cls = shapeClass("bone-tube", ["pelvis"]);
    const holeCls = shapeClass("hole-fill", ["pelvis"]);
    const topY = pel.y - 20, botY = pel.y + 34;
    const d = `
      M ${hl.x + 4} ${topY}
      C ${hl.x - 10} ${topY} ${hl.x - 16} ${topY + 20} ${hl.x - 8} ${topY + 34}
      C ${hl.x - 2} ${topY + 44} ${pel.x - 30} ${botY - 18} ${pel.x - 18} ${botY}
      C ${pel.x - 8} ${botY + 12} ${pel.x + 8} ${botY + 12} ${pel.x + 18} ${botY}
      C ${pel.x + 30} ${botY - 18} ${hr.x + 2} ${topY + 44} ${hr.x + 8} ${topY + 34}
      C ${hr.x + 16} ${topY + 20} ${hr.x + 10} ${topY} ${hr.x - 4} ${topY}
      C ${hr.x - 16} ${topY - 12} ${pel.x + 18} ${topY - 20} ${pel.x} ${topY - 16}
      C ${pel.x - 18} ${topY - 20} ${hl.x + 16} ${topY - 12} ${hl.x + 4} ${topY}
      Z`;
    group.appendChild(el("path", { d, class: cls }));

    for (const side of [-1, 1]) {
      const ux = pel.x + side * (hl.x - pel.x) * 0.5;
      holeGroup.appendChild(
        el("ellipse", {
          cx: ux, cy: topY + 8, rx: 11, ry: 15, class: holeCls,
          transform: `rotate(${side * 20} ${ux} ${topY + 8})`,
        })
      );
      holeGroup.appendChild(
        el("ellipse", { cx: pel.x + side * (hl.x - pel.x) * 0.32, cy: botY - 6, rx: 7, ry: 9, class: holeCls })
      );
    }
  }

  // -- ribcage: a single wavy "spring" ribbon from shoulders to pelvis --
  function ribbonPath(from, to, halfWidth, waves) {
    const ang = screenAngle(from, to);
    const rad = (ang * Math.PI) / 180;
    const ux = Math.cos(rad), uy = Math.sin(rad);
    const nx = -uy, ny = ux;
    const len = Math.hypot(to.x - from.x, to.y - from.y);

    const peaks = [];
    for (let i = 1; i <= waves; i++) {
      const t = i / (waves + 1);
      const side = i % 2 === 0 ? 1 : -1;
      const cx = from.x + ux * len * t, cy = from.y + uy * len * t;
      peaks.push({ x: cx + nx * halfWidth * side, y: cy + ny * halfWidth * side });
    }

    // a smooth curve pulled toward each peak in turn, passing through the
    // midpoint between consecutive peaks so the wave reads as continuous
    let d = `M ${from.x} ${from.y}`;
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const next = i < peaks.length - 1 ? peaks[i + 1] : to;
      const mid = { x: (peak.x + next.x) / 2, y: (peak.y + next.y) / 2 };
      d += ` Q ${peak.x} ${peak.y} ${mid.x} ${mid.y}`;
    }
    d += ` L ${to.x} ${to.y}`;
    return d;
  }

  function drawTorso(gShapes, screenPos) {
    const shoulderMid = {
      x: (screenPos.shoulderL.x + screenPos.shoulderR.x) / 2,
      y: (screenPos.shoulderL.y + screenPos.shoulderR.y) / 2,
    };
    const d = ribbonPath(shoulderMid, screenPos.pelvis, 42, 5);
    gShapes.appendChild(
      el("path", { d, class: shapeClass("bone-outline", ["chest", "pelvis"]), style: "stroke-width:15px" })
    );
    gShapes.appendChild(
      el("path", { d, class: shapeClass("ribbon-fill", ["chest", "pelvis"]), style: "stroke-width:8px" })
    );

    // shoulder bar: a single thick bone spanning shoulder to shoulder
    drawBoneTube(gShapes, screenPos.shoulderL, shoulderMid, 15, 15, shapeClass("bone-tube", ["shoulderL", "chest"]));
    drawBoneTube(gShapes, shoulderMid, screenPos.shoulderR, 15, 15, shapeClass("bone-tube", ["shoulderR", "chest"]));
  }

  // -- skull: round cartoon cranium with big eyes, a nose, and a grin --
  function drawSkull(gShapes, screenPos) {
    const head = screenPos.head, neck = screenPos.neck;
    const rot = screenAngle(neck, head) + 90;
    const cx = neck.x + (head.x - neck.x) * 0.35;
    const cy = neck.y + (head.y - neck.y) * 0.35;
    const cls = shapeClass("skull-fill", ["head", "neck"]);
    const featureCls = shapeClass("skull-feature", ["head", "neck"]);
    const toothCls = shapeClass("tooth-line", ["head", "neck"]);
    const transform = `translate(${cx} ${cy}) rotate(${rot})`;

    gShapes.appendChild(
      el("path", {
        d: "M -42 6 C -46 -34 -24 -58 0 -58 C 24 -58 46 -34 42 6 C 41 20 32 26 22 27 L -22 27 C -32 26 -41 20 -42 6 Z",
        class: cls, transform,
      })
    );

    gShapes.appendChild(el("ellipse", { cx: -17, cy: -8, rx: 12, ry: 14, class: featureCls, transform: `${transform} rotate(-8 -17 -8)` }));
    gShapes.appendChild(el("ellipse", { cx: 17, cy: -8, rx: 12, ry: 14, class: featureCls, transform: `${transform} rotate(8 17 -8)` }));
    gShapes.appendChild(el("path", { d: "M -5 12 L 5 12 L 0 22 Z", class: featureCls, transform }));

    const jawCls = shapeClass("bone-outline", ["head", "neck"]);
    gShapes.appendChild(el("path", { d: "M -20 27 L 20 27", class: jawCls, transform }));
    for (let i = -3; i <= 3; i++) {
      const tx = i * 5.5;
      gShapes.appendChild(el("line", { x1: tx, y1: 27, x2: tx, y2: 34, class: toothCls, transform }));
    }
    gShapes.appendChild(el("path", { d: "M -20 34 Q 0 40 20 34", class: jawCls, transform }));
  }

  function drawHand(group, wrist, hand, cls) {
    drawBoneTube(group, wrist, hand, 7, 4, cls);
    const dx = hand.x - wrist.x, dy = hand.y - wrist.y;
    const baseAngle = Math.atan2(dy, dx);
    const fingerLen = Math.hypot(dx, dy) * 0.62;
    const spread = [-0.44, -0.2, 0, 0.2, 0.42];
    const lineCls = shapeClassSwap(cls, "finger-line");
    for (const s of spread) {
      const a = baseAngle + s;
      const fx = hand.x + Math.cos(a) * fingerLen * (1 - Math.abs(s) * 0.3);
      const fy = hand.y + Math.sin(a) * fingerLen * (1 - Math.abs(s) * 0.3);
      group.appendChild(el("line", { x1: hand.x, y1: hand.y, x2: fx, y2: fy, class: lineCls }));
    }
  }

  function drawFoot(group, ankle, toe, cls) {
    drawBoneTube(group, ankle, toe, 9, 5, cls);
    const dx = toe.x - ankle.x, dy = toe.y - ankle.y;
    const baseAngle = Math.atan2(dy, dx);
    const toeLen = Math.hypot(dx, dy) * 0.5;
    const spread = [-0.3, -0.12, 0.08, 0.26];
    const lineCls = shapeClassSwap(cls, "finger-line");
    for (const s of spread) {
      const a = baseAngle + s;
      const fx = toe.x + Math.cos(a) * toeLen;
      const fy = toe.y + Math.sin(a) * toeLen;
      group.appendChild(el("line", { x1: toe.x, y1: toe.y, x2: fx, y2: fy, class: lineCls }));
    }
    // small heel bump behind the ankle
    const heelAngle = baseAngle + Math.PI;
    const hx = ankle.x + Math.cos(heelAngle) * 7;
    const hy = ankle.y + Math.sin(heelAngle) * 7;
    group.appendChild(el("circle", { cx: hx, cy: hy, r: 8, class: cls }));
  }

  function drawSkeletonBody(screenPos) {
    drawPelvis(gShapes, gShapes, screenPos);
    drawTorso(gShapes, screenPos);
    drawSkull(gShapes, screenPos);
    drawBoneTube(gShapes, screenPos.chest, screenPos.neck, 9, 9, shapeClass("bone-tube", ["chest", "neck"]));
    drawBoneTube(gShapes, screenPos.neck, screenPos.head, 9, 9, shapeClass("bone-tube", ["neck", "head"]));

    for (const side of ["L", "R"]) {
      const shoulder = screenPos["shoulder" + side];
      const elbow = screenPos["elbow" + side];
      const wrist = screenPos["wrist" + side];
      const hand = screenPos["hand" + side];
      const hip = screenPos["hip" + side];
      const knee = screenPos["knee" + side];
      const ankle = screenPos["ankle" + side];
      const foot = screenPos["foot" + side];

      drawBoneTube(gBones, shoulder, elbow, 13, 9, shapeClass("bone-tube", ["elbow" + side]));
      drawBoneTube(gBones, elbow, wrist, 9, 7, shapeClass("bone-tube", ["wrist" + side]));
      drawHand(gBones, wrist, hand, shapeClass("bone-tube", ["hand" + side]));

      drawBoneTube(gBones, hip, knee, 16, 12, shapeClass("bone-tube", ["knee" + side]));
      drawBoneTube(gBones, knee, ankle, 12, 9, shapeClass("bone-tube", ["ankle" + side]));
      drawFoot(gBones, ankle, foot, shapeClass("bone-tube", ["foot" + side]));
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

      const baseR = draggable ? 5 : 3.5;
      const r = selected ? baseR + 4 : baseR;

      const circle = el("circle", {
        cx: p.x, cy: p.y, r,
        class: cls.join(" "),
        "data-joint": id,
      });
      gJoints.appendChild(circle);

      if (selected) {
        const dot = el("circle", { cx: p.x, cy: p.y, r: 2.5, class: "joint-dot selected" });
        gJoints.appendChild(dot);
      }

      // angle label
      const angle = getFlexionAngle(id, modelPos);
      if (angle !== null) {
        const showLabel = state.selected ? selected : state.showAllAngles;
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

  function onPointerDown(evt) {
    const target = evt.target.closest("[data-joint]");
    if (!target) {
      // clicked empty space -> clear selection
      state.selected = null;
      render();
      return;
    }
    const id = target.getAttribute("data-joint");
    state.selected = id;

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
    const svgPt = svgPointFromEvent(evt);
    const modelPt = toModel(svgPt);
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
      state.selected = null;
      render();
    }
  });

  // ---------------------------------------------------------------
  // Toolbar wiring
  // ---------------------------------------------------------------
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      state.view = btn.getAttribute("data-view");
      render();
    });
  });

  document.getElementById("angleToggle").addEventListener("change", (evt) => {
    state.showAllAngles = evt.target.checked;
    render();
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    state.joints = freshState();
    state.selected = null;
    render();
  });

  document.getElementById("clearSelectionBtn").addEventListener("click", () => {
    state.selected = null;
    render();
  });

  render();
})();
