# AGENTS.md — Ludo 3D conventions

## Stack
Three.js + TypeScript + Vite. Vitest for game logic. No backend. HUD is plain HTML/CSS.

## Layout
- `src/game` — pure rules. **Never import Three.js or DOM here.** State is plain data; `apply(state, action)` returns `{ state, events }`. Randomness only via seeded `rng.ts`.
- `src/render` — 3D scene. Only reacts to `GameEvent`s and reads state. **No rule logic here.** `layout.ts` maps token progress to board cells.
- `src/ui` — HUD/menu (DOM).
- `src/ai` — bots (phase 3). Must use `game/engine` to simulate, never duplicate rules.
- `src/audio` — Web Audio SFX/music (phase 4).
- `src/main.ts` — glue: UI input -> engine action -> scene playback.

## Rules
All variants live in `RulesConfig` (`src/game/rules.ts`). Add a flag there instead of branching elsewhere.

## Conventions
- UI text in Brazilian Portuguese; code and comments in English.
- Keep dependencies minimal (`three` only at runtime). Prefer primitives; `createPiece` in `render/scene.ts` is the swap point for `.glb` models.
- Every rule change gets a test in `src/game/*.test.ts`.
- Target 60 fps on mid-range phones: cap pixel ratio at 2, reuse geometries, avoid per-frame allocations.
- Mark deliberate shortcuts with `// ponytail:` naming the limit and upgrade path.

## Commands
`npm run dev` · `npm test` · `npm run build`
