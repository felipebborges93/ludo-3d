import { CardDefinition, DeckConfiguration } from './types';
import { Color } from '../rules';
import { absPos } from '../engine';

/**
 * Deck configuration with initial cards and weights.
 * Luck squares favor defense and help (higher weight).
 * Bad luck squares favor attack and chaos (higher weight).
 */
export const INITIAL_DECK_CONFIG: DeckConfiguration = {
  // Luck deck distribution: ~80% defense/help, ~20% other
  luckWeights: {
    // Defense / Help
    escudo_bananildo: 25,
    dado_turbinado: 25,
    atalho_cocorina: 25,
    ressurreicao: 15,
    // Attack / Chaos (low weight on luck)
    escorregao_abelardo: 3,
    tapete_magico: 3,
    gripe_gelinho: 2,
    bolo_caiu: 2,
  },
  // Bad luck deck distribution: ~70% attack, ~30% chaos/defense
  badLuckWeights: {
    escorregao_abelardo: 25,
    tapete_magico: 20,
    gripe_gelinho: 20,
    bolo_caiu: 15,
    // Chaos & Defense/Help
    troca_chapeus: 5,
    danca_obrigatoria: 5,
    contra_danca: 5,
    escudo_bananildo: 5,
  },
};

/**
 * Registry of card definitions.
 * Implemented incrementally per subphase.
 */
export const CARD_REGISTRY: Record<string, CardDefinition> = {};

export function registerCard(card: CardDefinition) {
  CARD_REGISTRY[card.id] = card;
}

export function getCard(id: string): CardDefinition | undefined {
  return CARD_REGISTRY[id];
}
