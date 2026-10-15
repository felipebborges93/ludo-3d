import { Color, RulesConfig } from '../rules';
import { GameState, GameEvent } from '../engine';

export type CardType = 'defesa' | 'ajuda' | 'ataque' | 'caos';

export type CardTarget = 'self' | 'adversary_chosen' | 'all' | 'none';

export type CardTiming = 'before_roll' | 'after_roll' | 'anytime_in_turn';

export interface CardActionPayload {
  tokenIndex?: number;
  targetPlayer?: Color;
  targetTokenIndex?: number;
  chosenValue?: number;
}

export interface CardEffectContext {
  state: GameState;
  player: Color;
  payload?: CardActionPayload;
}

export interface CardEffectResult {
  state: GameState;
  events: GameEvent[];
}

export interface CardDefinition {
  id: string;
  name: string;
  shortText: string;
  type: CardType;
  target: CardTarget;
  timing: CardTiming;
  costDescription: string;
  durationDescription: string;
  /** Check if the card can currently be played by this player */
  canPlay: (state: GameState, player: Color, payload?: CardActionPayload) => boolean;
  /** Pure effect application returning updated state and emitted events */
  applyEffect: (ctx: CardEffectContext) => CardEffectResult;
}

export interface CardDeckConfigItem {
  id: string;
  weight: number; // weight in deck
}

export interface DeckConfiguration {
  luckWeights: Record<string, number>;
  badLuckWeights: Record<string, number>;
}
