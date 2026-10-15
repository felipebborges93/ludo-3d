---
last_mapped_commit: d3c2c30333a6a2903596f2bf0409282661dfc173
last_mapped_at: 2026-10-15
---
# Codebase Structure

**Analysis Date:** 2026-10-15

## Directory Layout

```
.
├── .planning/                  # Project management & codebase intelligence
│   └── codebase/               # GSD codebase maps
├── dist/                       # Production build output
├── scripts/                    # Headless balance simulation scripts
│   ├── balance_report.csv      # CSV output of simulation metrics
│   └── simulate.ts             # 10k game balance simulator
├── src/                        # Application source code
│   ├── ai/                     # Bot decision heuristics
│   │   ├── bot.test.ts         # Bot unit tests
│   │   └── bot.ts              # Easy / Medium / Hard bot algorithms
│   ├── audio/                  # Web Audio synthesizer
│   │   └── sound.ts            # Procedural sound effects and BGM
│   ├── game/                   # Pure game engine & rules
│   │   ├── cards/              # Card subsystem
│   │   │   ├── cards.test.ts   # Card logic tests
│   │   │   ├── deck.config.ts  # Card definitions registry & draw weights
│   │   │   ├── deck.ts         # Shuffling, drawing, discarding
│   │   │   ├── effects.ts      # Pure effect reducer implementations
│   │   │   └── types.ts        # Card TypeScript interfaces
│   │   ├── engine.test.ts      # Core rules and movement tests
│   │   ├── engine.ts           # State machine, legal moves, apply()
│   │   ├── rng.ts              # Seeded pseudo-random number generator
│   │   └── rules.ts            # Board constants, tracks, rules config
│   ├── net/                    # P2P WebRTC networking
│   │   └── network.ts          # PeerJS connection & room management
│   ├── render/                 # Three.js 3D presentation
│   │   ├── characters.ts       # Character rigs & accessory attachments
│   │   ├── layout.ts           # 2D cell coordinate mappings
│   │   └── scene.ts            # Three.js scene, camera, lights, animations
│   ├── ui/                     # 2D DOM HUD & Menus
│   │   ├── bubble.ts           # Speech bubble rendering
│   │   ├── hud.ts              # HUD element selectors & state binding
│   │   └── style.css           # UI layout and styling
│   └── main.ts                 # Orchestration glue & application entry point
├── AGENTS.md                   # Project design guidelines & conventions
├── index.html                  # HTML entry point and HUD markup
├── package.json                # Dependencies and script definitions
├── README.md                   # User documentation and guide
├── tsconfig.json               # TypeScript compiler configuration
└── vercel.json                 # Vercel deployment configuration
```

## Directory Purposes

**`src/game/`:**

- Purpose: Core game rules and state transformations.
- Contains: Types, constants, math, pure state machine.
- Key files: `src/game/engine.ts`, `src/game/rules.ts`, `src/game/rng.ts`.

**`src/game/cards/`:**

- Purpose: Special cards subsystem (Luck and Bad Luck squares).
- Contains: Card configurations, draw logic, effect handlers.
- Key files: `src/game/cards/effects.ts`, `src/game/cards/deck.config.ts`.

**`src/render/`:**

- Purpose: Three.js 3D board, piece models, and animation tweens.
- Contains: Mesh generators, character rigs, particle systems.
- Key files: `src/render/scene.ts`, `src/render/characters.ts`, `src/render/layout.ts`.

**`src/ai/`:**

- Purpose: Bot decision making.
- Contains: Strategic scoring, move simulation, card play AI.
- Key files: `src/ai/bot.ts`.

**`src/net/`:**

- Purpose: Zero-backend peer-to-peer multiplayer.
- Contains: WebRTC room state, message serialization, turn timers.
- Key files: `src/net/network.ts`.

**`src/audio/`:**

- Purpose: Web Audio API sound generator.
- Contains: Procedural synthesizers for dice rolls, hops, captures, victory fanfare.
- Key files: `src/audio/sound.ts`.

**`src/ui/`:**

- Purpose: DOM interface and speech bubbles.
- Contains: CSS styles and DOM bindings.
- Key files: `src/ui/hud.ts`, `src/ui/style.css`, `src/ui/bubble.ts`.

## Key File Locations

**Entry Points:**

- `src/main.ts`: Main client application loop and DOM event wiring.
- `index.html`: Canvas container and HUD layout.
- `scripts/simulate.ts`: Headless simulation CLI.

**Configuration:**

- `src/game/rules.ts`: Core rules configuration (`DEFAULT_RULES`).
- `src/game/cards/deck.config.ts`: Card probabilities and deck weights.
- `tsconfig.json`: TypeScript options.

**Core Logic:**

- `src/game/engine.ts`: Core game loop rules and event generation.

**Testing:**

- `src/game/engine.test.ts`: Engine tests.
- `src/game/cards/cards.test.ts`: Card tests.
- `src/ai/bot.test.ts`: Bot AI tests.

## Naming Conventions

**Files:**

- Kebab-case or dot-notation for modules: `deck.config.ts`, `engine.test.ts`.
- Single nouns or verbs: `scene.ts`, `sound.ts`, `network.ts`.

**Directories:**

- Lowercase single words: `game`, `render`, `ai`, `audio`, `net`, `ui`.

## Where to Add New Code

**New Card:**

- Implementation: Add definition and reducer to `src/game/cards/effects.ts`.
- Registration: Register card in `src/game/cards/deck.config.ts`.
- Tests: Add unit tests in `src/game/cards/cards.test.ts`.

**New Rule Variant:**

- Flag: Add property to `RulesConfig` interface and `DEFAULT_RULES` in `src/game/rules.ts`.
- Logic: Handle flag in `src/game/engine.ts`.
- Tests: Add test case in `src/game/engine.test.ts`.

**New 3D Model / Character:**

- Mesh / Rig: Extend `src/render/characters.ts` or swap `createPiece()` in `src/render/scene.ts`.

**New SFX:**

- Synthesizer: Add synthesis method to `SoundSystem` in `src/audio/sound.ts`.

---

*Structure analysis: 2026-10-15*
