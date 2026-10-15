import { nextRandom } from './rng';
import { BASE, Color, DEFAULT_RULES, GOAL, LAST_TRACK, RulesConfig, START, TRACK_LEN } from './rules';
import { drawCard } from './cards/deck';
import { getCard } from './cards/deck.config';

export interface GameState {
  rules: RulesConfig;
  players: Color[];
  tokens: Record<string, number[]>;
  turn: number;
  turnCount: number;
  dice: number | null;
  sixes: number;
  phase: 'roll' | 'move' | 'over';
  winner: Color | null;
  seed: number;
  // Card system state
  hands: Record<string, string[]>;
  drawPile: string[];
  discardPile: string[];
  cardPlayedThisTurn: boolean;
  activeShields?: Record<string, { expiresAtTurnIndex: number }>;
  usedRessurreicao?: Record<string, boolean>;
  lastCapturedToken?: Record<string, number | undefined>;
  skipNextMove?: Record<string, boolean>; // Gripe do Seu Gelinho
  skipNextTurn?: Record<string, boolean>; // Dança Obrigatória
}

export type Action =
  | { type: 'roll'; forced?: number }
  | { type: 'move'; token: number }
  | {
      type: 'playCard';
      cardId: string;
      tokenIndex?: number;
      targetPlayer?: Color;
      targetTokenIndex?: number;
      chosenValue?: number;
    };

export type GameEvent =
  | { type: 'diceRolled'; color: Color; value: number }
  | { type: 'tokenMoved'; color: Color; token: number; path: number[] }
  | { type: 'tokenCaptured'; color: Color; token: number; by: Color }
  | { type: 'tokenFinished'; color: Color; token: number }
  | { type: 'turnForfeited'; color: Color }
  | { type: 'turnChanged'; color: Color }
  | { type: 'gameWon'; color: Color }
  | { type: 'cardDrawn'; color: Color; cardId: string; squareType: 'luck' | 'badLuck' }
  | { type: 'cardDiscarded'; color: Color; cardId: string; reason: 'hand_full' | 'used' | 'cancel' }
  | { type: 'cardPlayed'; color: Color; cardId: string }
  | { type: 'cardEffectApplied'; color: Color; cardId: string; description: string }
  | { type: 'cardCancelled'; color: Color; cardId: string; by: Color };

export function createGame(players: Color[], seed: number, rules: RulesConfig = DEFAULT_RULES): GameState {
  const tokens: Record<string, number[]> = {};
  const hands: Record<string, string[]> = {};
  for (const c of players) {
    tokens[c] = Array(rules.tokensPerPlayer).fill(BASE);
    hands[c] = [];
  }

  // Initialize initial draw piles if cards enabled
  let drawPile: string[] = [];
  let sSeed = seed;
  if (rules.enableCards !== false) {
    // Generate combined initial draw pile from luck & bad luck weights
    const allWeights: Record<string, number> = {
      escudo_bananildo: 25,
      dado_turbinado: 25,
      atalho_cocorina: 25,
      ressurreicao: 15,
      escorregao_abelardo: 20,
      tapete_magico: 18,
      gripe_gelinho: 18,
      bolo_caiu: 15,
      troca_chapeus: 6,
      danca_obrigatoria: 8,
      contra_danca: 10,
    };
    for (const [id, weight] of Object.entries(allWeights)) {
      const count = Math.max(1, Math.round(weight / 4));
      for (let i = 0; i < count; i++) drawPile.push(id);
    }
    const [shuffled, nextS] = nextRandom(sSeed);
    sSeed = nextS;
    // Simple initial shuffle
    drawPile.sort(() => (sSeed % 2 === 0 ? 1 : -1));
  }

  return {
    rules,
    players,
    tokens,
    turn: 0,
    turnCount: 0,
    dice: null,
    sixes: 0,
    phase: 'roll',
    winner: null,
    seed: sSeed,
    hands,
    drawPile,
    discardPile: [],
    cardPlayedThisTurn: false,
    activeShields: {},
    usedRessurreicao: {},
    lastCapturedToken: {},
    skipNextMove: {},
    skipNextTurn: {},
  };
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

/** Returns the single legal token index if exactly one move is possible; otherwise null. */
export function getSingleLegalMove(s: GameState): number | null {
  if (s.phase !== 'move') return null;
  const moves = legalMoves(s);
  return moves.length === 1 ? moves[0] : null;
}

function checkCardExpiry(s: GameState) {
  if (!s.activeShields) return;
  for (const [col, shield] of Object.entries(s.activeShields)) {
    if (shield && s.turnCount >= shield.expiresAtTurnIndex) {
      delete s.activeShields[col];
    }
  }
}

function nextTurn(s: GameState, ev: GameEvent[]) {
  s.turn = (s.turn + 1) % s.players.length;
  s.turnCount++;
  s.sixes = 0;
  s.dice = null;
  s.phase = 'roll';
  s.cardPlayedThisTurn = false;
  checkCardExpiry(s);

  // Check if player's turn is skipped (e.g. Dança Obrigatória)
  const nextCol = currentColor(s);
  if (s.skipNextTurn?.[nextCol]) {
    s.skipNextTurn[nextCol] = false;
    ev.push({ type: 'turnChanged', color: nextCol });
    ev.push({ type: 'turnForfeited', color: nextCol });
    nextTurn(s, ev);
    return;
  }

  ev.push({ type: 'turnChanged', color: nextCol });
}

function handleCardLanding(s: GameState, color: Color, absSquare: number, ev: GameEvent[]) {
  if (s.rules.enableCards === false) return;
  const isLuck = s.rules.luckSquares?.includes(absSquare);
  const isBadLuck = s.rules.badLuckSquares?.includes(absSquare);
  if (!isLuck && !isBadLuck) return;

  const squareType: 'luck' | 'badLuck' = isLuck ? 'luck' : 'badLuck';
  const drawRes = drawCard(s.drawPile, s.discardPile, s.seed, color, s);
  s.drawPile = drawRes.drawPile;
  s.discardPile = drawRes.discardPile;
  s.seed = drawRes.seed;

  if (!drawRes.cardId) return;

  ev.push({ type: 'cardDrawn', color, cardId: drawRes.cardId, squareType });

  const maxHand = s.rules.maxHandSize ?? 3;
  if (!s.hands[color]) s.hands[color] = [];

  if (s.hands[color].length >= maxHand) {
    // Hand full, discard drawn card
    s.discardPile.push(drawRes.cardId);
    ev.push({ type: 'cardDiscarded', color, cardId: drawRes.cardId, reason: 'hand_full' });
  } else {
    s.hands[color].push(drawRes.cardId);
  }
}

function cloneGameState(prev: GameState): GameState {
  const tokens: Record<string, number[]> = {};
  for (const p of prev.players) {
    tokens[p] = [...prev.tokens[p]];
  }
  const hands: Record<string, string[]> = {};
  for (const p of prev.players) {
    hands[p] = prev.hands[p] ? [...prev.hands[p]] : [];
  }
  return {
    rules: prev.rules,
    players: prev.players,
    tokens,
    turn: prev.turn,
    turnCount: prev.turnCount,
    dice: prev.dice,
    sixes: prev.sixes,
    phase: prev.phase,
    winner: prev.winner,
    seed: prev.seed,
    hands,
    drawPile: [...prev.drawPile],
    discardPile: [...prev.discardPile],
    cardPlayedThisTurn: prev.cardPlayedThisTurn,
    activeShields: prev.activeShields ? { ...prev.activeShields } : {},
    usedRessurreicao: prev.usedRessurreicao ? { ...prev.usedRessurreicao } : {},
    lastCapturedToken: prev.lastCapturedToken ? { ...prev.lastCapturedToken } : {},
    skipNextMove: prev.skipNextMove ? { ...prev.skipNextMove } : {},
    skipNextTurn: prev.skipNextTurn ? { ...prev.skipNextTurn } : {},
  };
}

/** Pure reducer: returns new state plus the events the renderer should play, in order. */
export function apply(prev: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const s = cloneGameState(prev);
  const ev: GameEvent[] = [];
  const color = currentColor(s);

  if (action.type === 'playCard') {
    if (s.cardPlayedThisTurn) throw new Error('Maximum of one card per turn');
    const hand = s.hands[color] || [];
    const cardIndex = hand.indexOf(action.cardId);
    if (cardIndex === -1) throw new Error('Player does not have this card');

    const cardDef = getCard(action.cardId);
    if (!cardDef) throw new Error(`Unknown card: ${action.cardId}`);

    const payload = {
      tokenIndex: action.tokenIndex,
      targetPlayer: action.targetPlayer,
      targetTokenIndex: action.targetTokenIndex,
      chosenValue: action.chosenValue,
    };

    if (!cardDef.canPlay(s, color, payload)) {
      throw new Error(`Cannot play card ${action.cardId} under current conditions`);
    }

    // Check if target player has Contra-dança and this is an attack card
    let cancelled = false;
    if (cardDef.type === 'ataque' && action.targetPlayer && action.targetPlayer !== color) {
      const targetHand = s.hands[action.targetPlayer] || [];
      const cdIndex = targetHand.indexOf('contra_danca');
      if (cdIndex !== -1) {
        // Automatically cancels attack and discards Contra-dança
        targetHand.splice(cdIndex, 1);
        s.discardPile.push('contra_danca');
        cancelled = true;
        ev.push({
          type: 'cardCancelled',
          color: action.targetPlayer,
          cardId: action.cardId,
          by: action.targetPlayer,
        });
      }
    }

    // Remove played card from hand
    hand.splice(cardIndex, 1);
    s.discardPile.push(action.cardId);
    s.cardPlayedThisTurn = true;
    ev.push({ type: 'cardPlayed', color, cardId: action.cardId });

    if (!cancelled) {
      const result = cardDef.applyEffect({ state: s, player: color, payload });
      // Merge state and events
      Object.assign(s, result.state);
      ev.push(...result.events);
    }

    return { state: s, events: ev };
  }

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

  // Check if player is under Gripe do Seu Gelinho (skip movement)
  if (s.skipNextMove?.[color]) {
    s.skipNextMove[color] = false;
    ev.push({ type: 'turnForfeited', color });
    nextTurn(s, ev);
    return { state: s, events: ev };
  }

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
          // Check Escudo de Bananildo
          if (s.activeShields?.[other]) {
            delete s.activeShields[other];
            ev.push({
              type: 'cardEffectApplied',
              color: other,
              cardId: 'escudo_bananildo',
              description: `Escudo de Bananildo de ${other} bloqueou a captura!`,
            });
          } else {
            s.tokens[other][i] = BASE;
            s.lastCapturedToken = s.lastCapturedToken || {};
            s.lastCapturedToken[other] = i;
            captured = true;
            ev.push({ type: 'tokenCaptured', color: other, token: i, by: color });
          }
        }
      });
    }
  }

  // Handle landing on card squares (luck / bad luck)
  if (abs !== null) {
    handleCardLanding(s, color, abs, ev);
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
    s.cardPlayedThisTurn = false;
  } else nextTurn(s, ev);
  return { state: s, events: ev };
}
