---
last_mapped_commit: d3c2c30333a6a2903596f2bf0409282661dfc173
last_mapped_at: 2026-10-15
---
# Codebase Concerns

**Analysis Date:** 2026-10-15

## Tech Debt

**Token Stacking in 3D Layout:**

- Issue: Multiple pieces on the exact same square are offset by a fixed static value rather than an adaptive radial or tiered stack.
- Files: `src/render/layout.ts:41`
- Impact: In rare occurrences of multiple safe-square sharing or board congestion, visual stacking can clip slightly.
- Fix approach: Implement dynamic circular or cluster layout for cells with >2 tokens (`// ponytail: fixed per-token offset so stacked tokens stay visible; real stacking layout later if needed`).

**Main File Orchestration Scope:**

- Issue: `src/main.ts` contains 566 lines acting as glue for UI, online networking callbacks, 3D animations, bot timers, and input handlers.
- Files: `src/main.ts`
- Impact: High cognitive load when altering interaction glue.
- Fix approach: Extract HUD controller and multiplayer orchestration into focused controller services.

## Known Bugs

- None identified; all 26 vitest tests and TypeScript compilations pass without warnings.

## Security Considerations

**WebRTC Peer-to-Peer Relay:**

- Risk: Client peer might forge illegal actions in multiplayer mode.
- Files: `src/net/network.ts`
- Current mitigation: Host-authoritative design validates every received action through `apply(state, action)` before broadcasting state syncs.
- Recommendations: Add explicit message schema validation / sanitization for incoming network messages.

## Performance Bottlenecks

**Mobile GPU / Low-End Devices:**

- Problem: Three.js render loop can drain battery on mobile if not throttled.
- Files: `src/render/scene.ts`
- Current mitigation: Pixel ratio capped at 2 (`Math.min(window.devicePixelRatio, 2)`), geometries and particle buffers reused.

## Fragile Areas

**State Mutation in Card Effects:**

- Files: `src/game/cards/effects.ts`
- Why fragile: Card effects perform `structuredClone(state)` and manipulate game state fields directly. If a card forgets to initialize an optional record or state property, runtime null errors could happen.
- Safe modification: Follow existing pattern of defaulting objects: `s.activeShields = s.activeShields || {}`.

## Dependencies at Risk

- `peerjs`: Public free signaling broker can occasionally experience intermittent latency or connection timeouts depending on regional cloud availability.

## Test Coverage Gaps

**UI & WebRTC Network Layer:**

- What's not tested: `src/render/scene.ts`, `src/ui/hud.ts`, and `src/net/network.ts` lack automated E2E or DOM unit tests (relies on manual verification and integration in browser).
- Files: `src/net/network.ts`, `src/render/scene.ts`
- Risk: Regressions in peer disconnect reconnection or mobile viewport resizing might only be caught during manual browser dogfooding.
- Priority: Medium.

---

*Concerns audit: 2026-10-15*
