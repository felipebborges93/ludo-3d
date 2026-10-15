import { BASE, Color, GOAL, LAST_TRACK, START, TRACK_LEN } from '../game/rules';

/** Board geometry on a 15x15 grid: [col, row], row 0 = far side. Pure data, no Three.js. */
export type Cell = [number, number];

const seg = (from: Cell, dir: Cell, n: number): Cell[] =>
  Array.from({ length: n }, (_, i) => [from[0] + dir[0] * i, from[1] + dir[1] * i] as Cell);

/** 52 track squares clockwise, index 0 = red start. */
export const TRACK: Cell[] = [
  ...seg([1, 6], [1, 0], 5), ...seg([6, 5], [0, -1], 6), [7, 0],
  ...seg([8, 0], [0, 1], 6), ...seg([9, 6], [1, 0], 6), [14, 7],
  ...seg([14, 8], [-1, 0], 6), ...seg([8, 9], [0, 1], 6), [7, 14],
  ...seg([6, 14], [0, -1], 6), ...seg([5, 8], [-1, 0], 6), [0, 7], [0, 6],
];

export const HOME_COL: Record<Color, Cell[]> = {
  red: seg([1, 7], [1, 0], 5),
  green: seg([7, 1], [0, 1], 5),
  yellow: seg([13, 7], [-1, 0], 5),
  blue: seg([7, 13], [0, -1], 5),
};

/** Top-left corner of each 6x6 base quadrant. */
export const BASE_ORIGIN: Record<Color, Cell> = { red: [0, 0], green: [9, 0], yellow: [9, 9], blue: [0, 9] };

const SPOTS: Cell[] = [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]];
const GOAL_OFFSET: Record<Color, Cell> = { red: [-0.6, 0], green: [0, -0.6], yellow: [0.6, 0], blue: [0, 0.6] };

/** Grid position (fractional) of a token given its progress. */
export function tokenCell(color: Color, progress: number, token: number): Cell {
  if (progress === BASE) {
    const o = BASE_ORIGIN[color];
    return [o[0] + SPOTS[token][0], o[1] + SPOTS[token][1]];
  }
  if (progress === GOAL) {
    const g = GOAL_OFFSET[color];
    return [7 + g[0] + (token - 1.5) * 0.15, 7 + g[1] + (token - 1.5) * 0.15];
  }
  const c = progress <= LAST_TRACK ? TRACK[(START[color] + progress) % TRACK_LEN] : HOME_COL[color][progress - LAST_TRACK - 1];
  // ponytail: fixed per-token offset so stacked tokens stay visible; real stacking layout later if needed.
  return [c[0] + (token % 2 ? 0.12 : -0.12), c[1] + (token < 2 ? -0.12 : 0.12)];
}
