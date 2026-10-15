import { nextRandom } from '../rng';
import { Color } from '../rules';
import { GameState } from '../engine';
import { CARD_REGISTRY } from './deck.config';

export interface DeckState {
  drawPile: string[];
  discardPile: string[];
}

/**
 * Fisher-Yates shuffle using our seeded RNG.
 */
export function shuffle(items: string[], seed: number): [string[], number] {
  const arr = [...items];
  let curSeed = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    const [r, nextS] = nextRandom(curSeed);
    curSeed = nextS;
    const j = Math.floor(r * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [arr, curSeed];
}

/**
 * Create a new draw pile from weights.
 */
export function createInitialDrawPile(weights: Record<string, number>, copiesMultiplier = 4): string[] {
  const pile: string[] = [];
  for (const [id, weight] of Object.entries(weights)) {
    // Only add if card is registered or planned
    const count = Math.max(1, Math.round((weight * copiesMultiplier) / 10));
    for (let i = 0; i < count; i++) {
      pile.push(id);
    }
  }
  return pile;
}

/**
 * Total progress for a player (sum of all tokens, BASE = -1 counts as -1).
 */
export function totalProgress(state: GameState, color: Color): number {
  return state.tokens[color].reduce((sum, p) => sum + (p >= 0 ? p : 0), 0);
}

/**
 * Check if the player is currently strictly in 1st place among active players.
 */
export function isPlayerAhead(state: GameState, color: Color): boolean {
  const myProg = totalProgress(state, color);
  for (const other of state.players) {
    if (other === color) continue;
    if (totalProgress(state, other) >= myProg) {
      return false;
    }
  }
  return true;
}

export interface DrawResult {
  cardId: string | null;
  drawPile: string[];
  discardPile: string[];
  seed: number;
  reshuffled: boolean;
}

/**
 * Draws a card from the deck.
 * Handles reshuffling discard pile if draw pile is empty (conserving cards).
 * Handles rule: If an attack card is drawn by a player who is currently ahead,
 * it is reshuffled back into the draw pile and another card is drawn.
 */
export function drawCard(
  drawPile: string[],
  discardPile: string[],
  seed: number,
  player: Color,
  state: GameState,
  maxRetries = 10
): DrawResult {
  let curDraw = [...drawPile];
  let curDiscard = [...discardPile];
  let curSeed = seed;
  let didReshuffle = false;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (curDraw.length === 0) {
      if (curDiscard.length === 0) {
        return {
          cardId: null,
          drawPile: curDraw,
          discardPile: curDiscard,
          seed: curSeed,
          reshuffled: didReshuffle,
        };
      }
      // Reshuffle discard into draw
      const [shuffled, newSeed] = shuffle(curDiscard, curSeed);
      curDraw = shuffled;
      curDiscard = [];
      curSeed = newSeed;
      didReshuffle = true;
    }

    const drawn = curDraw.pop()!;
    const cardDef = CARD_REGISTRY[drawn];

    // Rule: attack card drawn while ahead -> reshuffle card back and retry
    if (cardDef && cardDef.type === 'ataque' && isPlayerAhead(state, player)) {
      curDraw.push(drawn);
      const [shuffled, newSeed] = shuffle(curDraw, curSeed);
      curDraw = shuffled;
      curSeed = newSeed;
      continue;
    }

    return {
      cardId: drawn,
      drawPile: curDraw,
      discardPile: curDiscard,
      seed: curSeed,
      reshuffled: didReshuffle,
    };
  }

  // If retries exceeded, draw the last card or null
  const drawn = curDraw.pop() ?? null;
  return {
    cardId: drawn,
    drawPile: curDraw,
    discardPile: curDiscard,
    seed: curSeed,
    reshuffled: didReshuffle,
  };
}
