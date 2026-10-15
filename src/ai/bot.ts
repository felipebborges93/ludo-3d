import { absPos, apply, currentColor, GameState, legalMoves, target } from '../game/engine';
import { BASE, GOAL, LAST_TRACK, TRACK_LEN } from '../game/rules';

export type BotLevel = 'easy' | 'medium' | 'hard';

/** Simulates move and returns { nextState, events } without mutating input. */
const simMove = (s: GameState, token: number) => apply(s, { type: 'move', token });

/** Returns how many steps from behind `attacker` is to `targetAbs` (1..6) if on common track. */
function attackDistance(attackerAbs: number, targetAbs: number): number {
  return (targetAbs - attackerAbs + TRACK_LEN) % TRACK_LEN;
}

/** Evaluates the immediate board state for `color`. Higher is better. */
export function scoreState(s: GameState, color: string): number {
  let score = 0;
  const myTokens = s.tokens[color];
  const safe = s.rules.safeSquares;

  for (const p of myTokens) {
    if (p === GOAL) score += 150;
    else if (p > LAST_TRACK) score += 60 + (p - LAST_TRACK) * 10; // home stretch safe
    else if (p >= 0) {
      score += 20 + p * 2;
      const abs = absPos(color as any, p);
      if (abs !== null && safe.includes(abs)) score += 15;
    }
  }

  // Penalize opponent tokens close behind vulnerable tokens
  for (const p of myTokens) {
    const myAbs = absPos(color as any, p);
    if (myAbs === null || safe.includes(myAbs)) continue;
    for (const [otherColor, others] of Object.entries(s.tokens)) {
      if (otherColor === color) continue;
      for (const op of others) {
        const opAbs = absPos(otherColor as any, op);
        if (opAbs === null) continue;
        const dist = attackDistance(opAbs, myAbs);
        if (dist >= 1 && dist <= 6) score -= (7 - dist) * 8; // threat penalty
      }
    }
  }

  return score;
}

/** Strategic lookahead: expected value taking opponent response into account. */
function strategicScore(s: GameState, color: string, token: number): number {
  const { state: next, events } = simMove(s, token);

  let val = scoreState(next, color);

  // Bonus for immediate events
  if (events.some((e) => e.type === 'tokenCaptured')) val += 120;
  if (events.some((e) => e.type === 'tokenFinished')) val += 100;
  if (s.tokens[color][token] === BASE) val += 60; // leaving base is top priority

  // Check vulnerability of the moved token
  const movedPos = next.tokens[color][token];
  const movedAbs = absPos(color as any, movedPos);
  if (movedAbs !== null && !s.rules.safeSquares.includes(movedAbs)) {
    // If enemy can hit with any 1..6 roll, subtract probability weight
    for (const [otherColor, others] of Object.entries(next.tokens)) {
      if (otherColor === color) continue;
      for (const op of others) {
        const opAbs = absPos(otherColor as any, op);
        if (opAbs !== null) {
          const d = attackDistance(opAbs, movedAbs);
          if (d >= 1 && d <= 6) val -= 45;
        }
      }
    }
  }

  return val;
}

export function chooseMove(s: GameState, level: BotLevel): number {
  const moves = legalMoves(s);
  if (moves.length <= 1) return moves[0] ?? -1;

  if (level === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const color = currentColor(s);

  if (level === 'medium') {
    // Greedy heuristic: capture > exit base > finish > furthest progress
    let bestMove = moves[0];
    let bestVal = -Infinity;
    for (const m of moves) {
      const { events } = simMove(s, m);
      let v = 0;
      if (events.some((e) => e.type === 'tokenCaptured')) v += 100;
      if (events.some((e) => e.type === 'tokenFinished')) v += 80;
      if (s.tokens[color][m] === BASE) v += 50;
      v += s.tokens[color][m]; // advance furthest
      if (v > bestVal) {
        bestVal = v;
        bestMove = m;
      }
    }
    return bestMove;
  }

  // Hard: strategic lookahead with danger evaluation
  let bestMove = moves[0];
  let bestVal = -Infinity;
  for (const m of moves) {
    const v = strategicScore(s, color, m);
    if (v > bestVal) {
      bestVal = v;
      bestMove = m;
    }
  }
  return bestMove;
}
