
import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import NarrativeMessage from './narrative/NarrativeMessage';

interface NarrativeViewProps {
  history: ChatMessage[];
  isThinking: boolean;
  highlightData: {
      npcNames: string[];
      itemNames: string[];
      effectNames: string[];
  };
  onEditMessage: (index: number, newContent: string) => void;
  onDeleteMessage: (index: number) => void;
  onRegenerate?: () => void;
  onRollback?: (index: number) => void;
  onGenerateSceneImage?: (index: number) => void;
}

const NarrativeView: React.FC<NarrativeViewProps> = ({ 
    history, isThinking, highlightData, 
    onEditMessage, onDeleteMessage, onRegenerate, onRollback, onGenerateSceneImage 
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar pb-32">
      {history.length === 0 && (
        <div className="text-center text-slate-500 italic mt-20 font-serif">
          История начинается...
        </div>
      )}
      
      {history.map((entry, idx) => (
          <NarrativeMessage 
            key={idx}
            index={idx}
            message={entry}
            isUser={entry.role === 'user'}
            isLast={idx === history.length - 1}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onRollback={onRollback}
            onRegenerate={onRegenerate}
            onGenerateImage={onGenerateSceneImage}
            highlightData={{
                npcs: highlightData.npcNames,
                items: highlightData.itemNames,
                effects: highlightData.effectNames
            }}
          />
      ))}

      {isThinking && (
        <div className="flex items-center space-x-2 text-indigo-400 opacity-75 p-4 animate-pulse">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-sans">AI Thinking...</span>
        </div>
      )}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

export default NarrativeView;
