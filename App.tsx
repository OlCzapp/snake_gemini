
import React, { useState, useCallback } from 'react';
import SnakeGame from './components/SnakeGame';
import AIAssistant from './components/AIAssistant';
import { GameStatus, AICommentary } from './types';
import { getAICommentary } from './services/geminiService';

const App: React.FC = () => {
  const [commentary, setCommentary] = useState<AICommentary | null>(null);
  const [lastScoreForAI, setLastScoreForAI] = useState(0);

  const handleGameStateChange = useCallback(async (status: GameStatus, score: number) => {
    if (status === GameStatus.GAME_OVER || (score > 0 && score % 5 === 0 && score !== lastScoreForAI)) {
      const result = await getAICommentary(score, status);
      setCommentary(result);
      setLastScoreForAI(score);
    }
  }, [lastScoreForAI]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-6xl font-orbitron font-bold text-cyan-400 neon-text tracking-widest mb-2">
          NEON SNAKE AI
        </h1>
        <p className="text-slate-400 uppercase tracking-tighter text-sm">Klasyczna rozgrywka w cyfrowym wydaniu</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl items-start">
        <div className="hidden lg:flex flex-col gap-4">
          <div className="bg-slate-900/50 border border-cyan-500/30 p-6 rounded-xl backdrop-blur-md">
            <h3 className="font-orbitron text-cyan-300 mb-4 border-b border-cyan-500/20 pb-2">STEROWANIE</h3>
            <ul className="text-slate-300 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-xs">STRZAŁKI</span>
                <span>Ruch wężem</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-xs">WASD</span>
                <span>Alternatywne sterowanie</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-xs">SPACJA</span>
                <span>Pauza / Start</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-slate-900/50 border border-purple-500/30 p-6 rounded-xl backdrop-blur-md">
            <h3 className="font-orbitron text-purple-300 mb-4 border-b border-purple-500/20 pb-2">CEL GRY</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Poruszaj się po neonowej siatce. Zbieraj punkty energii, aby rosnąć. Unikaj ścian i własnego ogona.
              Sztuczna inteligencja śledzi każdy Twój ruch...
            </p>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col items-center">
          <SnakeGame onStateChange={handleGameStateChange} />
        </div>

        <div className="w-full">
          <AIAssistant commentary={commentary} />
        </div>
      </div>

      <footer className="mt-12 text-slate-600 text-xs text-center uppercase tracking-widest">
        Napędzane przez Gemini 3 Flash • &copy; {new Date().getFullYear()} Neon Labs
      </footer>
    </div>
  );
};

export default App;
