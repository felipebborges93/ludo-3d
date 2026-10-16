import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GameEvent } from '../game/engine';
import { BASE, Color, DEFAULT_RULES } from '../game/rules';
import { BASE_ORIGIN, Cell, HOME_COL, TRACK, tokenCell } from './layout';
import { buildCharacter, CHARACTERS, pickLine, TRIP_LINES } from './characters';
import { CAMERA_CONFIG } from './camera.config';

export const HEX: Record<Color, number> = { red: 0xe84a4a, green: 0x3dbb5c, yellow: 0xf5c518, blue: 0x3b7be8 };

const world = (c: Cell, y = 0) => new THREE.Vector3(c[0] - 7, y, c[1] - 7);
const mat = (color: number, roughness = 0.35, metalness = 0.06, bumpMap?: THREE.Texture, bumpScale = 0.01) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, bumpMap, bumpScale });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs fn(t) with t in 0..1 over ms, resolves when done. */
function tween(ms: number, fn: (t: number) => void) {
  return new Promise<void>((done) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      t < 1 ? requestAnimationFrame(step) : done();
    };
    requestAnimationFrame(step);
  });
}

/** Team shape icon (colorblind support). Swap point for .glb characters in phase 2. */
function iconGeometry(color: Color): THREE.BufferGeometry {
  switch (color) {
    case 'red': return new THREE.ConeGeometry(0.16, 0.26, 3);
    case 'green': return new THREE.SphereGeometry(0.13, 16, 12);
    case 'yellow': return new RoundedBoxGeometry(0.22, 0.22, 0.22, 2, 0.03);
    case 'blue': return new THREE.OctahedronGeometry(0.16);
  }
}

/** Concentric lathe grooves bump map for token bases and home yard spots. */
function createRingBumpTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0, 0, 128, 128);
  for (const [r, w, col] of [[54, 5, '#ffffff'], [44, 4, '#555555'], [34, 3, '#e8e8e8'], [22, 3, '#666666']] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(64, 64, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Molded board tile bump map: raised outer bevel, subtle inset inner square, and fine grain. */
function createTileBumpTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, 128, 128);
  // Subtle recessed inner panel
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(12, 12, 104, 104);
  ctx.fillStyle = '#bcbcbc';
  ctx.fillRect(16, 16, 96, 96);
  // Fine tactile grain
  for (let i = 0; i < 450; i++) {
    const v = 175 + Math.floor((Math.random() - 0.5) * 30);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

let sharedRingBumpTex: THREE.CanvasTexture | null = null;
let sharedTileBumpTex: THREE.CanvasTexture | null = null;

const baseGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.08, 24);
const iconGeos = new Map<Color, THREE.BufferGeometry>();
const iconMat = mat(0xffffff, 0.25, 0.1);
const pieceBaseMats = new Map<Color, THREE.MeshStandardMaterial>();

/** Procedural dotted circle texture */
function createDottedRingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.setLineDash([20, 24]);
  ctx.beginPath();
  ctx.arc(128, 128, 105, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

let sharedDottedRingTex: THREE.CanvasTexture | null = null;
const ringPlaneGeo = new THREE.PlaneGeometry(1.2, 1.2);

/** Piece = team-colored base + character rig + floating shape icon (colorblind support) + dotted selection ring. */
function createPiece(color: Color, variant: number): THREE.Group {
  const g = new THREE.Group();
  if (!sharedRingBumpTex) sharedRingBumpTex = createRingBumpTexture();
  if (!pieceBaseMats.has(color)) {
    pieceBaseMats.set(color, mat(HEX[color], 0.32, 0.08, sharedRingBumpTex, 0.015));
  }
  const base = new THREE.Mesh(baseGeo, pieceBaseMats.get(color)!);
  base.position.y = 0.04;
  base.castShadow = true;
  base.receiveShadow = true;
  if (!iconGeos.has(color)) iconGeos.set(color, iconGeometry(color));
  const icon = new THREE.Mesh(iconGeos.get(color)!, iconMat);
  icon.position.y = 1.35;
  icon.scale.setScalar(0.7);
  const rig = buildCharacter(color, variant);

  if (!sharedDottedRingTex) sharedDottedRingTex = createDottedRingTexture();
  const ringMat = new THREE.MeshBasicMaterial({
    map: sharedDottedRingTex,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const selectionRing = new THREE.Mesh(ringPlaneGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.04;
  selectionRing.visible = false;

  // Invisible larger hit cylinder for easy tapping on mobile/desktop
  const hitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitMesh.position.y = 0.9;
  g.add(base, rig, icon, selectionRing, hitMesh);
  g.userData.rig = rig;
  g.userData.selectionRing = selectionRing;
  return g;
}

function diceFace(n: number): THREE.MeshStandardMaterial {
  const c = document.createElement('canvas');
  const b = document.createElement('canvas');
  c.width = c.height = b.width = b.height = 128;
  const x = c.getContext('2d')!;
  const bx = b.getContext('2d')!;

  // Warm ivory base color + slight edge vignette
  const bgGrad = x.createRadialGradient(64, 64, 16, 64, 64, 88);
  bgGrad.addColorStop(0, '#fdfbf7');
  bgGrad.addColorStop(1, '#ede6d8');
  x.fillStyle = bgGrad;
  x.fillRect(0, 0, 128, 128);

  // Neutral high height on bump map
  bx.fillStyle = '#e6e6e6';
  bx.fillRect(0, 0, 128, 128);

  const pips: Record<number, Cell[]> = {
    1: [[64, 64]], 2: [[32, 32], [96, 96]], 3: [[32, 32], [64, 64], [96, 96]],
    4: [[32, 32], [96, 32], [32, 96], [96, 96]], 5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]],
    6: [[32, 28], [96, 28], [32, 64], [96, 64], [32, 100], [96, 100]],
  };
  const r = n === 1 ? 15 : 12;
  for (const [px, py] of pips[n]) {
    x.fillStyle = n === 1 ? '#d93838' : '#1e1e24';
    x.beginPath();
    x.arc(px, py, r, 0, Math.PI * 2);
    x.fill();

    // Concave dimple height gradient for each pip
    const g = bx.createRadialGradient(px, py, 1, px, py, r + 2);
    g.addColorStop(0, '#101010');
    g.addColorStop(0.75, '#404040');
    g.addColorStop(1, '#e6e6e6');
    bx.fillStyle = g;
    bx.beginPath();
    bx.arc(px, py, r + 2, 0, Math.PI * 2);
    bx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const bumpTex = new THREE.CanvasTexture(b);
  return new THREE.MeshStandardMaterial({
    map: tex,
    bumpMap: bumpTex,
    bumpScale: 0.035,
    roughness: 0.24,
    metalness: 0.04,
  });
}

// Box face order: +x, -x, +y, -y, +z, -z. Rotation that brings each value to +y.
const DICE_FACES = [3, 4, 1, 6, 2, 5];
const DICE_UP: Record<number, [number, number]> = {
  1: [0, 0], 6: [Math.PI, 0], 2: [-Math.PI / 2, 0], 5: [Math.PI / 2, 0], 3: [0, Math.PI / 2], 4: [0, -Math.PI / 2],
};

/** Generates matching color, bump, and roughness maps for realistic planked wood. */
function createWoodMaps(repeatX = 8, repeatY = 8, baseRgb: [number, number, number] = [122, 73, 36]) {
  const c = document.createElement('canvas');
  const b = document.createElement('canvas');
  const r = document.createElement('canvas');
  c.width = c.height = b.width = b.height = r.width = r.height = 512;
  const ctx = c.getContext('2d')!;
  const btx = b.getContext('2d')!;
  const rtx = r.getContext('2d')!;

  const [br, bg, bb] = baseRgb;
  ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
  ctx.fillRect(0, 0, 512, 512);
  btx.fillStyle = '#c8c8c8';
  btx.fillRect(0, 0, 512, 512);
  rtx.fillStyle = '#b8b8b8';
  rtx.fillRect(0, 0, 512, 512);

  const plankHeight = 64;
  for (let y = 0; y < 512; y += plankHeight) {
    const shade = (Math.random() - 0.5) * 16;
    ctx.fillStyle = `rgba(${Math.floor(br + shade)}, ${Math.floor(bg + shade * 0.7)}, ${Math.floor(bb + shade * 0.4)}, 0.5)`;
    ctx.fillRect(0, y, 512, plankHeight);

    const rShade = Math.floor(175 + (Math.random() - 0.5) * 28);
    rtx.fillStyle = `rgb(${rShade}, ${rShade}, ${rShade})`;
    rtx.fillRect(0, y, 512, plankHeight);

    // Plank seam grooves (dark in color and bump, rougher in roughnessMap)
    ctx.strokeStyle = 'rgba(30, 15, 5, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    btx.strokeStyle = '#222222';
    btx.lineWidth = 3.5;
    btx.beginPath();
    btx.moveTo(0, y);
    btx.lineTo(512, y);
    btx.stroke();

    rtx.strokeStyle = '#f0f0f0';
    rtx.lineWidth = 3;
    rtx.beginPath();
    rtx.moveTo(0, y);
    rtx.lineTo(512, y);
    rtx.stroke();

    // Vertical plank joint per row
    const jx = 80 + Math.floor(Math.random() * 350);
    ctx.beginPath(); ctx.moveTo(jx, y); ctx.lineTo(jx, y + plankHeight); ctx.stroke();
    btx.beginPath(); btx.moveTo(jx, y); btx.lineTo(jx, y + plankHeight); btx.stroke();

    // Wood grain fibers and pores
    for (let i = 0; i < 26; i++) {
      const gy = y + 3 + Math.random() * (plankHeight - 6);
      const c1 = (Math.random() - 0.5) * 8;
      const c2 = (Math.random() - 0.5) * 8;
      const lw = 0.8 + Math.random() * 2;

      ctx.strokeStyle = i % 3 === 0 ? 'rgba(155, 98, 52, 0.14)' : 'rgba(45, 22, 8, 0.2)';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(170, gy + c1, 340, gy + c2, 512, gy);
      ctx.stroke();

      btx.strokeStyle = i % 3 === 0 ? 'rgba(235, 235, 235, 0.35)' : 'rgba(80, 80, 80, 0.45)';
      btx.lineWidth = lw;
      btx.beginPath();
      btx.moveTo(0, gy);
      btx.bezierCurveTo(170, gy + c1, 340, gy + c2, 512, gy);
      btx.stroke();

      rtx.strokeStyle = i % 2 === 0 ? 'rgba(140, 140, 140, 0.3)' : 'rgba(215, 215, 215, 0.3)';
      rtx.lineWidth = lw;
      rtx.beginPath();
      rtx.moveTo(0, gy);
      rtx.bezierCurveTo(170, gy + c1, 340, gy + c2, 512, gy);
      rtx.stroke();
    }
  }

  const cfg = (canvas: HTMLCanvasElement, isColor: boolean) => {
    const t = new THREE.CanvasTexture(canvas);
    if (isColor) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.needsUpdate = true;
    return t;
  };

  return {
    map: cfg(c, true),
    bumpMap: cfg(b, false),
    roughnessMap: cfg(r, false),
  };
}

export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls;
  private pieces = new Map<string, THREE.Group>();
  private highlighted: THREE.Group[] = [];
  private dice: THREE.Mesh;
  private shake = 0;
  private shakeOffset = new THREE.Vector3();
  private focus = new THREE.Vector3();
  private zoomCamPos = new THREE.Vector3();
  private initialCamPos = new THREE.Vector3(0, 16, 13);
  private dancing: THREE.Group[] = [];
  private confetti = new Confetti();
  private lastT = 0;
  private baseDist = 23;
  private isZoomed = false;
  private cameraState: 'IDLE' | 'OVERVIEW' | 'APPROACH' | 'FOLLOW' | 'RETURN' = 'IDLE';
  private cameraTargetPos = new THREE.Vector3(0, 16, 13);
  /** Called with screen coords when a character speaks; UI draws the bubble. */
  onSpeak?: (text: string, x: number, y: number) => void;
  /** Called when sound effects should play. Keeps render decoupled from audio. */
  onSound?: (name: 'hop' | 'trip' | 'capture' | 'finish' | 'win' | 'dice') => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.92;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;
    pmrem.dispose();

    this.scene.background = new THREE.Color(0x2a1c14);
    this.camera.position.set(0, 16, 13);
    this.cameraTargetPos.set(0, 16, 13);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enablePan: false, minDistance: 10, maxDistance: 32, maxPolarAngle: Math.PI / 2.35, enableDamping: true });

    this.scene.add(new THREE.HemisphereLight(0xfff1e0, 0x4a3222, 0.75));
    const sun = new THREE.DirectionalLight(0xfffaed, 1.45);
    sun.position.set(7, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 2;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11 });
    this.scene.add(sun);

    this.buildBoard();
    this.dice = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.8, 0.8, 4, 0.1), DICE_FACES.map(diceFace));
    this.dice.castShadow = true;
    this.dice.receiveShadow = true;
    this.dice.position.set(0, 0.6, 0);
    this.scene.add(this.dice, this.confetti.points);

    addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private buildBoard() {
    // Large tabletop with color, bump, and roughness wood maps
    const tableWood = createWoodMaps(8, 8, [122, 73, 36]);
    const tableMat = new THREE.MeshStandardMaterial({
      map: tableWood.map,
      bumpMap: tableWood.bumpMap,
      bumpScale: 0.025,
      roughnessMap: tableWood.roughnessMap,
      roughness: 0.78,
      metalness: 0.02,
    });
    const table = new THREE.Mesh(new THREE.BoxGeometry(70, 0.6, 70), tableMat);
    table.position.y = -0.42;
    table.receiveShadow = true;
    this.scene.add(table);

    // Board wood frame/border with darker mahogany grain and bevels
    const frameWood = createWoodMaps(2, 2, [92, 50, 22]);
    const frameMat = new THREE.MeshStandardMaterial({
      map: frameWood.map,
      bumpMap: frameWood.bumpMap,
      bumpScale: 0.02,
      roughnessMap: frameWood.roughnessMap,
      roughness: 0.52,
      metalness: 0.04,
    });
    const boardBorder = new THREE.Mesh(new RoundedBoxGeometry(16.2, 0.28, 16.2, 4, 0.06), frameMat);
    boardBorder.position.y = -0.16;
    boardBorder.castShadow = true;
    boardBorder.receiveShadow = true;
    this.scene.add(boardBorder);

    if (!sharedTileBumpTex) sharedTileBumpTex = createTileBumpTexture();
    if (!sharedRingBumpTex) sharedRingBumpTex = createRingBumpTexture();

    const tileMats = new Map<number, THREE.MeshStandardMaterial>();
    const getTileMat = (color: number) => {
      if (!tileMats.has(color)) {
        tileMats.set(color, mat(color, 0.46, 0.03, sharedTileBumpTex!, 0.008));
      }
      return tileMats.get(color)!;
    };

    const tileGeo = new RoundedBoxGeometry(0.94, 0.12, 0.94, 3, 0.03);
    const tile = (c: Cell, color: number) => {
      const m = new THREE.Mesh(tileGeo, getTileMat(color));
      m.position.copy(world(c, -0.04));
      m.receiveShadow = true;
      this.scene.add(m);
    };
    const starts = [0, 13, 26, 39];
    const colors: Color[] = ['red', 'green', 'yellow', 'blue'];
    TRACK.forEach((c, i) => {
      const si = starts.indexOf(i);
      tile(c, si >= 0 ? HEX[colors[si]] : 0xfbf9f5);
      if (si < 0 && DEFAULT_RULES.safeSquares.includes(i)) {
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mat(0xc4c4cc, 0.25, 0.35));
        star.scale.y = 0.3;
        star.position.copy(world(c, 0.04));
        star.receiveShadow = true;
        this.scene.add(star);
      } else if (DEFAULT_RULES.luckSquares?.includes(i)) {
        // Clover / Luck icon (green octahedron / diamond)
        const luckMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mat(0x22c55e, 0.25, 0.2));
        luckMarker.scale.y = 0.4;
        luckMarker.position.copy(world(c, 0.04));
        luckMarker.receiveShadow = true;
        this.scene.add(luckMarker);
      } else if (DEFAULT_RULES.badLuckSquares?.includes(i)) {
        // Hazard / Bad luck icon (purple / red diamond)
        const badMarker = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), mat(0xa855f7, 0.25, 0.2));
        badMarker.scale.y = 0.4;
        badMarker.position.copy(world(c, 0.04));
        badMarker.receiveShadow = true;
        this.scene.add(badMarker);
      }
    });
    const baseOuterGeo = new RoundedBoxGeometry(5.9, 0.12, 5.9, 3, 0.04);
    const baseInnerGeo = new RoundedBoxGeometry(3.8, 0.14, 3.8, 3, 0.04);
    const spotGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.16, 24);
    const innerBaseMat = mat(0xf6f3ec, 0.52, 0.02, sharedTileBumpTex, 0.005);
    for (const color of colors) {
      HOME_COL[color].forEach((c) => tile(c, HEX[color]));
      const o = BASE_ORIGIN[color];
      const base = new THREE.Mesh(baseOuterGeo, mat(HEX[color], 0.48, 0.03, sharedTileBumpTex, 0.006));
      base.position.copy(world([o[0] + 2.5, o[1] + 2.5], -0.04));
      base.receiveShadow = true;
      const inner = new THREE.Mesh(baseInnerGeo, innerBaseMat);
      inner.position.copy(world([o[0] + 2.5, o[1] + 2.5], -0.03));
      inner.receiveShadow = true;
      this.scene.add(base, inner);
      const spotMat = mat(HEX[color], 0.36, 0.06, sharedRingBumpTex, 0.014);
      for (let t = 0; t < 4; t++) {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.copy(world(tokenCell(color, BASE, t), -0.02));
        spot.receiveShadow = true;
        this.scene.add(spot);
      }
    }
    // Center goal: four triangles pointing inward with subtle bevel.
    const tri: Record<Color, Cell[]> = {
      red: [[-1.5, -1.5], [-1.5, 1.5]], green: [[-1.5, -1.5], [1.5, -1.5]],
      yellow: [[1.5, -1.5], [1.5, 1.5]], blue: [[-1.5, 1.5], [1.5, 1.5]],
    };
    for (const color of colors) {
      const [a, b] = tri[color];
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(a[0], -a[1]), new THREE.Vector2(b[0], -b[1])]);
      const m = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }),
        mat(HEX[color], 0.48, 0.04)
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = -0.09;
      m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  private resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.baseDist = w < h ? (w < 420 ? 32 : 28) : 23;
    const baseDir = new THREE.Vector3(0, 16, 13).normalize();
    this.initialCamPos.copy(baseDir).multiplyScalar(this.baseDist);
    if (this.cameraState === 'IDLE' || this.cameraState === 'RETURN') {
      this.cameraTargetPos.copy(this.initialCamPos);
      this.camera.position.copy(this.initialCamPos);
    }
    this.camera.updateProjectionMatrix();
  }

  private frame(t: number) {
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;
    let k = 0;
    for (const p of this.pieces.values()) {
      const rig: THREE.Object3D = p.userData.rig;
      const ph = k++ * 1.7;
      if (this.dancing.includes(p)) {
        rig.rotation.y = Math.sin(t / 150 + ph) * 0.9;
        rig.rotation.z = Math.sin(t / 110 + ph) * 0.25;
        p.position.y = Math.abs(Math.sin(t / 180 + ph)) * 0.5;
      } else if (!p.userData.busy) {
        rig.rotation.z = Math.sin(t / 450 + ph) * 0.06;
        rig.scale.y = 1 + Math.sin(t / 320 + ph) * 0.03;
      }
    }
    this.highlighted.forEach((p) => {
      p.position.y = 0.15 + Math.abs(Math.sin(t / 200)) * 0.25;
      const ring: THREE.Mesh | undefined = p.userData.selectionRing;
      if (ring) {
        ring.rotation.z = (t / 600) % (Math.PI * 2);
      }
    });

    this.camera.position.sub(this.shakeOffset);

    // Smooth focal target interpolation
    this.controls.target.lerp(this.focus, CAMERA_CONFIG.targetLerpSpeed);

    // Dynamic camera position lerping according to state machine
    let currentLerpSpeed = CAMERA_CONFIG.lerpSpeedReturn;
    switch (this.cameraState) {
      case 'OVERVIEW':
        currentLerpSpeed = CAMERA_CONFIG.lerpSpeedOverview;
        break;
      case 'APPROACH':
        currentLerpSpeed = CAMERA_CONFIG.lerpSpeedApproach;
        break;
      case 'FOLLOW':
        currentLerpSpeed = CAMERA_CONFIG.lerpSpeedFollow;
        break;
      case 'RETURN':
      case 'IDLE':
      default:
        currentLerpSpeed = CAMERA_CONFIG.lerpSpeedReturn;
        break;
    }

    this.camera.position.lerp(this.cameraTargetPos, currentLerpSpeed);

    // Prevent camera from dipping under board
    if (this.camera.position.y < 1.0) {
      this.camera.position.y = 1.0;
    }

    this.controls.update();
    this.shake = Math.max(0, this.shake - dt);
    this.shakeOffset.set((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0);
    this.camera.position.add(this.shakeOffset);

    this.confetti.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  setup(tokens: Record<string, number[]>) {
    this.pieces.forEach((p) => this.scene.remove(p));
    this.pieces.clear();
    this.dancing = [];
    for (const [color, list] of Object.entries(tokens)) {
      list.forEach((p, i) => {
        const piece = createPiece(color as Color, i);
        piece.position.copy(world(tokenCell(color as Color, p, i)));
        Object.assign(piece.userData, { color, token: i });
        this.pieces.set(`${color}${i}`, piece);
        this.scene.add(piece);
      });
    }
  }

  highlight(color: Color | null, tokens: number[] = []) {
    this.highlighted.forEach((p) => {
      p.position.y = 0;
      if (p.userData.selectionRing) p.userData.selectionRing.visible = false;
    });
    this.highlighted = tokens.map((i) => {
      const piece = this.pieces.get(`${color}${i}`)!;
      if (piece?.userData.selectionRing) piece.userData.selectionRing.visible = true;
      return piece;
    }).filter(Boolean);
  }

  /** Returns the token under the screen point, if any. */
  pick(x: number, y: number): { color: Color; token: number } | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), this.camera);
    let o: THREE.Object3D | null = ray.intersectObjects([...this.pieces.values()], true)[0]?.object ?? null;
    while (o && o.userData.token === undefined) o = o.parent;
    return o ? (o.userData as { color: Color; token: number }) : null;
  }

  /** Checks if the cursor is hovering a piece that has a legal move */
  isPlayableToken(x: number, y: number, color: Color, legalTokens: number[]): boolean {
    const hit = this.pick(x, y);
    return !!(hit && hit.color === color && legalTokens.includes(hit.token));
  }

  private speak(piece: THREE.Group, text: string) {
    if (!this.onSpeak) return;
    const v = piece.position.clone().setY(piece.position.y + 1.4).project(this.camera);
    this.onSpeak(text, ((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight);
  }

  private async rollDice(value: number) {
    this.onSound?.('dice');
    const d = this.dice;
    const [rx, rz] = DICE_UP[value];
    const sx = d.rotation.x, sz = d.rotation.z;
    const ex = rx + Math.PI * 4, ez = rz + Math.PI * 2;
    await tween(700, (t) => {
      const e = 1 - (1 - t) ** 3;
      d.rotation.set(sx + (ex - sx) * e, 0, sz + (ez - sz) * e);
      d.position.y = 0.6 + Math.abs(Math.sin(t * Math.PI * 2)) * 2 * (1 - t);
    });
    d.rotation.set(rx, 0, rz);
  }

  private async hop(piece: THREE.Group, to: THREE.Vector3) {
    this.onSound?.('hop');
    const from = piece.position.clone();
    await tween(CAMERA_CONFIG.hopStepDuration, (t) => {
      piece.position.lerpVectors(from, to, t);
      piece.position.y = Math.sin(Math.PI * t) * 0.6;
      piece.scale.set(1, 1 + Math.sin(Math.PI * t) * 0.25, 1); // stretch in air
    });
    await tween(CAMERA_CONFIG.hopSettleDuration, (t) => piece.scale.set(1 + Math.sin(Math.PI * t) * 0.2, 1 - Math.sin(Math.PI * t) * 0.3, 1 + Math.sin(Math.PI * t) * 0.2));
  }

  /** Tilt rig on an axis and back (trip, bow, faint). */
  private async tilt(piece: THREE.Group, axis: 'x' | 'z', angle: number, hold: number) {
    const rig: THREE.Object3D = piece.userData.rig;
    piece.userData.busy = true;
    await tween(180, (t) => (rig.rotation[axis] = angle * t));
    await sleep(hold);
    await tween(220, (t) => (rig.rotation[axis] = angle * (1 - t)));
    piece.userData.busy = false;
  }

  private async fly(piece: THREE.Group, to: THREE.Vector3) {
    this.onSound?.('capture');
    const from = piece.position.clone();
    const eyes = piece.userData.rig.getObjectByName('eyes') as THREE.Object3D;
    eyes.scale.setScalar(1.8); // shocked face
    this.shake = 0.4;
    await tween(800, (t) => {
      piece.position.lerpVectors(from, to, t);
      piece.position.y = Math.sin(Math.PI * t) * 4;
      piece.rotation.set(t * Math.PI * 4, t * Math.PI * 2, 0);
    });
    piece.rotation.set(0, 0, 0);
    eyes.scale.setScalar(1);
  }

  /** Plays game events in order. Render only reacts; it never decides rules. */
  async play(events: GameEvent[]) {
    let mover: THREE.Group | null = null;
    let hadMovement = false;

    for (const e of events) {
      const piece = 'token' in e ? this.pieces.get(`${e.color}${e.token}`)! : null;
      if (e.type === 'diceRolled') await this.rollDice(e.value);
      else if (e.type === 'tokenMoved') {
        mover = piece!;
        hadMovement = true;

        // Sequence Step 1: Rise to top-down overview showing whole board
        this.cameraState = 'OVERVIEW';
        this.focus.set(0, 0, 0);
        this.cameraTargetPos.set(0, CAMERA_CONFIG.topDownHeight, 0.5);
        await sleep(CAMERA_CONFIG.overviewHoldMs);

        // Sequence Step 2: Approach selected piece closely
        this.cameraState = 'APPROACH';
        this.focus.set(piece!.position.x, piece!.position.y + CAMERA_CONFIG.focusOffsetY, piece!.position.z);
        this.cameraTargetPos.set(
          piece!.position.x,
          piece!.position.y + CAMERA_CONFIG.zoomOffsetY,
          piece!.position.z + CAMERA_CONFIG.zoomOffsetForward
        );
        await sleep(CAMERA_CONFIG.approachDurationMs);

        // Sequence Step 3: Follow character hop-by-hop up close
        this.cameraState = 'FOLLOW';
        const trip = e.color === 'yellow' && Math.random() < 0.3 ? Math.floor(Math.random() * e.path.length) : -1;
        for (let i = 0; i < e.path.length; i++) {
          const dest = world(tokenCell(e.color, e.path[i], e.token));
          this.focus.set(dest.x, dest.y + CAMERA_CONFIG.focusOffsetY, dest.z);
          this.cameraTargetPos.set(
            dest.x,
            dest.y + CAMERA_CONFIG.zoomOffsetY,
            dest.z + CAMERA_CONFIG.zoomOffsetForward
          );
          await this.hop(piece!, dest);
          if (i === trip) {
            this.onSound?.('trip');
            this.speak(piece!, pickLine(TRIP_LINES));
            await this.tilt(piece!, 'x', 1.1, 250);
          }
        }
        if (e.path.length === 1 && e.path[0] === 0 && Math.random() < 0.5) this.speak(piece!, pickLine(CHARACTERS[e.color].lines.enter));
      } else if (e.type === 'tokenCaptured') {
        await this.fly(piece!, world(tokenCell(e.color, BASE, e.token)));
        this.speak(piece!, pickLine(CHARACTERS[e.color].lines.captured));
        const faint = e.color === 'red' ? this.tilt(piece!, 'z', Math.PI / 2, 900) : Promise.resolve();
        if (mover) {
          this.speak(mover, pickLine(CHARACTERS[e.by].lines.capture));
          await (e.by === 'blue' ? this.tilt(mover, 'x', 0.7, 400) : this.hop(mover, mover.position.clone()));
        }
        await faint;
      } else if (e.type === 'tokenFinished') {
        this.onSound?.('finish');
        this.confetti.burst(piece!.position);
        this.speak(piece!, pickLine(CHARACTERS[e.color].lines.finish));
        await tween(600, (t) => {
          piece!.rotation.y = t * Math.PI * 2;
          piece!.position.y = Math.sin(Math.PI * t) * 1.2;
        });
      } else if (e.type === 'gameWon') {
        this.onSound?.('win');
        this.dancing = [0, 1, 2, 3].map((i) => this.pieces.get(`${e.color}${i}`)!);
        this.confetti.burst(new THREE.Vector3(0, 0.5, 0));
        this.speak(this.dancing[0], pickLine(CHARACTERS[e.color].lines.win));
      } else if (e.type === 'turnForfeited') await sleep(400);
    }

    if (hadMovement) {
      await sleep(CAMERA_CONFIG.returnWaitMs);
      this.cameraState = 'RETURN';
      this.focus.set(0, 0, 0);
      this.cameraTargetPos.copy(this.initialCamPos);
    } else {
      this.focus.set(0, 0, 0);
    }
  }
}

/** One reusable confetti burst: fixed buffers, no per-frame allocation. */
class Confetti {
  readonly points: THREE.Points;
  private vel: Float32Array;
  private life = 0;
  constructor(private n = 200) {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) c.setHSL(Math.random(), 0.9, 0.6).toArray(col, i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.vel = new Float32Array(n * 3);
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.18, vertexColors: true }));
    this.points.visible = false;
    this.points.frustumCulled = false;
  }
  burst(at: THREE.Vector3) {
    const p = this.points.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.n; i++) {
      p[i * 3] = at.x; p[i * 3 + 1] = at.y + 0.5; p[i * 3 + 2] = at.z;
      this.vel[i * 3] = (Math.random() - 0.5) * 5;
      this.vel[i * 3 + 1] = 4 + Math.random() * 5;
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    this.life = 2.5;
    this.points.visible = true;
  }
  update(dt: number) {
    if (this.life <= 0) return;
    this.life -= dt;
    const attr = this.points.geometry.attributes.position;
    const p = attr.array as Float32Array;
    for (let i = 0; i < this.n * 3; i += 3) {
      this.vel[i + 1] -= 9.8 * dt;
      p[i] += this.vel[i] * dt;
      p[i + 1] = Math.max(0.02, p[i + 1] + this.vel[i + 1] * dt);
      p[i + 2] += this.vel[i + 2] * dt;
    }
    attr.needsUpdate = true;
    if (this.life <= 0) this.points.visible = false;
  }
}
