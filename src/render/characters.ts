import * as THREE from 'three';
import type { Color } from '../game/rules';

/** Character data + primitive models. Swap `buildCharacter` internals for .glb loads later. */
export const CHARACTERS: Record<Color, { name: string; lines: Record<'capture' | 'captured' | 'finish' | 'win' | 'enter', string[]> }> = {
  red: {
    name: 'Dona Cocorina',
    lines: {
      enter: ['Cheguei, queridos!', 'Abram alas para a diva!'],
      capture: ['Có-có-CAPTUREI!', 'Sai da minha passarela!'],
      captured: ['Ai, meu coração... *desmaia*', 'Que DRAMA! Que injustiça!'],
      finish: ['Obrigada, obrigada, sem fotos!', 'Uma estrela nasceu!'],
      win: ['Eu sempre soube que era a melhor!'],
    },
  },
  blue: {
    name: 'Seu Gelinho',
    lines: {
      enter: ['Com licença, por gentileza.', 'Bom dia a todos!'],
      capture: ['Mil perdões! Foi sem querer!', 'Desculpe o incômodo, viu?'],
      captured: ['Oh, compreendo. Justo.', 'Que gentil da sua parte...'],
      finish: ['Agradeço a hospitalidade!', 'Muito obrigado, tabuleiro.'],
      win: ['Foi uma honra jogar com vocês!'],
    },
  },
  green: {
    name: 'Abelardo',
    lines: {
      enter: ['Sair da base é nascer de novo.', 'Toda casa é um começo.'],
      capture: ['Quem captura é capturado pelo destino.', 'Voltar também é avançar.'],
      captured: ['A base... sempre foi o caminho?', 'Sou caroço, logo existo.'],
      finish: ['O destino era a jornada. Ou não.', 'Cheguei onde sempre estive.'],
      win: ['Vencer é só perder ao contrário.'],
    },
  },
  yellow: {
    name: 'Bananildo',
    lines: {
      enter: ['Opa, opa! Tô indo!', 'Ninguém viu nada!'],
      capture: ['Foi de propósito! ...Acho.', 'Escorreguei em você, foi mal!'],
      captured: ['Ai! Escorreguei de novo!', 'Quem botou essa casca aí?!'],
      finish: ['Cheguei inteiro! Quase.', 'Nem tropecei! ...Muito.'],
      win: ['BA-NA-NA! Campeão!'],
    },
  },
};

export const TRIP_LINES = ['Opa!', 'Uoou!', 'Tô bem! Tô bem!'];

export const pickLine = (list: string[]) => list[Math.floor(Math.random() * list.length)];

// Shared geometries/materials (reused across all pieces).
const geo = {
  sphere: new THREE.SphereGeometry(1, 14, 10),
  cone: new THREE.ConeGeometry(1, 1, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  capsule: new THREE.CapsuleGeometry(1, 1, 4, 12),
  torus: new THREE.TorusGeometry(1, 0.15, 6, 16),
  banana: new THREE.TorusGeometry(0.45, 0.16, 8, 14, Math.PI * 0.75),
};
const mats = new Map<number, THREE.MeshStandardMaterial>();
const m = (color: number) => {
  if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7 }));
  return mats.get(color)!;
};

function part(g: THREE.BufferGeometry, color: number, pos: [number, number, number], scale: [number, number, number] | number, rot?: [number, number, number]) {
  const mesh = new THREE.Mesh(g, m(color));
  mesh.position.set(...pos);
  typeof scale === 'number' ? mesh.scale.setScalar(scale) : mesh.scale.set(...scale);
  if (rot) mesh.rotation.set(...rot);
  mesh.castShadow = true;
  return mesh;
}

function eyes(y: number, z: number, spread = 0.09): THREE.Group {
  const e = new THREE.Group();
  for (const x of [-spread, spread]) {
    e.add(part(geo.sphere, 0xffffff, [x, 0, 0], 0.06));
    e.add(part(geo.sphere, 0x111111, [x, 0, 0.045], 0.03));
  }
  e.position.set(0, y, z);
  e.name = 'eyes';
  return e;
}

/** Head height per character, used to place accessories. */
const HEAD_Y: Record<Color, number> = { red: 0.72, blue: 0.82, green: 0.78, yellow: 0.92 };

function body(color: Color): THREE.Object3D[] {
  switch (color) {
    case 'red': // chicken
      return [
        part(geo.sphere, 0xfdf6ec, [0, 0.38, 0], [0.28, 0.32, 0.28]),
        part(geo.sphere, 0xfdf6ec, [0, 0.62, 0.04], 0.17),
        part(geo.sphere, 0xe23b3b, [0, 0.8, 0.02], 0.06), part(geo.sphere, 0xe23b3b, [0, 0.79, -0.06], 0.05),
        part(geo.sphere, 0xe23b3b, [0, 0.77, 0.09], 0.045),
        part(geo.cone, 0xff9d1c, [0, 0.6, 0.2], [0.05, 0.1, 0.05], [Math.PI / 2, 0, 0]),
        part(geo.sphere, 0xe23b3b, [0, 0.53, 0.17], [0.03, 0.05, 0.03]),
        part(geo.sphere, 0xf0e6d6, [-0.27, 0.4, 0], [0.06, 0.15, 0.12]), part(geo.sphere, 0xf0e6d6, [0.27, 0.4, 0], [0.06, 0.15, 0.12]),
        eyes(0.66, 0.15, 0.07),
      ];
    case 'blue': // penguin
      return [
        part(geo.capsule, 0x24365e, [0, 0.45, 0], [0.26, 0.22, 0.24]),
        part(geo.sphere, 0xffffff, [0, 0.42, 0.08], [0.2, 0.26, 0.18]),
        part(geo.cone, 0xff9d1c, [0, 0.62, 0.25], [0.05, 0.1, 0.05], [Math.PI / 2, 0, 0]),
        part(geo.sphere, 0x24365e, [-0.26, 0.45, 0], [0.05, 0.18, 0.1], [0, 0, 0.3]),
        part(geo.sphere, 0x24365e, [0.26, 0.45, 0], [0.05, 0.18, 0.1], [0, 0, -0.3]),
        part(geo.sphere, 0xff9d1c, [-0.1, 0.03, 0.08], [0.08, 0.03, 0.1]), part(geo.sphere, 0xff9d1c, [0.1, 0.03, 0.08], [0.08, 0.03, 0.1]),
        eyes(0.7, 0.2),
      ];
    case 'green': // avocado
      return [
        part(geo.sphere, 0x2f6b2a, [0, 0.42, 0], [0.3, 0.42, 0.26]),
        part(geo.sphere, 0xc8e07a, [0, 0.4, 0.06], [0.25, 0.36, 0.22]),
        part(geo.sphere, 0x8a5a2b, [0, 0.34, 0.2], 0.12),
        part(geo.sphere, 0x111111, [0, 0.55, 0.27], [0.05, 0.015, 0.01]), // thoughtful eyebrow line
        eyes(0.6, 0.24),
      ];
    case 'yellow': { // banana
      const b = part(geo.banana, 0xf7d33c, [0.22, 0.48, 0], 1, [0, 0, Math.PI * 0.62]);
      return [
        b,
        part(geo.cyl, 0x5a3d1e, [0.02, 0.98, 0], [0.05, 0.12, 0.05], [0, 0, -0.3]),
        part(geo.sphere, 0x5a3d1e, [0.2, 0.02, 0], 0.07),
        eyes(0.66, 0.14),
      ];
    }
  }
}

export const ACCESSORY_LABELS = ['🎩 Cartola', '🎀 Laço', '👑 Coroa', '🥳 Gorro'] as const;

function accessory(variant: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  if (variant === 0) g.add(part(geo.cyl, 0x222222, [0, 0.12, 0], [0.13, 0.22, 0.13]), part(geo.cyl, 0x222222, [0, 0.01, 0], [0.2, 0.02, 0.2]));
  if (variant === 1) g.add(part(geo.cone, 0xff6fb5, [-0.08, 0.02, 0], [0.06, 0.12, 0.06], [0, 0, Math.PI / 2]), part(geo.cone, 0xff6fb5, [0.08, 0.02, 0], [0.06, 0.12, 0.06], [0, 0, -Math.PI / 2]));
  if (variant === 2) {
    g.add(part(geo.cyl, 0xffc93c, [0, 0.04, 0], [0.12, 0.08, 0.12]));
    for (let i = 0; i < 4; i++) g.add(part(geo.cone, 0xffc93c, [Math.cos(i * 1.57) * 0.1, 0.12, Math.sin(i * 1.57) * 0.1], [0.03, 0.08, 0.03]));
  }
  if (variant === 3) g.add(part(geo.cone, 0x9b59ff, [0, 0.13, 0], [0.11, 0.28, 0.11]), part(geo.sphere, 0xffffff, [0, 0.29, 0], 0.04));
  g.position.y = y;
  return g;
}

/** Returns a rig group; 'eyes' child can be scaled for expressions. */
export function buildCharacter(color: Color, variant: number): THREE.Group {
  const rig = new THREE.Group();
  rig.add(...body(color), accessory(variant, HEAD_Y[color]));
  return rig;
}
