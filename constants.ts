
import { Direction, Point, Difficulty } from './types';

export const GRID_SIZE = 20;
export const CONSTANT_SPEED = 110; // Stała prędkość ruchu (ms)
export const SPEED_INCREMENT = 0; // Brak przyspieszania
export const MIN_SPEED = 110;
export const GRACE_PERIOD_MS = 500; // 0.5 sekundy na reakcję przy kolizji

export const DIFFICULTY_SPEEDS: Record<Difficulty, number> = {
  [Difficulty.EASY]: 110,
  [Difficulty.NORMAL]: 110,
  [Difficulty.HARD]: 110,
  [Difficulty.HARDCORE]: 110,
};

export const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

export const INITIAL_DIRECTION = Direction.UP;

export const KEY_MAP: Record<string, Direction> = {
  ArrowUp: Direction.UP,
  ArrowDown: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  w: Direction.UP,
  s: Direction.DOWN,
  a: Direction.LEFT,
  d: Direction.RIGHT,
};

export const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
};
