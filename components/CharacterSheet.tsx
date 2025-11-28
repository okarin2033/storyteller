
import React, { useState } from 'react';
import { PlayerStats } from '../types';
import { Heart, Package, Shield, User, Shirt, Camera, Loader2, RefreshCw } from 'lucide-react';

interface CharacterSheetProps {
    player: PlayerStats;
    onItemUse: (itemName: string) => void;
    onGenerateImage?: (desc: string) => Promise<void>;
    visualStyle?: string;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ player, onItemUse, onGenerateImage, visualStyle }) => {
    const [loading, setLoading] = useState(false);

    const handleGen = async () => {
        if (!onGenerateImage) return;
        setLoading(true);
        const stylePrompt = visualStyle ? `Style: ${visualStyle}. ` : '';
        await onGenerateImage(`${stylePrompt}Fantasy RPG Character Portrait. ${player.name}. Physical: ${player.appearance.physical}. Wearing: ${player.appearance.clothing}. High quality art.`);
        setLoading(false);
    }

    return (
        <div className="flex flex-col h-full font-sans text-slate-200 overflow-y-auto custom-scrollbar pr-2">
            
            {/* Portrait & HP - No longer fixed */}
            <div className="mb-4 space-y-3">
                <div className="flex items-start justify-between">
                    <h2 className="font-heading font-bold text-lg">{player.name}</h2>
                    {onGenerateImage && !player.imageUrl && (
                        <button 
                            onClick={handleGen} 
                            disabled={loading}
                            className="text-slate-500 hover:text-indigo-400 transition-colors"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14} />}
                        </button>
                    )}
                </div>

                {player.imageUrl ? (
                    <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-700 mb-2 relative group flex-shrink-0">
                        <img src={player.imageUrl} alt="Character" className="w-full h-full object-cover" />
                        {onGenerateImage && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={handleGen}
                                    disabled={loading}
                                    className="px-3 py-1 bg-indigo-600/90 text-white text-xs rounded-full flex items-center gap-2 hover:bg-indigo-500 transition-colors"
                                >
                                    {loading ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />}
                                    Update Portrait
                                </button>
                            </div>
                        )}
                    </div>
                ) : null}
                
                 {/* HP Bar */}
                 <div className="w-full">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span className="flex items-center gap-1"><Heart size={12} className="text-red-500" /> HP</span>
                        <span>{player.hp.current} / {player.hp.max}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                            style={{ width: `${(player.hp.current / player.hp.max) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Appearance - part of flow now */}
                <div className="space-y-2 text-xs">
                     <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                        <div className="flex items-center gap-1 text-slate-400 font-bold mb-1">
                             <User size={10} />
                             <span>Тело</span>
                        </div>
                        <p className="text-slate-300 italic">{player.appearance.physical}</p>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                        <div className="flex items-center gap-1 text-slate-400 font-bold mb-1">
                             <Shirt size={10} />
                             <span>Экипировка</span>
                        </div>
                        <p className="text-slate-300 italic">{player.appearance.clothing}</p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-800 mb-4" />

            <div className="space-y-4 pb-4">
                 {/* Status Effects */}
                <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Shield size={10} /> Состояние
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {(player.statusEffects || []).length > 0 ? (
                            (player.statusEffects || []).map((effect, i) => (
                                <span key={i} className="px-2 py-1 bg-indigo-900/30 border border-indigo-700/50 text-indigo-200 text-xs rounded shadow-sm">
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
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Package size={10} /> Инвентарь
                    </h3>
                    <div className="space-y-2">
                        {(player.inventory || []).map((item, i) => (
                            <button 
                                key={i}
                                onClick={() => onItemUse(item.name)}
                                className="w-full text-left bg-slate-800/30 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 p-2 rounded transition-all group"
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
                        {(player.inventory || []).length === 0 && (
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
