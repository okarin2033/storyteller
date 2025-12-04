import React, { useState, useEffect, useRef } from 'react';
import NarrativeView from './components/NarrativeView';
import StateInspector from './components/StateInspector';
import LeftPanel from './components/LeftPanel';
import WorldMap from './components/WorldMap';
import NPCList from './components/NPCList';
import SettingsModal from './components/SettingsModal';
import CharacterModal from './components/CharacterModal';
import MapModal from './components/MapModal';
import { useGameEngine } from './hooks/useGameEngine';
import { createWorldState, generateImage, sanitizeStateForAi, repairGameState } from './services/geminiService';
import { SaveFile } from './types';
import { INITIAL_GAME_STATE } from './constants';
import { Send, BookOpen, Sparkles, Play, Settings as SettingsIcon, Upload, X } from 'lucide-react';

type AppMode = 'MENU' | 'GAME';
type RightPanelTab = 'MAP' | 'NPC' | 'GOD';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [mode, setMode] = useState<AppMode>('MENU');
  
  // Menu & World Gen
  const [worldIdea, setWorldIdea] = useState("Dark fantasy world where the sun has died, and humanity lives in underground cities.");
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook Logic
  const engine = useGameEngine(apiKey);
  
  // UI State
  const [input, setInput] = useState('');
  const [rightTab, setRightTab] = useState<RightPanelTab>('MAP');
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Init API Key
  useEffect(() => {
    try { if (process.env.API_KEY) setApiKey(process.env.API_KEY); } catch (e) {}
  }, []);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [generationLogs]);

  // --- Handlers ---

  const handleCreateWorld = async () => {
      if (!apiKey) return;
      setIsGeneratingWorld(true);
      setGenerationLogs(["Initializing system..."]);
      try {
          const newState = await createWorldState(apiKey, worldIdea, (log) => setGenerationLogs(prev => [...prev, log]));
          engine.setGameState(newState);
          engine.setHistory([{ role: 'model', content: Array.isArray(newState.openingScene) ? newState.openingScene.join('\n\n') : (newState.openingScene || "Welcome") }]);
          setMode('GAME');
      } catch (e: any) {
          engine.setError(e.message);
      } finally {
          setIsGeneratingWorld(false);
      }
  };

  const handleStartDefault = () => {
      const repaired = repairGameState(INITIAL_GAME_STATE);
      engine.setGameState(repaired);
      engine.setHistory([{ role: 'model', content: Array.isArray(repaired.openingScene) ? repaired.openingScene.join('\n\n') : "Welcome." }]);
      setMode('GAME');
  };

  const handleExportSave = () => {
      const saveFile: SaveFile = {
          version: 1,
          timestamp: Date.now(),
          name: engine.gameState.player.name,
          gameState: sanitizeStateForAi(engine.gameState),
          history: engine.history,
          stateHistory: engine.stateHistory.map(sanitizeStateForAi)
      };
      const blob = new Blob([JSON.stringify(saveFile, null, 2)], { type: "application/json" });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `save_${saveFile.name}_${Date.now()}.json`;
      a.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const content = ev.target?.result as string;
              engine.loadGame(JSON.parse(content));
              setMode('GAME');
          } catch(err) { console.error(err); }
      };
      reader.readAsText(file);
  };

  const onEditMsg = (index: number, content: string) => {
      const shouldRetry = engine.handleEditMessage(index, content);
      if (shouldRetry) {
          engine.handleAction(content);
      }
  };

  const onRollback = (index: number) => {
      const text = engine.handleRollback(index);
      if (text) setInput(text);
  };

  const onGenImage = async (index: number) => {
      if (!apiKey) return;
      const msg = engine.history[index];
      const url = await generateImage(apiKey, `Style: ${engine.gameState.visualStyle}. ${msg.content.substring(0,400)}`);
      if (url) {
          engine.setHistory(prev => {
              const next = [...prev];
              next[index] = { ...next[index], sceneImage: url };
              return next;
          });
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          engine.handleAction(input);
          setInput('');
      }
  };

  const highlightData = {
      npcNames: (engine.gameState.npcs || []).map(n => n.name),
      itemNames: (engine.gameState.player?.inventory || []).map(i => i.name),
      effectNames: engine.gameState.player?.statusEffects || []
  };

  if (mode === 'MENU') {
      return (
          <div className="flex h-screen bg-slate-950 text-slate-200 items-center justify-center p-4 overflow-hidden relative">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_70%)]" />
               <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl z-10">
                   <h1 className="text-4xl font-heading font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 mb-2">Chronicles</h1>
                   {isGeneratingWorld ? (
                        <div className="bg-black/50 border border-indigo-500/30 rounded p-4 h-64 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-400 space-y-1">
                            {generationLogs.map((l,i) => <div key={i}>➜ {l}</div>)}
                            <div ref={logsEndRef}/>
                        </div>
                   ) : (
                       <div className="space-y-6">
                           <textarea className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-4 text-slate-200 resize-none focus:border-indigo-500 outline-none" value={worldIdea} onChange={e => setWorldIdea(e.target.value)} placeholder="Describe your world..." />
                           <div className="grid grid-cols-2 gap-3">
                               <button onClick={handleCreateWorld} disabled={!worldIdea} className="col-span-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold flex justify-center gap-2"><Sparkles/> Generate</button>
                               <button onClick={handleStartDefault} className="py-3 bg-slate-800 rounded flex justify-center gap-2"><Play size={16}/> Demo</button>
                               <button onClick={() => fileInputRef.current?.click()} className="py-3 bg-slate-800 rounded flex justify-center gap-2"><Upload size={16}/> Load</button>
                               <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                           </div>
                       </div>
                   )}
               </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans relative">
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} visualStyle={engine.gameState.visualStyle} onSaveStyle={(s) => engine.setGameState(p => ({...p, visualStyle: s}))} apiKey={apiKey} onSaveKey={setApiKey} onExportSave={handleExportSave} />
      {showCharacterModal && <CharacterModal player={engine.gameState.player} onClose={() => setShowCharacterModal(false)} visualStyle={engine.gameState.visualStyle} />}
      {showMapModal && <MapModal locations={engine.gameState.locations} currentLocationId={engine.gameState.currentLocationId} npcs={engine.gameState.npcs} onTravel={(n) => { engine.handleAction(`Go to ${n}`); setShowMapModal(false); }} onClose={() => setShowMapModal(false)} />}

      <div className="hidden lg:block w-72 h-full z-10 shadow-xl border-r border-slate-800 bg-slate-950">
        <LeftPanel 
            player={engine.gameState.player} quests={engine.gameState.quests} 
            location={engine.gameState.locations.find(l => l.id === engine.gameState.currentLocationId)} 
            time={engine.gameState.currentTime} visualStyle={engine.gameState.visualStyle}
            onItemUse={(n) => engine.handleAction(`Use ${n}`)} 
            onMaximizeCharacter={() => setShowCharacterModal(true)}
            onGenerateCharacterImage={async (p) => { if(apiKey) { const u = await generateImage(apiKey, p); if(u) engine.setGameState(s => ({...s, player: {...s.player, imageUrl: u}})) }}}
            onGenerateLocationImage={async (id, p) => { if(apiKey) { const u = await generateImage(apiKey, p); if(u) engine.setGameState(s => ({...s, locations: s.locations.map(l => l.id === id ? {...l, imageUrl: u} : l)})) }}}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 bg-slate-950 relative">
        <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-4 z-20">
             <div className="flex items-center gap-3">
                 <button onClick={() => setMode('MENU')} className="p-2 text-slate-400 hover:text-white"><BookOpen size={18} /></button>
                 <span className="font-heading font-bold text-slate-200 truncate">{engine.gameState.locations.find(l => l.id === engine.gameState.currentLocationId)?.name}</span>
             </div>
             <div className="flex items-center gap-2">
                 <button onClick={() => engine.setIsDirectorMode(!engine.isDirectorMode)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${engine.isDirectorMode ? 'bg-purple-900/50 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                     {engine.isDirectorMode ? 'DIRECTOR' : 'PLAYER'}
                 </button>
                 <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white"><SettingsIcon size={18} /></button>
             </div>
        </header>

        <main className="flex-1 relative flex flex-col min-h-0">
           {engine.error && (
               <div className="bg-red-900/50 p-4 border-b border-red-700 text-red-200 text-sm flex justify-between items-center animate-in fade-in slide-in-from-top-5">
                   <span>{engine.error}</span>
                   <button onClick={() => engine.setError(null)}><X size={16} /></button>
               </div>
           )}
           
           <NarrativeView 
                history={engine.history} isThinking={engine.isProcessing} highlightData={highlightData}
                onEditMessage={onEditMsg} onDeleteMessage={engine.handleDeleteMessage}
                onRegenerate={() => { /* Logic to be added if needed */ }}
                onRollback={onRollback} onGenerateSceneImage={onGenImage}
           />
           <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-10">
             {!engine.isProcessing && engine.suggestedActions.length > 0 && !engine.isDirectorMode && (
                 <div className="flex flex-wrap gap-2 mb-3 justify-center">
                     {engine.suggestedActions.map((a, i) => (
                         <button key={i} onClick={() => { engine.handleAction(a.actionText); setInput(''); }} className="px-3 py-1 bg-slate-800 hover:bg-indigo-900/50 border border-slate-700 rounded-full text-xs text-indigo-200 transition-colors">{a.label}</button>
                     ))}
                 </div>
             )}
             <div className="max-w-3xl mx-auto relative group">
                 <div className={`absolute -inset-0.5 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 ${engine.isDirectorMode ? 'bg-gradient-to-r from-purple-500 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}></div>
                 <div className="relative flex bg-slate-900 rounded-lg shadow-xl ring-1 ring-slate-800">
                    <input type="text" className="flex-1 bg-transparent text-slate-100 px-4 py-4 focus:outline-none" placeholder={engine.isDirectorMode ? "Director command..." : "Action..."} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={engine.isProcessing} autoFocus />
                    <button onClick={() => { engine.handleAction(input); setInput(''); }} disabled={engine.isProcessing || !input.trim()} className="px-6 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"><Send size={20} /></button>
                 </div>
             </div>
           </div>
        </main>
      </div>

      <div className="hidden lg:flex w-80 h-full flex-col bg-slate-900 border-l border-slate-800 z-10 shadow-xl">
          <div className="flex border-b border-slate-800">
              <button onClick={() => setRightTab('MAP')} className={`flex-1 py-3 text-xs font-bold uppercase ${rightTab === 'MAP' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>Map</button>
              <button onClick={() => setRightTab('NPC')} className={`flex-1 py-3 text-xs font-bold uppercase ${rightTab === 'NPC' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>NPCs</button>
              <button onClick={() => setRightTab('GOD')} className={`flex-1 py-3 text-xs font-bold uppercase ${rightTab === 'GOD' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>God</button>
          </div>
          <div className="flex-1 relative overflow-hidden">
              {rightTab === 'MAP' && <WorldMap locations={engine.gameState.locations} currentLocationId={engine.gameState.currentLocationId} npcs={engine.gameState.npcs} onTravel={(n) => engine.handleAction(`Go to ${n}`)} onMaximize={() => setShowMapModal(true)} />}
              {rightTab === 'NPC' && <NPCList npcs={engine.gameState.npcs} locations={engine.gameState.locations} onUpdateNPC={(id, u) => engine.setGameState(s => ({...s, npcs: s.npcs.map(n => n.id === id ? {...n, ...u} : n)}))} onDeleteNPC={(id) => engine.setGameState(s => ({...s, npcs: s.npcs.filter(n => n.id !== id)}))} />}
              {rightTab === 'GOD' && <StateInspector gameState={engine.gameState} onUpdatePreferences={(p) => engine.setGameState(s => ({...s, metaPreferences: p}))} onUpdateTheme={(t) => engine.setGameState(s => ({...s, worldTheme: t}))} />}
          </div>
      </div>
    </div>
  );
};

export default App;