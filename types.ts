
export type Point = {
  x: number;
  y: number;
};

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
}

export enum GameMode {
  NORMAL = 'NORMAL',
  WRAP = 'WRAP',
  STOP = 'STOP',
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
  snakeColor: string;
  mode: GameMode;
  gridSize: number;
  difficulty: Difficulty;
}

export interface GameState {
  snake: Point[];
  foods: Point[];
  direction: Direction;
  status: GameStatus;
  score: number;
  highScore: number;
  speed: number;
  settings: GameSettings;
  isAutoPilot: boolean;
}

// Fixed missing AICommentary interface definition
export interface AICommentary {
  message: string;
  type: 'encouragement' | 'sarcasm' | 'advice' | 'congratulations';
}
