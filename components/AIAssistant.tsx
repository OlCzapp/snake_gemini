
import React, { useState, useEffect } from 'react';
import { AICommentary } from '../types';

interface AIAssistantProps {
  commentary: AICommentary | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ commentary }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!commentary || !commentary.message) return;

    let i = 0;
    const fullText = commentary.message;
    setDisplayedText('');
    setIsTyping(true);
    
    const interval = setInterval(() => {
      setDisplayedText((prev) => fullText.slice(0, prev.length + 1));
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [commentary]);

  const getBorderColor = () => {
    switch (commentary?.type) {
      case 'congratulations': return 'border-emerald-500/50';
      case 'sarcasm': return 'border-red-500/50';
      case 'advice': return 'border-blue-500/50';
      case 'encouragement': return 'border-cyan-500/50';
      default: return 'border-slate-500/50';
    }
  };

  const getIcon = () => {
    switch (commentary?.type) {
      case 'congratulations': return 'fa-trophy text-emerald-400';
      case 'sarcasm': return 'fa-ghost text-red-400';
      case 'advice': return 'fa-brain text-blue-400';
      case 'encouragement': return 'fa-bolt text-cyan-400';
      default: return 'fa-robot text-slate-400';
    }
  };

  const getTypeName = (type?: string) => {
    switch (type) {
      case 'congratulations': return 'Gratulacje';
      case 'sarcasm': return 'Sarkazm';
      case 'advice': return 'Porada';
      case 'encouragement': return 'Zachęta';
      default: return 'Neutralny';
    }
  };

  return (
    <div className={`bg-slate-900/60 backdrop-blur-lg border-l-4 ${getBorderColor()} p-6 rounded-r-xl transition-all duration-500 h-full min-h-[160px] flex flex-col`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
          <i className={`fa-solid ${getIcon()} text-lg`}></i>
        </div>
        <div>
          <h3 className="font-orbitron text-xs text-slate-400 uppercase tracking-widest">Komentator Neuronowy</h3>
          <div className="flex gap-1 mt-1">
            <span className={`w-2 h-2 rounded-full ${isTyping ? 'bg-cyan-500 animate-pulse' : 'bg-slate-600'}`}></span>
            <span className="text-[10px] text-slate-500 uppercase">{isTyping ? 'Analizowanie...' : 'Oczekiwanie'}</span>
          </div>
        </div>
      </div>

      <div className="flex-grow flex items-center">
        {!commentary ? (
          <p className="text-slate-500 italic text-sm">
            Rozpocznij sekwencję, aby aktywować analizę neuronową.
          </p>
        ) : (
          <p className="text-slate-200 font-medium leading-relaxed">
            "{displayedText}"
            {isTyping && <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1 animate-pulse"></span>}
          </p>
        )}
      </div>

      {commentary?.type && (
        <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center text-[10px] uppercase tracking-tighter text-slate-500 font-orbitron">
          <span>Tryb: {getTypeName(commentary.type)}</span>
          <span className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-1 h-3 rounded-full ${i <= 2 ? 'bg-cyan-500/40' : 'bg-slate-700'}`}></div>
            ))}
          </span>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
