
export type Point = {
  x: number;
  y: number;
};

export interface Food extends Point {
  createdAt: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  WON = 'WON',
  STALLED = 'STALLED'
}

export enum FoodMode {
  NORMAL = 'NORMAL',
  MAGNET = 'MAGNET',
  FADING = 'FADING'
}

export enum GameMode {
  NORMAL = 'NORMAL',
  WRAP = 'WRAP',
  STOP = 'STOP',
  GOD = 'GOD'
}

export enum GameType {
  SOLO = 'SOLO',
  VERSUS = 'VERSUS',
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  HARDCORE = 'HARDCORE',
}

export interface GameSettings {
  foodCount: number;
  foodMode: FoodMode;
  snakeColor: string;
  mode: GameMode;
  gridSize: number;
  difficulty: Difficulty;
  targetScore: number | 'max';
}

export interface GameState {
  snake: Point[];
  foods: Food[];
  direction: Direction;
  status: GameStatus;
  score: number;
  highScore: number;
  speed: number;
  settings: GameSettings;
  isAutoPilot: boolean;
}

export interface AICommentary {
  message: string;
  type: 'encouragement' | 'sarcasm' | 'advice' | 'congratulations';
}
