import { describe, expect, it } from 'vitest';
import { chooseMove } from './bot';
import { apply, createGame, GameState } from '../game/engine';

const roll = (s: GameState, v: number) => apply(s, { type: 'roll', forced: v }).state;

describe('AI bot', () => {
  it('easy bot picks a legal move', () => {
    let s = createGame(['red', 'yellow'], 1);
    s = roll(s, 6);
    const m = chooseMove(s, 'easy');
    expect([0, 1, 2, 3]).toContain(m);
  });

  it('medium bot prefers capture over plain advance', () => {
    // red at token 0 (pos 2 -> abs 2). token 1 (pos 10 -> abs 10).
    // yellow at pos 31 (abs (26+31)%52 = 5).
    // Roll 3: token 0 reaches 2+3=5 (captures yellow!). token 1 reaches 13 (no capture).
    const s = createGame(['red', 'yellow'], 1);
    s.tokens.red = [2, 10, -1, -1];
    s.tokens.yellow = [31, -1, -1, -1];
    const rolled = roll(s, 3);
    const m = chooseMove(rolled, 'medium');
    expect(m).toBe(0);
  });

  it('medium bot prefers leaving base on 6', () => {
    const s = createGame(['red', 'yellow'], 1);
    s.tokens.red = [10, -1, -1, -1];
    const rolled = roll(s, 6);
    const m = chooseMove(rolled, 'medium');
    // tokens 1, 2, 3 are in base (-1)
    expect([1, 2, 3]).toContain(m);
  });

  it('hard bot avoids move that lands in enemy attack range when safe option exists', () => {
    // Red has token 0 at pos 10, token 1 at pos 25.
    // Yellow is at abs 14.
    // Roll 2: token 0 would land at pos 12 (abs 12). Yellow at abs 14 is in front, but if yellow was at abs 10?
    // Let's set enemy at abs 10.
    // If Red token 0 is at pos 6 (abs 6), roll 6 moves to abs 12. Enemy at abs 10 has dist 2 to abs 12! Danger!
    // Meanwhile token 1 at pos 25 moves to 31 (abs 31), far from enemies.
    const s = createGame(['red', 'yellow'], 1);
    s.tokens.red = [6, 25, -1, -1];
    s.tokens.yellow = [36, -1, -1, -1]; // yellow abs: (26 + 36)%52 = 10
    const rolled = roll(s, 2); // token 0 -> pos 8 (abs 8, safe square!), token 1 -> 27
    // Let's test danger: roll 3 -> token 0 lands on pos 9 (abs 9, not safe; yellow abs 10 is 51 steps away, but wait: yellow at abs 7, red lands on 9 -> dist is 2!)
    s.tokens.yellow = [33, -1, -1, -1]; // yellow abs: (26 + 33)%52 = 7
    const rolled3 = roll(s, 3); // token 0 lands on 9 (abs 9, yellow at 7 is 2 behind!). token 1 lands on 28 (safe from yellow)
    const m = chooseMove(rolled3, 'hard');
    expect(m).toBe(1);
  });
});
