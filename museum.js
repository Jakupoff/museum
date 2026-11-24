import * as THREE from 'three';

// ---------- config ----------
const CFG = window.MUSEUM || {};
const PHOTOS = (CFG.photos || []).filter(Boolean);
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

const W = 8;          // hall width
const H = 4.2;        // ceiling height
const S = 4.2;        // spacing between frames on one wall
const EYE = 1.65;     // eye height
const R = 0.45;       // player radius
const perSide = Math.max(1, Math.ceil(PHOTOS.length / 2));
const L = Math.max(18, perSide * S + 8); // hall length grows with photo count

document.title = CFG.title || 'Our Museum';
document.getElementById('introTitle').textContent = CFG.title || 'Our Museum';
document.getElementById('introSub').textContent = CFG.subtitle || '';
if (isTouch) document.getElementById('help').textContent = 'Left thumb to walk, right thumb to look around, tap a photo to see it up close.';

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('stage').appendChild(renderer.domElement);
const canvas = renderer.domElement;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14100d);
scene.fog = new THREE.Fog(0x14100d, 16, L + 8);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';

// ---------- procedural textures ----------
function woodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    const x = i * 64, b = 95 + Math.random() * 30;
    g.fillStyle = `rgb(${b + 55},${b + 22},${b - 25})`;
    g.fillRect(x, 0, 64, 512);
    for (let k = 0; k < 45; k++) {
      g.strokeStyle = `rgba(60,30,10,${Math.random() * 0.16})`;
      g.lineWidth = Math.random() * 2;
      const xx = x + Math.random() * 64;
      g.beginPath(); g.moveTo(xx, 0);
      g.bezierCurveTo(xx + Math.random() * 6 - 3, 170, xx + Math.random() * 6 - 3, 340, xx, 512);
      g.stroke();
    }
    g.fillStyle = 'rgba(35,18,5,.65)';
    g.fillRect(x, 0, 2, 512);
    g.fillRect(x, Math.random() * 512, 64, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function fitFont(g, text, maxW, size, style) {
  do { g.font = `${style} ${size}px Georgia, serif`; size -= 2; } while (g.measureText(text).width > maxW && size > 10);
}

function plaqueTexture(title, date) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, 512, 200);
  g.strokeStyle = '#c9b48f'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 194);
  g.fillStyle = '#2a1f17'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, title || '', 460, 46, '600');
  g.fillText(title || '', 256, date ? 80 : 100);
  if (date) { g.fillStyle = '#7a6a5a'; fitFont(g, date, 460, 34, 'italic'); g.fillText(date, 256, 140); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return t;
}

function signTexture(big, small) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#5a4127'; fitFont(g, big, 940, 130, 'normal'); g.fillText(big, 512, 210);
  if (small) { g.fillStyle = '#8a6f50'; fitFont(g, small, 900, 52, 'italic'); g.fillText(small, 512, 330); }
  g.fillStyle = '#b5524f'; g.font = '60px Georgia, serif'; g.fillText('♥', 512, 430);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return t;
}

const PALETTES = [['#f6d5c9', '#e9a3a0'], ['#d9e6f2', '#a8c3e0'], ['#e8e0f3', '#bba7dc'], ['#f3ead0', '#e2c68d'], ['#d7efe3', '#9fd1b8']];
function placeholderCanvas(p, i) {
  const c = document.createElement('canvas'); c.width = 900; c.height = 675;
  const g = c.getContext('2d');
  const [a, b] = PALETTES[i % PALETTES.length];
  const grd = g.createLinearGradient(0, 0, 900, 675); grd.addColorStop(0, a); grd.addColorStop(1, b);
  g.fillStyle = grd; g.fillRect(0, 0, 900, 675);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '150px Georgia, serif'; g.fillText('♥', 450, 250);
  g.fillStyle = '#4a3a30'; fitFont(g, p.title || 'Your photo here', 820, 54, 'normal'); g.fillText(p.title || 'Your photo here', 450, 430);
  g.fillStyle = '#6d5a4c'; g.font = '30px system-ui, sans-serif'; g.fillText(`put your photo at ${p.src || 'photos/…'}`, 450, 510);
  return c;
}

// ---------- room ----------
function addMesh(geo, mat, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); scene.add(m); return m;
}
const wallMat = new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.95 });
const floorTex = woodTexture(); floorTex.repeat.set(W / 4, L / 4);
addMesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 }), [0, 0, -L / 2], [-Math.PI / 2, 0, 0]);
addMesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 }), [0, H, -L / 2], [Math.PI / 2, 0, 0]);
addMesh(new THREE.PlaneGeometry(L, H), wallMat, [-W / 2, H / 2, -L / 2], [0, Math.PI / 2, 0]);
addMesh(new THREE.PlaneGeometry(L, H), wallMat, [W / 2, H / 2, -L / 2], [0, -Math.PI / 2, 0]);
addMesh(new THREE.PlaneGeometry(W, H), wallMat, [0, H / 2, -L]);
addMesh(new THREE.PlaneGeometry(W, H), wallMat, [0, H / 2, 0], [0, Math.PI, 0]);

const darkWood = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.6 });
addMesh(new THREE.BoxGeometry(0.04, 0.18, L), darkWood, [-W / 2 + 0.02, 0.09, -L / 2]);
addMesh(new THREE.BoxGeometry(0.04, 0.18, L), darkWood, [W / 2 - 0.02, 0.09, -L / 2]);
addMesh(new THREE.BoxGeometry(W, 0.18, 0.04), darkWood, [0, 0.09, -L + 0.02]);
addMesh(new THREE.BoxGeometry(W, 0.18, 0.04), darkWood, [0, 0.09, -0.02]);

// lights
scene.add(new THREE.HemisphereLight(0xfff4e4, 0x3a2a20, 1.1));
const nLights = Math.min(8, Math.ceil(L / 6));
const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff3dc });
for (let i = 0; i < nLights; i++) {
  const z = -L * (i + 0.5) / nLights;
  const pl = new THREE.PointLight(0xffe9cc, 22, 13, 1.6);
  pl.position.set(0, H - 0.4, z); scene.add(pl);
  addMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 32), lampMat, [0, H - 0.03, z]);
}

// signs
const sign = (tex, pos, rotY) => addMesh(new THREE.PlaneGeometry(4.4, 2.2),
  new THREE.MeshBasicMaterial({ map: tex, transparent: true }), pos, [0, rotY, 0]);
sign(signTexture(CFG.title || 'Our Museum', CFG.subtitle || ''), [0, 2.3, -L + 0.03], 0);
sign(signTexture(CFG.exitText || 'Thank you for visiting', ''), [0, 2.3, -0.03], Math.PI);

// benches (with collision)
const obstacles = [];
const benchMat = new THREE.MeshStandardMaterial({ color: 0x5b4030, roughness: 0.5 });
for (let z = -(5 + S * 1.5); z > -L + 5; z -= S * 4) {
  addMesh(new THREE.BoxGeometry(0.55, 0.08, 1.8), benchMat, [0, 0.45, z]);
  addMesh(new THREE.BoxGeometry(0.45, 0.41, 0.08), darkWood, [0, 0.205, z - 0.75]);
  addMesh(new THREE.BoxGeometry(0.45, 0.41, 0.08), darkWood, [0, 0.205, z + 0.75]);
  obstacles.push({ x0: -0.28, x1: 0.28, z0: z - 0.9, z1: z + 0.9 });
}

// ---------- frames ----------
const clickable = [];
const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.45, metalness: 0.25 });
const matMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.9 });
const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.3, metalness: 0.8 });

function addFrame(tex, aspect, info, place) {
  const maxW = 2.2, maxH = 1.6;
  let h = maxH, w = h * aspect;
  if (w > maxW) { w = maxW; h = w / aspect; }
  const border = 0.09, mat = 0.13, ow = w + 2 * (mat + border), oh = h + 2 * (mat + border);
  const grp = new THREE.Group();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(ow, oh, 0.06), frameMat); frame.position.z = 0.03; grp.add(frame);
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(w + 2 * mat, h + 2 * mat), matMat); pm.position.z = 0.061; grp.add(pm);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  photo.position.z = 0.063; photo.userData.info = info; grp.add(photo); clickable.push(photo);

  // little picture light above the frame
  const bar = new THREE.Mesh(new THREE.BoxGeometry(Math.min(ow * 0.5, 0.9), 0.05, 0.07), brassMat);
  bar.position.set(0, oh / 2 + 0.18, 0.2); grp.add(bar);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.2), brassMat);
  arm.position.set(0, oh / 2 + 0.18, 0.1); grp.add(arm);

  // plaque next to the frame
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.22), new THREE.MeshBasicMaterial({ map: plaqueTexture(info.title, info.date) }));
  // always on the side that faces the entrance, so it reads as belonging to this frame
  plaque.position.set((place.rotY > 0 ? -1 : 1) * (ow / 2 + 0.42), -0.35, 0.01); grp.add(plaque);

  grp.position.set(place.x, 1.65, place.z);
  grp.rotation.y = place.rotY;
  scene.add(grp);
}

const loader = new THREE.TextureLoader();
PHOTOS.forEach((p, i) => {
  const left = i % 2 === 0;
  const place = { x: left ? -W / 2 + 0.01 : W / 2 - 0.01, z: -(5 + Math.floor(i / 2) * S), rotY: left ? Math.PI / 2 : -Math.PI / 2 };
  const fallback = () => {
    const c = placeholderCanvas(p, i);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    addFrame(tex, c.width / c.height, { ...p, display: c.toDataURL('image/jpeg', 0.85) }, place);
  };
  if (!p.src) return fallback();
  loader.load(p.src, tex => {
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    addFrame(tex, tex.image.width / tex.image.height, { ...p, display: p.src }, place);
  }, undefined, fallback);
});

// ---------- player state ----------
const pos = new THREE.Vector3(0, EYE, -1.4);
let yaw = 0, pitch = 0, started = false, lbOpen = false, bobT = 0;
const keys = {};
const joy = { x: 0, y: 0 };

function blocked(x, z) {
  return obstacles.some(o => x > o.x0 - R && x < o.x1 + R && z > o.z0 - R && z < o.z1 + R);
}
function tryMove(dx, dz) {
  const nx = THREE.MathUtils.clamp(pos.x + dx, -W / 2 + R, W / 2 - R);
  const nz = THREE.MathUtils.clamp(pos.z + dz, -L + R, -R);
  if (!blocked(nx, nz)) { pos.x = nx; pos.z = nz; }
}

function update(dt) {
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1;
  if (keys.KeyA || keys.ArrowLeft) s -= 1;
  f -= joy.y; s += joy.x;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const speed = (keys.ShiftLeft || keys.ShiftRight) ? 5 : 2.8;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  tryMove((-sin * f + cos * s) * speed * dt, 0);
  tryMove(0, (-cos * f - sin * s) * speed * dt);
  if (len > 0.05) bobT += dt * speed * 2.6;
  const bob = Math.sin(bobT) * 0.035 * Math.min(1, len);
  camera.position.set(pos.x, EYE + bob, pos.z);
  camera.rotation.set(pitch, yaw, 0);
}

function look(dx, dy, k) {
  yaw -= dx * k;
  pitch = THREE.MathUtils.clamp(pitch - dy * k, -1.3, 1.3);
}

// ---------- picking / lightbox ----------
const ray = new THREE.Raycaster(); ray.far = 6;
function hitAt(nx, ny) {
  ray.setFromCamera({ x: nx, y: ny }, camera);
  const h = ray.intersectObjects(clickable, false)[0];
  return h ? h.object : null;
}
const hitAtScreen = (cx, cy) => hitAt(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);

const lb = document.getElementById('lightbox');
function openPhoto(obj) {
  if (!obj) return false;
  const info = obj.userData.info;
  document.getElementById('lbImg').src = info.display;
  document.getElementById('lbTitle').textContent = info.title || '';
  document.getElementById('lbDate').textContent = info.date || '';
  document.getElementById('lbNote').textContent = info.note || '';
  lbOpen = true; lb.classList.add('open');
  if (typeof send === 'function') send({ t: 'look', title: info.title || '' });
  Object.keys(keys).forEach(k => keys[k] = false);
  if (document.pointerLockElement) document.exitPointerLock();
  return true;
}
function closePhoto() { lbOpen = false; lb.classList.remove('open'); }
lb.addEventListener('click', closePhoto);

// ---------- music ----------
let audio = null;
if (CFG.music) { audio = new Audio(CFG.music); audio.loop = true; audio.volume = 0.5; }
const toggleMusic = () => { if (audio) audio.paused ? audio.play().catch(() => {}) : audio.pause(); };

// ---------- intro / pause ----------
const intro = document.getElementById('intro');
const nameInput = document.getElementById('name');
const codeInput = document.getElementById('code');
const netStatus = document.getElementById('netStatus');
nameInput.value = localStorage.getItem('museum-name') || '';
const myName = () => (nameInput.value.trim() || 'Guest').slice(0, 16);
function lock() { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
function start() {
  localStorage.setItem('museum-name', nameInput.value.trim());
  if (!started && audio) audio.play().catch(() => {});
  started = true; document.body.classList.add('started');
  intro.classList.add('hidden', 'paused');
  document.getElementById('enter').textContent = 'Continue';
  if (!isTouch) lock();
}
document.getElementById('enter').addEventListener('click', start);
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && started && !lbOpen) intro.classList.remove('hidden');
});
for (const el of [nameInput, codeInput]) el.addEventListener('keydown', e => e.stopPropagation());

// ---------- visit together (peer-to-peer via WebRTC / PeerJS) ----------
const ID_PREFIX = 'our-museum-jk-';
const WORDS = ['ROSE', 'MOON', 'STAR', 'LOVE', 'SUN', 'KISS', 'HUG', 'TULIP', 'HONEY', 'PEACH'];
const pill = document.getElementById('roomPill');
const toastEl = document.getElementById('toast');
let peer = null, conn = null, partner = null, sendT = 0, toastTimer = 0;

function toast(text) {
  toastEl.textContent = text; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
}
function setPill(text) { pill.textContent = text; pill.classList.toggle('show', !!text); }
function send(msg) { if (conn && conn.open) conn.send(msg); }

function nameSprite(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.font = '600 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(500, g.measureText(text).width + 60);
  g.fillStyle = 'rgba(20,16,13,.75)'; g.beginPath(); g.roundRect(256 - w / 2, 14, w, 100, 50); g.fill();
  g.fillStyle = '#fff'; g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  s.scale.set(1.2, 0.3, 1); s.renderOrder = 10;
  return s;
}
function makePartner(name) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd9706b, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.75, 6, 16), mat); body.position.y = 0.75; grp.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf1d3bd, roughness: 0.6 }));
  head.position.y = 1.5; grp.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat); nose.position.set(0, 1.5, -0.2); grp.add(nose); // shows facing
  const label = nameSprite(name + ' ♥'); label.position.y = 2.0; grp.add(label);
  grp.position.set(0, 0, -1.4);
  scene.add(grp);
  return { grp, label, target: { x: 0, z: -1.4, yaw: 0 }, name, bob: 0 };
}
function setPartnerName(name) {
  if (!partner || partner.name === name) return;
  partner.grp.remove(partner.label);
  partner.label = nameSprite(name + ' ♥'); partner.label.position.y = 2.0; partner.grp.add(partner.label);
  partner.name = name;
}
function dropPartner() {
  if (partner) { scene.remove(partner.grp); partner = null; }
}

function setupConn(c) {
  conn = c;
  c.on('open', () => {
    send({ t: 'hi', n: myName() });
  });
  c.on('data', m => {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hi') {
      if (!partner) partner = makePartner(String(m.n || 'Guest').slice(0, 16));
      setPill('Together with ' + partner.name + ' ♥');
      toast(partner.name + ' is here ♥');
      if (!started) start();
    } else if (m.t === 's' && partner) {
      partner.target = { x: +m.x || 0, z: +m.z || 0, yaw: +m.y || 0 };
      if (m.n) setPartnerName(String(m.n).slice(0, 16));
    } else if (m.t === 'look' && partner) {
      toast(partner.name + ' is looking at "' + String(m.title || 'a photo').slice(0, 60) + '"');
    }
  });
  c.on('close', () => {
    if (partner) toast(partner.name + ' left the museum');
    dropPartner(); conn = null;
    setPill(peer && peer.id && peer.id.startsWith(ID_PREFIX) ? 'Code ' + peer.id.slice(ID_PREFIX.length).toUpperCase() + ' · waiting…' : 'Disconnected');
  });
}

function newPeer(id) {
  if (!window.Peer) { netStatus.textContent = 'Could not load the connection library. Check the internet connection.'; return null; }
  if (peer) peer.destroy();
  peer = id ? new window.Peer(id) : new window.Peer();
  peer.on('error', err => {
    const msg = {
      'peer-unavailable': 'No museum is open with that code. Check the code, and that the other person is still inside.',
      'unavailable-id': 'That code is busy, try again.',
      'network': 'Connection problem. Check the internet and try again.',
    }[err.type] || ('Connection error: ' + err.type);
    netStatus.textContent = msg;
    if (started) toast(msg);
  });
  return peer;
}

document.getElementById('host').addEventListener('click', () => {
  const code = WORDS[Math.floor(Math.random() * WORDS.length)] + '-' + (10 + Math.floor(Math.random() * 90));
  netStatus.textContent = 'Opening the museum… (can take up to 10 seconds)';
  const p = newPeer(ID_PREFIX + code.toLowerCase());
  if (!p) return;
  p.on('open', () => {
    netStatus.innerHTML = `Your code: <b>${code}</b> · send it to her`;
    setPill('Code ' + code + ' · waiting…');
    setTimeout(start, 1600);
  });
  p.on('connection', c => {
    if (conn && conn.open) { c.on('open', () => c.close()); return; } // only two visitors
    setupConn(c);
  });
});

document.getElementById('join').addEventListener('click', () => {
  const code = codeInput.value.trim().toLowerCase().replace(/\s+/g, '');
  if (!code) { netStatus.textContent = 'Type the code you got first.'; codeInput.focus(); return; }
  netStatus.textContent = 'Connecting…';
  const p = newPeer();
  if (!p) return;
  p.on('open', () => setupConn(p.connect(ID_PREFIX + code, { reliable: true })));
});

function updatePartner(dt) {
  if (!partner) return;
  const g = partner.grp, t = partner.target;
  const k = 1 - Math.exp(-dt * 10);
  const moved = Math.hypot(t.x - g.position.x, t.z - g.position.z);
  g.position.x += (t.x - g.position.x) * k;
  g.position.z += (t.z - g.position.z) * k;
  let d = t.yaw - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  g.rotation.y += d * k;
  if (moved > 0.02) partner.bob += dt * 9;
  g.children[0].position.y = 0.75 + Math.abs(Math.sin(partner.bob)) * 0.05;
}

// ---------- keyboard ----------
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Escape' && lbOpen) closePhoto();
  if (!started) return;
  if (e.code === 'KeyE') lbOpen ? closePhoto() : openPhoto(hitAt(0, 0));
  if (e.code === 'KeyM') toggleMusic();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = false));

// ---------- mouse (pointer lock, or drag to look as fallback) ----------
let drag = null;
canvas.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
addEventListener('mousemove', e => {
  if (!started || lbOpen) return;
  if (document.pointerLockElement === canvas) look(e.movementX, e.movementY, 0.0022);
  else if (drag && e.buttons) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    look(dx, dy, 0.004);
  }
});
canvas.addEventListener('click', e => {
  if (!started || lbOpen || isTouch) return;
  if (drag && drag.moved > 6) { drag = null; return; }
  drag = null;
  if (document.pointerLockElement === canvas) openPhoto(hitAt(0, 0));
  else if (!openPhoto(hitAtScreen(e.clientX, e.clientY))) lock();
});

// ---------- touch: left = joystick, right = look / tap ----------
const joyEl = document.getElementById('joy'), knob = document.getElementById('knob');
let joyId = null, joyO = null, lookId = null, lookLast = null, tap = null;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!started || lbOpen) return;
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && joyId === null) {
      joyId = t.identifier; joyO = { x: t.clientX, y: t.clientY };
      joyEl.style.left = t.clientX + 'px'; joyEl.style.top = t.clientY + 'px'; joyEl.style.display = 'block';
    } else if (lookId === null) {
      lookId = t.identifier; lookLast = { x: t.clientX, y: t.clientY };
      tap = { x: t.clientX, y: t.clientY, t: performance.now() };
    }
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) {
      let dx = t.clientX - joyO.x, dy = t.clientY - joyO.y;
      const d = Math.hypot(dx, dy), max = 50;
      if (d > max) { dx *= max / d; dy *= max / d; }
      joy.x = dx / max; joy.y = dy / max;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (t.identifier === lookId) {
      look(t.clientX - lookLast.x, t.clientY - lookLast.y, 0.005);
      lookLast = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });
const touchEnd = e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) {
      joyId = null; joy.x = joy.y = 0; joyEl.style.display = 'none'; knob.style.transform = '';
    } else if (t.identifier === lookId) {
      lookId = null;
      if (tap && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) < 12 && performance.now() - tap.t < 350) {
        openPhoto(hitAtScreen(t.clientX, t.clientY));
      }
      tap = null;
    }
  }
};
canvas.addEventListener('touchend', touchEnd);
canvas.addEventListener('touchcancel', touchEnd);

// ---------- loop ----------
const hint = document.getElementById('hint');
hint.textContent = isTouch ? 'Tap the photo to look closer' : 'Click or press E to look closer';
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

camera.position.copy(pos);
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (started && !lbOpen) update(dt);
  else if (!started) { yaw = Math.sin(clock.elapsedTime * 0.15) * 0.35; camera.rotation.set(0, yaw, 0); }
  updatePartner(dt);
  sendT += dt;
  if (sendT > 0.08 && started) { sendT = 0; send({ t: 's', x: +pos.x.toFixed(3), z: +pos.z.toFixed(3), y: +yaw.toFixed(3), n: myName() }); }
  hint.classList.toggle('show', started && !lbOpen && !!hitAt(0, 0));
  renderer.render(scene, camera);
});
