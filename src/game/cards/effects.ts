import { CardDefinition, CardEffectContext, CardEffectResult } from './types';
import { registerCard } from './deck.config';
import { BASE, Color, GOAL, LAST_TRACK, START, TRACK_LEN } from '../rules';
import { absPos, GameState } from '../engine';

/**
 * Escudo de Bananildo
 * Tipo: defesa
 * Efeito: cancela a próxima captura contra o dono.
 * Duração: até ser usada ou até o fim do próximo turno do dono.
 * Sem custo.
 */
export const escudoBananildo: CardDefinition = {
  id: 'escudo_bananildo',
  name: 'Escudo de Bananildo',
  shortText: 'Protege contra a próxima captura até o fim do seu próximo turno.',
  type: 'defesa',
  target: 'self',
  timing: 'anytime_in_turn',
  costDescription: 'Sem custo',
  durationDescription: 'Até ser usada ou até o fim do seu próximo turno',
  canPlay: (state, player) => {
    // Can play if player doesn't already have an active shield
    return !state.activeShields?.[player];
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    s.activeShields = s.activeShields || {};
    // Active until the end of this player's next turn (expiresAfterTurn = turn count when played + total players)
    s.activeShields[ctx.player] = {
      expiresAtTurnIndex: s.turnCount + s.players.length,
    };
    return {
      state: s,
      events: [
        {
          type: 'cardEffectApplied',
          cardId: 'escudo_bananildo',
          color: ctx.player,
          description: 'Escudo de Bananildo ativado! Próxima captura será bloqueada.',
        },
      ],
    };
  },
};

/**
 * Dado Turbinado
 * Tipo: ajuda
 * Efeito: o próximo dado pode ser escolhido entre dois valores (ex.: 3 ou 4).
 * Condição: só pode ser usada com pelo menos uma peça fora da base.
 * Custo: a jogada é consumida (pula o rolar dado tradicional e oferece os valores).
 */
export const dadoTurbinado: CardDefinition = {
  id: 'dado_turbinado',
  name: 'Dado Turbinado',
  shortText: 'Escolha o valor do dado entre duas opções turbinadas (3 ou 4).',
  type: 'ajuda',
  target: 'self',
  timing: 'before_roll',
  costDescription: 'Consome a rolagem comum',
  durationDescription: 'Turno atual',
  canPlay: (state, player, payload) => {
    if (state.phase !== 'roll') return false;
    // Pelo menos uma peça fora da base e não terminada
    const hasActiveToken = state.tokens[player].some((p) => p > BASE && p < GOAL);
    return hasActiveToken;
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const chosen = ctx.payload?.chosenValue ?? 4;
    s.dice = chosen;
    s.phase = 'move';
    return {
      state: s,
      events: [
        {
          type: 'diceRolled',
          color: ctx.player,
          value: chosen,
        },
        {
          type: 'cardEffectApplied',
          cardId: 'dado_turbinado',
          color: ctx.player,
          description: `Dado Turbinado ativado! O dado foi definido para ${chosen}.`,
        },
      ],
    };
  },
};

/**
 * Atalho do Cocorina
 * Tipo: ajuda
 * Efeito: move uma peça 4 casas à frente.
 * Condição: não pode passar pela coluna final nem ocupar casa segura.
 * Custo: a peça fica numa casa comum, sem proteção.
 */
export const atalhoCocorina: CardDefinition = {
  id: 'atalho_cocorina',
  name: 'Atalho do Cocorina',
  shortText: 'Avança uma peça em 4 casas (apenas no anel comum e para casa comum).',
  type: 'ajuda',
  target: 'self',
  timing: 'anytime_in_turn',
  costDescription: 'A peça vai para casa comum sem proteção',
  durationDescription: 'Instantâneo',
  canPlay: (state, player, payload) => {
    const token = payload?.tokenIndex;
    if (token === undefined) {
      // General check: is there any token that satisfies the conditions?
      return state.tokens[player].some((p, i) => canMoveAtalho(state, player, i));
    }
    return canMoveAtalho(state, player, token);
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const token = ctx.payload?.tokenIndex ?? 0;
    const from = s.tokens[ctx.player][token];
    const to = from + 4;
    s.tokens[ctx.player][token] = to;

    const path: number[] = [];
    for (let p = from + 1; p <= to; p++) path.push(p);

    return {
      state: s,
      events: [
        {
          type: 'tokenMoved',
          color: ctx.player,
          token,
          path,
        },
        {
          type: 'cardEffectApplied',
          cardId: 'atalho_cocorina',
          color: ctx.player,
          description: `Atalho do Cocorina! Peça ${token + 1} avançou 4 casas.`,
        },
      ],
    };
  },
};

function canMoveAtalho(state: GameState, color: import('../rules').Color, tokenIndex: number): boolean {
  const p = state.tokens[color][tokenIndex];
  if (p === BASE || p >= GOAL) return false;
  const to = p + 4;
  // Não pode passar nem entrar na coluna final (LAST_TRACK = 50)
  if (to > LAST_TRACK) return false;
  // Não pode ocupar casa segura
  const abs = absPos(color, to);
  if (abs !== null && state.rules.safeSquares.includes(abs)) return false;
  return true;
}

/**
 * Ressurreição
 * Tipo: ajuda
 * Efeito: uma peça capturada no último turno volta à casa de saída (progress 0), em vez da base.
 * Condição: uma vez por partida por jogador; deve haver uma peça capturada no último turno.
 */
export const ressurreicao: CardDefinition = {
  id: 'ressurreicao',
  name: 'Ressurreição',
  shortText: 'Uma peça capturada volta à casa de saída em vez da base (1x por partida).',
  type: 'ajuda',
  target: 'self',
  timing: 'anytime_in_turn',
  costDescription: 'Uma vez por partida',
  durationDescription: 'Instantâneo',
  canPlay: (state, player) => {
    if (state.usedRessurreicao?.[player]) return false;
    const lastCaptured = state.lastCapturedToken?.[player];
    return lastCaptured !== undefined && state.tokens[player][lastCaptured] === BASE;
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    s.usedRessurreicao = s.usedRessurreicao || {};
    s.usedRessurreicao[ctx.player] = true;

    const token = s.lastCapturedToken![ctx.player]!;
    s.tokens[ctx.player][token] = 0; // Saída
    s.lastCapturedToken![ctx.player] = undefined;

    return {
      state: s,
      events: [
        {
          type: 'tokenMoved',
          color: ctx.player,
          token,
          path: [0],
        },
        {
          type: 'cardEffectApplied',
          cardId: 'ressurreicao',
          color: ctx.player,
          description: `Ressurreição! Peça ${token + 1} voltou diretamente para a saída!`,
        },
      ],
    };
  },
};

// Register Subphase 1 cards
registerCard(escudoBananildo);
registerCard(dadoTurbinado);
registerCard(atalhoCocorina);
registerCard(ressurreicao);

/**
 * Escorregão do Abelardo
 * Tipo: ataque
 * Efeito: uma peça adversária escolhida recua 3 casas.
 * Condição: não pode retroceder para antes da casa de saída (progress 0) da cor dela. Não captura.
 * Custo: o jogador perde o próximo movimento de peça (skipNextMove[player] = true).
 */
export const escorregaoAbelardo: CardDefinition = {
  id: 'escorregao_abelardo',
  name: 'Escorregão do Abelardo',
  shortText: 'Uma peça adversária recua 3 casas (não antes da saída). Você perde o próximo movimento!',
  type: 'ataque',
  target: 'adversary_chosen',
  timing: 'anytime_in_turn',
  costDescription: 'Você perde seu próximo movimento de peça',
  durationDescription: 'Instantâneo',
  canPlay: (state, player, payload) => {
    const targetPlayer = payload?.targetPlayer;
    const targetToken = payload?.targetTokenIndex;
    if (!targetPlayer || targetPlayer === player) return false;
    if (targetToken === undefined) {
      // Check if target player has any token eligible
      return state.tokens[targetPlayer].some((p) => p >= 3 && p <= LAST_TRACK);
    }
    const p = state.tokens[targetPlayer][targetToken];
    return p !== undefined && p >= 3 && p <= LAST_TRACK;
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const targetP = ctx.payload!.targetPlayer!;
    const targetT = ctx.payload!.targetTokenIndex ?? 0;
    const from = s.tokens[targetP][targetT];
    const to = Math.max(0, from - 3);
    s.tokens[targetP][targetT] = to;

    // Apply cost: attacker skips next piece move
    s.skipNextMove = s.skipNextMove || {};
    s.skipNextMove[ctx.player] = true;

    return {
      state: s,
      events: [
        {
          type: 'tokenMoved',
          color: targetP,
          token: targetT,
          path: [to],
        },
        {
          type: 'cardEffectApplied',
          cardId: 'escorregao_abelardo',
          color: ctx.player,
          description: `Escorregão do Abelardo! Peça do ${targetP} escorregou para a casa ${to}.`,
        },
      ],
    };
  },
};

/**
 * Tapete Mágico
 * Tipo: ataque
 * Efeito: troca de lugar com uma peça adversária escolhida.
 * Condição: não vale se alguma das duas estiver em casa segura. Só pode se a peça do jogador estiver em casa comum.
 */
export const tapeteMagico: CardDefinition = {
  id: 'tapete_magico',
  name: 'Tapete Mágico',
  shortText: 'Troca de lugar entre sua peça e uma peça adversária em casa comum.',
  type: 'ataque',
  target: 'adversary_chosen',
  timing: 'anytime_in_turn',
  costDescription: 'Sem custo adicional',
  durationDescription: 'Instantâneo',
  canPlay: (state, player, payload) => {
    const myToken = payload?.tokenIndex;
    const targetP = payload?.targetPlayer;
    const targetT = payload?.targetTokenIndex;

    if (!targetP || targetP === player) return false;
    if (myToken === undefined || targetT === undefined) {
      // General check
      return (
        state.tokens[player].some((_, mi) =>
          state.tokens[targetP].some((_, ti) => canSwapTapete(state, player, mi, targetP, ti))
        )
      );
    }
    return canSwapTapete(state, player, myToken, targetP, targetT);
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const myT = ctx.payload!.tokenIndex!;
    const targetP = ctx.payload!.targetPlayer!;
    const targetT = ctx.payload!.targetTokenIndex!;

    const myProg = s.tokens[ctx.player][myT];
    const targetProg = s.tokens[targetP][targetT];

    const myAbs = absPos(ctx.player, myProg)!;
    const targetAbs = absPos(targetP, targetProg)!;

    // Convert absolute positions to the other player's progress
    const newMyProg = (targetAbs - START[ctx.player] + TRACK_LEN) % TRACK_LEN;
    const newTargetProg = (myAbs - START[targetP] + TRACK_LEN) % TRACK_LEN;

    s.tokens[ctx.player][myT] = newMyProg;
    s.tokens[targetP][targetT] = newTargetProg;

    return {
      state: s,
      events: [
        {
          type: 'tokenMoved',
          color: ctx.player,
          token: myT,
          path: [newMyProg],
        },
        {
          type: 'tokenMoved',
          color: targetP,
          token: targetT,
          path: [newTargetProg],
        },
        {
          type: 'cardEffectApplied',
          cardId: 'tapete_magico',
          color: ctx.player,
          description: `Tapete Mágico! ${ctx.player} e ${targetP} trocaram de lugar no tabuleiro!`,
        },
      ],
    };
  },
};

function canSwapTapete(
  state: GameState,
  p1: Color,
  t1: number,
  p2: Color,
  t2: number
): boolean {
  const prog1 = state.tokens[p1][t1];
  const prog2 = state.tokens[p2][t2];
  if (prog1 === BASE || prog1 > LAST_TRACK) return false;
  if (prog2 === BASE || prog2 > LAST_TRACK) return false;

  const abs1 = absPos(p1, prog1);
  const abs2 = absPos(p2, prog2);
  if (abs1 === null || abs2 === null) return false;

  if (state.rules.safeSquares.includes(abs1) || state.rules.safeSquares.includes(abs2)) {
    return false;
  }
  return true;
}

/**
 * Gripe do Seu Gelinho
 * Tipo: ataque
 * Efeito: o adversário escolhido não pode mover peças no próximo turno dele, mas pode usar cartas.
 * Condição: não pode ser usada contra quem está com todas as peças na base.
 */
export const gripeGelinho: CardDefinition = {
  id: 'gripe_gelinho',
  name: 'Gripe do Seu Gelinho',
  shortText: 'O adversário escolhido fica gripado e não move peças no próximo turno.',
  type: 'ataque',
  target: 'adversary_chosen',
  timing: 'anytime_in_turn',
  costDescription: 'Sem custo',
  durationDescription: 'Próximo turno do adversário',
  canPlay: (state, player, payload) => {
    const targetP = payload?.targetPlayer;
    if (!targetP || targetP === player) return false;
    // Not with all tokens in base
    const hasOut = state.tokens[targetP].some((p) => p !== BASE);
    return hasOut;
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const targetP = ctx.payload!.targetPlayer!;
    s.skipNextMove = s.skipNextMove || {};
    s.skipNextMove[targetP] = true;
    return {
      state: s,
      events: [
        {
          type: 'cardEffectApplied',
          cardId: 'gripe_gelinho',
          color: ctx.player,
          description: `Atchim! ${targetP} pegou a Gripe do Seu Gelinho e não moverá peças no próximo turno!`,
        },
      ],
    };
  },
};

/**
 * Bolo que caiu
 * Tipo: ataque
 * Efeito: todas as peças de um adversário escolhido voltam 1 casa. Sem captura.
 * Condição: só afeta peças no anel comum com progresso > 0.
 */
export const boloCaiu: CardDefinition = {
  id: 'bolo_caiu',
  name: 'Bolo que caiu',
  shortText: 'Todas as peças de um adversário escolhido voltam 1 casa.',
  type: 'ataque',
  target: 'adversary_chosen',
  timing: 'anytime_in_turn',
  costDescription: 'Sem custo',
  durationDescription: 'Instantâneo',
  canPlay: (state, player, payload) => {
    const targetP = payload?.targetPlayer;
    if (!targetP || targetP === player) return false;
    return state.tokens[targetP].some((p) => p > 0 && p <= LAST_TRACK);
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const targetP = ctx.payload!.targetPlayer!;
    const ev: import('../engine').GameEvent[] = [];

    s.tokens[targetP].forEach((p, i) => {
      if (p > 0 && p <= LAST_TRACK) {
        s.tokens[targetP][i] = p - 1;
        ev.push({
          type: 'tokenMoved',
          color: targetP,
          token: i,
          path: [p - 1],
        });
      }
    });

    ev.push({
      type: 'cardEffectApplied',
      cardId: 'bolo_caiu',
      color: ctx.player,
      description: `Bolo que caiu! Que desastre: as peças de ${targetP} recuaram 1 casa!`,
    });

    return { state: s, events: ev };
  },
};

// Register Subphase 2 cards
registerCard(escorregaoAbelardo);
registerCard(tapeteMagico);
registerCard(gripeGelinho);
registerCard(boloCaiu);

/**
 * Troca de Chapéus
 * Tipo: caos
 * Efeito: troca as posições das peças entre todos os jogadores (rotaciona as posições relativas às pistas), mantendo a cor.
 * Condição: proibida se algum jogador estiver a menos de 5 casas da chegada (progress >= GOAL - 5).
 * Peso baixo no baralho.
 */
export const trocaChapeus: CardDefinition = {
  id: 'troca_chapeus',
  name: 'Troca de Chapéus',
  shortText: 'Gira as posições de todas as peças entre os jogadores! Proibida se alguém estiver a <5 da chegada.',
  type: 'caos',
  target: 'all',
  timing: 'anytime_in_turn',
  costDescription: 'Sem custo',
  durationDescription: 'Instantâneo',
  canPlay: (state) => {
    // Proibida se alguém estiver a menos de 5 casas da chegada (GOAL = 56, 56 - 5 = 51)
    for (const col of state.players) {
      if (state.tokens[col].some((p) => p >= GOAL - 5 && p < GOAL)) {
        return false;
      }
    }
    // Must have at least one token outside base across all players
    return state.players.some((col) => state.tokens[col].some((p) => p !== BASE && p !== GOAL));
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const players = s.players;
    const n = players.length;
    // Circular shift of token positions: player[i] gets player[(i - 1 + n) % n]'s tokens
    const oldTokens: Record<string, number[]> = {};
    for (const col of players) {
      oldTokens[col] = [...s.tokens[col]];
    }

    for (let i = 0; i < n; i++) {
      const targetCol = players[i];
      const sourceCol = players[(i - 1 + n) % n];
      s.tokens[targetCol] = [...oldTokens[sourceCol]];
    }

    return {
      state: s,
      events: [
        {
          type: 'cardEffectApplied',
          cardId: 'troca_chapeus',
          color: ctx.player,
          description: `Troca de Chapéus! Um redemoinho trocou as posições de todas as peças!`,
        },
      ],
    };
  },
};

/**
 * Dança Obrigatória
 * Tipo: caos
 * Efeito: o adversário escolhido pula a próxima vez de jogar (skipNextTurn[adversary] = true).
 * Pode ser cancelada por Contra-dança.
 */
export const dancaObrigatoria: CardDefinition = {
  id: 'danca_obrigatoria',
  name: 'Dança Obrigatória',
  shortText: 'O adversário escolhido é forçado a dançar e pula a próxima vez de jogar.',
  type: 'caos',
  target: 'adversary_chosen',
  timing: 'anytime_in_turn',
  costDescription: 'Sem custo',
  durationDescription: 'Próxima rodada do adversário',
  canPlay: (state, player, payload) => {
    const targetP = payload?.targetPlayer;
    return !!targetP && targetP !== player;
  },
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    const s = structuredClone(ctx.state);
    const targetP = ctx.payload!.targetPlayer!;
    s.skipNextTurn = s.skipNextTurn || {};
    s.skipNextTurn[targetP] = true;
    return {
      state: s,
      events: [
        {
          type: 'cardEffectApplied',
          cardId: 'danca_obrigatoria',
          color: ctx.player,
          description: `Dança Obrigatória! ${targetP} começou a sambar sem parar e vai pular a vez!`,
        },
      ],
    };
  },
};

/**
 * Contra-dança
 * Tipo: defesa / cancelamento
 * Efeito: cancela uma carta de ataque que acabou de ser usada contra o dono.
 * Não cancela cartas de caos. Não há cadeia infinita (não cancela outra Contra-dança).
 * Passiva/Reativa: verificada automaticamente em engine.ts no applyCard quando o jogador alvo a possui na mão.
 */
export const contraDanca: CardDefinition = {
  id: 'contra_danca',
  name: 'Contra-dança',
  shortText: 'Cancela automaticamente uma carta de ataque usada contra você (não cancela caos).',
  type: 'defesa',
  target: 'self',
  timing: 'anytime_in_turn',
  costDescription: 'Consumida na reação',
  durationDescription: 'Reação imediata',
  canPlay: () => false, // Played automatically as reaction when attacked
  applyEffect: (ctx: CardEffectContext): CardEffectResult => {
    return {
      state: ctx.state,
      events: [
        {
          type: 'cardEffectApplied',
          cardId: 'contra_danca',
          color: ctx.player,
          description: 'Contra-dança bloqueou o ataque com sucesso!',
        },
      ],
    };
  },
};

// Register Subphase 3 cards
registerCard(trocaChapeus);
registerCard(dancaObrigatoria);
registerCard(contraDanca);

