export const COLORS = ['red', 'green', 'yellow', 'blue'] as const;
export type Color = (typeof COLORS)[number];

/** Absolute track index where each color enters the common track. */
export const START: Record<Color, number> = { red: 0, green: 13, yellow: 26, blue: 39 };

export const TRACK_LEN = 52;
/** Token progress: -1 = base, 0..50 = common track, 51..55 = home column, 56 = goal. */
export const BASE = -1;
export const LAST_TRACK = 50;
export const GOAL = 56;

export interface RulesConfig {
  tokensPerPlayer: number;
  enterOn: number[];
  sixGivesExtraTurn: boolean;
  /** Rolling this many sixes in a row forfeits the turn. */
  maxConsecutiveSixes: number;
  captureGivesExtraTurn: boolean;
  finishGivesExtraTurn: boolean;
  exactRollToFinish: boolean;
  safeSquares: number[];
}

export const DEFAULT_RULES: RulesConfig = {
  tokensPerPlayer: 4,
  enterOn: [6],
  sixGivesExtraTurn: true,
  maxConsecutiveSixes: 3,
  captureGivesExtraTurn: true,
  finishGivesExtraTurn: true,
  exactRollToFinish: true,
  safeSquares: [0, 8, 13, 21, 26, 34, 39, 47],
};
