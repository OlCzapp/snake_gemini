
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Point, Food, Direction, GameStatus, GameState, GameSettings, GameMode, Difficulty, FoodMode } from '../types';
import { 
  INITIAL_SNAKE, 
  INITIAL_DIRECTION, 
  KEY_MAP, 
  OPPOSITE_DIRECTIONS,
  CONSTANT_SPEED,
  GRACE_PERIOD_MS
} from '../constants';

const COLORS = [
  { name: 'Błękit', value: '#22d3ee', glow: '0 0 10px #22d3ee' },
  { name: 'Limonka', value: '#a3e635', glow: '0 0 10px #a3e635' },
  { name: 'Róż', value: '#f472b6', glow: '0 0 10px #f472b6' },
  { name: 'Żółty', value: '#facc15', glow: '0 0 10px #facc15' },
  { name: 'Pomarańcz', value: '#fb923c', glow: '0 0 10px #fb923c' },
];

const MODES = [
  { id: GameMode.NORMAL, name: 'Normalny', desc: 'Ściany zabijają' },
  { id: GameMode.WRAP, name: 'Tunel', desc: 'Przenikanie ścian' },
  { id: GameMode.STOP, name: 'Zderzak', desc: 'Zatrzymuje na krawędzi' },
  { id: GameMode.GOD, name: 'Boski', desc: 'Nieśmiertelność i blokada na ogonie' },
];

const FOOD_MODES_INFO = [
  { id: FoodMode.NORMAL, name: 'Normalny', icon: 'fa-bowling-ball', desc: 'Kule są stałe' },
  { id: FoodMode.MAGNET, name: 'Magnez', icon: 'fa-magnet', desc: 'Kule śledzą węża' },
  { id: FoodMode.FADING, name: 'Znikanie', icon: 'fa-wind', desc: 'Kule nikną po 10s' },
];

interface SnakeGameProps {
  onStateChange: (status: GameStatus, score: number) => void;
  isAIOpponent?: boolean;
  externalStatus?: GameStatus;
  sharedSettings?: GameSettings;
  isDark?: boolean;
}

export interface SnakeGameHandle {
  reset: () => void;
  pause: () => void;
  resume: () => void;
  toggleAutoPilot: () => void;
  getScore: () => number;
}

const SnakeGame = forwardRef<SnakeGameHandle, SnakeGameProps>(({ onStateChange, isAIOpponent = false, externalStatus, sharedSettings, isDark = true }, ref) => {
  const [game, setGame] = useState<GameState>({
    snake: INITIAL_SNAKE,
    foods: [],
    direction: INITIAL_DIRECTION,
    status: GameStatus.IDLE,
    score: 0,
    highScore: Number(localStorage.getItem('highScore')) || 0,
    speed: CONSTANT_SPEED,
    isAutoPilot: isAIOpponent,
    settings: sharedSettings || {
      foodCount: 10,
      foodMode: FoodMode.NORMAL,
      snakeColor: isAIOpponent ? COLORS[2].value : COLORS[0].value,
      mode: GameMode.NORMAL,
      gridSize: 20,
      difficulty: Difficulty.NORMAL,
      targetScore: 'max'
    }
  });

  const [isWaitingForFirstMove, setIsWaitingForFirstMove] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  
  const gameLoopRef = useRef<number | null>(null);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const lastProcessedDirectionRef = useRef<Direction>(INITIAL_DIRECTION);
  const stallTimerRef = useRef<number | null>(null);
  const graceTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<Point | null>(null);
  const magnetCounterRef = useRef<number>(0);

  useEffect(() => {
    if (sharedSettings) {
      setGame(prev => ({ 
        ...prev, 
        settings: { ...sharedSettings, snakeColor: isAIOpponent ? COLORS[2].value : sharedSettings.snakeColor },
        speed: CONSTANT_SPEED
      }));
    }
  }, [sharedSettings, isAIOpponent]);

  useEffect(() => {
    if (externalStatus !== undefined && externalStatus !== game.status) {
      if (externalStatus === GameStatus.PLAYING && game.status === GameStatus.IDLE) {
        resetGame();
      } else {
        setGame(prev => ({ ...prev, status: externalStatus }));
      }
    }
  }, [externalStatus]);

  const generateFood = useCallback((snake: Point[], count: number, gridSize: number, existingFoods: Food[] = []): Food[] => {
    const newFoods: Food[] = [...existingFoods];
    const maxPossibleFoods = (gridSize * gridSize) - snake.length;
    const targetCount = Math.min(count, maxPossibleFoods);

    while (newFoods.length < targetCount) {
      const foodPos = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
      };
      const onSnake = snake.some(s => s.x === foodPos.x && s.y === foodPos.y);
      const onFood = newFoods.some(f => f.x === foodPos.x && f.y === foodPos.y);
      if (!onSnake && !onFood) {
        newFoods.push({ ...foodPos, createdAt: Date.now() });
      }
    }
    return newFoods;
  }, []);

  const resetGame = () => {
    const newSnake = INITIAL_SNAKE;
    const newFoods = generateFood(newSnake, game.settings.foodCount, game.settings.gridSize);
    directionRef.current = INITIAL_DIRECTION;
    lastProcessedDirectionRef.current = INITIAL_DIRECTION;
    setIsGracePeriod(false);
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    setGame(prev => ({
      ...prev,
      snake: newSnake,
      foods: newFoods,
      direction: INITIAL_DIRECTION,
      status: GameStatus.PLAYING,
      score: 0,
      speed: CONSTANT_SPEED,
      isAutoPilot: isAIOpponent
    }));
    
    if (!isAIOpponent) {
      setIsWaitingForFirstMove(true);
    }
    
    onStateChange(GameStatus.PLAYING, 0);
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  useImperativeHandle(ref, () => ({
    reset: resetGame,
    pause: () => setGame(prev => ({ ...prev, status: GameStatus.PAUSED })),
    resume: () => setGame(prev => ({ ...prev, status: GameStatus.PLAYING })),
    toggleAutoPilot: () => setGame(prev => ({ ...prev, isAutoPilot: !prev.isAutoPilot })),
    getScore: () => game.score
  }));

  const gameOver = () => {
    setGame(prev => {
      const newHighScore = Math.max(prev.score, prev.highScore);
      if (!isAIOpponent) localStorage.setItem('highScore', newHighScore.toString());
      onStateChange(GameStatus.GAME_OVER, prev.score);
      return {
        ...prev,
        status: GameStatus.GAME_OVER,
        highScore: newHighScore,
        isAutoPilot: isAIOpponent
      };
    });
  };

  const gameWon = () => {
    setGame(prev => {
      const newHighScore = Math.max(prev.score, prev.highScore);
      if (!isAIOpponent) localStorage.setItem('highScore', newHighScore.toString());
      onStateChange(GameStatus.WON, prev.score);
      return {
        ...prev,
        status: GameStatus.WON,
        highScore: newHighScore
      };
    });
  };

  const checkStall = (gameState: GameState) => {
    const head = gameState.snake[0];
    const gridSize = gameState.settings.gridSize;
    const snake = gameState.snake;
    
    const possibleMoves = [
      { x: head.x, y: head.y - 1 },
      { x: head.x, y: head.y + 1 },
      { x: head.x - 1, y: head.y },
      { x: head.x + 1, y: head.y },
    ];

    const isTrapped = possibleMoves.every(p => {
      let np = { ...p };
      if (gameState.settings.mode === GameMode.WRAP) {
        np.x = (np.x + gridSize) % gridSize;
        np.y = (np.y + gridSize) % gridSize;
      }
      const outOfBounds = np.x < 0 || np.x >= gridSize || np.y < 0 || np.y >= gridSize;
      const collision = snake.some(s => s.x === np.x && s.y === np.y);
      
      if (gameState.settings.mode === GameMode.GOD) return false;
      if (gameState.settings.mode === GameMode.STOP && outOfBounds) return true;
      if (gameState.settings.mode === GameMode.NORMAL && outOfBounds) return true;
      return collision;
    });

    if (isTrapped && gameState.status === GameStatus.PLAYING) {
      if (!stallTimerRef.current) {
        stallTimerRef.current = window.setTimeout(() => {
          setGame(prev => ({ ...prev, status: GameStatus.STALLED }));
        }, 5000);
      }
    } else {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    }
  };

  const getAIDirection = (currentGameState: GameState): Direction => {
    const head = currentGameState.snake[0];
    const foods = currentGameState.foods;
    const gridSize = currentGameState.settings.gridSize;
    const snake = currentGameState.snake;
    if (foods.length === 0) return directionRef.current;

    const normalize = (p: Point) => {
      if (currentGameState.settings.mode === GameMode.WRAP) {
        return { x: (p.x + gridSize) % gridSize, y: (p.y + gridSize) % gridSize };
      }
      return p;
    };

    const isCollision = (p: Point, checkSnake: Point[]) => {
      const np = normalize(p);
      if (currentGameState.settings.mode !== GameMode.WRAP) {
        if (np.x < 0 || np.x >= gridSize || np.y < 0 || np.y >= gridSize) return true;
      }
      return checkSnake.slice(0, -1).some(s => s.x === np.x && s.y === np.y);
    };

    const calculateAvailableSpace = (startPoint: Point, checkSnake: Point[]) => {
      const start = normalize(startPoint);
      if (isCollision(start, checkSnake)) return 0;
      const visited = new Set<string>();
      const queue: Point[] = [start];
      visited.add(`${start.x},${start.y}`);
      let count = 0;
      const limit = gridSize * gridSize;
      while (queue.length > 0 && count < limit) {
        const p = queue.shift()!;
        count++;
        const neighbors = [{ x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 }, { x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y }].map(normalize);
        for (const n of neighbors) {
          const key = `${n.x},${n.y}`;
          if (!visited.has(key) && !isCollision(n, checkSnake)) {
            visited.add(key);
            queue.push(n);
          }
        }
      }
      return count;
    };

    const target = foods.reduce((prev, curr) => {
      const distPrev = Math.abs(normalize(prev).x - head.x) + Math.abs(normalize(prev).y - head.y);
      const distCurr = Math.abs(normalize(curr).x - head.x) + Math.abs(normalize(curr).y - head.y);
      return distCurr < distPrev ? curr : prev;
    });

    const possibleMoves = [
      { dir: Direction.UP, p: { x: head.x, y: head.y - 1 } },
      { dir: Direction.DOWN, p: { x: head.x, y: head.y + 1 } },
      { dir: Direction.LEFT, p: { x: head.x - 1, y: head.y } },
      { dir: Direction.RIGHT, p: { x: head.x + 1, y: head.y } },
    ];

    const scoredMoves = possibleMoves
      .filter(m => !isCollision(m.p, snake))
      .filter(m => m.dir !== OPPOSITE_DIRECTIONS[currentGameState.direction])
      .map(m => {
        const np = normalize(m.p);
        const space = calculateAvailableSpace(m.p, snake);
        const dist = Math.abs(np.x - target.x) + Math.abs(np.y - target.y);
        return { ...m, space, dist };
      });

    if (scoredMoves.length === 0) return directionRef.current;
    const viableMoves = scoredMoves.filter(m => m.space >= snake.length);
    if (viableMoves.length > 0) {
      viableMoves.sort((a, b) => a.dist - b.dist);
      return viableMoves[0].dir;
    }
    scoredMoves.sort((a, b) => b.space - a.space);
    return scoredMoves[0].dir;
  };

  const moveSnake = useCallback(() => {
    setGame(prev => {
      if (prev.status !== GameStatus.PLAYING || isWaitingForFirstMove || isGracePeriod) return prev;
      let currentDir = directionRef.current;
      
      if (prev.isAutoPilot) {
        currentDir = getAIDirection(prev);
        directionRef.current = currentDir;
      }

      lastProcessedDirectionRef.current = currentDir;

      const newHead = { ...prev.snake[0] };
      switch (currentDir) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      const gridSize = prev.settings.gridSize;
      const targetGoal = prev.settings.targetScore === 'max' 
        ? (gridSize * gridSize) - INITIAL_SNAKE.length 
        : prev.settings.targetScore;
      
      const isOutOfBounds = newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize;
      
      // Collision Grace Logic
      const selfCollision = prev.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y);
      const isActuallyColliding = (prev.settings.mode === GameMode.NORMAL && (isOutOfBounds || selfCollision)) || 
                                   (prev.settings.mode === GameMode.WRAP && selfCollision);

      if (isActuallyColliding && !prev.isAutoPilot) {
        // Trigger grace period
        setIsGracePeriod(true);
        graceTimerRef.current = window.setTimeout(() => {
          gameOver();
          setIsGracePeriod(false);
        }, GRACE_PERIOD_MS);
        return prev;
      }

      // Standard movement logic
      if (prev.settings.mode === GameMode.GOD) {
        let np = { ...newHead };
        if (isOutOfBounds) { np.x = (np.x + gridSize) % gridSize; np.y = (np.y + gridSize) % gridSize; }
        const godSelfCollision = prev.snake.some(segment => segment.x === np.x && segment.y === np.y);
        if (godSelfCollision) return prev;
        newHead.x = np.x; newHead.y = np.y;
      } else {
        if (isOutOfBounds) {
          if (prev.settings.mode === GameMode.NORMAL) { gameOver(); return prev; } 
          else if (prev.settings.mode === GameMode.WRAP) { newHead.x = (newHead.x + gridSize) % gridSize; newHead.y = (newHead.y + gridSize) % gridSize; } 
          else if (prev.settings.mode === GameMode.STOP) { return prev; }
        }
        if (selfCollision) { gameOver(); return prev; }
      }

      const newSnake = [newHead, ...prev.snake];
      let newScore = prev.score;
      const foodIndex = prev.foods.findIndex(f => f.x === newHead.x && f.y === newHead.y);

      let currentFoods = [...prev.foods];
      
      if (prev.settings.foodMode === FoodMode.FADING) {
        const now = Date.now();
        currentFoods = currentFoods.filter(f => now - f.createdAt < 10000);
      }
      
      if (prev.settings.foodMode === FoodMode.MAGNET) {
        magnetCounterRef.current++;
        if (magnetCounterRef.current >= 4) {
          magnetCounterRef.current = 0;
          currentFoods = currentFoods.map(food => {
            let nx = food.x;
            let ny = food.y;
            if (food.x < newHead.x) nx++;
            else if (food.x > newHead.x) nx--;
            if (food.y < newHead.y) ny++;
            else if (food.y > newHead.y) ny--;
            
            const collides = newSnake.some(s => s.x === nx && s.y === ny) || currentFoods.some(f => f !== food && f.x === nx && f.y === ny);
            if (!collides) return { ...food, x: nx, y: ny };
            return food;
          });
        }
      }

      if (foodIndex !== -1) {
        newScore += 1;
        if (newScore >= targetGoal) {
           gameWon();
           return { ...prev, score: newScore, snake: newSnake, status: GameStatus.WON };
        }
        const remainingFoods = currentFoods.filter((_, i) => i !== foodIndex);
        const newFoods = generateFood(newSnake, prev.settings.foodCount, gridSize, remainingFoods);
        onStateChange(GameStatus.PLAYING, newScore);
        return { ...prev, snake: newSnake, foods: newFoods, score: newScore, direction: currentDir };
      } else {
        newSnake.pop();
        if (currentFoods.length < prev.settings.foodCount) {
          currentFoods = generateFood(newSnake, prev.settings.foodCount, gridSize, currentFoods);
        }
        return { ...prev, snake: newSnake, foods: currentFoods, direction: currentDir };
      }
    });
  }, [generateFood, onStateChange, isWaitingForFirstMove, isGracePeriod]);

  useEffect(() => {
    if (game.status === GameStatus.PLAYING) {
      gameLoopRef.current = window.setInterval(moveSnake, game.speed);
      checkStall(game);
    } else { if (gameLoopRef.current) clearInterval(gameLoopRef.current); }
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [game.status, game.speed, moveSnake, game.snake]);

  const handleStartInteraction = useCallback((newDir: Direction) => {
    if (isWaitingForFirstMove) {
      setIsWaitingForFirstMove(false);
    }
    
    // If in grace period, check if the new direction avoids collision
    if (isGracePeriod) {
      const currentHead = game.snake[0];
      const nextHead = { ...currentHead };
      switch (newDir) {
        case Direction.UP: nextHead.y -= 1; break;
        case Direction.DOWN: nextHead.y += 1; break;
        case Direction.LEFT: nextHead.x -= 1; break;
        case Direction.RIGHT: nextHead.x += 1; break;
      }
      
      const gridSize = game.settings.gridSize;
      const isOutOfBounds = nextHead.x < 0 || nextHead.x >= gridSize || nextHead.y < 0 || nextHead.y >= gridSize;
      const selfCollision = game.snake.some(segment => segment.x === nextHead.x && segment.y === nextHead.y);
      const wouldStillCollide = (game.settings.mode === GameMode.NORMAL && (isOutOfBounds || selfCollision)) || 
                                (game.settings.mode === GameMode.WRAP && selfCollision);

      if (!wouldStillCollide && OPPOSITE_DIRECTIONS[newDir] !== lastProcessedDirectionRef.current) {
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
        }
        setIsGracePeriod(false);
        directionRef.current = newDir;
      }
      return;
    }

    if (OPPOSITE_DIRECTIONS[newDir] !== lastProcessedDirectionRef.current) {
      setGame(prev => ({ ...prev, isAutoPilot: false }));
      directionRef.current = newDir;
    }
  }, [isWaitingForFirstMove, isGracePeriod, game.snake, game.settings.mode, game.settings.gridSize]);

  useEffect(() => {
    if (isAIOpponent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (game.status === GameStatus.IDLE || game.status === GameStatus.GAME_OVER || game.status === GameStatus.WON) { resetGame(); } 
        else if (game.status === GameStatus.PLAYING) { setGame(prev => ({ ...prev, isAutoPilot: !prev.isAutoPilot })); }
        return;
      }
      const newDir = KEY_MAP[e.key];
      if (newDir) {
        handleStartInteraction(newDir);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.status, isAIOpponent, handleStartInteraction]);

  const updateSettings = (updates: Partial<GameSettings>) => {
    setGame(prev => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAIOpponent || game.status !== GameStatus.PLAYING) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchEnd.x - touchStartRef.current.x;
    const dy = touchEnd.y - touchStartRef.current.y;
    const minDistance = 30;
    if (Math.abs(dx) > Math.abs(dy)) { 
      if (Math.abs(dx) > minDistance) { handleStartInteraction(dx > 0 ? Direction.RIGHT : Direction.LEFT); } 
    } 
    else { 
      if (Math.abs(dy) > minDistance) { handleStartInteraction(dy > 0 ? Direction.DOWN : Direction.UP); } 
    }
    touchStartRef.current = null;
  };

  const currentModeName = MODES.find(m => m.id === game.settings.mode)?.name || 'Nieznany';

  return (
    <div className={`flex flex-col items-center gap-2 transition-opacity ${isAIOpponent ? 'opacity-90' : 'opacity-100'}`}>
      <div className="flex justify-between w-full max-w-[380px] md:max-w-[420px] font-orbitron text-xs tracking-widest transition-colors mb-2">
        <div className="flex flex-col">
          <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1 uppercase text-[8px] md:text-[10px]`}>{isAIOpponent ? 'AI SCORE' : 'TWÓJ WYNIK'}</span>
          <span className={`text-2xl md:text-3xl font-bold ${!isDark && 'text-slate-800'}`}>{game.score.toString().padStart(3, '0')}</span>
        </div>
        {!isAIOpponent && (
          <div className="flex flex-col items-end">
            <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1 uppercase text-[8px] md:text-[10px]`}>REKORD</span>
            <span className="text-2xl md:text-3xl font-bold text-purple-500">{game.highScore.toString().padStart(3, '0')}</span>
          </div>
        )}
      </div>

      <div className={`w-full max-w-[380px] md:max-w-[420px] px-3 md:px-5 py-2 rounded-t-lg border-x border-t flex justify-between items-center font-orbitron text-[9px] md:text-[11px] uppercase tracking-widest ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
        <div className="flex items-center gap-4">
           <span><span className={isDark ? "text-cyan-500" : "text-cyan-600"}>CEL:</span> {game.settings.targetScore === 'max' ? 'MAKS' : game.settings.targetScore}</span>
           <span><span className={isDark ? "text-cyan-500" : "text-cyan-600"}>SIATKA:</span> {game.settings.gridSize}x{game.settings.gridSize}</span>
        </div>
        <div>
           <span><span className={isDark ? "text-purple-500" : "text-purple-600"}>TRYB:</span> {currentModeName}</span>
        </div>
      </div>

      <div 
        className={`relative bg-slate-900 border-x border-b border-t-0 ${isAIOpponent ? 'border-purple-800' : (isDark ? 'border-slate-800' : 'border-slate-300')} rounded-b-lg overflow-hidden ${isAIOpponent ? 'shadow-lg shadow-purple-500/20' : 'neon-glow'} shadow-2xl transition-all touch-none`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ 
          width: 'min(90vw, 420px)', 
          height: 'min(85vw, 420px)',
          display: 'grid',
          gridTemplateColumns: `repeat(${game.settings.gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${game.settings.gridSize}, 1fr)`
        }}
      >
        {game.snake.map((segment, i) => (
          <div 
            key={`${i}-${segment.x}-${segment.y}`} 
            className={`rounded-sm z-10 ${i === 0 && isGracePeriod ? 'animate-ping bg-red-500' : ''}`} 
            style={{ 
              gridColumn: segment.x + 1, 
              gridRow: segment.y + 1, 
              backgroundColor: i === 0 && isGracePeriod ? '#ed4747' : game.settings.snakeColor, 
              opacity: i === 0 ? 1 : 0.7, 
              boxShadow: i === 0 ? `0 0 10px ${isGracePeriod ? '#ed4747' : game.settings.snakeColor}` : 'none' 
            }} 
          />
        ))}
        {game.foods.map((food, i) => {
          let opacity = 1;
          if (game.settings.foodMode === FoodMode.FADING) {
            const age = Date.now() - food.createdAt;
            opacity = Math.max(0, 1 - age / 10000);
          }
          return (
            <div key={`food-${i}-${food.x}-${food.y}`} className="bg-purple-500 rounded-full animate-pulse z-20" style={{ gridColumn: food.x + 1, gridRow: food.y + 1, boxShadow: '0 0 15px #a855f7', opacity }} />
          );
        })}

        {isGracePeriod && !isAIOpponent && (
          <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[0.5px] z-20 flex flex-col items-center justify-center p-4">
              <span className="text-white font-orbitron text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold"></span>           
          </div>
          // <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center text-center p-4">
          //    <div className="bg-red-500 border border-red-400 px-4 py-2 rounded-xl animate-bounce shadow-lg">
          //       <span className="text-white font-orbitron text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">KOLIZJA! SKRĘĆ!</span>
          //    </div>
          // </div>
        )}

        {isWaitingForFirstMove && !isAIOpponent && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4">
             <div className="bg-cyan-500/10 border border-cyan-500/30 px-6 py-3 rounded-2xl animate-pulse">
                <span className="text-cyan-400 font-orbitron text-[10px] md:text-xs uppercase tracking-[0.2em]">Wykonaj pierwszy ruch</span>
             </div>
          </div>
        )}

        {!isAIOpponent && (game.status === GameStatus.PLAYING || game.status === GameStatus.STALLED) && externalStatus === undefined && (
          <button 
            onClick={() => setGame(prev => ({ ...prev, status: GameStatus.IDLE }))}
            className="absolute bottom-3 left-3 z-40 bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-600 text-[10px] font-orbitron uppercase tracking-widest transition-all backdrop-blur-md shadow-lg active:scale-95"
          >
            Menu
          </button>
        )}

        {!isAIOpponent && game.status !== GameStatus.PLAYING && externalStatus === undefined && (
          <div className={`absolute inset-0 ${isDark ? 'bg-slate-950/90' : 'bg-white/95'} backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-8 md:p-12 overflow-y-auto custom-scrollbar`}>
            {game.status === GameStatus.IDLE && (
              <div className="w-full space-y-3">
                <h2 className={`text-2xl md:text-4xl font-orbitron ${isDark ? 'text-cyan-400 neon-text' : 'text-cyan-600'} uppercase tracking-widest mb-6`}>NEON CONFIG</h2>
                
                <div className="space-y-15 text-left">
                  <label className={`text-[10px] md:text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase font-orbitron flex justify-between`}>Rozmiar mapy <span>{game.settings.gridSize}x{game.settings.gridSize}</span></label>
                  <input type="range" min="10" max="30" step="5" value={game.settings.gridSize} onChange={(e) => updateSettings({ gridSize: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>

                <div className="space-y-2 text-left">
                  <label className={`text-[10px] md:text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase font-orbitron flex justify-between`}>Liczba kulek <span>{game.settings.foodCount}</span></label>
                  <input type="range" min="1" max="20" step="1" value={game.settings.foodCount} onChange={(e) => updateSettings({ foodCount: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>

                <div className="space-y-2 text-left">
                  <label className={`text-[10px] md:text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase font-orbitron mb-2`}>Tryb Gry</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map(mode => (
                      <button key={mode.id} title={mode.desc} onClick={() => updateSettings({ mode: mode.id })} className={`p-3 md:p-3 rounded-lg border text-[9px] md:text-[11px] font-bold font-orbitron transition-all ${game.settings.mode === mode.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : (isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200')}`}>{mode.name}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className={`text-[10px] md:text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase font-orbitron mb-2`}>Cel Gry</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => updateSettings({ targetScore: 20 })} className={`p-4 md:p-4 rounded-xl border text-[10px] md:text-[12px] font-bold font-orbitron transition-all ${game.settings.targetScore === 20 ? 'bg-purple-500/20 border-purple-500 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.2)] scale-[1.02]' : (isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200')}`}>LIMIT: 20</button>
                    <button onClick={() => updateSettings({ targetScore: 'max' })} className={`p-4 md:p-4 rounded-xl border text-[10px] md:text-[12px] font-bold font-orbitron transition-all ${game.settings.targetScore === 'max' ? 'bg-purple-500/20 border-purple-500 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.2)] scale-[1.02]' : (isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200')}`}>MAKSIMUM</button>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className={`text-[10px] md:text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase font-orbitron mb-2`}>Kolor węża</label>
                  <div className="flex justify-between gap-2">
                    {COLORS.map(c => (
                      <button key={c.value} onClick={() => updateSettings({ snakeColor: c.value })} className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all ${game.settings.snakeColor === c.value ? (isDark ? 'border-white ring-2 ring-cyan-500' : 'border-slate-800 ring-2 ring-cyan-600') + ' scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                </div>

                <button onClick={resetGame} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-orbitron font-bold py-4 md:py-5 rounded-2xl transition-all active:scale-95 shadow-[0_10px_20px_rgba(34,211,238,0.3)] uppercase text-xs md:text-sm tracking-widest mt-4">Inicjalizuj System</button>
              </div>
            )}

            {game.status === GameStatus.GAME_OVER && (
              <div className="animate-in fade-in zoom-in duration-300">
                <h2 className="text-5xl font-orbitron text-red-500 mb-6 neon-text uppercase tracking-widest">Awaria</h2>
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-10 font-orbitron text-sm uppercase tracking-wider`}>Wynik końcowy: {game.score}</p>
                <button onClick={() => setGame(prev => ({ ...prev, status: GameStatus.IDLE }))} className="bg-red-500 hover:bg-red-400 text-slate-950 font-orbitron font-bold py-4 px-12 rounded-full transition-all uppercase text-xs md:text-sm tracking-widest shadow-lg shadow-red-500/30">Powrót do Menu</button>
              </div>
            )}
            {game.status === GameStatus.WON && (
              <div className="animate-in fade-in zoom-in duration-500">
                <h2 className="text-5xl font-orbitron text-emerald-500 mb-6 neon-text uppercase tracking-widest">Cel Osiągnięty</h2>
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-10 font-orbitron text-sm uppercase tracking-wider`}>Osiągnięto wymagany limit: {game.score}</p>
                <div className="flex flex-col gap-4">
                   <button onClick={resetGame} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-orbitron font-bold py-4 px-12 rounded-full transition-all uppercase text-xs md:text-sm tracking-widest shadow-lg shadow-emerald-500/30">Zagraj Ponownie</button>
                   <button onClick={() => setGame(prev => ({ ...prev, status: GameStatus.IDLE }))} className="text-slate-500 hover:text-slate-300 font-orbitron text-[11px] uppercase transition-colors">Główne Menu</button>
                </div>
              </div>
            )}
            {game.status === GameStatus.STALLED && (
              <div className="animate-in zoom-in duration-300"> //<div className="animate-in fade-in zoom-in duration-300">
              //<h2 className="text-3xl font-orbitron text-yellow-500 mb-6 uppercase tracking-widest">System Zablokowany</h2>
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-10 font-orbitron text-xs uppercase tracking-tighter max-w-[200px] mx-auto`}></p>
                <div className="flex gap-4 justify-center">
                   <button onClick={() => setGame(prev => ({ ...prev, status: GameStatus.PLAYING }))} className="bg-slate-700 hover:bg-slate-600 text-white font-orbitron font-bold py-4 px-8 rounded-xl transition-all uppercase text-[10px] md:text-[12px]">Zostań</button>
                   <button onClick={resetGame} className="bg-yellow-600 hover:bg-yellow-500 text-white font-orbitron font-bold py-4 px-8 rounded-xl transition-all uppercase text-[10px] md:text-[12px]">Resetuj</button>
                </div>
              </div>
              
              //   <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-10 font-orbitron text-xs uppercase tracking-tighter max-w-[200px] mx-auto`}>Wykryto brak możliwości manewru przez 5 sekund.</p>
              //   <div className="flex gap-4 justify-center">
              //      <button onClick={() => setGame(prev => ({ ...prev, status: GameStatus.PLAYING }))} className="bg-slate-700 hover:bg-slate-600 text-white font-orbitron font-bold py-4 px-8 rounded-xl transition-all uppercase text-[10px] md:text-[12px]">Zostań</button>
              //      <button onClick={resetGame} className="bg-yellow-600 hover:bg-yellow-500 text-white font-orbitron font-bold py-4 px-8 rounded-xl transition-all uppercase text-[10px] md:text-[12px]">Resetuj</button>
              //   </div>
              // </div>
            )}
          </div>
        )}
        
        {isAIOpponent && <div className="absolute top-3 right-3 z-40 bg-purple-900/40 px-3 py-1 rounded border border-purple-500/50 backdrop-blur-sm"><span className="text-[9px] font-orbitron text-purple-200 uppercase tracking-widest animate-pulse">AI Core Active</span></div>}
      </div>

      {!isAIOpponent && game.status !== GameStatus.PLAYING && externalStatus === undefined && (
        <div className="w-full flex flex-col gap-2 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`w-full max-w-[380px] md:max-w-[420px] px-4 py-[46px] rounded-xl border transition-all backdrop-blur-md ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-sm'}`}>
            <h3 className={`font-orbitron text-[10px] uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Tryb Kulek Energii</h3>
            <div className="grid grid-cols-3 gap-2">
              {FOOD_MODES_INFO.map(mode => (
                <button 
                  key={mode.id} 
                  title={mode.desc}
                  onClick={() => updateSettings({ foodMode: mode.id })}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${game.settings.foodMode === mode.id ? (isDark ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-purple-100 border-purple-400 text-purple-600') : (isDark ? 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50')}`}
                >
                  <i className={`fa-solid ${mode.icon} text-sm mb-1`}></i>
                  <span className="text-[8px] font-orbitron uppercase tracking-tighter">{mode.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isAIOpponent && game.status === GameStatus.PLAYING && (
        <div className="lg:hidden mt-5 flex flex-col items-center gap-1 animate-in fade-in slide-in-from-bottom-3 duration-500">
           <button onClick={() => handleStartInteraction(Direction.UP)} className={`w-[50px] h-[50px] rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-slate-800/80 text-cyan-400 border border-slate-700 shadow-lg' : 'bg-slate-200/90 text-cyan-600 border border-slate-300 shadow-md'}`}><i className="fa-solid fa-chevron-up text-2xl"></i></button>
           <div className="flex gap-20">
              <button onClick={() => handleStartInteraction(Direction.LEFT)} className={`w-[50px] h-[50px] rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-slate-800/80 text-cyan-400 border border-slate-700 shadow-lg' : 'bg-slate-200/90 text-cyan-600 border border-slate-300 shadow-md'}`}><i className="fa-solid fa-chevron-left text-2xl"></i></button>
              <button onClick={() => handleStartInteraction(Direction.RIGHT)} className={`w-[50px] h-[50px] rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-slate-800/80 text-cyan-400 border border-slate-700 shadow-lg' : 'bg-slate-200/90 text-cyan-600 border border-slate-300 shadow-md'}`}><i className="fa-solid fa-chevron-right text-2xl"></i></button>
           </div>
           <button onClick={() => handleStartInteraction(Direction.DOWN)} className={`w-[50px] h-[50px] rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-slate-800/80 text-cyan-400 border border-slate-700 shadow-lg' : 'bg-slate-200/90 text-cyan-600 border border-slate-300 shadow-md'}`}><i className="fa-solid fa-chevron-down text-2xl"></i></button>
        </div>
      )}
    </div>
  );
});

export default SnakeGame;
