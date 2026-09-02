(() => {
  "use strict";

  // ---------------------------------------------------------------
  // Skeleton model: a hierarchy of bones, each ending at a named
  // joint. A bone's direction is cos(angle)*restDir + sin(angle)*
  // bendAxis, both fixed unit vectors in world space: angle = 0 is
  // always anatomical neutral (restDir), positive angle sweeps the
  // bone toward bendAxis (flexion), negative sweeps it the other way
  // (extension past neutral). Positions chain from the fixed pelvis
  // root through each bone's own length and direction (no rotation
  // composition — every bone's angle is independent, so dragging one
  // joint bends only the bone that ends there, exactly like the
  // original 2D rig).
  // ---------------------------------------------------------------
  function cross3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  const RAW_BONES = {
    pelvis: { parent: null, length: 0, thickness: 20, label: "Pelvis" },

    chest: {
      parent: "pelvis", length: 90, thickness: 13, label: "Spine",
      angleChild: "neck", restDir: [0, 1, 0], bendAxis: [0, 0, 1],
      angle: 0, angleMin: -40, angleMax: 100,
      romMin: -25, romMax: 80, romLabel: "Trunk flexion / extension",
      draggable: true, massFrac: 0.477, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.52, bioLabel: "Trunk",
    },
    neck: {
      parent: "chest", length: 26, thickness: 8, label: "Neck",
      angleChild: "head", restDir: [0, 1, 0], bendAxis: [0, 0, 1],
      angle: 0, angleMin: -60, angleMax: 65,
      romMin: -45, romMax: 50, romLabel: "Neck flexion / extension",
      draggable: true, massFrac: 0.020, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.12, bioLabel: "Neck",
    },
    head: {
      parent: "neck", length: 34, thickness: 17, label: "Head", skull: true,
      restDir: [0, 1, 0], bendAxis: [0, 0, 1],
      angle: 0, angleMin: -55, angleMax: 60,
      draggable: true, massFrac: 0.081, comFrac: 0.55, radGyrFrac: 0.495, lengthM: 0.24, bioLabel: "Head",
    },

    shoulderL: {
      parent: "chest", length: 46, thickness: 6, label: "Shoulder (L)",
      angleChild: "elbowL", restDir: [-1, 0, 0], bendAxis: [0, 0, 1], angle: 0,
      romMin: -50, romMax: 180, romLabel: "Shoulder flexion / extension",
      draggable: false, massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.16, bioLabel: "Clavicle (L)",
    },
    shoulderR: {
      parent: "chest", length: 46, thickness: 6, label: "Shoulder (R)",
      angleChild: "elbowR", restDir: [1, 0, 0], bendAxis: [0, 0, 1], angle: 0,
      romMin: -50, romMax: 180, romLabel: "Shoulder flexion / extension",
      draggable: false, massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.16, bioLabel: "Clavicle (R)",
    },
    hipL: {
      parent: "pelvis", length: 32, thickness: 8, label: "Hip (L)",
      angleChild: "kneeL", restDir: [-1, 0, 0], bendAxis: [0, 0, 1], angle: 0,
      romMin: -20, romMax: 120, romLabel: "Hip flexion / extension",
      draggable: false, massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.13, bioLabel: "Pelvic girdle (L)",
    },
    hipR: {
      parent: "pelvis", length: 32, thickness: 8, label: "Hip (R)",
      angleChild: "kneeR", restDir: [1, 0, 0], bendAxis: [0, 0, 1], angle: 0,
      romMin: -20, romMax: 120, romLabel: "Hip flexion / extension",
      draggable: false, massFrac: 0.005, comFrac: 0.50, radGyrFrac: 0.50, lengthM: 0.13, bioLabel: "Pelvic girdle (R)",
    },

    elbowL: {
      parent: "shoulderL", length: 84, thickness: 11, label: "Elbow (L)",
      angleChild: "wristL", restDir: [0, -1, 0], bendAxis: [0, 0, 1],
      angle: 0, angleMin: -60, angleMax: 190,
      romMin: 0, romMax: 150, romLabel: "Elbow flexion",
      draggable: true, massFrac: 0.028, comFrac: 0.436, radGyrFrac: 0.322, lengthM: 0.29, bioLabel: "Upper arm (L)",
    },
    elbowR: {
      parent: "shoulderR", length: 84, thickness: 11, label: "Elbow (R)",
      angleChild: "wristR", restDir: [0, -1, 0], bendAxis: [0, 0, 1],
      angle: 0, angleMin: -60, angleMax: 190,
      romMin: 0, romMax: 150, romLabel: "Elbow flexion",
      draggable: true, massFrac: 0.028, comFrac: 0.436, radGyrFrac: 0.322, lengthM: 0.29, bioLabel: "Upper arm (R)",
    },
    wristL: {
      parent: "elbowL", length: 74, thickness: 9, label: "Wrist (L)",
      angleChild: "handL", restDir: [0, -1, 0], bendAxis: [0, 0, 1],
      angle: 15, angleMin: -15, angleMax: 165,
      romMin: -70, romMax: 80, romLabel: "Wrist flexion / extension",
      draggable: true, massFrac: 0.016, comFrac: 0.430, radGyrFrac: 0.303, lengthM: 0.26, bioLabel: "Forearm (L)",
    },
    wristR: {
      parent: "elbowR", length: 74, thickness: 9, label: "Wrist (R)",
      angleChild: "handR", restDir: [0, -1, 0], bendAxis: [0, 0, 1],
      angle: 15, angleMin: -15, angleMax: 165,
      romMin: -70, romMax: 80, romLabel: "Wrist flexion / extension",
      draggable: true, massFrac: 0.016, comFrac: 0.430, radGyrFrac: 0.303, lengthM: 0.26, bioLabel: "Forearm (R)",
    },
    handL: {
      parent: "wristL", length: 26, thickness: 7, label: "Hand (L)",
      restDir: [0, -1, 0], bendAxis: [0, 0, 1], angle: 0, angleMin: -80, angleMax: 90,
      draggable: true, massFrac: 0.006, comFrac: 0.506, radGyrFrac: 0.297, lengthM: 0.19, bioLabel: "Hand (L)",
    },
    handR: {
      parent: "wristR", length: 26, thickness: 7, label: "Hand (R)",
      restDir: [0, -1, 0], bendAxis: [0, 0, 1], angle: 0, angleMin: -80, angleMax: 90,
      draggable: true, massFrac: 0.006, comFrac: 0.506, radGyrFrac: 0.297, lengthM: 0.19, bioLabel: "Hand (R)",
    },

    kneeL: {
      parent: "hipL", length: 108, thickness: 13, label: "Knee (L)",
      angleChild: "ankleL", restDir: [0, -1, 0], bendAxis: [0, 0, 1],
      angle: 0, angleMin: -35, angleMax: 130,
      romMin: -10, romMax: 135, romLabel: "Knee flexion",
      draggable: true, massFrac: 0.100, comFrac: 0.433, radGyrFrac: 0.323, lengthM: 0.42, bioLabel: "Thigh (L)",
    },
    kneeR: {
      parent: "hipR", length: 108, thickness: 13, label: "Knee (R)",
      angleChild: "ankleR", restDir: [0, -1, 0], bendAxis: [0, 0, 1],
      angle: 0, angleMin: -35, angleMax: 130,
      romMin: -10, romMax: 135, romLabel: "Knee flexion",
      draggable: true, massFrac: 0.100, comFrac: 0.433, radGyrFrac: 0.323, lengthM: 0.42, bioLabel: "Thigh (R)",
    },
    ankleL: {
      parent: "kneeL", length: 98, thickness: 10, label: "Ankle (L)",
      angleChild: "footL", restDir: [0, -1, 0], bendAxis: [0, 0, -1],
      angle: 5, angleMin: -20, angleMax: 145,
      romMin: -50, romMax: 20, romLabel: "Ankle dorsi / plantarflexion",
      draggable: true, massFrac: 0.0465, comFrac: 0.433, radGyrFrac: 0.302, lengthM: 0.43, bioLabel: "Shank (L)",
    },
    ankleR: {
      parent: "kneeR", length: 98, thickness: 10, label: "Ankle (R)",
      angleChild: "footR", restDir: [0, -1, 0], bendAxis: [0, 0, -1],
      angle: 5, angleMin: -20, angleMax: 145,
      romMin: -50, romMax: 20, romLabel: "Ankle dorsi / plantarflexion",
      draggable: true, massFrac: 0.0465, comFrac: 0.433, radGyrFrac: 0.302, lengthM: 0.43, bioLabel: "Shank (R)",
    },
    footL: {
      parent: "ankleL", length: 32, thickness: 8, label: "Foot (L)",
      restDir: [0, 0, 1], bendAxis: [0, 1, 0], angle: 0, angleMin: -60, angleMax: 30,
      draggable: true, massFrac: 0.0145, comFrac: 0.50, radGyrFrac: 0.475, lengthM: 0.26, bioLabel: "Foot (L)",
    },
    footR: {
      parent: "ankleR", length: 32, thickness: 8, label: "Foot (R)",
      restDir: [0, 0, 1], bendAxis: [0, 1, 0], angle: 0, angleMin: -60, angleMax: 30,
      draggable: true, massFrac: 0.0145, comFrac: 0.50, radGyrFrac: 0.475, lengthM: 0.26, bioLabel: "Foot (R)",
    },
  };

  // Precompute each bendable joint's hinge normal, used to sign its
  // flexion-angle display (positive = flexion, negative = extension).
  // Derived from the CHILD bone's own bend plane, since it's the
  // child's rotation toward its own bendAxis that defines "flexion"
  // at this joint (the parent and child don't always share the same
  // plane — e.g. the knee's shank bends opposite the thigh's plane).
  function signedAngleDeg(v1, v2, normal) {
    const a = new THREE.Vector3(...v1).normalize();
    const b = new THREE.Vector3(...v2).normalize();
    const dot = Math.min(1, Math.max(-1, a.dot(b)));
    const mag = (Math.acos(dot) * 180) / Math.PI;
    const cross = new THREE.Vector3().crossVectors(a, b);
    const sign = cross.dot(new THREE.Vector3(...normal)) >= 0 ? 1 : -1;
    return sign * mag;
  }

  for (const id in RAW_BONES) {
    const b = RAW_BONES[id];
    if (b.angleChild) {
      const child = RAW_BONES[b.angleChild];
      b.hingeNormal = cross3(child.restDir, child.bendAxis);
      // Some joint pairs aren't anatomically straight at rest (the
      // foot sits perpendicular to the shank, not in line with it),
      // so the raw angle between their two rest directions isn't
      // zero. Bake that baseline out so 0deg always means "this
      // joint's own neutral pose", regardless of the pair's geometry.
      const incomingRest = b.draggable === false ? child.restDir : b.restDir;
      b.flexOffset = signedAngleDeg(incomingRest, child.restDir, b.hingeNormal);
    }
  }

  const BONES = RAW_BONES;
  const JOINT_ORDER = Object.keys(BONES);
  const G = 9.81; // m/s^2

  function freshAngles() {
    const angles = {};
    for (const id of JOINT_ORDER) angles[id] = BONES[id].angle || 0;
    return angles;
  }

  const state = {
    angles: freshAngles(),
    selected: null,
    bodyMass: 70,
    bio: { force: false, velocity: false, acceleration: false, moment: false, com: false, grf: false },
    kinetics: { v: 0, a: 0, F: 0, dt: 0.2 },
  };

  // ---------------------------------------------------------------
  // Forward kinematics
  // ---------------------------------------------------------------
  function computePositions() {
    const pos = {};
    for (const id of JOINT_ORDER) {
      const b = BONES[id];
      if (b.parent === null) {
        pos[id] = new THREE.Vector3(0, 0, 0);
        continue;
      }
      const rad = (state.angles[id] * Math.PI) / 180;
      const c = Math.cos(rad), s = Math.sin(rad);
      const dir = new THREE.Vector3(
        b.restDir[0] * c + b.bendAxis[0] * s,
        b.restDir[1] * c + b.bendAxis[1] * s,
        b.restDir[2] * c + b.bendAxis[2] * s
      );
      pos[id] = pos[b.parent].clone().addScaledVector(dir, b.length);
    }
    return pos;
  }

  function getFlexionAngle(id, pos) {
    const b = BONES[id];
    if (!b.angleChild || !b.parent) return null;
    // Fixed anchor joints (shoulders/hips) sit at a right angle to the
    // limb they carry, so comparing their own direction to the limb's
    // would always read a constant ~90deg regardless of pose. They
    // contribute no rotation of their own, so treat their "incoming"
    // reference as the limb's own neutral direction instead — the
    // displayed flexion then reduces to the limb's own angle, which is
    // what shoulder/hip flexion actually means clinically.
    const incoming = b.draggable === false
      ? new THREE.Vector3(...BONES[b.angleChild].restDir)
      : pos[id].clone().sub(pos[b.parent]);
    const outgoing = pos[b.angleChild].clone().sub(pos[id]);
    if (incoming.lengthSq() < 1e-8 || outgoing.lengthSq() < 1e-8) return 0;
    incoming.normalize();
    outgoing.normalize();
    const dot = Math.min(1, Math.max(-1, incoming.dot(outgoing)));
    const mag = (Math.acos(dot) * 180) / Math.PI;
    const cross = new THREE.Vector3().crossVectors(incoming, outgoing);
    const sign = cross.dot(new THREE.Vector3(...b.hingeNormal)) >= 0 ? 1 : -1;
    return Math.round(sign * mag - b.flexOffset);
  }

  function getRomInfo(id, pos) {
    const b = BONES[id];
    if (b.romMax === undefined) return null;
    const flex = getFlexionAngle(id, pos);
    if (flex === null) return null;
    return { label: b.romLabel, romMin: b.romMin, romMax: b.romMax, flex, exceeds: flex > b.romMax || flex < b.romMin };
  }

  // ---------------------------------------------------------------
  // Biomechanics: segment mass/inertia, and the v <-> a <-> F coupling
  // ---------------------------------------------------------------
  function getSegmentInfo(jointId) {
    const b = jointId ? BONES[jointId] : null;
    if (!b || b.massFrac === undefined) return null;
    const m = b.massFrac * state.bodyMass;
    const r = b.comFrac * b.lengthM;
    const radGyr = b.radGyrFrac * b.lengthM;
    const iCom = m * radGyr * radGyr;
    const iJoint = iCom + m * r * r; // parallel axis theorem
    return { label: b.bioLabel, proximal: b.parent, m, r, iCom, iJoint, comFrac: b.comFrac };
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
    const sum = new THREE.Vector3();
    let sumM = 0;
    for (const id of JOINT_ORDER) {
      const b = BONES[id];
      if (b.massFrac === undefined) continue;
      const com = pos[b.parent].clone().lerp(pos[id], b.comFrac);
      sum.addScaledVector(com, b.massFrac);
      sumM += b.massFrac;
    }
    return sum.divideScalar(sumM);
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
  // Three.js scene setup
  // ---------------------------------------------------------------
  const canvas = document.getElementById("glCanvas");
  const wrap = document.querySelector(".canvas-wrap");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 1, 3000);
  camera.position.set(110, 60, 560);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -30, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 150;
  controls.maxDistance = 1000;
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(150, 260, 200);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-200, 80, -150);
  scene.add(fill);

  const grid = new THREE.GridHelper(600, 24, 0xd8d3c6, 0xe7e3d8);
  grid.position.y = -206;
  scene.add(grid);

  const BONE_COLOR = 0xf3f0e6;
  const HIGHLIGHT_COLOR = 0x7c5cf0;
  const DIM_COLOR = 0xdedad0;
  const SELECTED_COLOR = 0x7c5cf0;

  const boneGroup = new THREE.Group();
  scene.add(boneGroup);

  const bonesById = {}; // jointId -> { shaft: Mesh, cap: Mesh, material }
  const pickables = []; // Mesh[] for raycasting, userData.jointId set

  function makeMaterial() {
    return new THREE.MeshStandardMaterial({ color: BONE_COLOR, roughness: 0.65, metalness: 0.04 });
  }

  for (const id of JOINT_ORDER) {
    const b = BONES[id];
    const radius = Math.max(2.5, b.thickness / 2);

    if (b.parent !== null) {
      const material = makeMaterial();
      const height = b.length;
      const shaftGeom = new THREE.CylinderGeometry(radius, radius, height, 14, 1, false);
      const shaft = new THREE.Mesh(shaftGeom, material);
      boneGroup.add(shaft);
      bonesById[id] = { shaft, material, radius };
    }

    // joint sphere (visible marker at the distal end of this bone, or
    // the pelvis root) — also used for the skull, drawn oversized.
    const jointRadius = b.skull ? 17 : Math.max(3, radius * 0.85);
    const jointGeom = new THREE.SphereGeometry(jointRadius, 20, 16);
    const jointMat = makeMaterial();
    const jointMesh = new THREE.Mesh(jointGeom, jointMat);
    boneGroup.add(jointMesh);
    if (!bonesById[id]) bonesById[id] = {};
    bonesById[id].joint = jointMesh;
    bonesById[id].jointMat = jointMat;

    // pick handle: an invisible, generously sized sphere for raycasting
    const pickGeom = new THREE.SphereGeometry(Math.max(10, jointRadius + 4), 10, 8);
    const pickMat = new THREE.MeshBasicMaterial({ visible: false });
    const pickMesh = new THREE.Mesh(pickGeom, pickMat);
    pickMesh.userData.jointId = id;
    boneGroup.add(pickMesh);
    pickables.push(pickMesh);
    bonesById[id].pick = pickMesh;
  }

  // ---------------------------------------------------------------
  // Biomechanics markers (arrows, moment ring, COM crosshair)
  // ---------------------------------------------------------------
  const bioGroup = new THREE.Group();
  scene.add(bioGroup);

  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();
      child.geometry && child.geometry.dispose();
      child.material && child.material.dispose();
    }
  }

  function addArrow(origin, dir, length, color, label) {
    if (length < 4) return;
    const arrow = new THREE.ArrowHelper(dir.clone().normalize(), origin, length, color, Math.min(14, length * 0.3), Math.min(8, length * 0.2));
    bioGroup.add(arrow);
    addLabel(origin.clone().addScaledVector(dir.clone().normalize(), length + 10), label, `#${color.toString(16).padStart(6, "0")}`);
  }

  const labelEls = [];
  function addLabel(worldPos, text, color) {
    const div = document.createElement("div");
    div.className = "gl-label";
    div.style.color = color;
    div.textContent = text;
    wrap.appendChild(div);
    labelEls.push({ el: div, pos: worldPos.clone() });
  }
  function clearLabels() {
    for (const l of labelEls) l.el.remove();
    labelEls.length = 0;
  }
  function updateLabelPositions() {
    const rect = canvas.getBoundingClientRect();
    for (const l of labelEls) {
      const p = l.pos.clone().project(camera);
      const x = (p.x * 0.5 + 0.5) * rect.width;
      const y = (-p.y * 0.5 + 0.5) * rect.height;
      const visible = p.z < 1;
      l.el.style.display = visible ? "block" : "none";
      l.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  function drawMomentRing(center, info, boneDir) {
    const alpha = info.r > 0 ? state.kinetics.a / info.r : 0;
    const M = info.iJoint * alpha;
    if (Math.abs(M) < 0.05) return;

    const radius = 26;
    const sweep = Math.min((30 + Math.abs(M) * 6) * (Math.PI / 180), 260 * (Math.PI / 180));
    const dir = M >= 0 ? 1 : -1;
    const up = boneDir.clone().normalize();
    let ref = new THREE.Vector3(1, 0, 0);
    if (Math.abs(up.dot(ref)) > 0.9) ref = new THREE.Vector3(0, 0, 1);
    const e1 = ref.clone().sub(up.clone().multiplyScalar(ref.dot(up))).normalize();
    const e2 = new THREE.Vector3().crossVectors(up, e1);

    const points = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * sweep * dir;
      const p = center.clone()
        .addScaledVector(e1, Math.cos(t) * radius)
        .addScaledVector(e2, Math.sin(t) * radius);
      points.push(p);
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xb5852f, linewidth: 2 });
    bioGroup.add(new THREE.Line(geom, mat));
    addLabel(points[points.length - 1], `M ${M.toFixed(1)} N·m`, "#b5852f");
  }

  function drawComMarker(pos) {
    const com = computeBodyCOM(pos);
    const geom = new THREE.SphereGeometry(6, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x14b8a6, wireframe: true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(com);
    bioGroup.add(mesh);
    addLabel(com.clone().add(new THREE.Vector3(0, 12, 0)), "COM", "#14b8a6");
  }

  function drawGrfArrow(pos) {
    const feet = [pos.footL, pos.footR];
    const base = feet[0].clone().add(feet[1]).multiplyScalar(0.5);
    base.y = Math.min(feet[0].y, feet[1].y);
    const grf = computeGRF();
    const pxPerN = 0.16;
    const len = Math.min(Math.abs(grf) * pxPerN, 110);
    addArrow(base, new THREE.Vector3(0, 1, 0), len, 0x7c5cf0, `GRF ${grf.toFixed(0)} N`);
  }

  function drawBiomechanics(pos) {
    clearGroup(bioGroup);
    clearLabels();

    if (state.bio.com) drawComMarker(pos);
    if (!state.selected) return;

    const info = getSegmentInfo(state.selected);
    if (!info) return;

    if (state.bio.grf) drawGrfArrow(pos);

    const jointPos = pos[state.selected];
    const proxPos = pos[info.proximal];
    const boneVec = jointPos.clone().sub(proxPos);
    const boneLen = boneVec.length() || 1;
    const boneDir = boneVec.clone().divideScalar(boneLen);
    // an arbitrary consistent tangent, perpendicular to the bone, used
    // to draw velocity/accel/force off to the side of the limb
    let tangent = new THREE.Vector3(1, 0, 0).sub(boneDir.clone().multiplyScalar(boneDir.x));
    if (tangent.lengthSq() < 1e-6) tangent = new THREE.Vector3(0, 0, 1);
    tangent.normalize();
    const com = proxPos.clone().lerp(jointPos, info.comFrac);

    if (state.bio.velocity) {
      const v = state.kinetics.v;
      addArrow(com.clone().addScaledVector(boneDir, -10), tangent.clone().multiplyScalar(Math.sign(v) || 1), Math.min(Math.abs(v) * 14, 80), 0x2f7de1, `v ${v.toFixed(1)} m/s`);
    }
    if (state.bio.acceleration) {
      const a = state.kinetics.a;
      addArrow(com, tangent.clone().multiplyScalar(Math.sign(a) || 1), Math.min(Math.abs(a) * 4, 80), 0x2ea86f, `a ${a.toFixed(1)} m/s²`);
    }
    if (state.bio.force) {
      const F = state.kinetics.F;
      addArrow(com.clone().addScaledVector(boneDir, 10), tangent.clone().multiplyScalar(Math.sign(F) || 1), Math.min(Math.abs(F) * 0.4, 80), 0xe2583e, `F ${F.toFixed(1)} N`);
    }
    if (state.bio.moment) {
      drawMomentRing(proxPos, info, boneDir);
    }
  }

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  function isRelated(id) {
    if (!state.selected) return true;
    if (id === state.selected) return true;
    const sel = BONES[state.selected];
    if (sel.parent === id) return true;
    if (sel.angleChild === id) return true;
    return false;
  }

  function colorFor(id) {
    if (!state.selected) return BONE_COLOR;
    return isRelated(id) ? HIGHLIGHT_COLOR : DIM_COLOR;
  }

  function applyBoneTransform(mesh, from, to, radius) {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from);
    const len = dir.length() || 1;
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.scale.set(1, len / (mesh.geometry.parameters.height || len), 1);
  }

  function render() {
    const pos = computePositions();

    for (const id of JOINT_ORDER) {
      const b = BONES[id];
      const entry = bonesById[id];
      const color = colorFor(id);
      const opacity = state.selected && !isRelated(id) ? 0.3 : 1;

      if (b.parent !== null) {
        applyBoneTransform(entry.shaft, pos[b.parent], pos[id], entry.radius);
        entry.material.color.setHex(color);
        entry.material.transparent = opacity < 1;
        entry.material.opacity = opacity;
      }

      entry.joint.position.copy(pos[id]);
      const jointRelated = isRelated(id) || (BONES[id].angleChild && isRelated(BONES[id].angleChild));
      entry.jointMat.color.setHex(state.selected === id ? SELECTED_COLOR : color);
      entry.jointMat.transparent = state.selected && !jointRelated && state.selected !== id;
      entry.jointMat.opacity = entry.jointMat.transparent ? 0.3 : 1;

      entry.pick.position.copy(pos[id]);
    }

    drawBiomechanics(pos);
    renderSidePanel(pos);
    updateRomPanel(pos);
    updateBioPanel(pos);
    syncMassInputs();
  }

  function syncMassInputs() {
    MASS_INPUT_IDS.forEach((id) => {
      const input = document.getElementById(id);
      if (document.activeElement !== input) input.value = state.bodyMass;
    });
  }

  function renderSidePanel(pos) {
    const empty = document.getElementById("panelEmpty");
    const filled = document.getElementById("panelSelected");
    if (!state.selected) {
      empty.hidden = false;
      filled.hidden = true;
      return;
    }
    empty.hidden = true;
    filled.hidden = false;
    const b = BONES[state.selected];
    document.getElementById("selJointName").textContent = b.label;
    const angle = getFlexionAngle(state.selected, pos);
    const angleEl = document.getElementById("selJointAngle");
    const caption = document.getElementById("selJointCaption");
    if (angle === null) {
      angleEl.textContent = "—";
      caption.textContent = "This joint has no further bone beyond it, so no flexion angle applies. Drag it to change the limb's orientation.";
    } else {
      angleEl.textContent = `${angle}°`;
      caption.textContent = "0° is anatomical neutral (fully extended); positive values are flexion, negative values are extension past neutral.";
    }
  }

  function updateRomPanel(pos) {
    const romSection = document.getElementById("romSection");
    const rom = state.selected ? getRomInfo(state.selected, pos) : null;
    if (!rom) {
      romSection.hidden = true;
      return;
    }
    romSection.hidden = false;

    document.getElementById("romLabel").textContent = rom.label;
    document.getElementById("romValueNum").textContent = `${Math.round(rom.flex)}°`;

    const pad = Math.max(15, (rom.romMax - rom.romMin) * 0.25);
    const dispMin = rom.romMin - pad;
    const dispMax = rom.romMax + pad;
    const span = dispMax - dispMin;
    const pct = (v) => Math.min(100, Math.max(0, ((v - dispMin) / span) * 100));

    const loPct = pct(rom.romMin);
    const hiPct = pct(rom.romMax);
    document.getElementById("romExceedZoneLo").style.width = `${loPct}%`;
    document.getElementById("romNormalZone").style.left = `${loPct}%`;
    document.getElementById("romNormalZone").style.width = `${hiPct - loPct}%`;
    document.getElementById("romExceedZone").style.width = `${100 - hiPct}%`;
    document.getElementById("romNeutralTick").style.left = `${pct(0)}%`;

    const markerPct = pct(rom.flex);
    const marker = document.getElementById("romMarker");
    marker.style.left = `${markerPct}%`;
    marker.classList.toggle("exceeds", rom.exceeds);

    const caption = document.getElementById("romCaption");
    caption.classList.toggle("exceeds", rom.exceeds);
    if (!rom.exceeds) {
      caption.textContent = "Within the typical normal range.";
    } else if (rom.flex > rom.romMax) {
      caption.textContent = `Exceeds the typical flexion range by ${Math.round(rom.flex - rom.romMax)}°.`;
    } else {
      caption.textContent = `Exceeds the typical extension range by ${Math.round(rom.romMin - rom.flex)}°.`;
    }
  }

  function setIfNotFocused(el, value) {
    if (document.activeElement !== el) el.value = value;
  }

  function updateBioPanel(pos) {
    const bioSection = document.getElementById("bioSection");
    const info = state.selected ? getSegmentInfo(state.selected) : null;

    if (!info) {
      bioSection.hidden = true;
      return;
    }
    bioSection.hidden = false;

    const pivotLabel = BONES[info.proximal].label;
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
      const alpha = info.r > 0 ? state.kinetics.a / info.r : 0;
      const M = info.iJoint * alpha;
      document.getElementById("readoutMoment").innerHTML = `${M.toFixed(2)} N&middot;m`;
    }
    if (state.bio.com) {
      const com = computeBodyCOM(pos);
      document.getElementById("readoutCom").textContent = `x ${com.x.toFixed(0)}, y ${com.y.toFixed(0)}, z ${com.z.toFixed(0)}`;
    }
    if (state.bio.grf) {
      document.getElementById("readoutGrf").textContent = `${computeGRF().toFixed(0)} N`;
    }
  }

  // ---------------------------------------------------------------
  // Interaction: raycast to pick a joint; click to isolate; drag a
  // draggable joint's vertical mouse motion into its bend angle.
  // ---------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const BIO_INPUT_IDS = ["inputForce", "inputVelocity", "inputAcceleration"];

  let dragging = null; // { id, startY, startAngle }
  let downPos = null;

  function selectJoint(id) {
    if (state.selected !== id) {
      resetKinetics();
      const active = document.activeElement;
      if (active && BIO_INPUT_IDS.includes(active.id)) active.blur();
    }
    state.selected = id;
  }

  function pickJointAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    return hits.length ? hits[0].object.userData.jointId : null;
  }

  function onPointerDown(evt) {
    downPos = { x: evt.clientX, y: evt.clientY };
    const id = pickJointAt(evt.clientX, evt.clientY);
    if (!id) return; // empty space: let OrbitControls orbit; selection clears on click (pointerup w/o drag)

    selectJoint(id);
    render();

    const b = BONES[id];
    if (b.draggable) {
      controls.enabled = false;
      dragging = { id, startY: evt.clientY, startAngle: state.angles[id] };
      canvas.setPointerCapture(evt.pointerId);
      evt.stopImmediatePropagation();
      evt.preventDefault();
    }
  }

  function onPointerMove(evt) {
    if (!dragging) return;
    const b = BONES[dragging.id];
    const deltaY = dragging.startY - evt.clientY; // up = increase angle
    const next = dragging.startAngle + deltaY * 0.4;
    state.angles[dragging.id] = Math.min(b.angleMax, Math.max(b.angleMin, next));
    render();
  }

  function onPointerUp(evt) {
    if (dragging) {
      try { canvas.releasePointerCapture(evt.pointerId); } catch (e) {}
      dragging = null;
      controls.enabled = true;
      return;
    }
    // a plain click (little/no movement) on empty space clears selection
    if (downPos && Math.hypot(evt.clientX - downPos.x, evt.clientY - downPos.y) < 4) {
      const id = pickJointAt(evt.clientX, evt.clientY);
      if (!id) {
        selectJoint(null);
        render();
      }
    }
    downPos = null;
  }

  canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

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
    state.angles = freshAngles();
    selectJoint(null);
    render();
  });

  document.getElementById("clearSelectionBtn").addEventListener("click", () => {
    selectJoint(null);
    render();
  });

  const MASS_INPUT_IDS = ["bodyMassInput", "bodyMassInput2"];

  function setBodyMass(val) {
    if (!Number.isFinite(val) || val <= 0) return;
    state.bodyMass = val;
    const info = getSegmentInfo(state.selected);
    if (info) state.kinetics.F = info.m * state.kinetics.a;
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
    if (Number.isFinite(val)) { setForce(val); render(); }
  });
  document.getElementById("inputVelocity").addEventListener("input", (evt) => {
    const val = parseFloat(evt.target.value);
    if (Number.isFinite(val)) { setVelocity(val); render(); }
  });
  document.getElementById("inputAcceleration").addEventListener("input", (evt) => {
    const val = parseFloat(evt.target.value);
    if (Number.isFinite(val)) { setAcceleration(val); render(); }
  });

  // ---------------------------------------------------------------
  // Resize + render loop
  // ---------------------------------------------------------------
  function resize() {
    const rect = wrap.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateLabelPositions();
    renderer.render(scene, camera);
  }

  render();
  animate();
})();
