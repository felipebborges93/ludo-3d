import { nextRandom } from './rng';
import { BASE, Color, DEFAULT_RULES, GOAL, LAST_TRACK, RulesConfig, START, TRACK_LEN } from './rules';

export interface GameState {
  rules: RulesConfig;
  players: Color[];
  tokens: Record<string, number[]>;
  turn: number;
  dice: number | null;
  sixes: number;
  phase: 'roll' | 'move' | 'over';
  winner: Color | null;
  seed: number;
}

export type Action = { type: 'roll'; forced?: number } | { type: 'move'; token: number };

export type GameEvent =
  | { type: 'diceRolled'; color: Color; value: number }
  | { type: 'tokenMoved'; color: Color; token: number; path: number[] }
  | { type: 'tokenCaptured'; color: Color; token: number; by: Color }
  | { type: 'tokenFinished'; color: Color; token: number }
  | { type: 'turnForfeited'; color: Color }
  | { type: 'turnChanged'; color: Color }
  | { type: 'gameWon'; color: Color };

export function createGame(players: Color[], seed: number, rules: RulesConfig = DEFAULT_RULES): GameState {
  const tokens: Record<string, number[]> = {};
  for (const c of players) tokens[c] = Array(rules.tokensPerPlayer).fill(BASE);
  return { rules, players, tokens, turn: 0, dice: null, sixes: 0, phase: 'roll', winner: null, seed };
}

export const currentColor = (s: GameState): Color => s.players[s.turn];

/** Absolute track square for a token, or null when off the common track. */
export function absPos(color: Color, progress: number): number | null {
  return progress >= 0 && progress <= LAST_TRACK ? (START[color] + progress) % TRACK_LEN : null;
}

/** Destination progress for a token with a given roll, or null if it cannot move. */
export function target(rules: RulesConfig, progress: number, roll: number): number | null {
  if (progress === GOAL) return null;
  if (progress === BASE) return rules.enterOn.includes(roll) ? 0 : null;
  const t = progress + roll;
  if (t > GOAL) return rules.exactRollToFinish ? null : GOAL;
  return t;
}

export function legalMoves(s: GameState): number[] {
  if (s.phase !== 'move' || s.dice === null) return [];
  const d = s.dice;
  return s.tokens[currentColor(s)].flatMap((p, i) => (target(s.rules, p, d) === null ? [] : [i]));
}

function nextTurn(s: GameState, ev: GameEvent[]) {
  s.turn = (s.turn + 1) % s.players.length;
  s.sixes = 0;
  s.dice = null;
  s.phase = 'roll';
  ev.push({ type: 'turnChanged', color: currentColor(s) });
}

/** Pure reducer: returns new state plus the events the renderer should play, in order. */
export function apply(prev: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const s = structuredClone(prev);
  const ev: GameEvent[] = [];
  const color = currentColor(s);

  if (action.type === 'roll') {
    if (s.phase !== 'roll') throw new Error('Not in roll phase');
    let v = action.forced;
    if (v === undefined) {
      const [r, seed] = nextRandom(s.seed);
      s.seed = seed;
      v = 1 + Math.floor(r * 6);
    }
    s.dice = v;
    ev.push({ type: 'diceRolled', color, value: v });
    s.sixes = v === 6 ? s.sixes + 1 : 0;
    if (s.sixes >= s.rules.maxConsecutiveSixes) {
      ev.push({ type: 'turnForfeited', color });
      nextTurn(s, ev);
    } else {
      s.phase = 'move';
      if (legalMoves(s).length === 0) nextTurn(s, ev);
    }
    return { state: s, events: ev };
  }

  if (!legalMoves(s).includes(action.token)) throw new Error('Illegal move');
  const from = s.tokens[color][action.token];
  const to = target(s.rules, from, s.dice!)!;
  const path: number[] = [];
  if (from === BASE) path.push(0);
  else for (let p = from + 1; p <= to; p++) path.push(p);
  s.tokens[color][action.token] = to;
  ev.push({ type: 'tokenMoved', color, token: action.token, path });

  let captured = false;
  const abs = absPos(color, to);
  if (abs !== null && !s.rules.safeSquares.includes(abs)) {
    for (const other of s.players) {
      if (other === color) continue;
      s.tokens[other].forEach((p, i) => {
        if (absPos(other, p) === abs) {
          s.tokens[other][i] = BASE;
          captured = true;
          ev.push({ type: 'tokenCaptured', color: other, token: i, by: color });
        }
      });
    }
  }

  const finished = to === GOAL;
  if (finished) {
    ev.push({ type: 'tokenFinished', color, token: action.token });
    if (s.tokens[color].every((p) => p === GOAL)) {
      s.winner = color;
      s.phase = 'over';
      ev.push({ type: 'gameWon', color });
      return { state: s, events: ev };
    }
  }

  const r = s.rules;
  const extra =
    (s.dice === 6 && r.sixGivesExtraTurn) || (captured && r.captureGivesExtraTurn) || (finished && r.finishGivesExtraTurn);
  if (extra) {
    s.phase = 'roll';
    s.dice = null;
  } else nextTurn(s, ev);
  return { state: s, events: ev };
}
