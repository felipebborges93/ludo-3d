import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GameEvent } from '../game/engine';
import { BASE, Color, DEFAULT_RULES } from '../game/rules';
import { BASE_ORIGIN, Cell, HOME_COL, TRACK, tokenCell } from './layout';
import { buildCharacter, CHARACTERS, pickLine, TRIP_LINES } from './characters';

export const HEX: Record<Color, number> = { red: 0xe84a4a, green: 0x3dbb5c, yellow: 0xf5c518, blue: 0x3b7be8 };

const world = (c: Cell, y = 0) => new THREE.Vector3(c[0] - 7, y, c[1] - 7);
const mat = (color: number) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7 });
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
    case 'green': return new THREE.SphereGeometry(0.13, 10, 8);
    case 'yellow': return new THREE.BoxGeometry(0.22, 0.22, 0.22);
    case 'blue': return new THREE.OctahedronGeometry(0.16);
  }
}

const baseGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.06, 16);
const iconGeos = new Map<Color, THREE.BufferGeometry>();
const iconMat = mat(0xffffff);

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
  const base = new THREE.Mesh(baseGeo, mat(HEX[color]));
  base.position.y = 0.03;
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
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#222';
  const pips: Record<number, Cell[]> = {
    1: [[32, 32]], 2: [[16, 16], [48, 48]], 3: [[16, 16], [32, 32], [48, 48]],
    4: [[16, 16], [48, 16], [16, 48], [48, 48]], 5: [[16, 16], [48, 16], [32, 32], [16, 48], [48, 48]],
    6: [[16, 14], [48, 14], [16, 32], [48, 32], [16, 50], [48, 50]],
  };
  for (const [px, py] of pips[n]) { x.beginPath(); x.arc(px, py, 6, 0, Math.PI * 2); x.fill(); }
  return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c) });
}

// Box face order: +x, -x, +y, -y, +z, -z. Rotation that brings each value to +y.
const DICE_FACES = [3, 4, 1, 6, 2, 5];
const DICE_UP: Record<number, [number, number]> = {
  1: [0, 0], 6: [Math.PI, 0], 2: [-Math.PI / 2, 0], 5: [Math.PI / 2, 0], 3: [0, Math.PI / 2], 4: [0, -Math.PI / 2],
};

function createWoodTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Warm wood base
  ctx.fillStyle = '#b87c44';
  ctx.fillRect(0, 0, 512, 512);

  // Planks
  const plankHeight = 64;
  for (let y = 0; y < 512; y += plankHeight) {
    // Subtle plank color variance
    const shade = (Math.random() - 0.5) * 15;
    ctx.fillStyle = `rgba(${Math.floor(184 + shade)}, ${Math.floor(124 + shade * 0.7)}, ${Math.floor(68 + shade * 0.4)}, 0.4)`;
    ctx.fillRect(0, y, 512, plankHeight);

    // Plank seam lines
    ctx.strokeStyle = 'rgba(70, 40, 18, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    // Wood grain streaks
    for (let i = 0; i < 18; i++) {
      const gy = y + Math.random() * plankHeight;
      ctx.strokeStyle = 'rgba(95, 52, 22, 0.12)';
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(170, gy + (Math.random() - 0.5) * 6, 340, gy + (Math.random() - 0.5) * 6, 512, gy);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.needsUpdate = true;
  return tex;
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
  /** Called with screen coords when a character speaks; UI draws the bubble. */
  onSpeak?: (text: string, x: number, y: number) => void;
  /** Called when sound effects should play. Keeps render decoupled from audio. */
  onSound?: (name: 'hop' | 'trip' | 'capture' | 'finish' | 'win' | 'dice') => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.scene.background = new THREE.Color(0x2a1c14);
    this.camera.position.set(0, 16, 13);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enablePan: false, minDistance: 10, maxDistance: 32, maxPolarAngle: Math.PI / 2.35, enableDamping: true });

    this.scene.add(new THREE.HemisphereLight(0xfff1e0, 0x5a4030, 1.8));
    const sun = new THREE.DirectionalLight(0xfffaed, 1.8);
    sun.position.set(6, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
    this.scene.add(sun);

    this.buildBoard();
    this.dice = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), DICE_FACES.map(diceFace));
    this.dice.castShadow = true;
    this.dice.position.set(0, 0.6, 0);
    this.scene.add(this.dice, this.confetti.points);

    addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private buildBoard() {
    // Large tabletop taking up the entire background view
    const woodTex = createWoodTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.65,
      metalness: 0.05,
    });
    const table = new THREE.Mesh(new THREE.BoxGeometry(70, 0.6, 70), tableMat);
    table.position.y = -0.4;
    table.receiveShadow = true;
    this.scene.add(table);

    // Board wood frame/border
    const boardBorder = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 16), mat(0x945f34));
    boardBorder.position.y = -0.15;
    boardBorder.receiveShadow = true;
    this.scene.add(boardBorder);

    const tileGeo = new THREE.BoxGeometry(0.94, 0.1, 0.94);
    const tile = (c: Cell, color: number) => {
      const m = new THREE.Mesh(tileGeo, mat(color));
      m.position.copy(world(c, -0.05));
      m.receiveShadow = true;
      this.scene.add(m);
    };
    const starts = [0, 13, 26, 39];
    const colors: Color[] = ['red', 'green', 'yellow', 'blue'];
    TRACK.forEach((c, i) => {
      const si = starts.indexOf(i);
      tile(c, si >= 0 ? HEX[colors[si]] : 0xffffff);
      if (si < 0 && DEFAULT_RULES.safeSquares.includes(i)) {
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mat(0xbbbbbb));
        star.scale.y = 0.3;
        star.position.copy(world(c, 0.03));
        this.scene.add(star);
      }
    });
    for (const color of colors) {
      HOME_COL[color].forEach((c) => tile(c, HEX[color]));
      const o = BASE_ORIGIN[color];
      const base = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.1, 5.9), mat(HEX[color]));
      base.position.copy(world([o[0] + 2.5, o[1] + 2.5], -0.05));
      const inner = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 3.8), mat(0xffffff));
      inner.position.copy(world([o[0] + 2.5, o[1] + 2.5], -0.04));
      this.scene.add(base, inner);
      for (let t = 0; t < 4; t++) {
        const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16), mat(HEX[color]));
        spot.position.copy(world(tokenCell(color, BASE, t), -0.03));
        this.scene.add(spot);
      }
    }
    // Center goal: four triangles pointing inward.
    const tri: Record<Color, Cell[]> = {
      red: [[-1.5, -1.5], [-1.5, 1.5]], green: [[-1.5, -1.5], [1.5, -1.5]],
      yellow: [[1.5, -1.5], [1.5, 1.5]], blue: [[-1.5, 1.5], [1.5, 1.5]],
    };
    for (const color of colors) {
      const [a, b] = tri[color];
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(a[0], -a[1]), new THREE.Vector2(b[0], -b[1])]);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), mat(HEX[color]));
      m.rotation.x = -Math.PI / 2;
      m.position.y = -0.1;
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
    if (!this.isZoomed) this.camera.position.copy(this.initialCamPos);
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
    this.controls.target.lerp(this.focus, 0.08);

    // Dynamic zoom in/out:
    // When zoomed: smoothly move camera close in front of character
    // When unzoomed: smoothly glide camera back to exact initial starting position and target
    if (this.isZoomed) {
      this.camera.position.lerp(this.zoomCamPos, 0.09);
    } else {
      this.camera.position.lerp(this.initialCamPos, 0.08);
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
    await tween(170, (t) => {
      piece.position.lerpVectors(from, to, t);
      piece.position.y = Math.sin(Math.PI * t) * 0.6;
      piece.scale.set(1, 1 + Math.sin(Math.PI * t) * 0.25, 1); // stretch in air
    });
    await tween(80, (t) => piece.scale.set(1 + Math.sin(Math.PI * t) * 0.2, 1 - Math.sin(Math.PI * t) * 0.3, 1 + Math.sin(Math.PI * t) * 0.2));
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
    for (const e of events) {
      const piece = 'token' in e ? this.pieces.get(`${e.color}${e.token}`)! : null;
      if (e.type === 'diceRolled') await this.rollDice(e.value);
      else if (e.type === 'tokenMoved') {
        mover = piece!;
        this.isZoomed = true;
        // Position camera closer (distance ~2.0 units) directly in front of the character's face
        this.zoomCamPos.set(piece!.position.x, piece!.position.y + 1.0, piece!.position.z + 1.8);
        // Bananildo trips on a random hop now and then (cosmetic only).
        const trip = e.color === 'yellow' && Math.random() < 0.3 ? Math.floor(Math.random() * e.path.length) : -1;
        for (let i = 0; i < e.path.length; i++) {
          const dest = world(tokenCell(e.color, e.path[i], e.token));
          this.focus.set(dest.x, dest.y + 0.6, dest.z);
          this.zoomCamPos.set(dest.x, dest.y + 1.0, dest.z + 1.8);
          await this.hop(piece!, dest);
          if (i === trip) {
            this.onSound?.('trip');
            this.speak(piece!, pickLine(TRIP_LINES));
            await this.tilt(piece!, 'x', 1.1, 250);
          }
        }
        if (e.path.length === 1 && e.path[0] === 0 && Math.random() < 0.5) this.speak(piece!, pickLine(CHARACTERS[e.color].lines.enter));
        await sleep(350);
        this.isZoomed = false;
        this.focus.set(0, 0, 0);
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
    this.focus.set(0, 0, 0);
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
