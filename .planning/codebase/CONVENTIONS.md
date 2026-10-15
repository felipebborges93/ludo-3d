---
last_mapped_commit: d3c2c30333a6a2903596f2bf0409282661dfc173
last_mapped_at: 2026-10-15
---
# Coding Conventions

**Analysis Date:** 2026-10-15

## Naming Patterns

**Files:**

- Lowercase with dots for roles: `engine.ts`, `engine.test.ts`, `deck.config.ts`.

**Functions:**

- camelCase for functions and methods: `createGame()`, `legalMoves()`, `chooseMove()`, `applyEffect()`.
- Prefix `is` or `has` for booleans: `isHost`, `hasActiveToken`.

**Variables:**

- camelCase: `turnCount`, `myColor`, `activeShields`.
- UPPER_SNAKE_CASE for constants: `BASE`, `GOAL`, `TRACK_LEN`, `DEFAULT_RULES`, `HEX`.

**Types & Interfaces:**

- PascalCase: `GameState`, `GameEvent`, `Action`, `CardDefinition`, `RoomState`.

## Code Style

**Formatting:**

- Modern standard TypeScript, 2-space indentation.
- Single quotes for strings (`'red'`, `'move'`).

**Language and Localization:**

- **Code, types, and comments:** English (`src/game/engine.ts`, `src/render/scene.ts`).
- **User-facing UI text, dialogues, character names:** Brazilian Portuguese (`src/ui/hud.ts`, `src/render/characters.ts`).

## Import Organization

**Order:**

1. External npm libraries (`three`, `peerjs`).
2. Internal core types and rules (`../game/engine`, `../game/rules`).
3. Subsystem helpers and components (`./characters`, `./layout`).
4. CSS stylesheets (`./ui/style.css`).

**Path Aliases:**

- Relative paths are used throughout (`../game/engine`, `./render/scene`).

## Error Handling

**Patterns:**

- Pure functions return fallback or no-op states rather than throwing uncaught exceptions.
- Actions are validated prior to execution using selector functions: `legalMoves()`, `canPlay()`.
- Optional fields and null checks using modern optional chaining (`state.activeShields?.[player]`).

## Logging

**Framework:**

- In-game game log via DOM (`ui.gameLog` in `src/ui/hud.ts`).
- Debug info restricted or omitted in production (`debug: 0` in PeerJS).

## Comments

**When to Comment:**

- Clear JSDoc/TSDoc for public interfaces and complex calculations (e.g. `attackDistance()`, `scoreState()`).
- Deliberate temporary shortcuts are marked with `// ponytail:` indicating the limit and future upgrade path (e.g., in `src/render/layout.ts`).

## Function Design

**Size:**

- Small, focused functions. Engine transformations structured as pure reducer handlers.

**Immutability:**

- Pure state reducers create a deep copy using `structuredClone(state)` or return a fresh state object with explicit properties rather than mutating incoming arguments.

---

*Convention analysis: 2026-10-15*
