import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.querySelector('.fsticky');
const old = document.getElementById('f3d');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const cv = renderer.domElement;
cv.id = 'f3gl';
cv.setAttribute('role', 'img');
cv.setAttribute('aria-label', '3D model of a dilution refrigerator, from the 300 K top flange down to the 10 mK mixing chamber and my chip. Drag to rotate.');
host.insertBefore(cv, old);
old.style.display = 'none';
const lab = document.createElement('div');
lab.className = 'f3lab'; lab.setAttribute('aria-hidden', 'true');
host.appendChild(lab);

const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1408, 0.35));
const key = new THREE.DirectionalLight(0xfff4e0, 2.6); key.position.set(60, 80, 90); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 1.2); fill.position.set(-40, 10, 120); scene.add(fill);
const rim = new THREE.DirectionalLight(0x9fc3ff, 0.9); rim.position.set(-80, -20, -60); scene.add(rim);

const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
camera.position.set(120, 40, 140);
const controls = new OrbitControls(camera, cv);
controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.6; controls.maxPolarAngle = 2.1;
controls.autoRotate = !RM; controls.autoRotateSpeed = 0.6;
if (coarse) controls.enabled = false;
controls.target.set(0, -40, 0);

/* materials */
const ACC = new THREE.Color(0x9fc3ff);
const gold = () => new THREE.MeshStandardMaterial({ color: 0xf5c66e, metalness: 1, roughness: 0.22, envMapIntensity: 1.8 });
const copper = new THREE.MeshStandardMaterial({ color: 0xe08a58, metalness: 1, roughness: 0.3, envMapIntensity: 1.6 });
const steel = new THREE.MeshStandardMaterial({ color: 0xc3c7cf, metalness: 1, roughness: 0.3 });
const steelDark = new THREE.MeshStandardMaterial({ color: 0x8d9099, metalness: 1, roughness: 0.42 });
const silver = new THREE.MeshStandardMaterial({ color: 0xe8e8ec, metalness: 1, roughness: 0.18 });
const g10 = new THREE.MeshStandardMaterial({ color: 0x9aa36a, metalness: 0, roughness: 0.55 });
const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.2, roughness: 0.9 });
const goldM = gold();

const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); return m; };
const cyl = (r, h, seg = 48) => new THREE.CylinderGeometry(r, r, h, seg);
const rod = (a, b, r, mat) => { // cylinder between two points
  const v = new THREE.Vector3().subVectors(b, a), L = v.length();
  const m = new THREE.Mesh(cyl(r, L, 16), mat);
  m.position.copy(a).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  scene.add(m); return m;
};

/* stages: y position, radius, label */
const ST = [
  { y: 0, r: 23, t: 2.2, l: '300 K', m: steel },
  { y: -15, r: 21, t: 1.3, l: '50 K' },
  { y: -31, r: 19, t: 1.3, l: '4 K' },
  { y: -47, r: 15.5, t: 1.1, l: 'Still, ~1 K' },
  { y: -59, r: 13.5, t: 1.1, l: '100 mK' },
  { y: -71, r: 12.5, t: 1.4, l: '10 mK' },
];
const rings = [];
ST.forEach((s, i) => {
  const mat = s.m || gold();
  s.mesh = add(cyl(s.r, s.t, 96), mat, 0, s.y, 0);
  // bolt holes around the rim and a wiring cut-out
  const n = Math.round(s.r * 1.4);
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; add(cyl(0.38, 0.08, 10), dark, Math.cos(a) * (s.r - 1.3), s.y + s.t / 2 + 0.03, Math.sin(a) * (s.r - 1.3)); }
  if (i > 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(s.r + 0.6, 0.22, 10, 120), new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0 })); ring.rotation.x = Math.PI / 2; ring.position.y = s.y; scene.add(ring); rings[i] = ring; }
});
// top flange: thicker rim
add(new THREE.TorusGeometry(23, 0.9, 16, 120), steel, 0, 0, 0).rotation.x = Math.PI / 2;

/* supports between stages */
for (let i = 0; i < ST.length - 1; i++) {
  const a = ST[i], b = ST[i + 1];
  for (let k = 0; k < 4; k++) {
    const ang = Math.PI / 4 + (k * Math.PI) / 2, ra = b.r - 2.2;
    rod(new THREE.Vector3(Math.cos(ang) * ra, a.y - a.t / 2, Math.sin(ang) * ra), new THREE.Vector3(Math.cos(ang) * ra, b.y + b.t / 2, Math.sin(ang) * ra), i < 2 ? 0.75 : 0.45, i < 2 ? g10 : steel);
  }
}

/* pulse-tube cooler: motor head on top, two stages down to 50 K and 4 K */
const PT = { x: 10, z: -7 };
add(cyl(4, 8), steelDark, PT.x, 6, PT.z);
add(cyl(2.6, 2.2), steel, PT.x, 1.6, PT.z);
add(cyl(1.7, 15), steel, PT.x, -7.5, PT.z);
add(cyl(3.2, 2.4), copper, PT.x, -15 - 1.9, PT.z);
add(cyl(1.1, 13.5), steel, PT.x, -24, PT.z);
add(cyl(2.4, 2.4), copper, PT.x, -31 - 1.9, PT.z);
add(cyl(0.7, 16), steel, PT.x - 3.4, -7.5, PT.z); // regenerator line

/* dilution unit: pumping line, still, heat exchangers, mixing chamber */
const DU = { x: 1, z: 6 };
add(cyl(1.9, 49), steel, DU.x, -22.5, DU.z);                 // still pumping line
add(cyl(3.6, 5.5), gold(), DU.x, -47 - 3.4, DU.z);           // still pot
add(cyl(0.35, 40), silver, DU.x + 3, -32, DU.z - 2);          // condensing line
const helix = []; for (let i = 0; i <= 260; i++) { const u = i / 260, a = u * Math.PI * 2 * 7; helix.push(new THREE.Vector3(DU.x + Math.cos(a) * 2.1, -53.5 - u * 13.5, DU.z + Math.sin(a) * 2.1)); }
scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 600, 0.2, 8), copper)); // continuous heat exchanger
[-61.5, -64, -66.5].forEach((y) => add(cyl(2.6, 0.9), silver, DU.x, y, DU.z));                       // step heat exchangers
add(cyl(3.4, 4.2), gold(), DU.x, -71 + 0.7 + 2.1, DU.z);     // mixing chamber
add(new THREE.SphereGeometry(3.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gold(), DU.x, -71 + 0.7 + 4.2, DU.z);

/* coax lines with attenuators, HEMT at 4 K, circulators at 10 mK */
const LX = [-9, -7, -5, -3], LZ = -3;
const box = new THREE.Vector3(0, -86, 0);
LX.forEach((x, i) => {
  const pts = [new THREE.Vector3(x, 4, LZ), new THREE.Vector3(x, -40, LZ), new THREE.Vector3(x, -72, LZ), new THREE.Vector3(x * 0.55, -79, LZ * 0.6), new THREE.Vector3(-4.6 + i * 0.1, -85.5 + i * 0.7, 0.2 * i)];
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 220, 0.2, 8), i % 2 ? silver : copper));
  add(cyl(0.5, 0.9, 16), goldM, x, 5, LZ); // SMA feedthrough
  [2, 3, 5].forEach((s) => { add(cyl(0.6, 1.8, 20), gold(), x, ST[s].y - ST[s].t / 2 - 1.2, LZ); add(cyl(0.45, 0.5, 6), silver, x, ST[s].y - ST[s].t / 2 - 0.1, LZ); });
});
add(new THREE.BoxGeometry(3.6, 1.4, 2.4), gold(), -5, -31 + 0.65 + 0.7, 9);         // HEMT amplifier
[[-7, 5], [-4.6, 5]].forEach(([x, z]) => { add(new THREE.BoxGeometry(1.8, 1.4, 1.8), silver, x, -71 + 0.7 + 0.7, z); add(cyl(0.5, 0.25, 24), gold(), x, -71 + 0.7 + 1.5, z); }); // circulators

/* cold finger and sample box with the chip */
add(cyl(1.3, 11.5), copper, 0, -71 - 0.7 - 5.75, 0);
add(new THREE.BoxGeometry(8, 2.6, 6), gold(), box.x, box.y, box.z);
[[-4.3, 0, 0, 'x'], [4.3, 0, 0, 'x'], [0, 0, 3.3, 'z']].forEach(([x, y, z, ax]) => { const c = add(cyl(0.55, 1.2, 16), silver, x, box.y, z); if (ax === 'x') c.rotation.z = Math.PI / 2; else c.rotation.x = Math.PI / 2; });
const chipMat = new THREE.MeshStandardMaterial({ color: 0x1a2235, emissive: ACC, emissiveIntensity: 0.15, metalness: 0.2, roughness: 0.4 });
const chip = add(new THREE.BoxGeometry(2.6, 0.12, 1.6), chipMat, 0, box.y + 1.36, 0.6);
const chipGlow = new THREE.PointLight(0x9fc3ff, 0, 30); chipGlow.position.set(0, box.y + 4, 0); scene.add(chipGlow);


/* ---------- realism details (after reference photos) ---------- */
const white = new THREE.MeshStandardMaterial({ color: 0xeef0f3, metalness: 0.15, roughness: 0.38 });
add(cyl(30, 12, 96), white, 0, 7.2, 0);                       // top housing
add(new THREE.TorusGeometry(30, 0.8, 12, 120), steel, 0, 1.3, 0).rotation.x = Math.PI / 2;
for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(cyl(0.45, 3.4, 12), steelDark, Math.cos(a) * 28.6, -0.6, Math.sin(a) * 28.6); }
// gold thermal-link sleeves on the support rods
for (let i = 0; i < ST.length - 1; i++) { const b = ST[i + 1]; for (let k = 0; k < 4; k++) { const ang = Math.PI / 4 + k * Math.PI / 2, ra = b.r - 2.2; add(cyl(i < 2 ? 1.25 : 0.85, 4, 24), gold(), Math.cos(ang) * ra, b.y + b.t / 2 + 2, Math.sin(ang) * ra); } }
// coax strain-relief loops between plates
[-9, -7, -5, -3].forEach((x, i) => { [-8, -39, -53].forEach((y) => { const t = add(new THREE.TorusGeometry(1.6, 0.11, 8, 40), silver, x - 0.4, y - i * 0.6, -4.8); t.rotation.y = 0.4 + i * 0.3; }); });
// fanned flexible coax from the 10 mK plate to the sample box
for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, r0 = 9 + (k % 3);
  const pts = [new THREE.Vector3(Math.cos(a) * r0, -72.2, Math.sin(a) * r0), new THREE.Vector3(Math.cos(a) * (r0 + 1), -78, Math.sin(a) * (r0 + 1)), new THREE.Vector3(Math.cos(a) * 6, -84, Math.sin(a) * 4), new THREE.Vector3(Math.cos(a) * 3.6, -86, Math.sin(a) * 2.4)];
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.16, 6), k % 4 ? silver : copper)); }

/* ---------- nested shields: outer vacuum can, 50 K, 4 K, still ---------- */
function canGeo(r, h) { const p = []; p.push(new THREE.Vector2(r, 0)); p.push(new THREE.Vector2(r, -h + r * 0.18)); for (let i = 1; i <= 10; i++) { const u = i / 10; p.push(new THREE.Vector2(r * Math.cos(u * Math.PI / 2), -h + r * 0.18 - Math.sin(u * Math.PI / 2) * r * 0.18)); } return new THREE.LatheGeometry(p, 96); }
const CANS = [
  { top: 1, r: 27, h: 104, mat: new THREE.MeshStandardMaterial({ color: 0xeceef2, metalness: 0.2, roughness: 0.35 }) },
  { top: -15.7, r: 22.6, h: 82, mat: new THREE.MeshStandardMaterial({ color: 0xd3d7de, metalness: 1, roughness: 0.32 }) },
  { top: -31.7, r: 20.4, h: 63, mat: new THREE.MeshStandardMaterial({ color: 0xf2c46a, metalness: 1, roughness: 0.25, envMapIntensity: 1.8 }) },
  { top: -47.6, r: 17, h: 45, mat: new THREE.MeshStandardMaterial({ color: 0xe08a58, metalness: 1, roughness: 0.3, envMapIntensity: 1.6 }) },
];
CANS.forEach((c) => { c.mat.side = THREE.DoubleSide; c.mat.transparent = true; c.mesh = add(canGeo(c.r, c.h), c.mat, 0, c.top, 0); c.y0 = c.top; c.ring = add(new THREE.TorusGeometry(c.r + 0.5, 0.7, 10, 96), c.mat, 0, c.top - 0.4, 0); c.ring.rotation.x = Math.PI / 2; });
let peelCur = 0;
function updateCans(goal) {
  peelCur += (goal - peelCur) * 0.05;
  CANS.forEach((c, k) => { const o = Math.min(1, Math.max(0, peelCur - k)), e = o * o * (3 - 2 * o);
    const dy = -e * 140; c.mesh.position.y = c.y0 + dy; c.ring.position.y = c.y0 - 0.4 + dy;
    c.mat.opacity = 1 - e * 0.9; c.mesh.visible = c.ring.visible = e < 0.98; c.mat.depthWrite = e < 0.2; });
}

/* camera choreography driven by scroll state from the main script */
const focusY = [-42, -20, -31, -47, -59, -71], focusD = [215, 150, 125, 110, 100, 92];
let tY = -40, tD = 190, W = 0, H = 0, vis = true, raf = 0;
const off = new THREE.Vector3();
function size() { W = host.clientWidth; H = Math.max(200, cv.parentElement.clientHeight - (host.querySelector('.fread')?.offsetHeight || 0)); renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px'; camera.aspect = W / H; camera.updateProjectionMatrix(); }
new ResizeObserver(size).observe(host);
const tmp = new THREE.Vector3(), right = new THREE.Vector3();
function frame() {
  raf = 0;
  const view = document.querySelector('[data-view="research"]');
  if (!vis || !view || view.hidden) return;
  const st = window.FST || { act: 0, chip: false };
  const a = st.chip ? 6 : st.act;
  const pl = st.peel == null ? 4 : st.peel; updateCans(pl);
  const out = Math.max(0, Math.min(1, 1 - pl));
  const goalY = a === 6 ? box.y + 2 : focusY[a] * (1 - out) + (-50) * out, goalD = a === 6 ? 46 : focusD[a] * (1 - out) + 340 * out;
  tY += (goalY - tY) * 0.06; tD += (goalD - tD) * 0.06;
  const dy = tY - controls.target.y; controls.target.y = tY; camera.position.y += dy;
  off.subVectors(camera.position, controls.target); off.setLength(off.length() + (tD - off.length()) * 0.08); camera.position.copy(controls.target).add(off);
  controls.autoRotate = !RM && window.MOTION_ON !== false;
  // highlight the active stage
  ST.forEach((s, i) => { if (rings[i]) { const on = i === st.act && !st.chip; rings[i].material.opacity += ((on ? 0.95 : 0) - rings[i].material.opacity) * 0.15; } if (s.mesh.material !== steel) s.mesh.material.emissive = s.mesh.material.emissive || new THREE.Color(); });
  ST.forEach((s, i) => { if (s.mesh.material !== steel) { const on = i === st.act && !st.chip; s.mesh.material.emissive.lerp(on ? new THREE.Color(0x1d2b45) : new THREE.Color(0), 0.15); } });
  chipMat.emissiveIntensity += ((st.chip ? 2.4 : 0.15) - chipMat.emissiveIntensity) * 0.1;
  chipGlow.intensity += ((st.chip ? 120 : 0) - chipGlow.intensity) * 0.1;
  controls.update();
  renderer.render(scene, camera);
  // floating label at the active stage
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  const s = a === 6 ? { y: box.y, r: 5, l: 'my chip' } : ST[a === 0 ? 0 : a];
  tmp.set(right.x * (s.r + 2), s.y, right.z * (s.r + 2)).project(camera);
  lab.textContent = pl < 0.5 ? 'Outer vacuum can' : pl < 3.5 && a <= 2 ? ['Vacuum can','50 K shield','4 K shield','Still shield'][Math.min(3, Math.ceil(pl))] : (a === 0 && !st.chip ? '300 K' : s.l);
  const lx = Math.min(W - lab.offsetWidth - 6, ((tmp.x + 1) / 2) * W + 10); lab.style.transform = `translate(${Math.max(4, lx)}px, ${Math.max(4, ((1 - tmp.y) / 2) * H - 12)}px)`;
  raf = requestAnimationFrame(frame);
}
function kick() { if (!raf) raf = requestAnimationFrame(frame); }
new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(host);
window.F3D_OK = true;
window.F3D_KICK = kick;
size(); kick();
