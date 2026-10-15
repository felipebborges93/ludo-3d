import { describe, expect, it } from 'vitest';
import { apply, createGame, GameState, legalMoves } from './engine';
import { DEFAULT_RULES, GOAL } from './rules';

const roll = (s: GameState, v: number) => apply(s, { type: 'roll', forced: v });
const move = (s: GameState, t: number) => apply(s, { type: 'move', token: t });
const game = (tokens: Record<string, number[]>, rules = DEFAULT_RULES) => {
  const s = createGame(Object.keys(tokens) as any, 1, rules);
  s.tokens = tokens;
  return s;
};

describe('engine', () => {
  it('needs a 6 to leave base', () => {
    let s = createGame(['red', 'yellow'], 1);
    let r = roll(s, 3);
    expect(r.state.turn).toBe(1); // no legal moves, turn passes
    r = roll(s, 6);
    expect(legalMoves(r.state)).toEqual([0, 1, 2, 3]);
    r = move(r.state, 0);
    expect(r.state.tokens.red[0]).toBe(0);
    expect(r.state.turn).toBe(0); // 6 = extra turn
    expect(r.state.phase).toBe('roll');
  });

  it('captures opponent and sends it home with extra turn', () => {
    // red at 2 moves 3 -> abs 5; yellow progress 31 -> abs (26+31)%52 = 5
    const s = game({ red: [2, -1, -1, -1], yellow: [31, -1, -1, -1] });
    const r = move(roll(s, 3).state, 0);
    expect(r.state.tokens.yellow[0]).toBe(-1);
    expect(r.events.some((e) => e.type === 'tokenCaptured')).toBe(true);
    expect(r.state.turn).toBe(0);
  });

  it('does not capture on safe squares', () => {
    // abs 8 is a star; yellow progress 34 -> abs 8
    const s = game({ red: [5, -1, -1, -1], yellow: [34, -1, -1, -1] });
    const r = move(roll(s, 3).state, 0);
    expect(r.state.tokens.yellow[0]).toBe(34);
    expect(r.state.turn).toBe(1);
  });

  it('forfeits turn on third consecutive 6', () => {
    let s = game({ red: [10, -1, -1, -1], yellow: [-1, -1, -1, -1] });
    s = move(roll(s, 6).state, 0).state;
    s = move(roll(s, 6).state, 0).state;
    const r = roll(s, 6);
    expect(r.events.map((e) => e.type)).toContain('turnForfeited');
    expect(r.state.turn).toBe(1);
  });

  it('requires exact roll to finish (configurable)', () => {
    const s = game({ red: [54, GOAL, GOAL, GOAL], yellow: [-1, -1, -1, -1] });
    expect(roll(s, 3).state.turn).toBe(1);
    const loose = game({ red: [54, -1, -1, -1], yellow: [-1, -1, -1, -1] }, { ...DEFAULT_RULES, exactRollToFinish: false });
    expect(move(roll(loose, 3).state, 0).state.tokens.red[0]).toBe(GOAL);
  });

  it('finishing gives extra turn; all four wins', () => {
    let r = move(roll(game({ red: [54, 10, -1, -1], yellow: [-1, -1, -1, -1] }), 2).state, 0);
    expect(r.events.map((e) => e.type)).toContain('tokenFinished');
    expect(r.state.turn).toBe(0);
    r = move(roll(game({ red: [54, GOAL, GOAL, GOAL], yellow: [-1, -1, -1, -1] }), 2).state, 0);
    expect(r.state.winner).toBe('red');
    expect(r.state.phase).toBe('over');
  });

  it('is deterministic with the same seed', () => {
    const a = apply(createGame(['red', 'blue'], 42), { type: 'roll' }).state.dice;
    const b = apply(createGame(['red', 'blue'], 42), { type: 'roll' }).state.dice;
    expect(a).toBe(b);
  });
});
