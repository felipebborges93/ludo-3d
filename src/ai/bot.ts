import { absPos, apply, currentColor, GameState, legalMoves, target } from '../game/engine';
import { BASE, GOAL, LAST_TRACK, TRACK_LEN } from '../game/rules';
import { getCard } from '../game/cards/deck.config';

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
    const d = s.dice!;
    for (const m of moves) {
      const from = s.tokens[color][m];
      const to = target(s.rules, from, d)!;
      let v = 0;
      if (to === GOAL) v += 80;
      if (from === BASE) v += 50;
      const abs = absPos(color, to);
      if (abs !== null && !s.rules.safeSquares.includes(abs)) {
        for (const op of s.players) {
          if (op !== color && s.tokens[op].some((p) => absPos(op, p) === abs)) {
            v += 100;
            break;
          }
        }
      }
      v += from;
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

export interface BotCardAction {
  cardId: string;
  tokenIndex?: number;
  targetPlayer?: import('../game/rules').Color;
  targetTokenIndex?: number;
  chosenValue?: number;
}

/**
 * Checks if the bot wants to play a card from its hand in the current phase.
 */
export function chooseCardAction(s: GameState): BotCardAction | null {
  if (s.cardPlayedThisTurn) return null;
  const color = currentColor(s);
  const hand = s.hands[color];
  if (!hand || hand.length === 0) return null;

  for (const cardId of hand) {
    const card = getCard(cardId);
    if (!card) continue;

    // Escudo de Bananildo
    if (cardId === 'escudo_bananildo' && card.canPlay(s, color)) {
      // Play if we have tokens on track in vulnerable positions
      return { cardId };
    }

    // Dado Turbinado (only in roll phase)
    if (cardId === 'dado_turbinado' && s.phase === 'roll' && card.canPlay(s, color)) {
      return { cardId, chosenValue: 4 };
    }

    // Atalho do Cocorina
    if (cardId === 'atalho_cocorina') {
      for (let i = 0; i < s.tokens[color].length; i++) {
        if (card.canPlay(s, color, { tokenIndex: i })) {
          return { cardId, tokenIndex: i };
        }
      }
    }

    // Ressurreição
    if (cardId === 'ressurreicao' && card.canPlay(s, color)) {
      return { cardId };
    }

    // Ataques contra jogador mais à frente
    if (card.type === 'ataque' || cardId === 'danca_obrigatoria') {
      // Find opponent with highest progress
      let maxProg = -1;
      let leadingOpponent: import('../game/rules').Color | null = null;
      for (const op of s.players) {
        if (op === color) continue;
        const p = s.tokens[op].reduce((acc, t) => acc + (t >= 0 ? t : 0), 0);
        if (p > maxProg) {
          maxProg = p;
          leadingOpponent = op;
        }
      }

      if (leadingOpponent) {
        if (cardId === 'escorregao_abelardo') {
          for (let i = 0; i < s.tokens[leadingOpponent].length; i++) {
            if (card.canPlay(s, color, { targetPlayer: leadingOpponent, targetTokenIndex: i })) {
              return { cardId, targetPlayer: leadingOpponent, targetTokenIndex: i };
            }
          }
        }
        if (cardId === 'tapete_magico') {
          for (let mi = 0; mi < s.tokens[color].length; mi++) {
            for (let ti = 0; ti < s.tokens[leadingOpponent].length; ti++) {
              if (card.canPlay(s, color, { tokenIndex: mi, targetPlayer: leadingOpponent, targetTokenIndex: ti })) {
                return { cardId, tokenIndex: mi, targetPlayer: leadingOpponent, targetTokenIndex: ti };
              }
            }
          }
        }
        if (cardId === 'gripe_gelinho' && card.canPlay(s, color, { targetPlayer: leadingOpponent })) {
          return { cardId, targetPlayer: leadingOpponent };
        }
        if (cardId === 'bolo_caiu' && card.canPlay(s, color, { targetPlayer: leadingOpponent })) {
          return { cardId, targetPlayer: leadingOpponent };
        }
        if (cardId === 'danca_obrigatoria' && card.canPlay(s, color, { targetPlayer: leadingOpponent })) {
          return { cardId, targetPlayer: leadingOpponent };
        }
      }
    }

    // Troca de Chapéus
    if (cardId === 'troca_chapeus' && card.canPlay(s, color)) {
      // Only play if bot is trailing behind
      const myProg = s.tokens[color].reduce((acc, t) => acc + (t >= 0 ? t : 0), 0);
      const isBehind = s.players.some(
        (op) => op !== color && s.tokens[op].reduce((acc, t) => acc + (t >= 0 ? t : 0), 0) > myProg + 20
      );
      if (isBehind) {
        return { cardId };
      }
    }
  }

  return null;
}

