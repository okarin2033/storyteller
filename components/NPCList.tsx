import React, { useState } from 'react';
import { NPC, WorldLocation } from '../types';
import { Search, MapPin, Brain, Heart, Target, Save, Edit2 } from 'lucide-react';

interface NPCListProps {
    npcs: NPC[];
    locations: WorldLocation[];
    onUpdateNPC: (id: string, updates: Partial<NPC>) => void;
}

const NPCList: React.FC<NPCListProps> = ({ npcs, locations, onUpdateNPC }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDesc, setEditDesc] = useState("");

    const filtered = (npcs || []).filter(n => n.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const getLocationName = (id: string) => (locations || []).find(l => l.id === id)?.name || "Unknown";

    const startEdit = (npc: NPC) => {
        setEditingId(npc.id);
        setEditDesc(npc.description);
    };

    const saveEdit = (id: string) => {
        onUpdateNPC(id, { description: editDesc });
        setEditingId(null);
    };

    return (
        <div className="h-full bg-slate-900 flex flex-col font-sans">
            <div className="p-4 border-b border-slate-800">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        placeholder="Найти персонажа..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {filtered.map(npc => (
                    <div key={npc.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-200">{npc.name}</h3>
                                <span className={`w-2 h-2 rounded-full ${npc.status === 'Alive' ? 'bg-green-500' : 'bg-red-600'}`} title={npc.status} />
                            </div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded">
                                <MapPin size={10} /> {getLocationName(npc.locationId)}
                            </span>
                        </div>

                        {/* Editable Description */}
                        <div className="mb-3">
                            {editingId === npc.id ? (
                                <div className="flex gap-2">
                                    <textarea 
                                        className="flex-1 bg-slate-950 border border-indigo-500/50 rounded text-xs text-slate-300 p-2 focus:outline-none"
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        rows={2}
                                    />
                                    <button onClick={() => saveEdit(npc.id)} className="text-green-400 hover:text-green-300"><Save size={16} /></button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start group">
                                    <p className="text-xs text-slate-400 italic">{npc.description}</p>
                                    <button onClick={() => startEdit(npc)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"><Edit2 size={12} /></button>
                                </div>
                            )}
                        </div>

                        {/* Internal State */}
                        <div className="space-y-2 bg-slate-900/50 p-2 rounded border border-slate-800/50">
                            <div className="flex gap-2 items-start">
                                <Brain size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-indigo-200">"{npc.internalThoughts}"</p>
                            </div>
                             <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="flex gap-1.5 items-center text-[10px]">
                                    <Heart size={10} className="text-pink-400" />
                                    <span className="text-slate-400">{npc.emotionalState}</span>
                                </div>
                                <div className="flex gap-1.5 items-center text-[10px]">
                                    <Target size={10} className="text-amber-400" />
                                    <span className="text-slate-400 truncate" title={npc.currentGoal}>{npc.currentGoal}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {filtered.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-10">Никого не найдено</div>
                )}
            </div>
        </div>
    );
};

export default NPCList;