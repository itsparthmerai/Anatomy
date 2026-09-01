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

  function boneIsRelated(childId) {
    // the bone drawn FROM parent TO childId; related if either endpoint matches selection rule
    if (!state.selected) return true;
    if (childId === state.selected) return true;
    const sel = state.joints[state.selected];
    if (sel.angleChild === childId) return true;
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

    drawBodyShapes(screenPos);
    drawBones(screenPos);
    drawAnatomicalMarks(screenPos);
    drawJoints(screenPos, pos);

    document.getElementById("viewTag").textContent =
      state.view === "anterior" ? "Anterior view" : "Posterior view";

    renderSidePanel(pos);
  }

  function drawBodyShapes(screenPos) {
    const chest = screenPos.chest, pelvis = screenPos.pelvis;
    const chestAngle = state.joints.chest.angle;
    const midX = (chest.x + pelvis.x) / 2;
    const midY = (chest.y + pelvis.y) / 2;
    const dimmed = state.selected && !["chest", "pelvis"].includes(state.selected) ? "dimmed" : "";
    const rotate = `rotate(${chestAngle + 90} ${midX} ${midY})`;

    const rib = el("ellipse", {
      cx: midX, cy: midY, rx: 54, ry: 58,
      class: `body-shape ${dimmed}`.trim(),
      transform: rotate,
    });
    gShapes.appendChild(rib);

    const pelvisShape = el("rect", {
      x: pelvis.x - 40, y: pelvis.y - 14, width: 80, height: 28, rx: 12,
      class: `body-shape ${dimmed}`.trim(),
    });
    gShapes.appendChild(pelvisShape);

    if (state.joints.head.skull) {
      const headPos = screenPos.head, neckPos = screenPos.neck;
      const cx = neckPos.x + (headPos.x - neckPos.x) * 0.55;
      const cy = neckPos.y + (headPos.y - neckPos.y) * 0.55;
      const skullDimmed = state.selected && !["head", "neck"].includes(state.selected) ? "dimmed" : "";
      const skull = el("circle", { cx, cy, r: 27, class: `body-shape ${skullDimmed}`.trim() });
      gShapes.appendChild(skull);
    }
  }

  function drawAnatomicalMarks(screenPos) {
    const anterior = state.view === "anterior";
    const chest = screenPos.chest, pelvis = screenPos.pelvis;
    const chestAngle = state.joints.chest.angle;
    const midX = (chest.x + pelvis.x) / 2;
    const midY = (chest.y + pelvis.y) / 2;
    const rotate = `rotate(${chestAngle + 90} ${midX} ${midY})`;
    const torsoDimmed = state.selected && !["chest", "pelvis"].includes(state.selected) ? "dimmed" : "";

    if (anterior) {
      // sternum line
      const sternum = el("line", {
        x1: midX, y1: midY - 34, x2: midX, y2: midY + 22,
        class: `detail-mark ${torsoDimmed}`.trim(),
        transform: rotate,
      });
      gMarks.appendChild(sternum);

      // patellae
      for (const kneeId of ["kneeL", "kneeR"]) {
        const p = screenPos[kneeId];
        const dimmed = isRelated(kneeId) ? "" : "dimmed";
        gMarks.appendChild(el("circle", { cx: p.x, cy: p.y, r: 6, class: `detail-mark ${dimmed}`.trim() }));
      }
    } else {
      // vertebrae dots along the spine
      for (let t = 0.12; t <= 0.92; t += 0.16) {
        const x = pelvis.x + (chest.x - pelvis.x) * t;
        const y = pelvis.y + (chest.y - pelvis.y) * t;
        gMarks.appendChild(el("circle", { cx: x, cy: y, r: 2.2, class: `detail-mark ${torsoDimmed}`.trim() }));
      }
      // scapulae
      for (const side of [-1, 1]) {
        const bx = midX + side * 20;
        const by = midY - 24;
        const tri = el("path", {
          d: `M ${bx} ${by} L ${bx + side * 16} ${by + 10} L ${bx} ${by + 30} Z`,
          class: `detail-mark ${torsoDimmed}`.trim(),
        });
        gMarks.appendChild(tri);
      }
    }
  }

  function drawBones(screenPos) {
    for (const id of JOINT_ORDER) {
      const j = state.joints[id];
      if (j.parent === null) continue;
      const a = screenPos[j.parent];
      const b = screenPos[id];
      const related = boneIsRelated(id);
      const cls = ["bone-line"];
      if (!related) cls.push("dimmed");
      else if (state.selected) cls.push("related");
      const line = el("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        "stroke-width": j.thickness || 8,
        class: cls.join(" "),
      });
      gBones.appendChild(line);
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

      const r = j.draggable === false ? (selected ? 8 : 5) : selected ? 13 : 9;

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
