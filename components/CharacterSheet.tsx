
import React from 'react';
import { PlayerStats } from '../types';
import { Heart, Package, Shield, User } from 'lucide-react';

interface CharacterSheetProps {
    player: PlayerStats;
    onItemUse: (itemName: string) => void;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ player, onItemUse }) => {
    return (
        <div className="h-full bg-slate-900 border-r border-slate-800 flex flex-col font-sans">
            <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                <h2 className="font-heading font-bold text-lg text-slate-200">{player.name}</h2>
                <div className="flex flex-col gap-4 mt-3">
                    {/* HP Bar */}
                    <div className="w-full">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span className="flex items-center gap-1"><Heart size={12} className="text-red-500" /> HP</span>
                            <span>{player.hp.current} / {player.hp.max}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-red-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${(player.hp.current / player.hp.max) * 100}%` }}
                            />
                        </div>
                    </div>
                    
                    {/* Appearance */}
                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                        <div className="flex items-center gap-1 text-xs text-indigo-400 font-bold mb-1">
                             <User size={12} />
                             <span>Внешность</span>
                        </div>
                        <p className="text-xs text-slate-300 italic leading-relaxed">
                            {player.appearance || "Вы выглядите как обычный путник."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
                 {/* Status Effects */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Shield size={12} /> Состояние
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {player.statusEffects.length > 0 ? (
                            player.statusEffects.map((effect, i) => (
                                <span key={i} className="px-2 py-1 bg-indigo-900/30 border border-indigo-700/50 text-indigo-200 text-xs rounded">
                                    {effect}
                                </span>
                            ))
                        ) : (
                            <span className="text-slate-600 text-xs italic">Без эффектов</span>
                        )}
                    </div>
                </div>

                {/* Inventory */}
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Package size={12} /> Инвентарь
                    </h3>
                    <div className="space-y-2">
                        {player.inventory.map((item, i) => (
                            <button 
                                key={i}
                                onClick={() => onItemUse(item.name)}
                                className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 p-2 rounded transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-sm text-slate-300 font-medium group-hover:text-indigo-300 transition-colors">
                                        {item.name}
                                    </span>
                                    <span className="text-xs text-slate-500 bg-slate-900 px-1.5 rounded">
                                        x{item.quantity}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">{item.description}</p>
                            </button>
                        ))}
                        {player.inventory.length === 0 && (
                             <div className="text-center py-4 border border-dashed border-slate-800 rounded text-slate-600 text-xs">
                                 Пусто
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterSheet;
