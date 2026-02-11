
import React, { useState, useCallback, useRef, useEffect } from 'react';
import SnakeGame, { SnakeGameHandle } from './components/SnakeGame';
import { GameStatus, GameType, Difficulty, GameMode, GameSettings } from './types';

const App: React.FC = () => {
  const [gameType, setGameType] = useState<GameType>(GameType.SOLO);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [versusStatus, setVersusStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  const [versusSettings, setVersusSettings] = useState<GameSettings>({
    foodCount: 1,
    snakeColor: '#22d3ee',
    mode: GameMode.NORMAL,
    gridSize: 20,
    difficulty: Difficulty.NORMAL
  });

  const playerRef = useRef<SnakeGameHandle>(null);
  const aiRef = useRef<SnakeGameHandle>(null);

  const handleGameStateChange = useCallback((status: GameStatus, score: number, isAI: boolean = false) => {
    if (isAI) {
      setAiScore(score);
    } else {
      setPlayerScore(score);
    }

    if (gameType === GameType.VERSUS) {
      if (status === GameStatus.GAME_OVER) {
        setVersusStatus(GameStatus.GAME_OVER);
      }
    }
  }, [gameType]);

  const startVersus = () => {
    setVersusStatus(GameStatus.PLAYING);
    setPlayerScore(0);
    setAiScore(0);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const MODES_INFO = [
    { id: GameMode.NORMAL, name: 'Normalny' },
    { id: GameMode.WRAP, name: 'Tunel' },
    { id: GameMode.STOP, name: 'Zderzak' },
  ];

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col items-center justify-center p-4 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <header className="w-full max-w-4xl mb-6 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4">
          <div className="w-10 h-10" /> {/* Spacer */}
          <h1 className={`text-3xl md:text-5xl font-orbitron font-bold tracking-widest ${isDark ? 'text-cyan-400 neon-text' : 'text-cyan-600'}`}>
            NEON SNAKE AI
          </h1>
          <button 
            onClick={toggleTheme}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-900 shadow-md hover:bg-slate-100'}`}
            title={isDark ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny"}
          >
            <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={() => { setGameType(GameType.SOLO); setVersusStatus(GameStatus.IDLE); }}
            className={`px-6 py-2 rounded-full font-orbitron text-[10px] tracking-widest border transition-all ${gameType === GameType.SOLO ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20' : isDark ? 'bg-transparent text-cyan-500 border-cyan-500/50 hover:bg-cyan-500/10' : 'bg-transparent text-cyan-600 border-cyan-600/50 hover:bg-cyan-600/10'}`}
          >
            SOLO
          </button>
          <button 
            onClick={() => { setGameType(GameType.VERSUS); setVersusStatus(GameStatus.IDLE); }}
            className={`px-6 py-2 rounded-full font-orbitron text-[10px] tracking-widest border transition-all ${gameType === GameType.VERSUS ? 'bg-purple-500 text-slate-950 border-purple-400 shadow-lg shadow-purple-500/20' : isDark ? 'bg-transparent text-purple-500 border-purple-500/50 hover:bg-purple-500/10' : 'bg-transparent text-purple-600 border-purple-600/50 hover:bg-purple-600/10'}`}
          >
            VERSUS AI
          </button>
        </div>
      </header>

      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 items-start justify-center">
        
        {/* Settings for Versus Mode */}
        {gameType === GameType.VERSUS && versusStatus === GameStatus.IDLE && (
          <div className={`w-full max-w-md mx-auto p-8 rounded-2xl border transition-all backdrop-blur-xl mb-6 ${isDark ? 'bg-slate-900/80 border-purple-500/30' : 'bg-white border-purple-200 shadow-xl'}`}>
            <h2 className={`text-xl font-orbitron text-center mb-8 uppercase tracking-widest ${isDark ? 'text-purple-400 neon-text' : 'text-purple-600'}`}>Ustawienia Pojedynku</h2>
            
            <div className="space-y-6">
               <div>
                 <label className={`text-[10px] uppercase font-orbitron mb-3 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Poziom Trudności AI</label>
                 <div className="grid grid-cols-2 gap-2">
                   {Object.values(Difficulty).map(d => (
                     <button 
                       key={d} 
                       onClick={() => setVersusSettings(prev => ({ ...prev, difficulty: d }))}
                       className={`py-2 rounded border font-orbitron text-[10px] transition-all ${versusSettings.difficulty === d ? 'bg-purple-500 border-purple-400 text-white' : isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}
                     >
                       {d}
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className={`text-[10px] uppercase font-orbitron mb-3 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Tryb Gry</label>
                 <div className="grid grid-cols-3 gap-2">
                   {MODES_INFO.map(m => (
                     <button 
                       key={m.id} 
                       onClick={() => setVersusSettings(prev => ({ ...prev, mode: m.id }))}
                       className={`py-2 rounded border font-orbitron text-[10px] transition-all ${versusSettings.mode === m.id ? 'bg-cyan-500 border-cyan-400 text-white' : isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}
                     >
                       {m.name}
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className={`text-[10px] uppercase font-orbitron mb-3 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Rozmiar Siatki: {versusSettings.gridSize}</label>
                 <input type="range" min="10" max="30" step="5" value={versusSettings.gridSize} onChange={(e) => setVersusSettings(prev => ({ ...prev, gridSize: parseInt(e.target.value) }))} className="w-full accent-purple-500" />
               </div>

               <button 
                onClick={startVersus} 
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-orbitron font-bold rounded-xl mt-4 shadow-lg transition-all active:scale-95 shadow-purple-500/20 uppercase tracking-widest text-sm"
               >
                 Inicjalizuj Walkę
               </button>
            </div>
          </div>
        )}

        {/* Game Layout */}
        <div className={`flex flex-col lg:flex-row gap-8 items-center justify-center w-full ${versusStatus === GameStatus.IDLE && gameType === GameType.VERSUS ? 'hidden' : ''}`}>
          
          <div className="flex flex-col gap-4">
             <SnakeGame 
                ref={playerRef}
                onStateChange={(s, sc) => handleGameStateChange(s, sc, false)} 
                externalStatus={gameType === GameType.VERSUS ? versusStatus : undefined}
                sharedSettings={gameType === GameType.VERSUS ? versusSettings : undefined}
             />
          </div>

          {gameType === GameType.VERSUS && (
            <>
              {/* FIXED WIDTH SCOREBOARD PANEL */}
              <div className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl border transition-all w-64 flex-shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-800 shadow-inner' : 'bg-white border-slate-200 shadow-lg'}`}>
                <span className={`text-[10px] font-orbitron mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>VERSUS</span>
                <div className={`text-5xl font-bold font-orbitron transition-all text-center tabular-nums ${playerScore > aiScore ? 'text-cyan-500' : aiScore > playerScore ? 'text-purple-500' : isDark ? 'text-white' : 'text-slate-800'}`}>
                  {playerScore} - {aiScore}
                </div>
                
                <div className="h-24 flex items-center justify-center">
                  {versusStatus === GameStatus.GAME_OVER ? (
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                      <p className={`font-orbitron text-xs uppercase mb-3 font-bold ${playerScore > aiScore ? 'text-cyan-500' : aiScore > playerScore ? 'text-purple-500' : 'text-slate-500'}`}>
                        {playerScore > aiScore ? 'Zwycięstwo!' : aiScore > playerScore ? 'AI wygrało' : 'Remis'}
                      </p>
                      <button 
                        onClick={() => setVersusStatus(GameStatus.IDLE)} 
                        className={`text-[9px] font-orbitron uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                      >
                          Resetuj
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <div className="flex gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full animate-bounce bg-cyan-500`} style={{ animationDelay: '0ms' }}></div>
                          <div className={`w-1.5 h-1.5 rounded-full animate-bounce bg-purple-500`} style={{ animationDelay: '150ms' }}></div>
                          <div className={`w-1.5 h-1.5 rounded-full animate-bounce bg-cyan-500`} style={{ animationDelay: '300ms' }}></div>
                       </div>
                       <span className="text-[8px] font-orbitron text-slate-500 animate-pulse">SESJA W TOKU</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SnakeGame 
                  ref={aiRef}
                  isAIOpponent={true}
                  onStateChange={(s, sc) => handleGameStateChange(s, sc, true)}
                  externalStatus={versusStatus}
                  sharedSettings={versusSettings}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <footer className={`mt-12 text-[10px] text-center uppercase tracking-widest max-w-lg transition-colors ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
        Tryb rywalizacji: Walcz o punkty energii z Neuronową Siecią. Trudność Hardcore testuje limity procesorów.
        <br />
        &copy; {new Date().getFullYear()} Neon Labs • Built with Gemini 3
      </footer>
    </div>
  );
};

export default App;
