import { describe, expect, it } from 'vitest';
import { apply, createGame, currentColor } from '../engine';
import { drawCard, shuffle } from './deck';
import { BASE, DEFAULT_RULES, GOAL } from '../rules';
import { getCard } from './deck.config';
// Ensure cards are registered
import './effects';

describe('Deck management', () => {
  it('conserves cards when reshuffling discard pile back into draw pile', () => {
    const s = createGame(['red', 'green'], 42);
    // Setup empty draw pile and 3 cards in discard pile
    s.drawPile = [];
    s.discardPile = ['escudo_bananildo', 'dado_turbinado', 'atalho_cocorina'];
    const initialTotal = s.discardPile.length;

    const res = drawCard(s.drawPile, s.discardPile, 12345, 'red', s);
    expect(res.reshuffled).toBe(true);
    expect(res.cardId).toBeDefined();
    // Total remaining in draw + discard + 1 drawn must equal initial total
    const totalAfter = res.drawPile.length + res.discardPile.length + (res.cardId ? 1 : 0);
    expect(totalAfter).toBe(initialTotal);
  });

  it('deterministic shuffle with same seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const [s1, seed1] = shuffle(items, 999);
    const [s2, seed2] = shuffle(items, 999);
    expect(s1).toEqual(s2);
    expect(seed1).toBe(seed2);
  });

  it('discards 4th card when hand is full and emits cardDiscarded', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['escudo_bananildo', 'dado_turbinado', 'atalho_cocorina'];
    s.drawPile = ['ressurreicao'];

    // Move red to square 4 (luckSquare)
    // Red start is 0, progress 4 = absPos 4
    s.tokens['red'][0] = 0; // at start
    s.phase = 'move';
    s.dice = 4;
    const { state: nextS, events } = apply(s, { type: 'move', token: 0 });

    expect(nextS.tokens['red'][0]).toBe(4);
    expect(nextS.hands['red'].length).toBe(3);
    const discardEv = events.find((e) => e.type === 'cardDiscarded');
    expect(discardEv).toBeDefined();
    expect(discardEv).toMatchObject({
      type: 'cardDiscarded',
      color: 'red',
      cardId: 'ressurreicao',
      reason: 'hand_full',
    });
  });
});

describe('Subphase 1 Cards - Defesa e Ajuda', () => {
  it('Escudo de Bananildo: protects from next capture and expires afterwards', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['escudo_bananildo'];

    // Red plays Escudo de Bananildo
    const res1 = apply(s, { type: 'playCard', cardId: 'escudo_bananildo' });
    expect(res1.state.hands['red']).not.toContain('escudo_bananildo');
    expect(res1.state.activeShields?.['red']).toBeDefined();

    // Setup: Red token 0 is at absPos 20. Green moves to 20 to capture.
    // Red start = 0 -> progress 20 = absPos 20.
    // Green start = 13 -> progress 7 = absPos 20.
    res1.state.tokens['red'][0] = 20;
    res1.state.tokens['green'][0] = 5; // progress 5 -> roll 2 -> progress 7 (abs 20)
    res1.state.turn = 1; // Green's turn
    res1.state.phase = 'move';
    res1.state.dice = 2;

    const res2 = apply(res1.state, { type: 'move', token: 0 });

    // Capture was blocked! Red token remains at 20, shield is consumed
    expect(res2.state.tokens['red'][0]).toBe(20);
    expect(res2.state.activeShields?.['red']).toBeUndefined();
    const shieldEv = res2.events.find(
      (e) => e.type === 'cardEffectApplied' && e.cardId === 'escudo_bananildo'
    );
    expect(shieldEv).toBeDefined();
  });

  it('Dado Turbinado: lets player choose roll value and consumes roll phase', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['dado_turbinado'];
    // Cannot play if all tokens in base
    expect(() => apply(s, { type: 'playCard', cardId: 'dado_turbinado', chosenValue: 4 })).toThrow();

    // Put one token on track
    s.tokens['red'][0] = 10;
    const res = apply(s, { type: 'playCard', cardId: 'dado_turbinado', chosenValue: 4 });
    expect(res.state.dice).toBe(4);
    expect(res.state.phase).toBe('move');
    expect(res.state.cardPlayedThisTurn).toBe(true);
  });

  it('Atalho do Cocorina: advances token by 4 squares on common track, rejecting safe squares and finish column', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['atalho_cocorina'];
    s.tokens['red'][0] = 1; // progress 1 -> advances to 5 (valid)
    s.tokens['red'][1] = 48; // progress 48 + 4 = 52 (> LAST_TRACK 50, invalid)

    // Invalid target token
    expect(() =>
      apply(s, { type: 'playCard', cardId: 'atalho_cocorina', tokenIndex: 1 })
    ).toThrow();

    // Valid target token
    const res = apply(s, { type: 'playCard', cardId: 'atalho_cocorina', tokenIndex: 0 });
    expect(res.state.tokens['red'][0]).toBe(5);
    const moveEv = res.events.find((e) => e.type === 'tokenMoved' && e.token === 0);
    expect(moveEv).toBeDefined();
  });

  it('Ressurreicao: revives last captured token to start square (0) once per game', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['ressurreicao'];

    // No token captured yet
    expect(() => apply(s, { type: 'playCard', cardId: 'ressurreicao' })).toThrow();

    // Simulate token 2 captured
    s.lastCapturedToken = { red: 2 };
    s.tokens['red'][2] = BASE;

    const res = apply(s, { type: 'playCard', cardId: 'ressurreicao' });
    expect(res.state.tokens['red'][2]).toBe(0);
    expect(res.state.usedRessurreicao?.['red']).toBe(true);

    // Second try in same game must fail
    s.hands['red'] = ['ressurreicao'];
    s.lastCapturedToken = { red: 2 };
    s.tokens['red'][2] = BASE;
    expect(() => apply(res.state, { type: 'playCard', cardId: 'ressurreicao' })).toThrow();
  });
});

describe('Subphase 2 Cards - Ataque Simples', () => {
  it('Pending attack rule: attack card drawn while ahead is reshuffled and player draws another card', () => {
    const s = createGame(['red', 'green'], 42);
    // Red is strictly ahead: 30 progress vs green 0
    s.tokens['red'][0] = 30;
    s.tokens['green'][0] = 0;

    // Draw pile has attack card followed by non-attack card
    const drawPile = ['dado_turbinado', 'escorregao_abelardo'];
    const discardPile: string[] = [];

    const res = drawCard(drawPile, discardPile, 42, 'red', s);
    // Red must not receive the attack card; it was reshuffled and red gets the other card
    expect(res.cardId).toBe('dado_turbinado');
  });

  it('Escorregao do Abelardo: moves adversary piece back 3 squares, bounded by start (0), and costs next move', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['escorregao_abelardo'];
    s.tokens['green'][0] = 10;

    const res = apply(s, {
      type: 'playCard',
      cardId: 'escorregao_abelardo',
      targetPlayer: 'green',
      targetTokenIndex: 0,
    });

    expect(res.state.tokens['green'][0]).toBe(7);
    expect(res.state.skipNextMove?.['red']).toBe(true);

    // When green's token is at 2, it is not eligible (must have >= 3 progress)
    s.tokens['green'][0] = 2;
    expect(() =>
      apply(s, {
        type: 'playCard',
        cardId: 'escorregao_abelardo',
        targetPlayer: 'green',
        targetTokenIndex: 0,
      })
    ).toThrow();
  });

  it('Tapete Magico: swaps piece with adversary piece on common squares, rejecting safe squares', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['tapete_magico'];
    // Red at progress 10 (abs 10). Green at progress 10 (START[green] 13 + 10 = abs 23).
    // Neither 10 nor 23 is safe square.
    s.tokens['red'][0] = 10;
    s.tokens['green'][0] = 10;

    const res = apply(s, {
      type: 'playCard',
      cardId: 'tapete_magico',
      tokenIndex: 0,
      targetPlayer: 'green',
      targetTokenIndex: 0,
    });

    // Positions swapped:
    // Red was at abs 10, now green is at abs 10 -> green progress = (10 - 13 + 52)%52 = 49
    // Green was at abs 23, now red is at abs 23 -> red progress = 23
    expect(res.state.tokens['red'][0]).toBe(23);
    expect(res.state.tokens['green'][0]).toBe(49);
  });

  it('Gripe do Seu Gelinho: prevents chosen adversary from moving pieces on next turn', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['gripe_gelinho'];
    s.tokens['green'][0] = 10;

    const res1 = apply(s, {
      type: 'playCard',
      cardId: 'gripe_gelinho',
      targetPlayer: 'green',
    });
    expect(res1.state.skipNextMove?.['green']).toBe(true);

    // Green rolls and attempts to move
    res1.state.turn = 1; // Green's turn
    res1.state.phase = 'move';
    res1.state.dice = 2;
    const res2 = apply(res1.state, { type: 'move', token: 0 });

    // Green skipped movement due to Gripe! Token remains at 10 and turn passed
    expect(res2.state.tokens['green'][0]).toBe(10);
    expect(res2.state.skipNextMove?.['green']).toBe(false);
  });

  it('Bolo que caiu: moves all adversary pieces back 1 square without capture', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['bolo_caiu'];
    s.tokens['green'][0] = 5;
    s.tokens['green'][1] = 12;

    const res = apply(s, {
      type: 'playCard',
      cardId: 'bolo_caiu',
      targetPlayer: 'green',
    });

    expect(res.state.tokens['green'][0]).toBe(4);
    expect(res.state.tokens['green'][1]).toBe(11);
  });
});

describe('Subphase 3 Cards - Caos e Cancelamento', () => {
  it('Troca de Chapeus: rotates token positions among players, forbidden if near goal', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['troca_chapeus'];
    s.tokens['red'] = [10, 20, BASE, BASE];
    s.tokens['green'] = [15, BASE, BASE, BASE];

    const res = apply(s, { type: 'playCard', cardId: 'troca_chapeus' });
    // In a 2-player game, red gets green's tokens and green gets red's tokens
    expect(res.state.tokens['red']).toEqual([15, BASE, BASE, BASE]);
    expect(res.state.tokens['green']).toEqual([10, 20, BASE, BASE]);

    // Forbidden if any token is within 5 of goal (GOAL = 56, 56 - 5 = 51)
    s.tokens['red'] = [52, BASE, BASE, BASE];
    s.hands['red'] = ['troca_chapeus'];
    expect(() => apply(s, { type: 'playCard', cardId: 'troca_chapeus' })).toThrow();
  });

  it('Danca Obrigatoria: forces adversary to skip their next turn', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['danca_obrigatoria'];

    const res1 = apply(s, {
      type: 'playCard',
      cardId: 'danca_obrigatoria',
      targetPlayer: 'green',
    });
    expect(res1.state.skipNextTurn?.['green']).toBe(true);

    // Red finishes turn by rolling and passing or nextTurn
    res1.state.phase = 'move';
    res1.state.dice = 1;
    s.tokens['red'][0] = 0;
    res1.state.tokens['red'][0] = 0;
    const res2 = apply(res1.state, { type: 'move', token: 0 });

    // Green's turn should have been automatically skipped and turn returned to Red
    expect(currentColor(res2.state)).toBe('red');
    const forfeitEv = res2.events.find(
      (e) => e.type === 'turnForfeited' && e.color === 'green'
    );
    expect(forfeitEv).toBeDefined();
  });

  it('Contra-danca: cancels an attack card used against owner, but does not cancel chaos cards', () => {
    const s = createGame(['red', 'green'], 42);
    s.hands['red'] = ['escorregao_abelardo'];
    s.hands['green'] = ['contra_danca']; // Target has Contra-dança
    s.tokens['green'][0] = 10;

    // Red plays attack card targeting Green
    const res = apply(s, {
      type: 'playCard',
      cardId: 'escorregao_abelardo',
      targetPlayer: 'green',
      targetTokenIndex: 0,
    });

    // Contra-dança consumed and attack blocked: Green's token remains at 10!
    expect(res.state.tokens['green'][0]).toBe(10);
    expect(res.state.hands['green']).not.toContain('contra_danca');
    expect(res.state.discardPile).toContain('contra_danca');
    const cancelEv = res.events.find((e) => e.type === 'cardCancelled');
    expect(cancelEv).toBeDefined();
    expect(cancelEv).toMatchObject({
      type: 'cardCancelled',
      cardId: 'escorregao_abelardo',
      by: 'green',
    });
  });
});


