import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

/** A procedural, editable architectural model. No external model or image assets.
 * elapsedSeconds passed to update is absolute real time since the page started.
 * The parent application owns requestAnimationFrame; update renders one frame.
 */
export function createScene(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', 'Modelo 3D interactivo de la mesa EcoSmart: paneles solares, turbina eólica, asientos y cargadores. Arrastra para girar y usa la rueda para acercarte.');
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 3.4;
  controls.maxDistance = 15;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.enablePan = false;
  controls.zoomSpeed = 0.65;
  controls.rotateSpeed = 0.65;
  controls.target.set(0, 1.65, 0);

  const material = (color, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const charcoal = material(0x263d3b, 0.45, 0.5);
  const charcoalLight = material(0x45605a, 0.54, 0.4);
  const wood = [0xc18e5d, 0xcca071, 0xd3a575, 0xbe8e60, 0xd6aa7a].map(c => material(c, 0.8));
  const pale = material(0xe9f0e7, 0.55, 0.16);
  const navy = material(0x183e58, 0.3, 0.42);
  const panelCell = material(0x1c4d6b, 0.34, 0.32);
  const panelLines = new THREE.LineBasicMaterial({ color: 0x91bdc9, transparent: true, opacity: 0.5 });
  const mint = material(0x9bc5ac, 0.85);
  const grass = material(0xa7bca1, 0.95);
  const paving = material(0xe6e7dc, 0.98);
  const baseMaterial = material(0xcdd8c9, 0.9);
  const black = material(0x142d32, 0.35, 0.12);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x66c6b2, emissive: 0x46ad91, emissiveIntensity: 0.3, roughness: 0.35 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x8de7bd, emissive: 0x6adfac, emissiveIntensity: 0.7 });

  function mesh(geometry, mat, position = [0, 0, 0], parent = scene) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, mat, position, parent = scene) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, position, parent);
  }
  function cylinder(rt, rb, height, mat, position, parent = scene, sides = 48) {
    return mesh(new THREE.CylinderGeometry(rt, rb, height, sides), mat, position, parent);
  }
  function rod(a, b, radius, mat, parent = scene) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
    const delta = bv.clone().sub(av);
    const object = cylinder(radius, radius, delta.length(), mat, av.clone().add(bv).multiplyScalar(0.5).toArray(), parent, 10);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return object;
  }
  function ringSegment(inner, outer, start, span, height, mat, y, parent = scene) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, start, start + span, false);
    shape.absarc(0, 0, inner, start + span, start, true);
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 32 });
    geom.rotateX(-Math.PI / 2);
    return mesh(geom, mat, [0, y, 0], parent);
  }
  function addLabel(text, width, height, position, fontSize = 48, parent = scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = '#d9eee0';
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), position, parent);
    label.castShadow = false; label.receiveShadow = false;
    return label;
  }

  // A soft, raised campus vignette keeps the actual table visually dominant.
  cylinder(3.25, 3.32, 0.16, baseMaterial, [0, -0.09, 0], scene, 96);
  cylinder(3.20, 3.20, 0.025, grass, [0, 0.002, 0], scene, 96);
  cylinder(2.16, 2.16, 0.035, paving, [0, 0.025, 0], scene, 96);
  const outerRing = ringSegment(2.12, 2.15, 0, Math.PI * 2, 0.009, material(0xc9cfc2), 0.05);
  outerRing.castShadow = false;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const paver = box(0.58, 0.022, 0.44, paving, [2.64 * Math.cos(angle), 0.025, 2.64 * Math.sin(angle)]);
    paver.rotation.y = -angle;
  }
  const floor = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x486253, opacity: 0.18 }), [0, -0.19, 0]);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;

  const station = new THREE.Group(); scene.add(station);
  // Battery cupboard, pedestal and service panel.
  cylinder(0.47, 0.52, 0.1, charcoal, [0, 0.12, 0], station);
  cylinder(0.43, 0.43, 0.65, charcoal, [0, 0.48, 0], station);
  box(0.49, 0.43, 0.035, charcoalLight, [0, 0.43, 0.432], station);
  for (let i = 0; i < 4; i++) box(0.23, 0.012, 0.007, black, [0, 0.30 + i * 0.035, 0.455], station);
  cylinder(0.012, 0.012, 0.018, pale, [0.18, 0.47, 0.457], station, 12).rotation.x = Math.PI / 2;
  addLabel('ECO SMART', 0.39, 0.097, [0, 0.575, 0.454], 45, station);
  cylinder(0.065, 0.065, 3.05, charcoal, [0, 1.68, 0], station, 24);

  // Broad circular tabletop, individual board seams, and a fine rim.
  cylinder(1.13, 1.13, 0.085, wood[1], [0, 1.03, 0], station, 96);
  ringSegment(1.11, 1.14, 0, Math.PI * 2, 0.045, charcoalLight, 0.97, station);
  const seamMat = new THREE.LineBasicMaterial({ color: 0x966a47, transparent: true, opacity: 0.5 });
  for (let z = -0.96; z < 1; z += 0.19) {
    const edge = Math.sqrt(1.122 * 1.122 - z * z);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-edge, 1.074, z), new THREE.Vector3(edge, 1.074, z)]), seamMat);
    station.add(line);
  }
  cylinder(0.14, 0.14, 0.009, charcoal, [0, 1.079, 0], station, 40);

  // Four curved benches with slatted seats and backrests, kept entirely editable.
  for (let q = 0; q < 4; q++) {
    const start = q * Math.PI / 2 + 0.19;
    const span = Math.PI / 2 - 0.38;
    for (let slat = 0; slat < 4; slat++) {
      ringSegment(1.38 + slat * 0.10, 1.469 + slat * 0.10, start, span, 0.055, wood[(slat + q) % wood.length], 0.56, station);
    }
    ringSegment(1.40, 1.76, start, span, 0.042, charcoal, 0.51, station);
    for (const a of [start + 0.1, start + span - 0.1]) {
      for (const r of [1.44, 1.72]) {
        const x = r * Math.cos(a), z = -r * Math.sin(a);
        box(0.055, 0.48, 0.055, charcoal, [x, 0.30, z], station);
        cylinder(0.055, 0.055, 0.024, charcoal, [x, 0.065, z], station, 16);
      }
      const r = 1.76;
      box(0.045, 0.55, 0.045, charcoal, [r * Math.cos(a), 0.84, -r * Math.sin(a)], station);
    }
    for (let slat = 0; slat < 3; slat++) {
      ringSegment(1.745, 1.79, start, span, 0.1, wood[(q + slat + 1) % wood.length], 0.74 + slat * 0.12, station);
    }
  }

  // Slender structural posts leave the open seating space easy to see.
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const x = Math.cos(a) * 1.05, z = Math.sin(a) * 1.05;
    box(0.065, 1.39, 0.065, charcoal, [x, 1.74, z], station);
    rod([x, 2.04, z], [x * 1.38, 2.39, z * 1.38], 0.027, charcoal, station);
    rod([0, 0.8, 0], [x, 0.98, z], 0.025, charcoal, station);
  }

  // Eight sloped trapezoidal photovoltaic sections around a raised hub.
  const roofY = 2.39, hubY = 2.75, outer = 2.03, inner = 0.30;
  const sectionWidth = Math.PI / 4;
  function roofPoint(angle, radius, offset = 0) {
    const y = roofY + (outer - radius) / (outer - inner) * (hubY - roofY) + offset;
    return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
  }
  const roofGroup = new THREE.Group(); station.add(roofGroup);
  for (let i = 0; i < 8; i++) {
    const a0 = i * sectionWidth + 0.009, a1 = (i + 1) * sectionWidth - 0.009;
    const corners = [roofPoint(a0, inner), roofPoint(a0, outer), roofPoint(a1, outer), roofPoint(a1, inner)];
    const positions = [];
    for (const j of [0, 1, 2, 0, 2, 3]) positions.push(...corners[j].toArray());
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    const surface = mesh(geom, navy, [0, 0, 0], roofGroup);
    surface.material.side = THREE.DoubleSide;
    // Panel cells follow the actual trapezoid plane, not a flat overlay.
    const quad = (t, s) => {
      const low = corners[0].clone().lerp(corners[1], t);
      const high = corners[3].clone().lerp(corners[2], t);
      return low.lerp(high, s).add(new THREE.Vector3(0, 0.006, 0));
    };
    const cellVertices = [], gridVertices = [];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        const t0 = 0.07 + row * 0.148, t1 = t0 + 0.139;
        const s0 = 0.045 + col * 0.23, s1 = s0 + 0.216;
        const cornersCell = [quad(t0, s0), quad(t1, s0), quad(t1, s1), quad(t0, s1)];
        for (const j of [0, 1, 2, 0, 2, 3]) cellVertices.push(...cornersCell[j].toArray());
        for (let side = 0; side < 4; side++) gridVertices.push(...cornersCell[side].toArray(), ...cornersCell[(side + 1) % 4].toArray());
      }
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cellVertices, 3));
    cg.computeVertexNormals();
    const cell = mesh(cg, panelCell, [0, 0, 0], roofGroup);
    cell.material.side = THREE.DoubleSide;
    cell.castShadow = false;
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
    roofGroup.add(new THREE.LineSegments(gridGeometry, panelLines));
    rod(corners[0].toArray(), corners[1].toArray(), 0.023, charcoal, roofGroup);
    rod(corners[1].toArray(), corners[2].toArray(), 0.032, charcoal, roofGroup);
    rod([0, hubY - 0.05, 0], [corners[1].x, roofY - 0.045, corners[1].z], 0.025, pale, roofGroup);
  }
  cylinder(0.31, 0.31, 0.045, charcoal, [0, hubY, 0], station, 8);

  // A small environmental sensor complements the proposed campus design.
  cylinder(0.018, 0.018, 0.34, charcoal, [0.93, 2.76, -0.4], station, 12);
  const anemometer = new THREE.Group();
  anemometer.position.set(0.93, 2.94, -0.4); station.add(anemometer);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    rod([0, 0, 0], [0.15 * Math.cos(a), 0, 0.15 * Math.sin(a)], 0.009, charcoal, anemometer);
    mesh(new THREE.SphereGeometry(0.036, 10, 7), charcoal, [0.15 * Math.cos(a), 0, 0.15 * Math.sin(a)], anemometer);
  }

  // Vertical-axis rotor: three curved airfoils, bearing hub and support spokes.
  cylinder(0.08, 0.10, 0.20, charcoal, [0, 2.87, 0], station, 24);
  const rotor = new THREE.Group(); rotor.position.y = 2.98; station.add(rotor);
  cylinder(0.026, 0.026, 1.08, pale, [0, 0.54, 0], rotor, 16);
  for (const y of [0.02, 1.05]) cylinder(0.11, 0.11, 0.06, charcoalLight, [0, y, 0], rotor, 24);
  const bladeMaterial = material(0xf5f3e8, 0.4, 0.12); bladeMaterial.side = THREE.DoubleSide;
  for (let blade = 0; blade < 3; blade++) {
    const baseAngle = blade * Math.PI * 2 / 3;
    const verts = [], indices = [], samples = 28;
    for (let j = 0; j <= samples; j++) {
      const t = j / samples;
      const radius = 0.26 + 0.19 * Math.sin(Math.PI * t);
      const angle = baseAngle + (t - 0.5) * 0.34;
      const cx = radius * Math.cos(angle), cz = radius * Math.sin(angle);
      const halfWidth = 0.062 + 0.014 * Math.sin(Math.PI * t);
      verts.push(cx - Math.sin(angle) * halfWidth, t * 1.06, cz + Math.cos(angle) * halfWidth);
      verts.push(cx + Math.sin(angle) * halfWidth, t * 1.06, cz - Math.cos(angle) * halfWidth);
      if (j < samples) {
        const n = j * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); bg.setIndex(indices); bg.computeVertexNormals();
    mesh(bg, bladeMaterial, [0, 0, 0], rotor);
    for (const t of [0, 1]) {
      const angle = baseAngle + (t - 0.5) * 0.34;
      rod([0, t * 1.06, 0], [0.26 * Math.cos(angle), t * 1.06, 0.26 * Math.sin(angle)], 0.013, pale, rotor);
    }
  }

  // Visible USB outlets and phone screens make the charging purpose explicit.
  box(0.21, 0.36, 0.22, charcoal, [0, 1.255, 0.08], station);
  box(0.15, 0.27, 0.009, pale, [0, 1.265, 0.195], station);
  for (const y of [1.21, 1.29]) {
    box(0.07, 0.026, 0.014, black, [0, y, 0.205], station);
    box(0.048, 0.008, 0.016, mint, [0, y, 0.214], station);
  }
  box(0.035, 0.014, 0.012, ledMat, [0, 1.365, 0.208], station);
  const phone = (x, z, yaw) => {
    const group = new THREE.Group(); group.position.set(x, 1.085, z); group.rotation.y = yaw; station.add(group);
    box(0.16, 0.017, 0.30, black, [0, 0.008, 0], group);
    const screen = box(0.14, 0.003, 0.258, screenMat, [0, 0.019, 0], group);
    screen.castShadow = false;
    box(0.04, 0.003, 0.007, black, [0, 0.022, -0.117], group);
    // A small battery glyph remains geometry, so it stays crisp as you zoom.
    box(0.056, 0.003, 0.087, pale, [0, 0.022, 0.008], group);
    box(0.043, 0.004, 0.057, charcoalLight, [0, 0.025, 0.017], group);
    box(0.022, 0.003, 0.01, pale, [0, 0.022, -0.04], group);
    return group;
  };
  phone(0.57, 0.37, -0.35); phone(-0.52, 0.36, 0.35);
  for (const direction of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.035 * direction, 1.21, 0.22),
      new THREE.Vector3(0.16 * direction, 1.09, 0.36),
      new THREE.Vector3(0.38 * direction, 1.09, 0.48),
      new THREE.Vector3(0.58 * direction, 1.105, 0.50)
    ]);
    mesh(new THREE.TubeGeometry(curve, 24, 0.008, 6, false), charcoal, [0, 0, 0], station);
  }

  // A restrained landscape avoids distracting from the mechanism.
  const leaves = [material(0x729d80), material(0x83ab87), material(0x91b88e)];
  function tree(x, z, scale) {
    const group = new THREE.Group(); group.position.set(x, 0.03, z); group.scale.setScalar(scale); scene.add(group);
    cylinder(0.22, 0.20, 0.17, paving, [0, 0.06, 0], group, 32);
    cylinder(0.028, 0.044, 0.90, wood[0], [0, 0.51, 0], group, 12);
    const crown = mesh(new THREE.IcosahedronGeometry(0.48, 2), leaves[0], [0, 1.18, 0], group);
    crown.scale.set(0.82, 1.05, 0.83);
    const side = mesh(new THREE.IcosahedronGeometry(0.32, 2), leaves[1], [0.24, 1.01, 0.08], group);
    side.scale.set(0.85, 1.1, 0.9);
  }
  tree(-2.35, -1.7, 0.92); tree(2.0, -2.15, 0.76);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.98 + i * 0.13;
    const shrub = mesh(new THREE.IcosahedronGeometry(0.14 + (i % 3) * 0.025, 1), leaves[i % 3], [2.86 * Math.cos(a), 0.16, 2.86 * Math.sin(a)]);
    shrub.scale.y = 0.8;
  }

  const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x82977b, 2.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe3b4, 3.2);
  sun.position.set(-3.5, 7, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -5; sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -5;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 20;
  sun.shadow.normalBias = 0.03; sun.shadow.bias = -0.00012;
  sun.shadow.radius = 3; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbce1e0, 1.1); fill.position.set(4, 4, -3); scene.add(fill);

  // Thin, flowing breeze traces show the direction without hiding the structure.
  const breeze = new THREE.Group(); scene.add(breeze);
  const breezeMaterials = [];
  for (let i = 0; i < 12; i++) {
    const mat = new THREE.LineBasicMaterial({ color: 0x6ba8a0, transparent: true, opacity: 0, depthWrite: false });
    breezeMaterials.push(mat);
    const points = [];
    for (let j = 0; j < 12; j++) points.push(new THREE.Vector3(j * 0.065, Math.sin(j * 0.2) * 0.025, 0));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    line.userData.start = (i * 1.931) % 6.6;
    line.position.set(line.userData.start - 3.3, 0.8 + (i % 4) * 0.74, -1.8 + (i % 5) * 0.82);
    breeze.add(line);
  }

  let previousTime = null, disposed = false, windPhase = 0;
  let targetCamera = null, targetLook = null;
  const views = {
    overview: { position: [6.0, 4.3, 7.5], target: [0, 1.74, 0] },
    charging: { position: [3.5, 2.1, 4.3], target: [0, 1.13, 0] },
    top: { position: [1.8, 8.5, 3.2], target: [0, 1.3, 0] }
  };
  function setView(view = 'overview', immediate = false) {
    const v = views[view] || views.overview;
    targetCamera = new THREE.Vector3(...v.position);
    targetLook = new THREE.Vector3(...v.target);
    if (immediate) {
      camera.position.copy(targetCamera); controls.target.copy(targetLook);
      targetCamera = null; targetLook = null; controls.update();
    }
  }
  controls.addEventListener('start', () => { targetCamera = null; targetLook = null; });
  setView('overview', true);

  function resize() {
    if (disposed) return;
    const width = Math.max(container.clientWidth, 1), height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    // A narrower stage needs a wider field of view to preserve the full canopy.
    camera.fov = width / height < 0.9 ? 46 : width / height < 1.18 ? 40 : 36;
    camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();

  function update({ irradiance = 700, wind = 5, solarW = 0, windW = 0, playing = true, elapsedSeconds = 0 } = {}) {
    if (disposed) return;
    const time = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
    const delta = previousTime === null ? 0 : Math.min(Math.max(time - previousTime, 0), 0.1);
    previousTime = time;
    const daylight = THREE.MathUtils.clamp(irradiance / 1000, 0, 1);
    hemi.intensity = 1.05 + daylight * 1.15;
    sun.intensity = 0.12 + daylight * 3.3;
    fill.intensity = 0.8 + daylight * 0.25;
    sun.color.setHex(daylight < 0.15 ? 0x9bbbd8 : 0xffe3b4);
    renderer.toneMappingExposure = 0.88 + daylight * 0.23;
    ledMat.emissiveIntensity = solarW + windW > 0 ? 0.85 : 0.25;
    if (playing) {
      const rotationRate = wind >= 3 && wind < 25 ? Math.min(wind * 0.55, 6) : 0;
      rotor.rotation.y += delta * rotationRate;
      anemometer.rotation.y += delta * Math.max(wind, 0) * 0.8;
      windPhase += delta * Math.max(wind, 0) * 0.25;
    }
    breeze.visible = wind > 0.5;
    breeze.children.forEach((line, i) => {
      line.position.x = ((line.userData.start + windPhase) % 6.6) - 3.3;
      const envelope = Math.sin(Math.PI * (line.position.x + 3.3) / 6.6);
      breezeMaterials[i].opacity = Math.min(wind / 12, 0.65) * 0.32 * envelope;
    });
    if (targetCamera && targetLook) {
      camera.position.lerp(targetCamera, 0.075); controls.target.lerp(targetLook, 0.075);
      if (camera.position.distanceTo(targetCamera) < 0.006) {
        camera.position.copy(targetCamera); controls.target.copy(targetLook); targetCamera = null; targetLook = null;
      }
    }
    controls.update(); renderer.render(scene, camera);
  }
  update();
  return {
    update, resize, setView,
    resetCamera() { setView('overview'); },
    dispose() {
      disposed = true; observer.disconnect(); controls.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(mat => { materials.add(mat); if (mat.map) textures.add(mat.map); });
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
