import React, { useEffect, useRef } from 'react';
import { SceneVisual } from '../types';
import { Eye } from 'lucide-react';

interface NarrativeViewProps {
  history: { role: string; content: string; sceneVisual?: SceneVisual | null }[];
  isThinking: boolean;
}

// Function to parse and highlight dialogue
const formatText = (text: string) => {
  const parts = text.split(/([«"“].*?[»"”])/g);
  return parts.map((part, index) => {
    if (part.match(/^[«"“].*[»"”]$/)) {
      return <span key={index} className="text-amber-200/90 italic font-medium">{part}</span>;
    }
    return <span key={index}>{part}</span>;
  });
};

const SceneCard: React.FC<{ visual: SceneVisual }> = ({ visual }) => {
    const moodColors = {
        'Dark': 'from-slate-900 to-black border-slate-800',
        'Bright': 'from-amber-900/20 to-orange-900/20 border-amber-800/30',
        'Mysterious': 'from-indigo-900/30 to-purple-900/30 border-indigo-800/30',
        'Dangerous': 'from-red-900/20 to-slate-900 border-red-900/30',
        'Peaceful': 'from-emerald-900/20 to-slate-900 border-emerald-900/30',
    };

    return (
        <div className={`my-4 p-4 rounded-lg bg-gradient-to-br ${moodColors[visual.mood] || moodColors['Mysterious']} border shadow-lg`}>
            <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-widest opacity-70">
                <Eye size={12} />
                <span>Scene Visualization</span>
            </div>
            <h3 className="font-heading font-bold text-lg mb-1">{visual.title}</h3>
            <p className="text-sm italic text-slate-400 font-serif leading-relaxed">{visual.description}</p>
        </div>
    )
}

const NarrativeView: React.FC<NarrativeViewProps> = ({ history, isThinking }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 font-prose text-lg leading-relaxed text-slate-300 custom-scrollbar">
      {history.length === 0 && (
        <div className="text-center text-slate-500 italic mt-20">
          История начинается...
        </div>
      )}
      
      {history.map((entry, idx) => (
        <div 
          key={idx} 
          className={`
            ${entry.role === 'user' 
              ? 'pl-8 border-l-2 border-indigo-500/50 text-indigo-200 italic bg-slate-800/30 p-4 rounded-r-lg' 
              : 'animate-in fade-in duration-700'}
          `}
        >
          {entry.role === 'user' ? (
             <span>&gt; {entry.content}</span>
          ) : (
            <div className="whitespace-pre-wrap">
                {formatText(entry.content)}
                {entry.sceneVisual && <SceneCard visual={entry.sceneVisual} />}
            </div>
          )}
        </div>
      ))}

      {isThinking && (
        <div className="flex items-center space-x-2 text-indigo-400 opacity-75 p-4">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-sm font-sans ml-2">Мир живет...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default NarrativeView;
