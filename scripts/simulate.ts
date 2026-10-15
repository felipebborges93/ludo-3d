import { apply, createGame, currentColor, GameState } from '../src/game/engine';
import { chooseCardAction, chooseMove } from '../src/ai/bot';
import { Color } from '../src/game/rules';
import '../src/game/cards/effects';
import * as fs from 'fs';
import * as path from 'path';

interface CardStats {
  obtained: number;
  used: number;
  winsWhenUsed: number;
  totalGamesUsed: number;
  winsWhenNotUsed: number;
  totalGamesNotUsed: number;
}

const ALL_CARDS = [
  'escudo_bananildo',
  'dado_turbinado',
  'atalho_cocorina',
  'ressurreicao',
  'escorregao_abelardo',
  'tapete_magico',
  'gripe_gelinho',
  'bolo_caiu',
  'troca_chapeus',
  'danca_obrigatoria',
  'contra_danca',
];

export function runSimulation(totalGames = 10000, maxTurnsPerGame = 2000) {
  console.log(`\nIniciando simulação de ${totalGames.toLocaleString()} partidas de Ludo 3D com bots...`);
  const startTime = Date.now();

  const stats: Record<string, CardStats> = {};
  for (const c of ALL_CARDS) {
    stats[c] = {
      obtained: 0,
      used: 0,
      winsWhenUsed: 0,
      totalGamesUsed: 0,
      winsWhenNotUsed: 0,
      totalGamesNotUsed: 0,
    };
  }

  let lockedGames = 0;
  const players: Color[] = ['red', 'green', 'yellow', 'blue'];

  for (let g = 0; g < totalGames; g++) {
    const seed = 100000 + g * 37;
    let s: GameState = createGame(players, seed);

    const cardsObtainedInGame = new Set<string>();
    const cardsUsedByPlayer: Record<string, Set<string>> = {
      red: new Set(),
      green: new Set(),
      yellow: new Set(),
      blue: new Set(),
    };

    let turns = 0;

    while (s.phase !== 'over' && turns < maxTurnsPerGame) {
      turns++;

      // Try bot card usage before roll
      if (s.phase === 'roll') {
        const cardAction = chooseCardAction(s);
        if (cardAction) {
          const c = currentColor(s);
          cardsUsedByPlayer[c].add(cardAction.cardId);
          stats[cardAction.cardId].used++;
          try {
            const res = apply(s, { type: 'playCard', ...cardAction });
            s = res.state;
          } catch {
            // Card failed or couldn't play, proceed
          }
        }
      }

      // Roll
      if (s.phase === 'roll') {
        const res = apply(s, { type: 'roll' });
        s = res.state;
      }

      // Move phase
      if (s.phase === 'move') {
        // Try card action in move phase if not yet played
        const cardAction = chooseCardAction(s);
        if (cardAction) {
          const c = currentColor(s);
          cardsUsedByPlayer[c].add(cardAction.cardId);
          stats[cardAction.cardId].used++;
          try {
            const res = apply(s, { type: 'playCard', ...cardAction });
            s = res.state;
          } catch {
            // Proceed
          }
        }

        if (s.phase === 'move') {
          const move = chooseMove(s, 'medium');
          if (move !== -1) {
            const res = apply(s, { type: 'move', token: move });
            s = res.state;
            for (const ev of res.events) {
              if (ev.type === 'cardDrawn') {
                stats[ev.cardId].obtained++;
                cardsObtainedInGame.add(ev.cardId);
              }
            }
          }
        }
      }
    }

    if (s.phase !== 'over') {
      lockedGames++;
    } else {
      const winner = s.winner!;
      // Aggregate win rates per card
      for (const cardId of ALL_CARDS) {
        for (const p of players) {
          const used = cardsUsedByPlayer[p].has(cardId);
          if (used) {
            stats[cardId].totalGamesUsed++;
            if (p === winner) stats[cardId].winsWhenUsed++;
          } else {
            stats[cardId].totalGamesNotUsed++;
            if (p === winner) stats[cardId].winsWhenNotUsed++;
          }
        }
      }
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSimulação concluída em ${durationSec}s!`);
  console.log(`Partidas sem vencedor após ${maxTurnsPerGame} turnos: ${lockedGames}`);

  // Generate CSV and display summary
  const rows = [
    'card_id,obtained,used,winrate_when_used,winrate_when_not_used,diff_percentage_points,status',
  ];

  console.log('\n--- Relatório de Balanceamento de Cartas ---');
  console.log(
    'Carta'.padEnd(22) +
      'Obtida'.padStart(8) +
      'Usada'.padStart(8) +
      'WR Usada'.padStart(11) +
      'WR Não Us'.padStart(11) +
      'Delta (pp)'.padStart(12) +
      '  Alerta'
  );
  console.log('-'.repeat(80));

  for (const cardId of ALL_CARDS) {
    const st = stats[cardId];
    const wrUsed = st.totalGamesUsed > 0 ? (st.winsWhenUsed / st.totalGamesUsed) * 100 : 25.0;
    const wrNotUsed =
      st.totalGamesNotUsed > 0 ? (st.winsWhenNotUsed / st.totalGamesNotUsed) * 100 : 25.0;
    const diff = wrUsed - wrNotUsed;
    const alert = Math.abs(diff) > 5.0 ? '⚠️  > 5pp' : '✅ OK';

    rows.push(
      `${cardId},${st.obtained},${st.used},${wrUsed.toFixed(2)}%,${wrNotUsed.toFixed(
        2
      )}%,${diff.toFixed(2)},${alert}`
    );

    console.log(
      cardId.padEnd(22) +
        String(st.obtained).padStart(8) +
        String(st.used).padStart(8) +
        `${wrUsed.toFixed(1)}%`.padStart(11) +
        `${wrNotUsed.toFixed(1)}%`.padStart(11) +
        `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`.padStart(12) +
        `  ${alert}`
    );
  }

  const csvPath = path.resolve(process.cwd(), 'scripts/balance_report.csv');
  fs.writeFileSync(csvPath, rows.join('\n'), 'utf-8');
  console.log(`\nRelatório CSV salvo em: ${csvPath}\n`);
}

// Execute if run directly
runSimulation();
