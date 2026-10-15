---
last_mapped_commit: d3c2c30333a6a2903596f2bf0409282661dfc173
last_mapped_at: 2026-10-15
---
<!-- refreshed: 2026-10-15 -->

# Architecture

**Analysis Date:** 2026-10-15

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                         Presentation                        │
├───────────────────────────────┬─────────────────────────────┤
│         3D Renderer           │          DOM HUD            │
│      `src/render/scene.ts`    │     `src/ui/hud.ts`         │
└───────────────▲───────────────┴──────────────▲──────────────┘
                │                              │
                └──────────────┬───────────────┘
                               │ (events / state)
┌──────────────────────────────┴──────────────────────────────┐
│                    Application Glue                         │
│                    `src/main.ts`                            │
├──────────────────────────────┬──────────────────────────────┤
│       WebRTC Networking      │         AI / Bot             │
│     `src/net/network.ts`     │      `src/ai/bot.ts`         │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │ (actions)                    │ (actions)
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pure Game Engine                         │
│                  `src/game/engine.ts`                       │
├──────────────────────────────┬──────────────────────────────┤
│         Core Rules           │         Cards System         │
│     `src/game/rules.ts`      │   `src/game/cards/effects.ts`│
│      `src/game/rng.ts`       │   `src/game/cards/deck.ts`   │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Game Engine | Pure functional rule evaluation, transitions, deterministic RNG | `src/game/engine.ts` |
| Rules Config | Constant board dimensions, starting points, tracks, variants | `src/game/rules.ts` |
| Cards System | Card definitions, probabilities, draw piles, and pure effect reducers | `src/game/cards/effects.ts`, `src/game/cards/deck.ts` |
| Bot AI | Heuristic state evaluation and move selection without rule duplication | `src/ai/bot.ts` |
| 3D Scene | Three.js rendering, camera control, character rigs, hop/trip tweens | `src/render/scene.ts` |
| Characters | Procedural geometries for Dona Cocorina, Abelardo, Bananildo, Seu Gelinho | `src/render/characters.ts` |
| Layout | Mapping logical token track positions to 3D grid cell coordinates | `src/render/layout.ts` |
| Audio System | Procedural Web Audio API sound effects and pentatonic BGM | `src/audio/sound.ts` |
| Network | Host-authoritative WebRTC multiplayer sync and room management | `src/net/network.ts` |
| UI HUD | DOM controls, player slot selection, dialogs, cards hand, and game log | `src/ui/hud.ts` |
| Main Glue | Event loop, wiring user inputs and bot triggers to engine actions | `src/main.ts` |

## Pattern Overview

**Overall:** Unidirectional Data Flow with Pure Reducer Architecture and Authoritative State Machine.

**Key Characteristics:**

- Strict decoupling: `src/game` has zero dependencies on DOM or Three.js.
- State is immutable plain data; `apply(state, action)` returns `{ state: GameState, events: GameEvent[] }`.
- Host-authoritative multiplayer: The host peer runs the authoritative engine and broadcasts state snapshots with event logs.

## Layers

**Pure Rules Layer (`src/game`):**

- Purpose: Execute game logic deterministically based on seed and player actions.
- Location: `src/game/`
- Contains: Types, state transitions, card decks, rules configuration.
- Depends on: Internal math and deterministic PRNG (`src/game/rng.ts`).
- Used by: `src/main.ts`, `src/ai/bot.ts`, `src/net/network.ts`, simulation scripts.

**AI Layer (`src/ai`):**

- Purpose: Simulate prospective moves using `apply()` and score resultant states.
- Location: `src/ai/`
- Contains: Heuristic evaluation functions for Easy, Medium, and Hard difficulty.
- Depends on: `src/game/engine.ts`, `src/game/rules.ts`.
- Used by: `src/main.ts`, `src/net/network.ts`, `scripts/simulate.ts`.

**Presentation Layer (`src/render`, `src/ui`, `src/audio`):**

- Purpose: Render 3D board visuals, play synthesized audio, and provide 2D UI touchpoints.
- Location: `src/render/`, `src/ui/`, `src/audio/`
- Contains: Three.js meshes, HTML elements, Web Audio nodes.
- Depends on: `three`, DOM APIs.
- Used by: `src/main.ts`.

## Data Flow

### Primary Request Path (Player Move)

1. User clicks piece on 3D canvas or DOM choice button (`src/main.ts:80-120`).
2. Dispatch action `{ type: 'move', token }` to `apply(state, action)` (`src/game/engine.ts`).
3. Engine returns updated immutable `GameState` and an array of `GameEvent`s.
4. If online host, broadcast `{ type: 'sync', state, events }` to connected peers (`src/net/network.ts`).
5. `src/main.ts` triggers visual playback in `scene.applyEvent()` (`src/render/scene.ts`) and plays sounds in `sound.*` (`src/audio/sound.ts`).

### Secondary Flow (Multiplayer Peer Sync)

1. Client peer receives action request or host sends state sync (`src/net/network.ts:160-220`).
2. Client adopts synced `GameState` and feeds `events` to the renderer.

**State Management:**

- Single source of truth in `state: GameState | null` in `src/main.ts`.

## Key Abstractions

**GameState & GameEvent:**

- Purpose: Data contract defining full board snapshot and change deltas.
- Examples: `src/game/engine.ts`.
- Pattern: Reducer / Event Sourcing-inspired event list.

**CardDefinition:**

- Purpose: Declarative card specification (type, timing, cost, eligibility, effect function).
- Examples: `src/game/cards/types.ts`, `src/game/cards/effects.ts`.
- Pattern: Strategy Pattern.

## Entry Points

**Web Application Entry:**

- Location: `src/main.ts` (loaded via `<script type="module" src="/src/main.ts">` in `index.html`).
- Triggers: Browser page load.
- Responsibilities: Initializes Three.js canvas, wires DOM HUD events, handles URL query params (`?room=ABCD`), manages game loop.

**Simulation Script Entry:**

- Location: `scripts/simulate.ts`.
- Triggers: CLI execution (`npx tsx scripts/simulate.ts`).
- Responsibilities: Runs batch simulated games headlessly and outputs `balance_report.csv`.

## Architectural Constraints

- **DOM/3D isolation:** Rules in `src/game` must NEVER import `three` or touch DOM.
- **Single-threaded Event Loop:** Async visual animations (tweens) hold a `busy = true` lock in `src/main.ts` so new actions are queued/disabled until animations complete.
- **RNG Determinism:** All game randomness must pass through `nextRandom(seed)` in `src/game/rng.ts`.

## Error Handling

**Strategy:**

- Validations are preventive: `legalMoves(state)` and `canPlay(state, player)` check feasibility before actions can be issued.
- If an illegal move is dispatched, `apply()` safely returns the original state without state corruption.

---

*Architecture analysis: 2026-10-15*
