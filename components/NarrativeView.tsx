
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Eye, Edit2, Check, X, RefreshCw, Dices, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface NarrativeViewProps {
  history: ChatMessage[];
  isThinking: boolean;
  highlightData: {
      npcNames: string[];
      itemNames: string[];
      effectNames: string[];
  };
  onEditMessage: (index: number, newContent: string) => void;
  onRegenerate?: () => void;
  onGenerateSceneImage?: (index: number) => void;
}

const DiceRoll: React.FC<{ raw: string }> = ({ raw }) => {
    const content = raw.replace('[DICE:', '').replace(']', '').trim();
    const parts = content.split('|').map(s => s.trim());
    
    if (parts.length < 3) return <span className="text-xs bg-slate-800 px-1 rounded">{raw}</span>;

    const skill = parts[0];
    const rollDetail = parts[1];
    const result = parts[2];
    const isSuccess = result.toLowerCase().includes('success') || result.toLowerCase().includes('успех');

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold mx-1 align-middle my-1 ${isSuccess ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'}`}>
            <Dices size={14} />
            <span className="uppercase tracking-wider opacity-80">{skill}</span>
            <div className="w-px h-3 bg-current opacity-30" />
            <span>{rollDetail}</span>
            <div className="w-px h-3 bg-current opacity-30" />
            <span className="uppercase">{result}</span>
        </div>
    );
};

const NarrativeView: React.FC<NarrativeViewProps> = ({ history, isThinking, highlightData, onEditMessage, onRegenerate, onGenerateSceneImage }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (editingIndex === null) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isThinking, editingIndex]);

  const highlightPatterns = useMemo(() => {
     const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     const npcs = highlightData.npcNames.filter(n => n.length > 2).map(escapeRegExp).join('|');
     const items = highlightData.itemNames.filter(n => n.length > 2).map(escapeRegExp).join('|');
     const effects = highlightData.effectNames.filter(n => n.length > 2).map(escapeRegExp).join('|');

     return {
         dialogue: /([«"“][^»"”]*?[»"”])/g,
         actionSound: /(\*[^*]+\*)/g, 
         systemMagic: /(\[[^\]]+\])/g, 
         diceTag: /^\[DICE:.*\]$/, 
         npc: npcs ? new RegExp(`\\b(${npcs})\\b`, 'gi') : null,
         item: items ? new RegExp(`\\b(${items})\\b`, 'gi') : null,
         effect: effects ? new RegExp(`\\b(${effects})\\b`, 'gi') : null,
     }
  }, [highlightData]);

  const startEditing = (index: number, content: string) => {
      setEditingIndex(index);
      setEditText(content);
  };

  const saveEdit = (index: number) => {
      onEditMessage(index, editText);
      setEditingIndex(null);
  };

  const handleSceneGen = async (idx: number) => {
      if (onGenerateSceneImage) {
          setGeneratingImages(prev => ({ ...prev, [idx]: true }));
          await onGenerateSceneImage(idx);
          setGeneratingImages(prev => ({ ...prev, [idx]: false }));
      }
  }

  const applyRegexStyle = (
      input: (string | React.ReactNode)[], 
      pattern: RegExp, 
      render: (match: string, i: number) => React.ReactNode
  ): (string | React.ReactNode)[] => {
      const output: (string | React.ReactNode)[] = [];
      input.forEach(part => {
          if (typeof part !== 'string') {
              output.push(part);
              return;
          }
          const split = part.split(pattern);
          split.forEach((s, idx) => {
              if (pattern.test(s)) {
                  output.push(render(s, idx));
              } else if (s) {
                  output.push(s);
              }
          });
      });
      return output;
  };

  const renderText = (text: string) => {
      const paragraphs = text.split('\n');

      return paragraphs.map((para, pIdx) => {
          if (!para.trim()) return <div key={pIdx} className="h-4" />;
          
          const parts = para.split(highlightPatterns.dialogue);
          
          return (
              <p key={pIdx} className="mb-4">
                  {parts.map((part, i) => {
                      if (highlightPatterns.dialogue.test(part)) {
                          return <span key={i} className="text-amber-100/90 italic font-serif tracking-wide">{part}</span>;
                      }
                      
                      let content: (string | React.ReactNode)[] = [part];

                      content = applyRegexStyle(content, highlightPatterns.actionSound, (s, idx) => (
                          <span key={`act-${idx}`} className="text-fuchsia-300/80 italic">{s}</span>
                      ));

                      content = applyRegexStyle(content, highlightPatterns.systemMagic, (s, idx) => {
                          if (s.startsWith('[DICE:')) {
                              return <DiceRoll key={`sys-${idx}`} raw={s} />;
                          }
                          return <span key={`sys-${idx}`} className="text-cyan-400 font-mono text-sm tracking-wide bg-cyan-950/30 px-1 py-0.5 rounded border border-cyan-900/50">{s}</span>;
                      });
                      
                      if (highlightPatterns.npc) {
                         content = applyRegexStyle(content, highlightPatterns.npc, (s, idx) => (
                             <span key={`n-${idx}`} className="text-blue-300 font-medium cursor-help hover:underline decoration-blue-500/50" title="NPC">{s}</span>
                         ));
                      }

                      if (highlightPatterns.item) {
                          content = applyRegexStyle(content, highlightPatterns.item, (s, idx) => (
                              <span key={`i-${idx}`} className="text-emerald-300 font-medium" title="Item">{s}</span>
                          ));
                      }
                      
                      if (highlightPatterns.effect) {
                          content = applyRegexStyle(content, highlightPatterns.effect, (s, idx) => (
                              <span key={`e-${idx}`} className="text-purple-300 font-medium" title="Status Effect">{s}</span>
                          ));
                      }

                      return <span key={i}>{content}</span>;
                  })}
              </p>
          );
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 font-prose text-lg leading-relaxed text-slate-300 custom-scrollbar">
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
              ? 'pl-8 border-l-2 border-indigo-500/50 text-indigo-200 italic bg-slate-800/30 p-4 rounded-r-lg my-6 group relative' 
              : 'group relative animate-in fade-in duration-700 hover:bg-slate-900/40 -mx-4 px-4 pb-4 rounded transition-colors'}
          `}
        >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                {onRegenerate && entry.role === 'model' && idx === history.length - 1 && !isThinking && (
                    <button onClick={onRegenerate} className="p-1 text-slate-500 hover:text-indigo-400 bg-slate-900/80 rounded" title="Regenerate this turn"><RefreshCw size={14} /></button>
                )}

                {editingIndex !== idx && (
                        <button onClick={() => startEditing(idx, entry.content)} className="p-1 text-slate-500 hover:text-indigo-400 bg-slate-900/80 rounded" title="Edit"><Edit2 size={14} /></button>
                )}
            </div>

            {editingIndex === idx ? (
                <div className="bg-slate-900 p-2 rounded border border-indigo-500/50">
                    <textarea 
                        className="w-full h-40 bg-transparent text-slate-200 focus:outline-none resize-y text-base font-sans"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingIndex(null)} className="p-1 text-slate-400 hover:text-slate-200"><X size={16}/></button>
                            <button onClick={() => saveEdit(idx)} className="p-1 text-green-400 hover:text-green-300"><Check size={16}/></button>
                    </div>
                </div>
            ) : (
                entry.role === 'user' ? (
                    <span>&gt; {entry.content}</span>
                ) : (
                    <div>
                        {renderText(entry.content)}
                        
                        {/* Generated Scene Image */}
                        {entry.sceneImage && (
                            <div className="mt-4 mb-2 rounded-lg overflow-hidden border border-slate-700 shadow-2xl relative animate-in fade-in zoom-in-95 duration-500">
                                <img src={entry.sceneImage} alt="Scene Visualization" className="w-full max-h-96 object-cover" />
                                <div className="absolute bottom-2 right-2 text-[10px] text-white/50 bg-black/50 px-2 py-1 rounded backdrop-blur-md">AI Visualization</div>
                            </div>
                        )}

                        {/* Visualize Scene Button (If no image yet) */}
                        {!entry.sceneImage && onGenerateSceneImage && (
                            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity h-0 group-hover:h-auto overflow-hidden">
                                <button 
                                    onClick={() => handleSceneGen(idx)}
                                    disabled={generatingImages[idx]}
                                    className="text-xs flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {generatingImages[idx] ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                                    Visualize Scene
                                </button>
                            </div>
                        )}
                    </div>
                )
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
