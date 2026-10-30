import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Lenis from 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.mjs';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let motion = !reduced;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------------- preloader ---------------- */
document.body.classList.add('loading');
const line = document.getElementById('loader-line');
const count = document.getElementById('loader-count');
let shown = 0, target = 0;
function setLoad(p) { target = Math.max(target, p); }
(function tickLoader() {
  shown = Math.min(target, shown + Math.max((target - shown) * 0.08, 0.5));
  const v = Math.round(shown);
  line.style.transform = `scaleY(${shown / 100})`;
  count.textContent = String(v).padStart(3, '0');
  if (v >= 100) {
    // line has reached the bottom: split the black open from the centre
    const loader = document.getElementById('loader');
    setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.remove('loading');
      setTimeout(() => loader.classList.add('gone'), 1400);
    }, 250);
    return;
  }
  requestAnimationFrame(tickLoader);
})();
setLoad(30);
document.fonts.ready.then(() => setLoad(60));
addEventListener('load', () => setLoad(100));
setTimeout(() => setLoad(100), 4000);

/* ---------------- smooth scroll ---------------- */
const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const el = document.querySelector(a.getAttribute('href'));
  if (!el) return;
  e.preventDefault();
  document.body.classList.remove('menu-open');
  lenis.scrollTo(el, { duration: 1.6 });
}));

/* ---------------- header / menu ---------------- */
const menuBtn = document.getElementById('menu-btn');
menuBtn.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuBtn.setAttribute('aria-expanded', open);
});
document.getElementById('sound-btn').addEventListener('click', e => {
  motion = !motion;
  e.currentTarget.classList.toggle('off', !motion);
});

/* ---------------- reveals ---------------- */
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
}), { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* card videos play only on hover / in view */
document.querySelectorAll('.card video, #reel-preview').forEach(v => {
  new IntersectionObserver(([en]) => en.isIntersecting ? v.play().catch(() => {}) : v.pause(), { threshold: 0.3 }).observe(v);
});

/* ---------------- reel modal ---------------- */
const modal = document.getElementById('reel-modal');
const reelVideo = document.getElementById('reel-video');
document.getElementById('reel').addEventListener('click', () => {
  modal.classList.add('open'); lenis.stop(); reelVideo.currentTime = 0; reelVideo.play().catch(() => {});
});
function closeReel() { modal.classList.remove('open'); reelVideo.pause(); lenis.start(); }
document.getElementById('reel-close').addEventListener('click', closeReel);
addEventListener('keydown', e => { if (e.key === 'Escape') { closeReel(); document.body.classList.remove('menu-open'); } });

/* ---------------- ribbons drawn by scroll ---------------- */
const ribbons = [...document.querySelectorAll('#ribbon path, #ribbon2 path')].map(p => {
  p.setAttribute('pathLength', '1');
  return { path: p, section: p.closest('section') };
});

/* ---------------- hero: instanced "connector" nodes ---------------- */
function buildHero() {
  const canvas = document.getElementById('hero-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.1;
  const bg = document.createElement('canvas'); bg.width = bg.height = 256;
  const g = bg.getContext('2d'), grd = g.createRadialGradient(180, 90, 10, 180, 90, 260);
  grd.addColorStop(0, '#34353d'); grd.addColorStop(0.55, '#16171c'); grd.addColorStop(1, '#0b0c0f');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  scene.background = new THREE.CanvasTexture(bg); scene.background.colorSpace = THREE.SRGBColorSpace;
  renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  // logo mark (ring + orange square) and plain spheres; studio materials incl. translucent glass
  const ringGeo = new THREE.TorusGeometry(0.92, 0.3, 48, 128);
  const cubeGeo = new RoundedBoxGeometry(0.6, 0.6, 0.6, 5, 0.08);
  const ballGeo = new THREE.SphereGeometry(1, 64, 48);
  // fine grain for the soft-touch finish (the velvety, slightly speckled matte look)
  const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 256;
  const gctx = grainCanvas.getContext('2d'), gimg = gctx.createImageData(256, 256);
  for (let i = 0; i < gimg.data.length; i += 4) {
    const v = 110 + Math.random() * 145;
    gimg.data[i] = gimg.data[i + 1] = gimg.data[i + 2] = v; gimg.data[i + 3] = 255;
  }
  gctx.putImageData(gimg, 0, 0);
  const grain = new THREE.CanvasTexture(grainCanvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(6, 3);
  const softTouch = (color, sheenColor) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.82, roughnessMap: grain, bumpMap: grain, bumpScale: 0.6,
    sheen: 1, sheenRoughness: 0.75, sheenColor, specularIntensity: 0.35,
  });
  const MAT = {
    // glossy porcelain white
    porcelain: new THREE.MeshPhysicalMaterial({ color: '#f4f1eb', roughness: 0.3, sheen: 0.6, sheenRoughness: 0.4, sheenColor: '#ffffff', clearcoat: 1, clearcoatRoughness: 0.12 }),
    // glossy brand orange (lacquered) and soft-touch charcoal black
    peach: new THREE.MeshPhysicalMaterial({ color: '#ff6a13', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.0, specularIntensity: 1, envMapIntensity: 1.8 }),
    charcoal: softTouch('#1b1b1e', '#5a5a62'),
    // frosted glass with a warm body tint
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, thickness: 0.5, roughness: 0.12, ior: 1.35, attenuationColor: '#fff4ea', attenuationDistance: 6, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }),
    // soft champagne metal
    metal: new THREE.MeshPhysicalMaterial({ color: '#d7c29e', metalness: 1, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    // brand square: translucent orange resin that glows a little from within
    resin: new THREE.MeshPhysicalMaterial({ color: '#ff6a13', transmission: 0.45, thickness: 0.6, roughness: 0.3, ior: 1.5, attenuationColor: '#ff4a00', attenuationDistance: 0.5, emissive: '#ff5a10', emissiveIntensity: 0.12, clearcoat: 1, clearcoatRoughness: 0.1 }),
  };
  const RINGS = { porcelain: 4, peach: 4, charcoal: 3, glass: 1 }, BALLS = { porcelain: 3, peach: 4, charcoal: 3, metal: 1 };
  const ringCount = Object.values(RINGS).reduce((a, b) => a + b, 0);
  const cubes = new THREE.InstancedMesh(cubeGeo, MAT.resin, ringCount);
  const meshes = [cubes];
  const bodies = [];
  // colliders: a ring is a chain of tube spheres + a hole plug + the orange square; balls are one sphere
  const ringParts = [];
  for (let k = 0; k < 10; k++) {
    const t = k / 10 * Math.PI * 2;
    ringParts.push({ o: new THREE.Vector3(Math.cos(t) * 0.92, Math.sin(t) * 0.92, 0), r: 0.31 });
  }
  ringParts.push({ o: new THREE.Vector3(), r: 0.64 }, { o: new THREE.Vector3(0.8, 0.8, 0.12), r: 0.52 });
  const spawn = (mesh, i, ring, r, ci) => {
    const parts = ring ? ringParts : [{ o: new THREE.Vector3(), r }];
    const R = ring ? 1.65 : r;
    bodies.push({
      mesh, i, ring, ci, r, R, parts, inv: 1 / (R * R * R),
      wo: parts.map(() => new THREE.Vector3()),
      p: new THREE.Vector3((Math.random() - .5) * 14, (Math.random() - .5) * 9, (Math.random() - .5) * 4),
      v: new THREE.Vector3(),
      // marks rest nearly facing the camera so the logo reads; pushes spin them, then they settle back
      base: new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - .5) * 0.7, (Math.random() - .5) * 0.7, (Math.random() - .5) * 0.5)),
      q: new THREE.Quaternion().random(),
      w: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(0.25),
    });
  };
  let ci = 0;
  for (const [k, count] of Object.entries(RINGS)) {
    const mesh = new THREE.InstancedMesh(ringGeo, MAT[k], count); meshes.push(mesh);
    for (let i = 0; i < count; i++) spawn(mesh, i, true, 1.22, ci++);
  }
  for (const [k, count] of Object.entries(BALLS)) {
    const mesh = new THREE.InstancedMesh(ballGeo, MAT[k], count); meshes.push(mesh);
    for (let i = 0; i < count; i++) spawn(mesh, i, false, k === 'metal' ? 0.5 + Math.random() * 0.25 : 0.6 + Math.random() * 0.4);
  }
  const N = bodies.length;
  scene.add(...meshes);
  // soft studio light: big neutral fill, warm key, cool back rim
  scene.add(new THREE.HemisphereLight('#f4f1ea', '#1a1b20', 0.9));
  const key = new THREE.DirectionalLight('#fff1e2', 2.4); key.position.set(-6, 9, 10); scene.add(key);
  const rim = new THREE.DirectionalLight('#cfd8ff', 1.4); rim.position.set(8, -2, -6); scene.add(rim);

  const mouse = new THREE.Vector3(999, 999, 0);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); ray.ray.intersectPlane(plane, mouse);
  });
  canvas.addEventListener('pointerleave', () => mouse.set(999, 999, 0));

  const center = new THREE.Vector3();
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    // park the cluster against the right edge so the headline (bottom-left) stays clear
    const halfW = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    center.set(w > 700 ? Math.max(0, halfW - 3.6) : 0, w > 700 ? 0.4 : 1.2, 0); // keep the headline clear
  }
  new ResizeObserver(resize).observe(canvas); resize();

  const m = new THREE.Matrix4(), tmp = new THREE.Vector3(), dq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const cubeOffset = new THREE.Vector3(), scale = new THREE.Vector3();
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), n = new THREE.Vector3();
  let pen;
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  return function step(dt) {
    if (!visible) return;
    const s = motion ? 1 : 0.15;
    // 1. forces + integration
    for (const a of bodies) {
      tmp.copy(a.p).sub(center);
      a.v.addScaledVector(tmp, -0.9 * dt * s);                    // pull to cluster
      tmp.subVectors(a.p, mouse); const dm = tmp.length();      // cursor pushes bodies away
      if (dm < 4.5) a.v.addScaledVector(tmp, (4.5 - dm) * 6 * dt / Math.max(dm, .2));
      a.v.multiplyScalar(0.94);
      a.p.addScaledVector(a.v, dt * 4 * s);
      dq.setFromAxisAngle(tmp.copy(a.w).normalize(), a.w.length() * dt * s * (1 + a.v.length()));
      a.q.premultiply(dq);
      if (a.ring) a.q.slerp(a.base, Math.min(1, dt * 0.8 * s));
      a.parts.forEach((pt, k) => a.wo[k].copy(pt.o).applyQuaternion(a.q));
    }
    // 2. hard contacts: push overlapping bodies apart so they only touch, and kill the closing speed
    for (let it = 0; it < 6; it++) {
      for (let i = 0; i < N; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < N; j++) {
          const b = bodies[j];
          if (a.p.distanceToSquared(b.p) >= (a.R + b.R) ** 2) continue;
          let pen = 0;
          for (let ka = 0; ka < a.parts.length; ka++) {
            pa.copy(a.p).add(a.wo[ka]);
            for (let kb = 0; kb < b.parts.length; kb++) {
              pb.copy(b.p).add(b.wo[kb]);
              const d = pa.distanceTo(pb), o = a.parts[ka].r + b.parts[kb].r - d;
              if (o > pen && d > 1e-5) { pen = o; n.subVectors(pa, pb).divideScalar(d); }
            }
          }
          if (pen <= 0) continue;
          const wa = a.inv / (a.inv + b.inv), wb = 1 - wa;
          a.p.addScaledVector(n, pen * wa); b.p.addScaledVector(n, -pen * wb);
          const vn = tmp.subVectors(a.v, b.v).dot(n);
          if (vn < 0) { const jn = -vn * 1.25; a.v.addScaledVector(n, jn * wa); b.v.addScaledVector(n, -jn * wb); }
        }
        // the cursor is a solid probe too
        pen = 0;
        for (let ka = 0; ka < a.parts.length; ka++) {
          pa.copy(a.p).add(a.wo[ka]);
          const d = pa.distanceTo(mouse), o = a.parts[ka].r + 1.2 - d;
          if (o > pen && d > 1e-5) { pen = o; n.subVectors(pa, mouse).divideScalar(d); }
        }
        if (pen > 0) { a.p.addScaledVector(n, pen); const vn = a.v.dot(n); if (vn < 0) a.v.addScaledVector(n, -vn * 1.25); }
      }
    }
    // 3. write instances
    for (const a of bodies) {
      if (a.ring) {
        m.compose(a.p, a.q, one); a.mesh.setMatrixAt(a.i, m);
        cubeOffset.set(0.8, 0.8, 0.12).applyQuaternion(a.q).add(a.p);   // square sits on the ring at ~1 o'clock
        m.compose(cubeOffset, a.q, one); cubes.setMatrixAt(a.ci, m);
      } else {
        scale.setScalar(a.r); m.compose(a.p, a.q, scale); a.mesh.setMatrixAt(a.i, m);
      }
    }
    for (const im of meshes) im.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };
}

/* ---------------- pinned journey: fly-through tunnel ---------------- */
function buildTunnel() {
  const section = document.getElementById('home-approach');
  const canvas = document.getElementById('tunnel-canvas');
  const steps = [...document.querySelectorAll('.journey-steps li')];
  const intro = document.querySelector('.journey-intro');
  const prog = document.querySelector('.journey-progress b');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070821');
  scene.fog = new THREE.Fog('#070821', 8, 60);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);

  const DEPTH = 160, RINGS = 70;
  const cols = ['#ff7a1a', '#e43fc8', '#6d3cff'].map(c => new THREE.Color(c));
  const frameGeo = new THREE.TorusGeometry(6, 0.04, 6, 4); // square frame
  for (let i = 0; i < RINGS; i++) {
    const t = i / RINGS;
    const c = t < .5 ? cols[0].clone().lerp(cols[1], t * 2) : cols[1].clone().lerp(cols[2], (t - .5) * 2);
    const ring = new THREE.Mesh(frameGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }));
    ring.position.z = -t * DEPTH;
    ring.rotation.z = Math.PI / 4 + t * 2.4;
    ring.scale.setScalar(1 + Math.sin(t * 20) * 0.08);
    scene.add(ring);
  }
  // data particles streaming along the tunnel
  const P = 2400, pos = new Float32Array(P * 3), pcol = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) {
    const r = 2 + Math.random() * 4, a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, Math.sin(a) * r, -Math.random() * DEPTH], i * 3);
    const c = cols[i % 3].clone().lerp(new THREE.Color('#ffffff'), Math.random() * .6);
    pcol.set([c.r, c.g, c.b], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: .9 })));
  // seven "integration nodes", one per step
  const nodeGeo = new THREE.IcosahedronGeometry(0.7, 1);
  const nodes = [];
  for (let i = 0; i < 7; i++) {
    const n = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: cols[i % 3], wireframe: true }));
    n.position.set(i % 2 ? 1.6 : -1.6, i % 3 === 0 ? .8 : -.6, -14 - i * (DEPTH - 30) / 7);
    scene.add(n); nodes.push(n);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  let camZ = 4, active = -1;
  return function step(dt, time) {
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    if (r.bottom < 0 || r.top > innerHeight) return;
    camZ += ((4 - p * (DEPTH - 20)) - camZ) * 0.08;
    camera.position.set(Math.sin(time * .3) * .3, Math.cos(time * .25) * .3, camZ);
    camera.rotation.z = p * 1.2;
    nodes.forEach((n, i) => { n.rotation.x += dt * .4; n.rotation.y += dt * (.3 + i * .05); });
    renderer.render(scene, camera);

    intro.style.opacity = 1 - clamp(p / 0.08);
    const idx = p < 0.1 ? -1 : Math.min(6, Math.floor((p - 0.1) / 0.9 * 7));
    if (idx !== active) { steps.forEach((s, i) => s.classList.toggle('active', i === idx)); active = idx; }
    prog.style.height = (p * 100) + '%';
  };
}

/* ---------------- featured cards: scroll reveal + slot-machine titles ---------------- */
const cards = [...document.querySelectorAll('.card')];
cards.forEach(card => {
  const h3 = card.querySelector('h3');
  const text = h3.textContent.trim();
  h3.setAttribute('aria-label', text);
  h3.innerHTML = '<span class="card-arrow" aria-hidden="true">→</span>' + [...text].map((ch, i) => {
    const c = ch === ' ' ? '&nbsp;' : ch;
    return `<span class="roll" aria-hidden="true" style="--i:${i}"><span>${c}</span><span>${c}</span></span>`;
  }).join('');
});
function updateCards() {
  const vh = innerHeight;
  cards.forEach((card, i) => {
    const r = card.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) { if (r.top > vh) card.style.setProperty('--p', 0); return; }
    // opens over the first ~55% of the viewport it travels; the right column trails a little
    const raw = clamp((vh - r.top) / (vh * 0.55) - (i % 2) * 0.08);
    const p = 1 - Math.pow(1 - raw, 3);
    card.style.setProperty('--p', p.toFixed(4));
  });
}

/* ---------------- main loop ---------------- */
let hero = () => {}, tunnel = () => {};
try { hero = buildHero(); tunnel = buildTunnel(); } catch (err) { console.warn('WebGL unavailable', err); }
setLoad(85);

const clock = new THREE.Clock();
const approach = document.getElementById('home-approach');
(function loop() {
  const dt = Math.min(clock.getDelta(), 1 / 30), time = clock.elapsedTime;
  hero(dt); tunnel(dt, time);
  updateCards();

  document.body.classList.toggle('scrolled', scrollY > 60);
  const ar = approach.getBoundingClientRect();
  document.body.classList.toggle('on-dark', ar.top < 60 && ar.bottom > 60);
  for (const { path, section } of ribbons) {
    const r = section.getBoundingClientRect();
    const p = clamp((innerHeight - r.top) / (r.height * 0.9));
    path.style.strokeDashoffset = 1 - p;
  }
  requestAnimationFrame(loop);
})();
