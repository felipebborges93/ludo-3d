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
  sphere: new THREE.SphereGeometry(1, 16, 12),
  cone: new THREE.ConeGeometry(1, 1, 14),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  capsule: new THREE.CapsuleGeometry(1, 1, 6, 14),
  torus: new THREE.TorusGeometry(1, 0.15, 8, 16),
  banana: new THREE.TorusGeometry(0.45, 0.16, 10, 16, Math.PI * 0.75),
};

const mats = new Map<number, THREE.MeshStandardMaterial>();
const m = (color: number) => {
  if (!mats.has(color)) {
    const isAvocadoRind = color === 0x2f6b2a;
    const isGold = color === 0xffc93c;
    const isEyeBlack = color === 0x111111;
    mats.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: isEyeBlack ? 0.12 : isGold ? 0.25 : isAvocadoRind ? 0.55 : 0.34,
        metalness: isGold ? 0.55 : 0.05,
      })
    );
  }
  return mats.get(color)!;
};

function part(g: THREE.BufferGeometry, color: number, pos: [number, number, number], scale: [number, number, number] | number, rot?: [number, number, number], shadow = true) {
  const mesh = new THREE.Mesh(g, m(color));
  mesh.position.set(...pos);
  typeof scale === 'number' ? mesh.scale.setScalar(scale) : mesh.scale.set(...scale);
  if (rot) mesh.rotation.set(...rot);
  mesh.castShadow = shadow;
  return mesh;
}

function eyes(y: number, z: number, spread = 0.09): THREE.Group {
  const e = new THREE.Group();
  for (const x of [-spread, spread]) {
    e.add(part(geo.sphere, 0xffffff, [x, 0, 0], 0.062));
    e.add(part(geo.sphere, 0x111111, [x, 0, 0.046], 0.032));
    // Cute anime/toy eye highlight glint
    e.add(part(geo.sphere, 0xffffff, [x + 0.012, 0.014, 0.072], 0.011));
  }
  e.position.set(0, y, z);
  e.name = 'eyes';
  return e;
}

function cheeks(y: number, z: number, spread = 0.14): THREE.Object3D[] {
  return [
    part(geo.sphere, 0xff8da1, [-spread, y, z], [0.038, 0.022, 0.02]),
    part(geo.sphere, 0xff8da1, [spread, y, z], [0.038, 0.022, 0.02]),
  ];
}

/** Head height per character, used to place accessories. */
const HEAD_Y: Record<Color, number> = { red: 0.72, blue: 0.82, green: 0.78, yellow: 0.92 };

function body(color: Color): THREE.Object3D[] {
  switch (color) {
    case 'red': // chicken (Dona Cocorina)
      return [
        part(geo.sphere, 0xfdf6ec, [0, 0.38, 0], [0.28, 0.32, 0.28]),
        part(geo.sphere, 0xfdf6ec, [0, 0.62, 0.04], 0.17),
        // Diva golden necklace
        part(geo.torus, 0xffc93c, [0, 0.51, 0.03], [0.16, 0.16, 0.14], [Math.PI / 2 + 0.15, 0, 0]),
        // Red comb on head
        part(geo.sphere, 0xe23b3b, [0, 0.8, 0.02], 0.06),
        part(geo.sphere, 0xe23b3b, [0, 0.79, -0.06], 0.05),
        part(geo.sphere, 0xe23b3b, [0, 0.77, 0.09], 0.045),
        // Beak and wattle
        part(geo.cone, 0xff9d1c, [0, 0.6, 0.2], [0.05, 0.11, 0.05], [Math.PI / 2, 0, 0]),
        part(geo.sphere, 0xe23b3b, [0, 0.53, 0.17], [0.032, 0.052, 0.032]),
        // Wings
        part(geo.sphere, 0xf0e6d6, [-0.27, 0.4, 0], [0.065, 0.16, 0.13], [0, 0, 0.18]),
        part(geo.sphere, 0xf0e6d6, [0.27, 0.4, 0], [0.065, 0.16, 0.13], [0, 0, -0.18]),
        // Tail feathers
        part(geo.cone, 0xfdf6ec, [0, 0.46, -0.26], [0.07, 0.16, 0.05], [-0.8, 0, 0]),
        part(geo.cone, 0xf0e6d6, [-0.06, 0.44, -0.25], [0.05, 0.13, 0.04], [-0.75, 0, 0.3]),
        part(geo.cone, 0xf0e6d6, [0.06, 0.44, -0.25], [0.05, 0.13, 0.04], [-0.75, 0, -0.3]),
        // Cute orange feet
        part(geo.sphere, 0xff9d1c, [-0.1, 0.09, 0.09], [0.07, 0.03, 0.1]),
        part(geo.sphere, 0xff9d1c, [0.1, 0.09, 0.09], [0.07, 0.03, 0.1]),
        ...cheeks(0.61, 0.17, 0.11),
        eyes(0.66, 0.15, 0.07),
      ];
    case 'blue': // penguin (Seu Gelinho)
      return [
        part(geo.capsule, 0x24365e, [0, 0.45, 0], [0.26, 0.22, 0.24]),
        part(geo.sphere, 0xffffff, [0, 0.42, 0.08], [0.2, 0.26, 0.18]),
        part(geo.cone, 0xff9d1c, [0, 0.62, 0.25], [0.05, 0.1, 0.05], [Math.PI / 2, 0, 0]),
        // Gentleman red bow-tie on chest
        part(geo.cone, 0xe84a4a, [-0.045, 0.54, 0.23], [0.035, 0.07, 0.025], [0, 0, Math.PI / 2]),
        part(geo.cone, 0xe84a4a, [0.045, 0.54, 0.23], [0.035, 0.07, 0.025], [0, 0, -Math.PI / 2]),
        part(geo.sphere, 0xc92a2a, [0, 0.54, 0.24], 0.022),
        // Flippers & feet
        part(geo.sphere, 0x24365e, [-0.26, 0.45, 0], [0.05, 0.18, 0.1], [0, 0, 0.3]),
        part(geo.sphere, 0x24365e, [0.26, 0.45, 0], [0.05, 0.18, 0.1], [0, 0, -0.3]),
        part(geo.sphere, 0xff9d1c, [-0.1, 0.09, 0.09], [0.08, 0.032, 0.11]),
        part(geo.sphere, 0xff9d1c, [0.1, 0.09, 0.09], [0.08, 0.032, 0.11]),
        ...cheeks(0.64, 0.21, 0.13),
        eyes(0.7, 0.2),
      ];
    case 'green': // avocado (Abelardo)
      return [
        part(geo.sphere, 0x2f6b2a, [0, 0.42, 0], [0.3, 0.42, 0.26]),
        part(geo.sphere, 0xc8e07a, [0, 0.4, 0.06], [0.25, 0.36, 0.22]),
        // Avocado pit + glossy highlight
        part(geo.sphere, 0x8a5a2b, [0, 0.34, 0.2], 0.125),
        part(geo.sphere, 0xb87d44, [0.035, 0.38, 0.29], [0.035, 0.025, 0.015]),
        // Cute leaf sprout on side of head
        part(geo.sphere, 0x4cd964, [0.16, 0.77, 0], [0.08, 0.03, 0.04], [0, 0, 0.55]),
        // Thoughtful zen eyebrows & feet
        part(geo.sphere, 0x111111, [-0.08, 0.67, 0.24], [0.045, 0.012, 0.01], [0, 0, 0.12]),
        part(geo.sphere, 0x111111, [0.08, 0.67, 0.24], [0.045, 0.012, 0.01], [0, 0, -0.12]),
        part(geo.sphere, 0x2f6b2a, [-0.1, 0.09, 0.06], [0.07, 0.035, 0.09]),
        part(geo.sphere, 0x2f6b2a, [0.1, 0.09, 0.06], [0.07, 0.035, 0.09]),
        ...cheeks(0.54, 0.25, 0.14),
        eyes(0.6, 0.24),
      ];
    case 'yellow': { // banana (Bananildo)
      const b = part(geo.banana, 0xf7d33c, [0.22, 0.48, 0], 1, [0, 0, Math.PI * 0.62]);
      return [
        b,
        // Peeled banana strips curving outward around waist
        part(geo.cone, 0xffe566, [-0.18, 0.34, 0.12], [0.06, 0.18, 0.03], [0.6, 0, 0.9]),
        part(geo.cone, 0xffe566, [0.14, 0.34, 0.12], [0.06, 0.18, 0.03], [0.6, 0, -0.9]),
        part(geo.cone, 0xffe566, [0, 0.32, -0.16], [0.06, 0.18, 0.03], [-0.8, 0, 0]),
        // Stem, bottom tip, and cute boots
        part(geo.cyl, 0x5a3d1e, [0.02, 0.98, 0], [0.05, 0.12, 0.05], [0, 0, -0.3]),
        part(geo.sphere, 0x5a3d1e, [0.2, 0.09, 0], 0.07),
        part(geo.sphere, 0xd97706, [-0.08, 0.09, 0.08], [0.07, 0.035, 0.09]),
        part(geo.sphere, 0xd97706, [0.08, 0.09, 0.08], [0.07, 0.035, 0.09]),
        ...cheeks(0.6, 0.16, 0.11),
        eyes(0.66, 0.14),
      ];
    }
  }
}

export const ACCESSORY_LABELS = ['🎩 Cartola', '🎀 Laço', '👑 Coroa', '🥳 Gorro'] as const;

function accessory(variant: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  if (variant === 0) {
    // Top hat with crimson ribbon band
    g.add(
      part(geo.cyl, 0x222222, [0, 0.12, 0], [0.13, 0.22, 0.13]),
      part(geo.cyl, 0xe84a4a, [0, 0.04, 0], [0.135, 0.04, 0.135]),
      part(geo.cyl, 0x222222, [0, 0.01, 0], [0.21, 0.02, 0.21])
    );
  }
  if (variant === 1) {
    // Pink ribbon bow with center knot
    g.add(
      part(geo.cone, 0xff6fb5, [-0.08, 0.02, 0], [0.065, 0.13, 0.065], [0, 0, Math.PI / 2]),
      part(geo.cone, 0xff6fb5, [0.08, 0.02, 0], [0.065, 0.13, 0.065], [0, 0, -Math.PI / 2]),
      part(geo.sphere, 0xff3d9a, [0, 0.02, 0.01], 0.038)
    );
  }
  if (variant === 2) {
    // Golden crown with ruby/sapphire gems
    g.add(part(geo.cyl, 0xffc93c, [0, 0.04, 0], [0.125, 0.08, 0.125]));
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      g.add(
        part(geo.cone, 0xffc93c, [Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1], [0.032, 0.085, 0.032]),
        part(geo.sphere, i % 2 === 0 ? 0xe84a4a : 0x3b7be8, [Math.cos(a) * 0.125, 0.04, Math.sin(a) * 0.125], 0.022)
      );
    }
  }
  if (variant === 3) {
    // Festive party cone hat with pom-pom and golden trim
    g.add(
      part(geo.cone, 0x9b59ff, [0, 0.13, 0], [0.115, 0.28, 0.115]),
      part(geo.torus, 0xffc93c, [0, 0.01, 0], [0.11, 0.11, 0.11], [Math.PI / 2, 0, 0]),
      part(geo.sphere, 0xffffff, [0, 0.29, 0], 0.048)
    );
  }
  g.position.y = y;
  return g;
}

/** Returns a rig group; 'eyes' child can be scaled for expressions. */
export function buildCharacter(color: Color, variant: number): THREE.Group {
  const rig = new THREE.Group();
  rig.add(...body(color), accessory(variant, HEAD_Y[color]));
  return rig;
}
