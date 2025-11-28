
import React, { useState, useCallback, useEffect, useRef } from 'react';
import NarrativeView from './components/NarrativeView';
import StateInspector from './components/StateInspector';
import CharacterSheet from './components/CharacterSheet';
import WorldMap from './components/WorldMap';
import NPCList from './components/NPCList';
import { generateStoryTurn, createWorldState } from './services/geminiService';
import { GameState, NPC, WorldLocation, SuggestedAction, SceneVisual } from './types';
import { INITIAL_GAME_STATE } from './constants';
import { Send, BookOpen, Sparkles, Play, Terminal, Map as MapIcon, Database, RotateCcw, Users } from 'lucide-react';

type AppMode = 'MENU' | 'GAME';
type RightPanelTab = 'MAP' | 'NPC' | 'GOD';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [mode, setMode] = useState<AppMode>('MENU');
  
  // Menu State
  const [worldIdea, setWorldIdea] = useState("Dark fantasy world where the sun has died, and humanity lives in underground cities.");
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  
  // REAL logs from the service
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Game State
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rightTab, setRightTab] = useState<RightPanelTab>('MAP');
  
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [history, setHistory] = useState<{ role: string; content: string; sceneVisual?: SceneVisual | null }[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
        if (process.env.API_KEY) {
            setApiKey(process.env.API_KEY);
        }
    } catch (e) {
        console.warn("API_KEY not found in environment.");
    }
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generationLogs]);

  const handleCreateWorld = async () => {
      if (!apiKey) { setError("API Key Required"); return; }
      
      setIsGeneratingWorld(true);
      setError(null);
      setGenerationLogs(["Initializing system..."]);

      try {
          const newState = await createWorldState(apiKey, worldIdea, (logMessage) => {
              setGenerationLogs(prev => [...prev, logMessage]);
          });
          
          setGameState(newState);
          setHistory([{ 
              role: 'model', 
              content: `**${newState.currentTime}**\n\nМир создан. Вы — ${newState.player.name}.\n${newState.locations.find(l => l.id === newState.currentLocationId)?.description}`
          }]);
          setMode('GAME');
      } catch (err: any) {
          setError("Ошибка создания мира: " + err.message);
      } finally {
          setIsGeneratingWorld(false);
      }
  };

  const handleStartDefault = () => {
      setGameState(INITIAL_GAME_STATE);
      setHistory([{ role: 'model', content: "Дождь барабанит по крыше таверны «Ржавый Якорь»..." }]);
      setMode('GAME');
  }

  const handleUpdateNPC = (id: string, updates: Partial<NPC>) => {
      setGameState(prev => ({
          ...prev,
          npcs: prev.npcs.map(n => n.id === id ? { ...n, ...updates } : n)
      }));
  };

  const handleAction = useCallback(async (customInput?: string) => {
    const actionText = customInput || input;
    if (!actionText.trim() || isProcessing) return;
    if (!apiKey) { setError("API Key is missing."); return; }

    setInput('');
    setSuggestedActions([]); // Clear suggested actions while thinking
    setError(null);
    setIsProcessing(true);

    const newHistory = [...history, { role: 'user', content: actionText }];
    setHistory(newHistory);

    try {
      const narrativeContext = newHistory.slice(-6).map(h => 
        `${h.role === 'user' ? 'PLAYER' : 'GM'}: ${h.content}`
      );

      const result = await generateStoryTurn(apiKey, gameState, narrativeContext, actionText);

      setGameState(prevState => {
        const updates = result.stateUpdate;
        
        let updatedNPCs = [...prevState.npcs];
        if (updates.npcs) {
            updates.npcs.forEach((uNPC: Partial<NPC>) => {
                const idx = updatedNPCs.findIndex(n => n.id === uNPC.id);
                if (idx !== -1) updatedNPCs[idx] = { ...updatedNPCs[idx], ...uNPC };
                else if (uNPC.id && uNPC.name) updatedNPCs.push(uNPC as NPC);
            });
        }

        let updatedLocations = [...prevState.locations];
        if (updates.locations) {
            updates.locations.forEach((uLoc: Partial<WorldLocation>) => {
                const idx = updatedLocations.findIndex(l => l.id === uLoc.id);
                if (idx !== -1) updatedLocations[idx] = { ...updatedLocations[idx], ...uLoc };
                else if (uLoc.id && uLoc.name) updatedLocations.push(uLoc as WorldLocation);
            });
        }

        return {
            ...prevState,
            ...updates,
            turnCount: prevState.turnCount + 1,
            player: { ...prevState.player, ...updates.player },
            npcs: updatedNPCs,
            locations: updatedLocations,
            worldLore: updates.worldLore ? [...prevState.worldLore, ...updates.worldLore.filter(l => !prevState.worldLore.includes(l))] : prevState.worldLore,
            activeEvents: updates.activeEvents || prevState.activeEvents
        };
      });

      setHistory(prev => [...prev, { 
          role: 'model', 
          content: result.narrative, 
          sceneVisual: result.sceneVisual 
      }]);
      setSuggestedActions(result.suggestedActions);

    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  }, [input, apiKey, gameState, history, isProcessing]);

  // Inject inventory action
  const handleItemUse = (itemName: string) => {
      setInput(`Использовать ${itemName}`);
  };
  // Inject travel action
  const handleTravel = (locName: string) => {
      handleAction(`Отправиться в ${locName}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAction();
    }
  };

  if (mode === 'MENU') {
      return (
          <div className="flex h-screen bg-slate-950 text-slate-200 items-center justify-center font-sans p-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_70%)]" />
               <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
                   <div className="flex justify-center mb-6"><BookOpen size={48} className="text-indigo-500" /></div>
                   <h1 className="text-4xl font-heading font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 mb-2">Chronicles of the Deep World</h1>
                   
                   {error && (
                       <div className="mb-4 bg-red-900/50 border border-red-800 text-red-200 p-3 rounded text-sm text-center flex flex-col items-center gap-2">
                           <span>{error}</span>
                           <button 
                             onClick={handleCreateWorld} 
                             className="text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1"
                            >
                               <RotateCcw size={12} /> Попробовать снова
                           </button>
                       </div>
                   )}
                   
                   {isGeneratingWorld ? (
                       <div className="bg-black/50 border border-indigo-500/30 rounded-lg p-6 font-mono text-sm h-64 flex flex-col relative overflow-hidden">
                           <div className="absolute top-0 left-0 right-0 bg-indigo-900/20 p-2 flex items-center gap-2 border-b border-indigo-500/20 text-xs text-indigo-300"><Terminal size={12} /> System Kernel</div>
                           <div className="mt-8 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                                {generationLogs.map((log, i) => (
                                    <div key={i} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300 text-slate-400">
                                        <span className="text-indigo-500 mt-0.5">➜</span>
                                        <span>{log}</span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                           </div>
                       </div>
                   ) : (
                       <div className="space-y-6">
                           <textarea 
                               className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                               placeholder="Опишите мир... (Например: Заброшенная космическая станция...)"
                               value={worldIdea}
                               onChange={(e) => setWorldIdea(e.target.value)}
                           />
                           <button onClick={handleCreateWorld} disabled={!worldIdea} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"><Sparkles /> Генерировать Мир</button>
                           <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-800"></div><span className="flex-shrink mx-4 text-slate-600 text-xs uppercase">Или</span><div className="flex-grow border-t border-slate-800"></div></div>
                           <button onClick={handleStartDefault} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"><Play size={16} /> Запустить Демо (Таверна)</button>
                       </div>
                   )}
               </div>
          </div>
      )
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Left Column: Character Sheet (Hidden on Mobile) */}
      <div className="hidden lg:block w-72 h-full z-10 shadow-xl">
        <CharacterSheet player={gameState.player} onItemUse={handleItemUse} />
      </div>

      {/* Center Column: Story */}
      <div className="flex flex-col flex-1 min-w-0 bg-slate-950 relative">
        <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-6 z-20">
             <div className="flex items-center gap-3">
                 <button onClick={() => setMode('MENU')} className="p-2 text-slate-400 hover:text-white"><BookOpen size={18} /></button>
                 <span className="font-heading font-bold text-slate-200 truncate">{gameState.locations.find(l => l.id === gameState.currentLocationId)?.name}</span>
             </div>
             {/* Mobile Toggles could go here */}
        </header>

        <main className="flex-1 relative flex flex-col min-h-0">
           <NarrativeView history={history} isThinking={isProcessing} />
           
           <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-10">
             {/* Suggested Actions Chips */}
             {!isProcessing && suggestedActions.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-3 justify-center">
                     {suggestedActions.map((action, i) => (
                         <button 
                            key={i} 
                            onClick={() => handleAction(action.actionText)}
                            className="px-3 py-1 bg-slate-800 hover:bg-indigo-900/50 border border-slate-700 hover:border-indigo-500 rounded-full text-xs text-indigo-200 transition-colors animate-in slide-in-from-bottom-2 fade-in duration-300"
                            style={{ animationDelay: `${i * 100}ms` }}
                         >
                             {action.label}
                         </button>
                     ))}
                 </div>
             )}

             <div className="max-w-3xl mx-auto relative">
               {error && <div className="absolute -top-12 left-0 right-0 bg-red-900/80 text-red-200 text-sm px-4 py-2 rounded mb-2 flex justify-between items-center">
                   <span>{error}</span>
                   <button onClick={() => handleAction()} className="p-1 hover:bg-red-800 rounded"><RotateCcw size={14} /></button>
               </div>}
               
               <div className="relative group">
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                 <div className="relative flex bg-slate-900 rounded-lg shadow-xl ring-1 ring-slate-800">
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 px-4 py-4 focus:outline-none"
                      placeholder="Ваши действия..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isProcessing}
                      autoFocus
                    />
                    <button onClick={() => handleAction()} disabled={isProcessing || !input.trim()} className="px-6 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"><Send size={20} /></button>
                 </div>
               </div>
             </div>
           </div>
        </main>
      </div>

      {/* Right Column: Map & Inspector & NPCs */}
      <div className="hidden lg:flex w-80 h-full flex-col bg-slate-900 border-l border-slate-800 z-10 shadow-xl">
          <div className="flex border-b border-slate-800">
              <button 
                onClick={() => setRightTab('MAP')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${rightTab === 'MAP' ? 'text-indigo-400 bg-slate-800/50 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <MapIcon size={14} />
              </button>
              <button 
                onClick={() => setRightTab('NPC')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${rightTab === 'NPC' ? 'text-indigo-400 bg-slate-800/50 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <Users size={14} />
              </button>
              <button 
                onClick={() => setRightTab('GOD')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${rightTab === 'GOD' ? 'text-indigo-400 bg-slate-800/50 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <Database size={14} />
              </button>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
              {rightTab === 'MAP' && (
                  <WorldMap 
                    locations={gameState.locations} 
                    currentLocationId={gameState.currentLocationId} 
                    npcs={gameState.npcs} 
                    onTravel={handleTravel}
                  />
              )}
              {rightTab === 'NPC' && (
                  <NPCList 
                      npcs={gameState.npcs} 
                      locations={gameState.locations}
                      onUpdateNPC={handleUpdateNPC}
                  />
              )}
              {rightTab === 'GOD' && (
                  <StateInspector gameState={gameState} />
              )}
          </div>
      </div>
    </div>
  );
};

export default App;
