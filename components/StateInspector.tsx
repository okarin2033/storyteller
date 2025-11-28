import React, { useState } from 'react';
import { GameState, NPC, WorldItem, WorldLocation } from '../types';
import { Eye, Brain, MapPin, Database, Package, Activity, Globe, Book, Users, ChevronRight, ChevronDown, Sparkles, Save } from 'lucide-react';

interface StateInspectorProps {
  gameState: GameState;
  onUpdatePreferences?: (newPrefs: string) => void;
}

// Helper Component for Folders
const InspectorFolder: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    defaultOpen?: boolean 
}> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-700/50">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-slate-800/20 hover:bg-slate-800/50 transition-colors text-left"
            >
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                    {icon}
                    {title}
                </div>
                <div className="text-slate-500">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
            </button>
            {isOpen && <div className="p-3 bg-slate-900/30 animate-in slide-in-from-top-1 duration-200">{children}</div>}
        </div>
    );
};

const StateInspector: React.FC<StateInspectorProps> = ({ gameState, onUpdatePreferences }) => {
  const [prefInput, setPrefInput] = useState(gameState.metaPreferences);
  
  // Helper to find location name
  const getLocationName = (id: string) => (gameState.locations || []).find(l => l.id === id)?.name || "Unknown";

  const handleBlurPrefs = () => {
      if (onUpdatePreferences && prefInput !== gameState.metaPreferences) {
          onUpdatePreferences(prefInput);
      }
  }

  return (
    <div className="w-full h-full bg-slate-900 border-l border-slate-700 overflow-y-auto font-sans text-sm custom-scrollbar">
      <div className="p-4 bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-md">
        <h2 className="text-indigo-400 font-heading font-bold uppercase tracking-wider flex items-center gap-2">
           <Database size={16} />
           God Mode (Debug)
        </h2>
      </div>

      <div className="flex flex-col">

        {/* --- FOLDER: STORYTELLER --- */}
        <InspectorFolder title="Storyteller & Meta" icon={<Sparkles size={14} />} defaultOpen={true}>
            <div className="space-y-4">
                <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">AI Story Plan</span>
                    <div className="p-2 bg-indigo-950/30 border border-indigo-900/50 rounded text-indigo-200 italic text-xs leading-relaxed">
                        "{gameState.storytellerThoughts}"
                    </div>
                </div>

                <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Your Directives (What you want)</span>
                    <textarea 
                        className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none resize-none"
                        value={prefInput}
                        onChange={(e) => setPrefInput(e.target.value)}
                        onBlur={handleBlurPrefs}
                        placeholder="Tell the AI what kind of story you want... (e.g. More mystery, less combat)"
                    />
                    <div className="text-[9px] text-slate-500 mt-1 flex justify-between">
                        <span>Updates automatically on click out</span>
                    </div>
                </div>
            </div>
        </InspectorFolder>
        
        {/* --- Global Events --- */}
        <div className="p-3 bg-indigo-900/20 border-b border-indigo-900/30">
            <div className="text-[10px] text-indigo-300 uppercase font-bold mb-1">Глобальные события</div>
            {(gameState.activeEvents || []).length > 0 ? (
                 <ul className="list-disc pl-3 text-xs text-indigo-100">
                    {(gameState.activeEvents || []).map((e, i) => <li key={i}>{e}</li>)}
                 </ul>
            ) : (
                <span className="text-slate-500 text-xs italic">Мир спокоен</span>
            )}
        </div>

        {/* --- FOLDER: CURRENT SCENE --- */}
        <InspectorFolder title="Текущая сцена" icon={<Activity size={14} />} defaultOpen={false}>
            <div className="mb-3">
                <span className="text-slate-500 text-xs block mb-1">Локация</span>
                <div className="text-slate-200 font-medium flex items-center gap-2">
                    <MapPin size={12} className="text-indigo-400" />
                    {getLocationName(gameState.currentLocationId)}
                </div>
                <div className="text-slate-500 text-xs mt-1">{gameState.currentTime}</div>
            </div>
            
            <div className="text-slate-500 text-xs block mb-1">Герой ({gameState.player.name})</div>
            <div className="flex flex-wrap gap-1 mb-2">
                {(gameState.player.statusEffects || []).length > 0 ? (
                    (gameState.player.statusEffects || []).map((e, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-red-900/30 border border-red-800 text-red-300 rounded text-[10px]">{e}</span>
                    ))
                ) : <span className="text-slate-600 text-[10px] italic">Статус в норме</span>}
            </div>
            
            <div className="mt-2 pt-2 border-t border-slate-700/50">
                 <div className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Package size={10} /> Инвентарь</div>
                 <div className="space-y-1">
                    {(gameState.player.inventory || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-300 bg-slate-800/40 px-2 py-1 rounded">
                            <span>{item.name}</span>
                            <span className="text-slate-500">x{item.quantity}</span>
                        </div>
                    ))}
                 </div>
            </div>
        </InspectorFolder>

        {/* --- FOLDER: WORLD ATLAS (Who is where?) --- */}
        <InspectorFolder title="Атлас Мира" icon={<Globe size={14} />} defaultOpen={true}>
            <div className="space-y-4">
                {(gameState.locations || []).map(loc => {
                    const npcsHere = (gameState.npcs || []).filter(n => n.locationId === loc.id);
                    const isCurrent = loc.id === gameState.currentLocationId;
                    
                    return (
                        <div key={loc.id} className={`relative pl-3 border-l-2 ${isCurrent ? 'border-indigo-500' : 'border-slate-700'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${isCurrent ? 'text-indigo-300' : 'text-slate-400'}`}>
                                    {loc.name}
                                </span>
                                {isCurrent && <span className="text-[9px] bg-indigo-600 text-white px-1 rounded">YOU</span>}
                            </div>
                            
                            {/* Connections */}
                            <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                                ↔ {(loc.connectedLocationIds || []).map(link => {
                                    const name = getLocationName(link.targetId);
                                    return `${name} (${link.status === 'Blocked' ? 'X' : link.distance})`;
                                }).join(", ")}
                            </div>

                            {/* NPCs in this location */}
                            {npcsHere.length > 0 ? (
                                <div className="mt-1.5 space-y-1">
                                    {npcsHere.map(npc => (
                                        <div key={npc.id} className="bg-slate-800 p-1.5 rounded flex items-center justify-between group">
                                            <span className="text-xs text-slate-300">{npc.name}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full ${npc.status === 'Alive' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            
                                            {/* Tooltip-ish thought preview */}
                                            <div className="hidden group-hover:block absolute left-0 -top-8 bg-black border border-slate-600 p-2 rounded z-20 w-48 text-[10px] text-slate-300 shadow-xl pointer-events-none">
                                                Thinking: "{npc.internalThoughts}"
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[10px] text-slate-700 italic mt-1">Пусто</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </InspectorFolder>

        {/* --- FOLDER: CHARACTERS DETAIL --- */}
        <InspectorFolder title="Психология NPC" icon={<Users size={14} />}>
             <div className="space-y-3">
            {(gameState.npcs || []).map((npc: NPC) => (
              <div key={npc.id} className="bg-slate-800/40 p-3 rounded border border-slate-700/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-300">{npc.name}</span>
                  <span className="text-[10px] text-slate-500">{getLocationName(npc.locationId)}</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-indigo-400 block mb-0.5">Мысли:</span>
                    <p className="text-slate-300 italic bg-slate-900/50 p-1 rounded">"{npc.internalThoughts}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <span className="text-slate-500 block">Цель:</span>
                        <span className="text-slate-300">{npc.currentGoal}</span>
                     </div>
                     <div>
                        <span className="text-slate-500 block">Эмоции:</span>
                        <span className="text-slate-300">{npc.emotionalState}</span>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </InspectorFolder>

        {/* --- FOLDER: LORE --- */}
        <InspectorFolder title="Архивы Знаний" icon={<Book size={14} />}>
            <ul className="list-disc list-outside pl-4 space-y-2 text-xs text-slate-400">
                {(gameState.worldLore || []).map((fact, i) => (
                    <li key={i}>{fact}</li>
                ))}
            </ul>
             <div className="mt-4 pt-2 border-t border-slate-700">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Слухи</span>
                <ul className="mt-1 space-y-1">
                    {(gameState.player.knownRumors || []).map((r, i) => (
                         <li key={i} className="text-xs text-amber-500/70 italic">"{r}"</li>
                    ))}
                </ul>
            </div>
        </InspectorFolder>

      </div>
    </div>
  );
};

export default StateInspector;