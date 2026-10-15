---
last_mapped_commit: d3c2c30333a6a2903596f2bf0409282661dfc173
last_mapped_at: 2026-10-15
---
# Testing Patterns

**Analysis Date:** 2026-10-15

## Test Framework

**Runner:**

- Vitest (`vitest@^5.0.4`)
- Config: Auto-discovered by Vite / default configuration

**Assertion Library:**

- Vitest built-in assertions (`describe`, `it`, `expect`)

**Run Commands:**

```bash
npm test              # Run all tests once
npx vitest            # Watch mode
```

## Test File Organization

**Location:**

- Co-located with their respective source code modules:
  - `src/game/engine.test.ts`
  - `src/game/cards/cards.test.ts`
  - `src/ai/bot.test.ts`

**Naming:**

- `*.test.ts`

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect } from 'vitest';
import { createGame, apply } from './engine';

describe('Game Engine', () => {
  it('moves token out of base on 6', () => {
    const s0 = createGame(['red', 'green'], 42);
    const { state: s1 } = apply(s0, { type: 'roll', forced: 6 });
    const { state: s2 } = apply(s1, { type: 'move', token: 0 });
    expect(s2.tokens['red'][0]).toBe(0);
  });
});
```

**Patterns:**

- Deterministic tests using forced rolls (`forced: 6`) or predictable RNG seeds.
- Verifying both state mutations and emitted `GameEvent` list.

## Mocking

**Approach:**

- Pure functions require minimal to no mocking.
- Seeded pseudo-random generator allows complete predictability in tests without mocking Math.random.

## Fixtures and Factories

**Test State Generation:**

- Initialized using factory functions: `createGame(['red', 'green'], 12345)`.

## Coverage

**Requirements:**

- High coverage on core rules (`src/game/engine.ts`), card effects (`src/game/cards/effects.ts`), and bot heuristics (`src/ai/bot.ts`).
- 26 tests across 3 test suites currently pass in ~500ms.

## Test Types

**Unit Tests:**

- Core engine movement, captures, safe squares, lap completions, winner checks.
- Card draw mechanics, card hand limits, card play conditions, effect applications.
- Bot heuristic scoring and strategic move choices.

**Simulation Tests:**

- Headless simulation of 10,000 matches via `scripts/simulate.ts` validating win-rate distribution, game length, and balance across colors.

---

*Testing analysis: 2026-10-15*
