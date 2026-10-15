---
last_mapped_commit: d3c2c30333a6a2903596f2bf0409282661dfc173
last_mapped_at: 2026-10-15
---
# Technology Stack

**Analysis Date:** 2026-10-15

## Languages

**Primary:**

- TypeScript 5.x / 7.x (`typescript@^7.0.2` in `package.json`, configured in `tsconfig.json`) - Game engine, rendering, AI bots, cards system, networking, and UI glue.

**Secondary:**

- HTML5 / CSS3 - Document structure in `index.html` and UI styling in `src/ui/style.css`.

## Runtime

**Environment:**

- Browser / Modern Web standards (ES Modules, Web Audio API, WebRTC DataChannels).
- Node.js (v18+) for local development, build tooling, and test runners.

**Package Manager:**

- npm
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**

- Three.js (`three@^0.186.1` and `@types/three@^0.186.0`) - 3D scene rendering, procedural geometries, camera, OrbitControls, and piece animations in `src/render/scene.ts`.

**Testing:**

- Vitest (`vitest@^5.0.4`) - Unit test framework for game logic, card mechanics, and bot heuristics (`src/game/engine.test.ts`, `src/game/cards/cards.test.ts`, `src/ai/bot.test.ts`).

**Build/Dev:**

- Vite (`vite@^8.3.4`) - Local development server and asset bundling.
- tsx (`npx tsx`) - Direct TypeScript execution for headless simulation scripts (`scripts/simulate.ts`).

## Key Dependencies

**Critical:**

- `three` (`^0.186.1`) - Powers the 3D board, characters, and particle effects.
- `peerjs` (`^1.5.5`) - WebRTC peer-to-peer data channels for zero-backend multiplayer (`src/net/network.ts`).

**Infrastructure:**

- `typescript` (`^7.0.2`) - Type checking and compilation (`tsc --noEmit`).

## Configuration

**Environment:**

- No server-side environment variables required; game runs fully client-side.

**Build:**

- `tsconfig.json` - Compiler options targeting modern browsers (`target: "ES2022"`, `moduleResolution: "bundler"`, `strict: true`).
- `vercel.json` - Deployment routing configuration for static hosting.

## Platform Requirements

**Development:**

- Node.js 18+ and npm.

**Production:**

- Any static hosting provider (e.g., Vercel, GitHub Pages). Capable of running in modern mobile and desktop browsers with WebGL and Web Audio API support.

---

*Stack analysis: 2026-10-15*
