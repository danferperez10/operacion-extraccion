// ===== OPERACIÓN EXTRACCIÓN — FPS 3D (Three.js r160) =====
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- CONFIGURACIÓN ----------
// true => TODOS los zombis mueren con exactamente 2 impactos (estricto según rúbrica RF07).
// false => el zombi "Tanque" aguanta más balas (hp definido abajo).
const STRICT_RUBRIC = false;
const CONFIG = {
  player: { speed: 5, sprint: 1.6, crouchMul: 0.5, radius: 0.4, eye: 1.7, eyeCrouch: 1.05, sens: 0.0018, crouchStealth: 0.6 },
  // mag = cargador, reserve = reserva inicial (finita), pickup = reserva que da cada caja
  weapons: [
    { name: 'DESERT EAGLE', file: 'assets/models/desert_eagle_fp.glb', mag: 7, reserve: 14, pickup: 7, cooldown: 0.35, reload: 2.9, viewmodel: true, pos: [0, 0, 0],
      attach: { file: 'assets/models/desert_eagle_gun.glb', bone: 'Weapon_0726', length: 0.27, rear: -0.125, top: 0.015 }, // pistola estática pegada a la mano; ajusta length/rear/top si queda desalineada
      anims: { idle: 'Idle', draw: 'Equip', walk: 'Walk', run: 'Run', shot: 'Fire', reload: 'Reload', reloadFull: 'Reload_Empty' } },
    { name: 'AK-74M', file: 'assets/models/ak74m.glb', mag: 30, reserve: 30, pickup: 20, cooldown: 0.16, reload: 2.4, viewmodel: true, vmScale: 1, pos: [0, 0, 0],
      anims: { idle: 'AK_Idle', draw: 'AK_Draw', walk: 'AK_Walk', run: 'AK_Run', shot: 'AK_Shot', reload: 'AK_Reload', reloadFull: 'AK_Reload_full' } },
  ],
};
// rot: corrige hacia dónde mira el modelo (0, Math.PI, ±Math.PI/2)
const ZT = {
  s: { name: 'Soldado',  model: 'soldier', hp: 2, height: 1.8,  speed: 2.0, detect: 14, contact: 0.95, hitW: 0.8, rot: 0, scream: 1 },
  r: { name: 'Corredor', model: 'soldier', hp: 2, height: 1.65, speed: 3.6, detect: 18, contact: 0.95, hitW: 0.7, rot: 0, tint: 0xff8a8a, scream: 1.2 },
  t: { name: 'Tanque',   model: 'tank',    hp: 4, height: 2.2,  speed: 1.5, detect: 12, contact: 1.25, hitW: 1.1, rot: 0, scream: 0.72 },
};

// ---------- NIVEL ----------
const W = 25, L = 190, EXTRACT = { x: 0, z: -182, hx: 8, hz: 6 };
const OBST = [ // [x,z,ancho,prof,alto]
  [-12,-24,4,3,1.6],[10,-30,3,6,1.6],[-4,-36,6,2,1.4],[14,-40,4,3,2.5],[-16,-42,3,3,1.6],
  [-14,-58,8,3,2.2],[6,-62,3,3,1.5],[16,-70,3,8,2.5],[-6,-76,6,2,1.5],[-18,-84,4,4,1.6],[2,-88,3,3,1.5],[12,-92,5,2,2],
  [8,-108,9,3,2.2],[-12,-112,3,6,2.4],[0,-120,3,3,1.5],[14,-124,3,5,1.6],[-8,-130,6,2,1.6],[4,-136,2,2,1.5],
  [-10,-152,5,3,1.8],[10,-156,5,3,1.8],[0,-164,3,3,1.5]];
const ZOMBIES = [ // [x,z,tipo]
  [-4,-30,'s'],[12,-34,'s'],[-14,-44,'s'],
  [-18,-54,'s'],[8,-56,'s'],[0,-68,'t'],[-12,-74,'s'],[14,-82,'r'],[-4,-94,'s'],
  [12,-104,'s'],[-10,-104,'s'],[-2,-116,'r'],[10,-120,'t'],[-16,-122,'s'],[6,-130,'s'],[-10,-138,'t'],
  [-6,-150,'s'],[6,-150,'r'],[-14,-160,'s'],[14,-162,'t'],[0,-170,'s'],[-8,-174,'r']];
const PICKUPS = [[-14,-20],[16,-46],[-16,-66],[14,-100],[-14,-132],[8,-146],[-4,-158]];
const LAMPS = [[0,-8,0xffb066],[-6,-40,0xffb066],[8,-75,0xff3322],[-6,-110,0xffb066],[6,-150,0xff3322]];

const $ = id => document.getElementById(id);
const errBox = document.createElement('div'); errBox.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99;max-width:60vw;font:12px monospace;color:#ff8a7a;background:rgba(0,0,0,.75);padding:6px 10px;border-radius:6px;display:none;white-space:pre-wrap'; document.body.appendChild(errBox);
function showErr(m) { lastErr = String(m).slice(0, 120); console.error(m); errBox.style.display = 'block'; errBox.textContent = '⚠ ' + m; }
addEventListener('error', e => showErr(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
addEventListener('unhandledrejection', e => showErr(String((e.reason && e.reason.message) || e.reason)));
$('c').addEventListener('webglcontextlost', e => { e.preventDefault(); state = 'lost'; document.exitPointerLock(); screen('over', 'GRÁFICOS DETENIDOS', 'El navegador liberó la memoria de video. Pulsa RECARGAR.', 'RECARGAR'); $('sbtn').onclick = () => location.reload(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') document.exitPointerLock(); });

// ---------- RENDER + POSTPROCESADO ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), powerPreference: 'high-performance' });
let PR = 1, qk = 'med'; renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene(), weaponScene = new THREE.Scene();
scene.background = new THREE.Color(0x04060a); scene.fog = new THREE.FogExp2(0x04060a, 0.04);
const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 150); camera.rotation.order = 'YXZ'; scene.add(camera);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 0 }));
composer.addPass(new RenderPass(scene, camera));
const wpass = new RenderPass(weaponScene, camera); wpass.clear = false; wpass.clearDepth = true; composer.addPass(wpass); // el arma nunca atraviesa paredes
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.9); composer.addPass(bloom);
const fx = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, hurt: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time)*43758.5453);}
    void main(){vec2 d=vUv-.5;float r=dot(d,d);vec2 o=d*r*.014;
      vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
      c*=1.-smoothstep(.1,.5,r)*.9; c+=(h(vUv*1000.)-.5)*.04; gl_FragColor=vec4(c,1.);}`,
});
composer.addPass(fx); composer.addPass(new OutputPass());
function resize() { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- ILUMINACIÓN ----------
scene.add(new THREE.HemisphereLight(0x3a4a70, 0x0c0c10, 0.5));
const torch = new THREE.SpotLight(0xfff1dc, 320, 48, 0.6, 0.7, 1.5); // linterna: sale un poco más arriba que la cámara y apunta al frente
torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024); torch.shadow.bias = -0.0004; torch.shadow.camera.near = 0.3;
{ const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 126);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.5, 'rgba(255,255,255,.92)'); gr.addColorStop(.82, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  torch.map = new THREE.CanvasTexture(c); torch.map.colorSpace = THREE.SRGBColorSpace; }
scene.add(torch, torch.target); const torchDir = new THREE.Vector3(0, 0, -1); let torchOn = true;
weaponScene.add(new THREE.HemisphereLight(0xaab4d0, 0x202428, 0.6));
weaponScene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // reflejos para las partes metálicas del arma
const wDir = new THREE.DirectionalLight(0xfff0e0, 2.2); wDir.position.set(1, 2, 1); weaponScene.add(wDir);
const weaponRoot = new THREE.Group(), weaponPivot = new THREE.Group(); weaponRoot.add(weaponPivot); weaponScene.add(weaponRoot);

// ---------- TEXTURAS PROCEDURALES ----------
function makeTex(base, mode) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) { const v = Math.random() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${Math.random() * .07})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    if (mode === 'brick') for (let x = (y / 32) % 2 ? 0 : 32; x < 256; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  if (mode === 'tile') for (let x = 0; x < 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  if (mode === 'crate') { g.strokeStyle = 'rgba(20,10,0,.6)'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248); g.beginPath(); g.moveTo(4, 4); g.lineTo(252, 252); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const TEX = { wall: makeTex('#5a5650', 'brick'), crate: makeTex('#6b4f2d', 'crate'), floor: makeTex('#3b3e3c', 'tile') };
const boxMat = (t, w, h, r = .9) => { const tt = t.clone(); tt.needsUpdate = true; tt.repeat.set(Math.max(w, 1) / 4, Math.max(h, 1) / 4); return new THREE.MeshStandardMaterial({ map: tt, roughness: r }); };

// ---------- MUNDO ----------
const colliders = [], solids = [];
function addBox(x, z, w, d, h, t) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat(t, Math.max(w, d), h)); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true;
  scene.add(m); solids.push(m); colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
}
const divider = (z, a, b) => { addBox((-W + a) / 2, z, a + W, 1.5, 5, TEX.wall); addBox((b + W) / 2, z, W - b, 1.5, 5, TEX.wall); };
const floorMat = new THREE.MeshStandardMaterial({ map: TEX.floor, roughness: .75, metalness: .1 }); floorMat.map.repeat.set(12, 48);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, L + 4), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -L / 2); floor.receiveShadow = true; scene.add(floor);
const roof = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, L + 4), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 1 })); roof.rotation.x = Math.PI / 2; roof.position.set(0, 6, -L / 2); scene.add(roof);
addBox(-W - .5, -L / 2, 1, L + 2, 6, TEX.wall); addBox(W + .5, -L / 2, 1, L + 2, 6, TEX.wall); addBox(0, 1, W * 2 + 2, 1, 6, TEX.wall); addBox(0, -L - 1, W * 2 + 2, 1, 6, TEX.wall);
divider(-14, -3, 3); divider(-48, 10, 18); divider(-98, -18, -10); divider(-142, -3, 3);
OBST.forEach(([x, z, w, d, h]) => addBox(x, z, w, d, h, TEX.crate));
const beamMat = new THREE.MeshStandardMaterial({ color: 0x25272b, metalness: .8, roughness: .5 });
for (let z = -6; z > -L; z -= 10) { const b = new THREE.Mesh(new THREE.BoxGeometry(W * 2, .35, .5), beamMat); b.position.set(0, 5.8, z); scene.add(b); }
// decals de sangre
{ const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(120,0,0,.9)'); gr.addColorStop(.6, 'rgba(70,0,0,.5)'); gr.addColorStop(1, 'rgba(40,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0x888888 });
  for (let i = 0; i < 45; i++) { const s = .6 + Math.random() * 1.8, d = new THREE.Mesh(new THREE.PlaneGeometry(s, s), m); d.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28); d.position.set((Math.random() * 2 - 1) * (W - 2), .015, -8 - Math.random() * (L - 16)); scene.add(d); } }
function label(text, x, y, z, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.font = 'bold 64px Segoe UI, sans-serif'; g.textAlign = 'center'; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 24; g.fillText(text, 256, 85);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, fog: false, toneMapped: false })); s.scale.set(8, 2, 1); s.position.set(x, y, z); scene.add(s);
}
const pad = (x, z, w, d, color) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .3 })); p.rotation.x = -Math.PI / 2; p.position.set(x, .03, z); scene.add(p); };
pad(0, -6, 10, 10, 0x4488ff); label('INICIO', 0, 4, -8, '#7fb2ff');
pad(EXTRACT.x, EXTRACT.z, EXTRACT.hx * 2, EXTRACT.hz * 2, 0x33ff77); label('EXTRACCIÓN', 0, 4.5, EXTRACT.z, '#7dff9b');
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 30, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x33ff77).multiplyScalar(2.5), transparent: true, opacity: .2, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
beam.position.set(EXTRACT.x, 15, EXTRACT.z); scene.add(beam);
const exLight = new THREE.PointLight(0x33ff77, 220, 28); exLight.position.set(0, 3, EXTRACT.z); scene.add(exLight);
const lamps = LAMPS.map(([x, z, col]) => {
  const l = new THREE.PointLight(col, 70, 30); l.position.set(x, 4.6, z); scene.add(l);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(3), toneMapped: false })); b.position.copy(l.position); scene.add(b); return l; });
// polvo en suspensión
const dustN = 260, dustPos = new Float32Array(dustN * 3).map(() => (Math.random() - .5) * 20);
for (let i = 0; i < dustN; i++) dustPos[i * 3 + 1] = Math.random() * 6 - 2.5;
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: .035, color: 0xcfd8e8, transparent: true, opacity: .35, depthWrite: false })); dust.frustumCulled = false; scene.add(dust);

// ---------- AUDIO (sintetizado) ----------
let ac; const SND = {}; let screamAt = 0;
async function loadSnd(name, urls) { for (const u of urls) { try { const r = await fetch(encodeURI(u)); if (r.ok) { SND[name] = await ac.decodeAudioData(await r.arrayBuffer()); return; } } catch (e) {} } }
function play(name, { vol = 1, rate = 1, pan = 0, dur } = {}) {
  const b = SND[name]; if (!b || !ac) return false; const s = ac.createBufferSource(), g = ac.createGain(), t = ac.currentTime; s.buffer = b; s.playbackRate.value = rate; g.gain.setValueAtTime(vol, t);
  if (dur) { g.gain.setValueAtTime(vol, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur); }
  let n = s.connect(g); if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; n = g.connect(p); } n.connect(ac.destination); s.start(0, 0, dur); return true;
}
function tone(f1, f2, d, type = 'square', v = .1) {
  if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f1, ac.currentTime); o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + d);
  g.gain.setValueAtTime(v, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
}
function noise(d, v) {
  if (!ac) return; const n = ac.sampleRate * d, buf = ac.createBuffer(1, n, ac.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = buf; g.gain.value = v; s.connect(g).connect(ac.destination); s.start();
}
const sfx = { shot: i => { if (!play(i ? 'ak' : 'deagle', { vol: .9, rate: .97 + Math.random() * .06 })) { noise(.2, .55); tone(180, 40, .15, 'sawtooth', .15); } }, empty: () => tone(900, 700, .05, 'square', .06),
  reload: () => { tone(300, 200, .06, 'square', .08); setTimeout(() => tone(500, 350, .08, 'square', .08), 600); setTimeout(() => tone(250, 180, .06, 'square', .1), 1100); },
  pickup: () => { tone(500, 900, .12, 'triangle', .15); setTimeout(() => tone(900, 1300, .15, 'triangle', .15), 90); },
  hit: () => tone(140, 60, .12, 'sawtooth', .18), die: () => tone(120, 30, .6, 'sawtooth', .2), growl: () => tone(95, 55, .5, 'sawtooth', .07),
  over: () => tone(300, 40, 1.2, 'sawtooth', .25), win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, f, .3, 'triangle', .15), i * 150)) };

// ---------- CARGA DE MODELOS GLB ----------
const loader = new GLTFLoader(); let nLoaded = 0;
// Algunos GLB (Sketchfab) usan KHR_materials_pbrSpecularGlossiness: se recupera la textura difusa si el loader no la aplicó.
async function prepare(g) {
  const jobs = [];
  g.scene.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; o.frustumCulled = false;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      const e = m.userData?.gltfExtensions?.KHR_materials_pbrSpecularGlossiness; if (!e || m.map) return;
      if (e.diffuseTexture) jobs.push(g.parser.getDependency('texture', e.diffuseTexture.index).then(t => { t.colorSpace = THREE.SRGBColorSpace; m.map = t; m.color.set(0xffffff); m.metalness = 0; m.roughness = .85; m.needsUpdate = true; }));
      else if (e.diffuseFactor) m.color.fromArray(e.diffuseFactor); }); });
  await Promise.all(jobs); return g;
}
const load = url => new Promise(res => loader.load(url, async g => { await prepare(g); $('ssub').textContent = `Cargando modelos ${++nLoaded}/5…`; res(g); }, undefined, () => res(null)));
function normalize(obj, size, byHeight) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = size / (byHeight ? s.y : Math.max(s.x, s.y, s.z));
  obj.position.set(-c.x, byHeight ? -b.min.y : -c.y, -c.z); const w = new THREE.Group(); w.add(obj); w.scale.setScalar(k); return w;
}
let wGLB = [], wGLB2 = [], zGLB = {};

// ---------- ARMAS ----------
const weapons = [];
function buildWeapons() {
  CONFIG.weapons.forEach((cfg, i) => {
    const g = wGLB[i], holder = new THREE.Group(); holder.position.set(...cfg.pos); let anim = null, mixer = null;
    if (g && cfg.viewmodel) { // viewmodel con brazos y animaciones: la cámara del rig se alinea con la nuestra
      const m = g.scene; if (cfg.hide) m.traverse(o => { if (o.isMesh && cfg.hide.test(o.name)) o.visible = false; }); m.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(x => { x.envMapIntensity = 1; }); });
      m.updateMatrixWorld(true); const p = new THREE.Vector3(); (m.getObjectByName('Camera') || m).getWorldPosition(p);
      const wrap = new THREE.Group(), k = cfg.vmScale || 1; wrap.rotation.y = Math.PI; wrap.scale.setScalar(k); wrap.position.copy(p.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).multiplyScalar(-k)); wrap.add(m); holder.add(wrap);
      if (cfg.attach && wGLB2[i]) { // la pistola sigue al hueso de la mano en todas las animaciones
        const bone = m.getObjectByName(cfg.attach.bone);
        if (bone) { const gm = wGLB2[i].scene; gm.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(gm), k = cfg.attach.length / (bb.max.z - bb.min.z), hold = new THREE.Group();
          gm.position.set(-(bb.min.x + bb.max.x) / 2, cfg.attach.top / k - bb.max.y, cfg.attach.rear / k - bb.min.z); hold.add(gm); hold.scale.setScalar(k);
          gm.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(x => { x.envMapIntensity = 1; }); }); bone.add(hold); }
      }
      mixer = new THREE.AnimationMixer(m); anim = {};
      for (const [key, n] of Object.entries(cfg.anims)) { const c = g.animations.find(a => a.name.split('|').pop() === n); if (c) anim[key] = mixer.clipAction(c); }
    } else if (g) {
      const mdl = normalize(g.scene, cfg.size, false); mdl.rotation.y = cfg.rotY; holder.add(mdl);
      const glove = new THREE.MeshStandardMaterial({ color: 0x1d2023, roughness: .9 });
      const hand = new THREE.Mesh(new THREE.BoxGeometry(.075, .1, .12), glove); hand.position.set(0, -.085, .07);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, .5, 10), glove); arm.rotation.x = -1.2; arm.position.set(0, -.2, .32); holder.add(hand, arm);
    } else holder.add(new THREE.Mesh(new THREE.BoxGeometry(.08, .12, .5), new THREE.MeshStandardMaterial({ color: 0x333 })));
    const flash = new THREE.PointLight(0xffaa44, 0, 6); flash.position.set(0, .05, -.6); holder.add(flash);
    holder.visible = i === 0; weaponPivot.add(holder);
    weapons.push({ cfg, holder, flash, anim, mixer, cur: null, once: false, base: new THREE.Vector3(...cfg.pos) });
  });
}
function fade(w, name, loop) {
  const a = w.anim[name] || w.anim.idle; if (!a || (w.cur === a && loop)) return;
  w.cur && w.cur !== a && w.cur.fadeOut(.15); a.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(.15).play(); a.clampWhenFinished = !loop; w.cur = a; w.once = !loop;
}
const clipDur = (w, n) => (w.anim && w.anim[n]) ? w.anim[n].getClip().duration : 0;

// ---------- ESTADO ----------
const P = { pos: new THREE.Vector3(0, 0, -4), yaw: 0, pitch: 0, bob: 0, eye: CONFIG.player.eye, crouch: false };
const keys = {}; let state = 'menu', cur = 0, want = 0, drop = 0, cd = 0, kick = 0, reloadT = 0, reloadDur = 1, equipT = 0, tStart = 0, kills = 0;
let mag = [], res = [], zombies = [], pickups = [], particles = [], tracers = [], msgTimer;

function msg(t, ms = 1800) { const m = $('msg'); m.textContent = t; m.style.opacity = 1; clearTimeout(msgTimer); msgTimer = setTimeout(() => m.style.opacity = 0, ms); }
function hud() {
  const c = weapons[cur].cfg; $('wname').textContent = c.name; $('ammo').textContent = mag[cur]; $('res').textContent = '/ ' + res[cur];
  $('ammo').classList.toggle('low', mag[cur] <= Math.ceil(c.mag * .2)); $('s1').classList.toggle('on', want === 0); $('s2').classList.toggle('on', want === 1);
  $('zleft').textContent = zombies.filter(z => !z.dead).length; $('hint').textContent = mag[cur] === 0 ? (res[cur] > 0 ? '[R] RECARGAR' : 'SIN MUNICIÓN — busca cajas') : '';
}
function screen(cls, title, sub, btn) {
  const s = $('scr'); s.className = 'screen ' + cls; s.style.display = 'flex'; $('hud').style.display = 'none';
  $('stitle').textContent = title; $('ssub').textContent = sub; $('sbtn').textContent = btn; $('sbtn').disabled = false; $('keys').style.display = cls === '' ? 'grid' : 'none';
}

// ---------- COLISIONES ----------
function resolve(p, r) {
  for (const b of colliders) { const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1)), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) { if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else p.x += r; } }
}
const ray = new THREE.Raycaster(), losRay = new THREE.Raycaster();
function lineOfSight(a, b) { const d = b.clone().sub(a), len = d.length(); losRay.set(a, d.normalize()); losRay.far = len; return losRay.intersectObjects(solids, false).length === 0; }

// ---------- ZOMBIS ----------
function spawnZombie([x, z, k]) {
  const T = ZT[k], src = zGLB[T.model], group = new THREE.Group(), mats = []; let inner;
  if (src) {
    const c = SkeletonUtils.clone(src.scene);
    c.traverse(o => { if (!o.isMesh) return; o.castShadow = false; o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (T.tint) m.color.multiply(new THREE.Color(T.tint)); mats.push(m); }); });
    inner = normalize(c, T.height, true); inner.rotation.y = T.rot; c.children.forEach(ch => ch.traverse(o => { o.matrixAutoUpdate = false; o.updateMatrix(); })); // huesos estáticos: ahorra CPU
  } else { inner = new THREE.Mesh(new THREE.CapsuleGeometry(.3, T.height - .6), new THREE.MeshStandardMaterial({ color: 0x5f7a4a })); inner.position.y = T.height / 2; }
  group.add(inner); group.position.set(x, 0, z); group.rotation.y = Math.random() * 6.28; scene.add(group);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(T.hitW, T.height, T.hitW), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = T.height / 2; group.add(hit);
  const hp = STRICT_RUBRIC ? 2 : T.hp, zb = { T, group, inner, hit, mats, hp, state: 'idle', dead: false, fall: 0, stun: 0, flash: 0, t: Math.random() * .25, phase: Math.random() * 6 }; hit.userData.zombie = zb; group.updateMatrixWorld(true); group.matrixWorldAutoUpdate = false; return zb; // la matriz solo se recalcula si el zombi se mueve
}
function activate(z) {
  z.state = 'chase'; const now = performance.now(); if (now - screamAt < 900) return; screamAt = now;
  const dx = z.group.position.x - P.pos.x, dz = z.group.position.z - P.pos.z, d = Math.hypot(dx, dz), pan = (dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / Math.max(d, 1);
  if (!play('scream', { vol: Math.max(.2, 1 - d / 40) * .8, rate: z.T.scream * (.95 + Math.random() * .1), pan: Math.max(-1, Math.min(1, pan)), dur: 2.6 })) sfx.growl();
}
function killZombie(z) { z.group.matrixWorldAutoUpdate = true; z.dead = true; z.state = 'dead'; kills++; sfx.die(); z.group.remove(z.hit); z.mats.forEach(m => m.emissive && m.emissive.setRGB(0, 0, 0)); }
function updateZombies(dt, t) {
  const stealth = P.crouch ? CONFIG.player.crouchStealth : 1;
  for (const z of zombies) {
    if (z.dead) { if (z.fall < 1) { z.fall = Math.min(1, z.fall + dt * 1.8); z.inner.rotation.x = -z.fall * Math.PI / 2; z.inner.position.y = -z.fall * .15; if (z.fall >= 1) z.group.matrixWorldAutoUpdate = false; } continue; }
    if (z.flash > 0) { z.flash -= dt; z.mats.forEach(m => m.emissive && m.emissive.setRGB(Math.max(0, z.flash) * 4, 0, 0)); }
    const p = z.group.position, dx = P.pos.x - p.x, dz = P.pos.z - p.z, dist = Math.hypot(dx, dz), near = dist < 55;
    if (z.group.visible !== near) z.group.visible = near; // lejos: no se dibuja
    const live = z.state === 'chase' ? near : dist < 18; if (z.group.matrixWorldAutoUpdate !== live) z.group.matrixWorldAutoUpdate = live;
    if (z.state === 'idle') { // inactivo hasta entrar en el rango de detección
      if (dist < 18) { z.inner.rotation.z = Math.sin(t * 1.3 + z.phase) * .03; z.inner.position.y = Math.sin(t * 1.6 + z.phase) * .01; }
      if ((z.t -= dt) <= 0) { z.t = .25; const R = z.T.detect * stealth;
        if (dist < R && (dist < 4 * stealth || lineOfSight(new THREE.Vector3(p.x, 1.2, p.z), new THREE.Vector3(P.pos.x, 1.2, P.pos.z)))) activate(z); }
      continue;
    }
    z.group.rotation.y = Math.atan2(dx, dz);
    if (z.stun > 0) z.stun -= dt;
    else { p.x += dx / dist * z.T.speed * dt; p.z += dz / dist * z.T.speed * dt;
      for (const o of zombies) if (o !== z && !o.dead) { const ox = p.x - o.group.position.x, oz = p.z - o.group.position.z, od = Math.hypot(ox, oz); if (od < .8 && od > 0) { p.x += ox / od * dt * 1.5; p.z += oz / od * dt * 1.5; } }
      resolve(p, .45); }
    const k = z.T.speed * 2.2, mv = z.stun <= 0; // animación procedural (los GLB no traen clips)
    z.inner.position.y = mv ? Math.abs(Math.sin(t * k + z.phase)) * .08 : 0; z.inner.rotation.z = mv ? Math.sin(t * k * .5 + z.phase) * .1 : 0; z.inner.rotation.x = mv ? .14 : -.1;
    if (dist < z.T.contact) return gameOver();
  }
}

// ---------- PICKUPS ----------
function spawnPickup([x, z]) {
  const g = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(.5, .32, .34), new THREE.MeshStandardMaterial({ color: 0x4b5a2a, emissive: 0x223300, roughness: .6 })); box.castShadow = true;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(.52, .08, .36), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd23a).multiplyScalar(3), toneMapped: false }));
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 3, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd23a).multiplyScalar(2), transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  g.add(box, strip, halo); g.position.set(x, 1, z); scene.add(g); return { g, box, taken: false };
}
function updatePickups(t) {
  for (const p of pickups) { if (p.taken) continue; p.box.rotation.y = t * 2; p.g.position.y = 1 + Math.sin(t * 2.5) * .12;
    if (Math.hypot(P.pos.x - p.g.position.x, P.pos.z - p.g.position.z) < 1.3) { p.taken = true; scene.remove(p.g); weapons.forEach((w, i) => res[i] += w.cfg.pickup); sfx.pickup(); hud(); msg(`+${weapons[0].cfg.pickup} balas ${weapons[0].cfg.name} · +${weapons[1].cfg.pickup} balas ${weapons[1].cfg.name}`); } }
}

// ---------- PARTÍCULAS Y TRAZADORAS ----------
const pGeo = new THREE.SphereGeometry(.035, 6, 6); // todo prefabricado (pools): sin crear objetos durante el juego
const pPool = Array.from({ length: 64 }, () => { const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ transparent: true })); m.visible = false; m.frustumCulled = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0 }; });
const tPool = Array.from({ length: 4 }, () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(0xffd890).multiplyScalar(3), transparent: true, toneMapped: false })); l.visible = false; l.frustumCulled = false; scene.add(l); return { l, life: 0 }; });
function burst(pt, color) { let n = 0; for (const p of pPool) { if (p.life > 0) continue; p.life = .5; p.m.visible = true; p.m.position.copy(pt); p.m.material.color.setHex(color); p.m.material.opacity = 1; p.v.set((Math.random() - .5) * 3, Math.random() * 2.5, (Math.random() - .5) * 3); if (++n >= 8) break; } }
function tracer(a, b) { const t = tPool.find(x => x.life <= 0) || tPool[0], p = t.l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; t.life = .06; t.l.visible = true; t.l.material.opacity = 1; }
function updateFx(dt) {
  for (const p of pPool) { if (p.life <= 0) continue; p.life -= dt; p.v.y -= 9 * dt; p.m.position.addScaledVector(p.v, dt); p.m.material.opacity = Math.max(0, p.life * 2); if (p.life <= 0) p.m.visible = false; }
  for (const t of tPool) { if (t.life <= 0) continue; t.life -= dt; t.l.material.opacity = Math.max(0, t.life / .06); if (t.life <= 0) t.l.visible = false; }
}

// ---------- DISPARO Y RECARGA ----------
function shoot() {
  const w = weapons[cur]; if (cd > 0 || drop > .2 || equipT > 0 || reloadT > 0) return;
  if (mag[cur] <= 0) { sfx.empty(); msg(res[cur] > 0 ? 'Cargador vacío — pulsa R' : '¡SIN MUNICIÓN! Busca cajas de munición', 1400); return; }
  mag[cur]--; cd = w.cfg.cooldown; kick = 1; w.flash.intensity = 40; sfx.shot(cur); if (w.anim) fade(w, 'shot', false);
  ray.setFromCamera(new THREE.Vector2(0, 0), camera); ray.far = 80;
  const h = ray.intersectObjects([...solids, ...zombies.filter(z => !z.dead && z.group.visible).map(z => z.hit)], false)[0];
  const dir = ray.ray.direction, right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
  const muzzle = camera.position.clone().addScaledVector(dir, .7).addScaledVector(right, .13).add(new THREE.Vector3(0, -.1, 0));
  tracer(muzzle, h ? h.point : camera.position.clone().addScaledVector(dir, 60));
  if (h) { const z = h.object.userData.zombie;
    if (z) { z.hp--; z.stun = z.T.hp > 2 ? .12 : .3; z.flash = .15; burst(h.point, 0xaa1111); sfx.hit(); const m = $('hit'); m.style.opacity = 1; setTimeout(() => m.style.opacity = 0, 120);
      if (z.state === 'idle') activate(z); if (z.hp <= 0) { killZombie(z); msg(`${z.T.name} eliminado`, 900); } }
    else burst(h.point, 0xbbbbbb); }
  hud();
}
function reload() {
  const w = weapons[cur], c = w.cfg; if (reloadT > 0 || drop > 0 || equipT > 0 || mag[cur] >= c.mag || res[cur] <= 0) return;
  const n = mag[cur] ? 'reload' : 'reloadFull'; reloadDur = reloadT = clipDur(w, n) || c.reload; if (w.anim) fade(w, n, false); sfx.reload(); msg('Recargando…', reloadDur * 1000);
}
function finishReload() { const i = cur, n = Math.min(weapons[i].cfg.mag - mag[i], res[i]); mag[i] += n; res[i] -= n; hud(); }

// ---------- FLUJO ----------
function reset() {
  zombies.forEach(z => scene.remove(z.group)); pickups.forEach(p => scene.remove(p.g)); zombies = ZOMBIES.map(spawnZombie); pickups = PICKUPS.map(spawnPickup);
  mag = weapons.map(w => w.cfg.mag); res = weapons.map(w => w.cfg.reserve); cur = want = 0; drop = cd = reloadT = equipT = 0; kills = 0; tStart = performance.now();
  weapons.forEach((w, i) => w.holder.visible = i === 0); P.pos.set(0, 0, -4); P.yaw = P.pitch = 0; P.eye = CONFIG.player.eye; hud();
}
function lockInput() { const p = $('c').requestPointerLock(); if (p && p.catch) p.catch(() => {}); } // se pide directo dentro del clic (Chrome lo exige)
function toggleFullscreen() { // tecla F: pantalla completa + bloqueo de teclado (evita que Ctrl+W cierre la pestaña)
  if (document.fullscreenElement) return document.exitFullscreen();
  Promise.resolve(document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })).then(() => navigator.keyboard?.lock?.(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Digit1', 'Digit2', 'KeyR'])?.catch(() => {})).catch(() => {});
}
function startPlay(fresh) {
  grace = 0; slowN = 0; if (fresh) reset(); ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume();
  $('scr').style.display = 'none'; $('hud').style.display = 'block'; state = 'playing'; lockInput(); if (fresh) msg('Llega a la zona de extracción', 3000);
}
function gameOver() { if (state !== 'playing') return; state = 'over'; sfx.over(); document.exitPointerLock(); screen('over', 'GAME OVER', `Un zombi te atrapó. Eliminaste ${kills} de ${zombies.length}.`, 'REINICIAR (R)'); }
function victory() { state = 'win'; sfx.win(); document.exitPointerLock(); const s = Math.round((performance.now() - tStart) / 1000);
  screen('win', '¡MISIÓN COMPLETADA!', `Has llegado a la zona de extracción · Tiempo ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · Zombis eliminados ${kills}/${zombies.length}`, 'JUGAR DE NUEVO'); }
$('sbtn').onclick = () => startPlay(state !== 'paused');
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== $('c') && state === 'playing') { state = 'paused'; screen('', 'PAUSA', 'Partida en pausa', 'CONTINUAR'); } });
document.addEventListener('pointerlockerror', () => setTimeout(() => { if (state === 'playing' && document.pointerLockElement !== $('c')) { state = 'paused'; screen('', 'PAUSA', 'El navegador no permitió capturar el mouse. Espera 1 segundo y pulsa CONTINUAR (abre el juego en Chrome, no dentro de VS Code)', 'CONTINUAR'); } }, 400));
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyF' && !e.repeat) toggleFullscreen();
  if (state !== 'playing') { if (e.code === 'KeyR' && (state === 'over' || state === 'win')) startPlay(true); return; }
  if (e.code === 'Space') e.preventDefault();
  if ((e.code === 'Digit1' || e.code === 'Digit2') && reloadT <= 0) { const n = e.code === 'Digit1' ? 0 : 1; if (n !== want) { want = n; hud(); } }
  if (e.code === 'KeyR' && !e.repeat) reload();
  if (e.code === 'KeyQ' && !e.repeat) { const ks = ['low', 'med', 'high']; applyQuality(ks[(ks.indexOf(qk) + 1) % 3]); msg('Calidad gráfica: ' + QUAL[qk].n, 1400); }
  if (e.code === 'KeyT' && !e.repeat) { torchOn = !torchOn; sfx.empty(); }
  if (e.ctrlKey && ['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = false); });
addEventListener('mousedown', e => { if (e.button === 0 && state === 'playing' && document.pointerLockElement) shoot(); }); // un disparo por clic
addEventListener('mousemove', e => { if (state !== 'playing' || !document.pointerLockElement) return; if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return; // descarta saltos erróneos del navegador
  P.yaw -= e.movementX * CONFIG.player.sens; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * CONFIG.player.sens)); });

// ---------- BUCLE ----------
const clock = new THREE.Clock(), _fw = new THREE.Vector3(), _ex = new THREE.Vector3(EXTRACT.x, 0, EXTRACT.z + EXTRACT.hz); let lastCrouch = null, lastR = '', distT = 0;
function update(dt, t) {
  const C = CONFIG.player; P.crouch = !!keys.Space;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), moving = !!(f || s), sprint = keys.ShiftLeft && !P.crouch && f > 0;
  const sp = C.speed * (sprint ? C.sprint : 1) * (P.crouch ? C.crouchMul : 1), len = Math.hypot(f, s) || 1;
  P.pos.x += (-Math.sin(P.yaw) * f + Math.cos(P.yaw) * s) / len * sp * dt; P.pos.z += (-Math.cos(P.yaw) * f - Math.sin(P.yaw) * s) / len * sp * dt; resolve(P.pos, C.radius);
  P.bob += moving ? dt * sp * 1.7 : 0; P.eye += ((P.crouch ? C.eyeCrouch : C.eye) - P.eye) * Math.min(1, dt * 10);
  camera.position.set(P.pos.x, P.eye + (moving ? Math.sin(P.bob * 2) * .03 : 0), P.pos.z); camera.rotation.set(P.pitch, P.yaw, 0);
  const fw = _fw.set(0, 0, -1).applyQuaternion(camera.quaternion); torch.intensity = torchOn ? 320 : 0; torchDir.lerp(fw, Math.min(1, dt * 14)).normalize(); // la linterna sigue la cámara con un leve retardo
  torch.position.set(camera.position.x, camera.position.y + .22, camera.position.z); torch.target.position.copy(torch.position).addScaledVector(torchDir, 10);
  if (P.crouch !== lastCrouch) { lastCrouch = P.crouch; $('crouch').style.opacity = P.crouch ? 1 : 0; }
  // cambio de arma (baja, intercambia, sube; el rifle reproduce su animación Draw)
  if (want !== cur) { drop += dt * 6; if (drop >= 1) { cur = want; weapons.forEach((w, i) => w.holder.visible = i === cur); const w = weapons[cur]; if (w.anim) { fade(w, 'draw', false); equipT = (clipDur(w, 'draw') || .6) * .85; } hud(); } } else drop = Math.max(0, drop - dt * 6);
  equipT = Math.max(0, equipT - dt); cd = Math.max(0, cd - dt); kick = Math.max(0, kick - dt * 8);
  if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) finishReload(); }
  { const r = reloadT > 0 ? Math.round(100 * (1 - reloadT / reloadDur)) + '%' : '0%'; if (r !== lastR) { lastR = r; $('rbar').style.width = r; } }
  const w = weapons[cur];
  if (w.mixer) { w.mixer.update(dt); if (w.once && w.cur && w.cur.time >= w.cur.getClip().duration - .03) w.once = false; if (!w.once && equipT <= 0 && reloadT <= 0) fade(w, moving ? (sprint ? 'run' : 'walk') : 'idle', true); }
  const rp = reloadT > 0 ? Math.sin((1 - reloadT / reloadDur) * Math.PI) : 0;
  weaponPivot.position.set(w.anim ? 0 : Math.sin(P.bob) * .012, -drop * .5 - (w.anim ? 0 : moving ? Math.abs(Math.sin(P.bob)) * .012 : -Math.sin(t * 1.5) * .003), 0);
  if (!w.anim) { w.holder.position.set(w.base.x, w.base.y - rp * .12, w.base.z + kick * .06); w.holder.rotation.set(kick * .1 + rp * .7, 0, rp * .4); } else w.holder.position.z = w.base.z + kick * .015;
  weapons.forEach(x => x.flash.intensity = Math.max(0, x.flash.intensity - dt * 400));
  weaponRoot.position.copy(camera.position); weaponRoot.quaternion.copy(camera.quaternion);
  lamps.forEach((l, i) => l.intensity = 70 + (i % 2 ? Math.sin(t * 17 + i) * Math.random() * 25 : 0));
  const dp = dustGeo.attributes.position, da = dp.array;
  for (let i = 0; i < dustN; i++) { da[i * 3 + 1] += Math.sin(t + i) * dt * .05; da[i * 3] += Math.sin(t * .3 + i * 2) * dt * .08; for (const a of [0, 2]) { if (da[i * 3 + a] > 10) da[i * 3 + a] -= 20; else if (da[i * 3 + a] < -10) da[i * 3 + a] += 20; } }
  dp.needsUpdate = true; dust.position.set(camera.position.x, 2.5, camera.position.z);
  updateZombies(dt, t); updatePickups(t); updateFx(dt);
  if ((distT -= dt) <= 0) { distT = .25; $('dist').textContent = Math.max(0, Math.round(P.pos.distanceTo(_ex))); }
  if (state === 'playing' && Math.abs(P.pos.x - EXTRACT.x) < EXTRACT.hx && Math.abs(P.pos.z - EXTRACT.z) < EXTRACT.hz) victory();
}
const QUAL = { low: { n: 'BAJA', pr: .75, bloom: false, shadow: false }, med: { n: 'MEDIA', pr: 1, bloom: true, shadow: true, map: 512 }, high: { n: 'ALTA', pr: Math.min(devicePixelRatio, 1.5), bloom: true, shadow: true, map: 1024 } };
function applyQuality(k) {
  qk = k; const q = QUAL[k]; PR = q.pr; renderer.setPixelRatio(PR); composer.setPixelRatio(PR); bloom.enabled = q.bloom; torch.castShadow = q.shadow;
  if (q.map && torch.shadow.mapSize.x !== q.map) { torch.shadow.mapSize.set(q.map, q.map); if (torch.shadow.map) { torch.shadow.map.dispose(); torch.shadow.map = null; } } resize();
}
let ema = 16, prT = 0, grace = 0, slowN = 0;
function adapt(ms, dt) { // baja la resolución solo si el juego va lento de forma sostenida (ignora los primeros segundos de carga)
  grace += dt; if (grace < 5) return; ema += (ms - ema) * .05; prT += dt; if (prT < 2) return; prT = 0; const mx = QUAL[qk].pr; let n = PR;
  if (ema > 30) { if (++slowN >= 2 && PR > .7) n = Math.max(.7, PR - .1); } else { slowN = 0; if (ema < 13 && PR < mx) n = Math.min(mx, PR + .05); }
  if (n !== PR) { PR = n; renderer.setPixelRatio(PR); composer.setPixelRatio(PR); resize(); }
}
// ---------- DIAGNÓSTICO: F3 muestra FPS y memoria; si el navegador se cierra, al volver se muestra el último estado ----------
renderer.info.autoReset = false;
let lastErr = '', crashInfo = null, dbgT = 0; const DK = 'opx_diag';
try { const prev = JSON.parse(localStorage.getItem(DK) || 'null'); if (prev && prev.running) crashInfo = prev; } catch (e) {}
const dbg = document.createElement('div'); dbg.style.cssText = 'position:fixed;right:10px;top:10px;z-index:99;font:12px monospace;color:#9fffb4;background:rgba(0,0,0,.7);padding:6px 10px;border-radius:6px;display:none;white-space:pre'; document.body.appendChild(dbg);
addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); dbg.style.display = dbg.style.display === 'none' ? 'block' : 'none'; } });
function mark(running) { try { const i = renderer.info; localStorage.setItem(DK, JSON.stringify({ running, state, fps: Math.round(1000 / Math.max(ema, 1)), res: +PR.toFixed(2), q: qk, tex: i.memory.textures, geo: i.memory.geometries, prog: i.programs ? i.programs.length : 0, z: zombies.filter(z => !z.dead).length, err: lastErr })); } catch (e) {} }
addEventListener('pagehide', () => mark(false)); setInterval(() => { if (state === 'playing') mark(true); }, 1000);
function loop() {
  requestAnimationFrame(loop); const raw = clock.getDelta(), dt = Math.min(raw, .05), t = clock.elapsedTime; fx.uniforms.time.value = t % 100;
  if (state === 'playing') { try { update(dt, t); adapt(raw * 1000, dt); } catch (e) { showErr(e.message); } }
  renderer.info.reset(); try { composer.render(); } catch (e) { showErr(e.message); }
  if (dbg.style.display !== 'none' && (dbgT -= raw) <= 0) { dbgT = .5; const i = renderer.info; dbg.textContent = `FPS ${Math.round(1 / Math.max(raw, .001))}  (${(raw * 1000).toFixed(1)} ms)\nCalidad ${QUAL[qk].n}  Res ${PR.toFixed(2)}\nDraw calls ${i.render.calls}  Triángulos ${i.render.triangles}\nTexturas ${i.memory.textures}  Geometrías ${i.memory.geometries}  Shaders ${i.programs ? i.programs.length : 0}`; }
}

// ---------- ARRANQUE ----------
(async function init() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  loadSnd('deagle', ['assets/audio/deagle_shot.wav', 'assets/audio/desert_eagle2.wav']); loadSnd('ak', ['assets/audio/ak_shot.mp3', 'assets/audio/ak 47 - single shot.mp3']); loadSnd('scream', ['assets/audio/zombie_scream.mp3', 'assets/audio/dragon-studio-zombie-scream-324752.mp3']);
  const [ak, eagle, soldier, tank, gun] = await Promise.all([load(CONFIG.weapons[1].file), load(CONFIG.weapons[0].file), load('assets/models/zombie_soldier.glb'), load('assets/models/zombie_tank.glb'), load(CONFIG.weapons[0].attach.file)]);
  wGLB = [eagle, ak]; wGLB2[0] = gun; zGLB = { soldier, tank };
  const missing = [['Desert Eagle', eagle], ['AK-74M', ak], ['zombi soldado', soldier], ['zombi tanque', tank], ['pistola', gun]].filter(x => !x[1]).map(x => x[0]);
  if (missing.length) $('warn').textContent = `⚠ No se pudieron cargar: ${missing.join(', ')}. Ejecuta el juego desde un servidor (no con doble clic).`;
  buildWeapons(); reset(); applyQuality('med');
  weapons.forEach(w => w.holder.visible = true); zombies.forEach(z => z.group.visible = true); pPool.forEach(p => p.m.visible = true); tPool.forEach(t => t.l.visible = true); // precalentar shaders: evita tirones al jugar
  renderer.compile(scene, camera); renderer.compile(weaponScene, camera); composer.render(); composer.render();
  weapons.forEach((w, i) => w.holder.visible = i === 0); pPool.forEach(p => p.m.visible = false); tPool.forEach(t => t.l.visible = false);
  if (crashInfo) $('warn').textContent += ` ⚠ La sesión anterior se cerró inesperadamente (FPS ${crashInfo.fps}, calidad ${crashInfo.q}, resolución ${crashInfo.res}, texturas ${crashInfo.tex}, geometrías ${crashInfo.geo}, error: ${crashInfo.err || 'ninguno'}). Envíame este texto.`;
  screen('', 'OPERACIÓN EXTRACCIÓN', 'El mundo cayó ante la infección. Atraviesa la zona infestada, administra tu munición y alcanza el punto de extracción.', 'INICIAR MISIÓN'); $('hud').style.display = 'none'; loop();
})();