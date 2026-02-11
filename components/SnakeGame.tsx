
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Point, Direction, GameStatus, GameState, GameSettings, GameMode } from '../types';
import { 
  INITIAL_SNAKE, 
  INITIAL_DIRECTION, 
  INITIAL_SPEED, 
  KEY_MAP, 
  OPPOSITE_DIRECTIONS,
  SPEED_INCREMENT,
  MIN_SPEED
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
];

interface SnakeGameProps {
  onStateChange: (status: GameStatus, score: number) => void;
}

const SnakeGame: React.FC<SnakeGameProps> = ({ onStateChange }) => {
  const [game, setGame] = useState<GameState>({
    snake: INITIAL_SNAKE,
    foods: [],
    direction: INITIAL_DIRECTION,
    status: GameStatus.IDLE,
    score: 0,
    highScore: Number(localStorage.getItem('highScore')) || 0,
    speed: INITIAL_SPEED,
    isAutoPilot: false,
    settings: {
      foodCount: 1,
      snakeColor: COLORS[0].value,
      mode: GameMode.NORMAL,
      gridSize: 20
    }
  });

  const gameLoopRef = useRef<number | null>(null);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);

  const generateFood = useCallback((snake: Point[], count: number, gridSize: number, existingFoods: Point[] = []): Point[] => {
    const newFoods: Point[] = [...existingFoods];
    while (newFoods.length < count) {
      const food = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
      };
      const onSnake = snake.some(s => s.x === food.x && s.y === food.y);
      const onFood = newFoods.some(f => f.x === food.x && f.y === food.y);
      if (!onSnake && !onFood) {
        newFoods.push(food);
      }
    }
    return newFoods;
  }, []);

  const resetGame = () => {
    const newSnake = INITIAL_SNAKE;
    const newFoods = generateFood(newSnake, game.settings.foodCount, game.settings.gridSize);
    directionRef.current = INITIAL_DIRECTION;
    setGame(prev => ({
      ...prev,
      snake: newSnake,
      foods: newFoods,
      direction: INITIAL_DIRECTION,
      status: GameStatus.PLAYING,
      score: 0,
      speed: INITIAL_SPEED,
      isAutoPilot: false
    }));
    onStateChange(GameStatus.PLAYING, 0);
  };

  const gameOver = () => {
    setGame(prev => {
      const newHighScore = Math.max(prev.score, prev.highScore);
      localStorage.setItem('highScore', newHighScore.toString());
      onStateChange(GameStatus.GAME_OVER, prev.score);
      return {
        ...prev,
        status: GameStatus.GAME_OVER,
        highScore: newHighScore,
        isAutoPilot: false
      };
    });
  };

  const getAIDirection = (currentGameState: GameState): Direction => {
    const head = currentGameState.snake[0];
    const foods = currentGameState.foods;
    const gridSize = currentGameState.settings.gridSize;
    const snake = currentGameState.snake;

    if (foods.length === 0) return directionRef.current;

    // Helper: normalizacja współrzędnych dla trybu WRAP
    const normalize = (p: Point) => {
      if (currentGameState.settings.mode === GameMode.WRAP) {
        return {
          x: (p.x + gridSize) % gridSize,
          y: (p.y + gridSize) % gridSize
        };
      }
      return p;
    };

    // Helper: sprawdzenie kolizji dla punktu
    const isCollision = (p: Point, checkSnake: Point[]) => {
      const np = normalize(p);
      if (currentGameState.settings.mode !== GameMode.WRAP) {
        if (np.x < 0 || np.x >= gridSize || np.y < 0 || np.y >= gridSize) return true;
      }
      // Pomijamy ostatni segment ogona, bo on się przesunie
      return checkSnake.slice(0, -1).some(s => s.x === np.x && s.y === np.y);
    };

    // Obliczanie dostępnej przestrzeni przy pomocy BFS
    const calculateAvailableSpace = (startPoint: Point, checkSnake: Point[]) => {
      const start = normalize(startPoint);
      if (isCollision(start, checkSnake)) return 0;

      const visited = new Set<string>();
      const queue: Point[] = [start];
      visited.add(`${start.x},${start.y}`);
      let count = 0;

      while (queue.length > 0 && count < gridSize * gridSize) {
        const p = queue.shift()!;
        count++;

        const neighbors = [
          { x: p.x, y: p.y - 1 },
          { x: p.x, y: p.y + 1 },
          { x: p.x - 1, y: p.y },
          { x: p.x + 1, y: p.y },
        ].map(normalize);

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

    // Wybór najbliższego celu (jedzenia)
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

    // Ocena ruchów
    const scoredMoves = possibleMoves
      .filter(m => !isCollision(m.p, snake)) // Wyklucz natychmiastowe kolizje
      .filter(m => m.dir !== OPPOSITE_DIRECTIONS[currentGameState.direction]) // Nie zawracaj
      .map(m => {
        const np = normalize(m.p);
        const space = calculateAvailableSpace(m.p, snake);
        const dist = Math.abs(np.x - target.x) + Math.abs(np.y - target.y);
        return { ...m, space, dist };
      });

    if (scoredMoves.length === 0) return directionRef.current;

    // Strategia:
    // 1. Szukaj ruchów, które dają wystarczająco dużo miejsca (więcej niż długość węża)
    // 2. Spośród nich wybierz ten najbliższy jedzeniu
    // 3. Jeśli wszystkie ruchy prowadzą do pułapki, wybierz ten z największą ilością miejsca (przetrwanie)
    
    const viableMoves = scoredMoves.filter(m => m.space >= snake.length);
    
    if (viableMoves.length > 0) {
      viableMoves.sort((a, b) => a.dist - b.dist);
      return viableMoves[0].dir;
    }

    // Tryb awaryjny - ucieczka tam, gdzie najwięcej miejsca
    scoredMoves.sort((a, b) => b.space - a.space);
    return scoredMoves[0].dir;
  };

  const moveSnake = useCallback(() => {
    setGame(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;

      let currentDir = directionRef.current;
      
      // Logika Autopilota
      if (prev.isAutoPilot) {
        currentDir = getAIDirection(prev);
        directionRef.current = currentDir;
      }

      const newHead = { ...prev.snake[0] };
      switch (currentDir) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      const gridSize = prev.settings.gridSize;
      const isOutOfBounds = newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize;

      if (isOutOfBounds) {
        if (prev.settings.mode === GameMode.NORMAL) {
          gameOver();
          return prev;
        } else if (prev.settings.mode === GameMode.WRAP) {
          newHead.x = (newHead.x + gridSize) % gridSize;
          newHead.y = (newHead.y + gridSize) % gridSize;
        } else if (prev.settings.mode === GameMode.STOP) {
          return prev;
        }
      }

      if (prev.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        gameOver();
        return prev;
      }

      const newSnake = [newHead, ...prev.snake];
      let newScore = prev.score;
      let newSpeed = prev.speed;
      
      const foodIndex = prev.foods.findIndex(f => f.x === newHead.x && f.y === newHead.y);

      if (foodIndex !== -1) {
        newScore += 1;
        const remainingFoods = prev.foods.filter((_, i) => i !== foodIndex);
        const newFoods = generateFood(newSnake, prev.settings.foodCount, gridSize, remainingFoods);
        newSpeed = Math.max(MIN_SPEED, prev.speed - SPEED_INCREMENT);
        onStateChange(GameStatus.PLAYING, newScore);
        return { ...prev, snake: newSnake, foods: newFoods, score: newScore, speed: newSpeed, direction: currentDir };
      } else {
        newSnake.pop();
        return { ...prev, snake: newSnake, direction: currentDir };
      }
    });
  }, [generateFood, onStateChange]);

  useEffect(() => {
    if (game.status === GameStatus.PLAYING) {
      gameLoopRef.current = window.setInterval(moveSnake, game.speed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [game.status, game.speed, moveSnake]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (game.status === GameStatus.IDLE || game.status === GameStatus.GAME_OVER) {
          resetGame();
        } else if (game.status === GameStatus.PLAYING) {
          setGame(prev => ({ ...prev, isAutoPilot: !prev.isAutoPilot }));
        }
        return;
      }

      if (e.key.toLowerCase() === 'p' && game.status !== GameStatus.IDLE && game.status !== GameStatus.GAME_OVER) {
        setGame(prev => ({
          ...prev,
          status: prev.status === GameStatus.PLAYING ? GameStatus.PAUSED : GameStatus.PLAYING
        }));
        return;
      }

      const newDir = KEY_MAP[e.key];
      if (newDir && OPPOSITE_DIRECTIONS[newDir] !== directionRef.current) {
        setGame(prev => ({ ...prev, isAutoPilot: false }));
        directionRef.current = newDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.status, game.settings]);

  const updateSettings = (updates: Partial<GameSettings>) => {
    setGame(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex justify-between w-full max-w-[400px] font-orbitron text-xs tracking-widest text-cyan-400">
        <div className="flex flex-col">
          <span className="text-slate-500 mb-1 uppercase">Wynik</span>
          <span className="text-2xl font-bold">{game.score.toString().padStart(3, '0')}</span>
        </div>
        <div className="flex flex-col items-center">
            {game.isAutoPilot && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-2 py-1 rounded animate-pulse">AI AUTOPILOT ACTIVE</span>
            )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-slate-500 mb-1 uppercase">Rekord</span>
          <span className="text-2xl font-bold text-purple-400">{game.highScore.toString().padStart(3, '0')}</span>
        </div>
      </div>

      <div 
        className="relative bg-slate-900 border-4 border-slate-800 rounded-lg overflow-hidden neon-glow shadow-2xl"
        style={{ 
          width: 'min(90vw, 400px)', 
          height: 'min(90vw, 400px)',
          display: 'grid',
          gridTemplateColumns: `repeat(${game.settings.gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${game.settings.gridSize}, 1fr)`
        }}
      >
        {game.snake.map((segment, i) => (
          <div
            key={`${i}-${segment.x}-${segment.y}`}
            className={`rounded-sm snake-body z-10`}
            style={{
              gridColumn: segment.x + 1,
              gridRow: segment.y + 1,
              backgroundColor: game.settings.snakeColor,
              opacity: i === 0 ? 1 : 0.7,
              boxShadow: i === 0 ? `0 0 10px ${game.settings.snakeColor}` : 'none'
            }}
          />
        ))}

        {game.foods.map((food, i) => (
          <div
            key={`food-${i}-${food.x}-${food.y}`}
            className="bg-purple-500 rounded-full animate-pulse z-20"
            style={{
              gridColumn: food.x + 1,
              gridRow: food.y + 1,
              boxShadow: '0 0 15px #a855f7'
            }}
          />
        ))}

        {game.status !== GameStatus.PLAYING && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6 overflow-y-auto custom-scrollbar">
            {game.status === GameStatus.IDLE && (
              <div className="w-full space-y-3">
                <h2 className="text-2xl font-orbitron text-cyan-400 neon-text">KONFIGURACJA</h2>
                
                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-slate-500 uppercase font-orbitron">Rozmiar mapy: {game.settings.gridSize}x{game.settings.gridSize}</label>
                  <input 
                    type="range" min="10" max="30" step="5"
                    value={game.settings.gridSize}
                    onChange={(e) => updateSettings({ gridSize: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-slate-500 uppercase font-orbitron">Ilość energii: {game.settings.foodCount}</label>
                  <input 
                    type="range" min="1" max="10" 
                    value={game.settings.foodCount}
                    onChange={(e) => updateSettings({ foodCount: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-slate-500 uppercase font-orbitron">Kolor węża</label>
                  <div className="flex justify-between gap-1">
                    {COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => updateSettings({ snakeColor: c.value })}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${game.settings.snakeColor === c.value ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                        style={{ backgroundColor: c.value, boxShadow: game.settings.snakeColor === c.value ? c.glow : 'none' }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-slate-500 uppercase font-orbitron">Tryb gry</label>
                  <div className="grid grid-cols-1 gap-1">
                    {MODES.map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => updateSettings({ mode: mode.id })}
                        className={`flex flex-col items-start p-2 rounded-lg border transition-all ${game.settings.mode === mode.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        <span className="text-[10px] font-bold font-orbitron">{mode.name}</span>
                        <span className="text-[7px] opacity-70 uppercase tracking-tighter">{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={resetGame}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-orbitron font-bold py-2 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 mt-1"
                >
                  START SYSTEMU
                </button>
              </div>
            )}

            {game.status === GameStatus.PAUSED && (
              <>
                <h2 className="text-3xl font-orbitron text-yellow-400 mb-6 neon-text">PAUZA</h2>
                <button 
                  onClick={() => setGame(prev => ({ ...prev, status: GameStatus.PLAYING }))}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-orbitron font-bold py-3 px-8 rounded-full transition-all"
                >
                  WZNÓW
                </button>
              </>
            )}

            {game.status === GameStatus.GAME_OVER && (
              <>
                <h2 className="text-4xl font-orbitron text-red-500 mb-2 neon-text">AWARIA SYSTEMU</h2>
                <p className="text-slate-400 mb-6 font-orbitron text-sm uppercase">WYNIK KOŃCOWY: {game.score}</p>
                <button 
                  onClick={() => setGame(prev => ({ ...prev, status: GameStatus.IDLE }))}
                  className="bg-red-500 hover:bg-red-400 text-slate-950 font-orbitron font-bold py-3 px-8 rounded-full transition-all hover:scale-105"
                >
                  MENU GŁÓWNE
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="text-slate-500 text-[10px] uppercase font-orbitron text-center">
          <p>Podczas gry: <span className="text-cyan-400">SPACJA</span> = Przełącz Autopilota AI</p>
          <p><span className="text-yellow-400">P</span> = Pauza</p>
      </div>

      <div className="grid grid-cols-3 gap-2 md:hidden">
        <div />
        <button 
          className="w-14 h-14 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center active:bg-cyan-900 transition-colors"
          onClick={() => directionRef.current !== Direction.DOWN && (directionRef.current = Direction.UP)}
        >
          <i className="fa-solid fa-chevron-up text-cyan-400"></i>
        </button>
        <div />
        <button 
          className="w-14 h-14 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center active:bg-cyan-900 transition-colors"
          onClick={() => directionRef.current !== Direction.RIGHT && (directionRef.current = Direction.LEFT)}
        >
          <i className="fa-solid fa-chevron-left text-cyan-400"></i>
        </button>
        <button 
          className="w-14 h-14 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center active:bg-cyan-900 transition-colors"
          onClick={() => directionRef.current !== Direction.UP && (directionRef.current = Direction.DOWN)}
        >
          <i className="fa-solid fa-chevron-down text-cyan-400"></i>
        </button>
        <button 
          className="w-14 h-14 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center active:bg-cyan-900 transition-colors"
          onClick={() => directionRef.current !== Direction.LEFT && (directionRef.current = Direction.RIGHT)}
        >
          <i className="fa-solid fa-chevron-right text-cyan-400"></i>
        </button>
      </div>
    </div>
  );
};

export default SnakeGame;
