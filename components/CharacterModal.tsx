
import React from 'react';
import { PlayerStats } from '../types';
import { X, Shield, Heart, Package, User, Shirt, Activity } from 'lucide-react';

interface CharacterModalProps {
  player: PlayerStats;
  onClose: () => void;
  visualStyle: string;
}

const CharacterModal: React.FC<CharacterModalProps> = ({ player, onClose, visualStyle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Column: Portrait & Core Stats */}
        <div className="md:w-1/3 bg-slate-950 p-6 flex flex-col border-r border-slate-800">
           <h2 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 mb-4">{player.name}</h2>
           
           <div className="w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-700 shadow-lg mb-6 bg-slate-900 relative">
               {player.imageUrl ? (
                   <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
               ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-700 flex-col gap-2">
                       <User size={48} />
                       <span className="text-xs uppercase tracking-widest">No Portrait</span>
                   </div>
               )}
           </div>

           <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm text-slate-400 mb-1 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-2"><Heart size={14} className="text-red-500" /> Vitality</span>
                        <span>{player.hp.current} / {player.hp.max}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                        <div 
                            className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${(player.hp.current / player.hp.max) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Shield size={12} /> Status Effects</h3>
                    <div className="flex flex-wrap gap-2">
                        {(player.statusEffects || []).length > 0 ? (
                             (player.statusEffects || []).map((e, i) => (
                                 <span key={i} className="px-2 py-1 bg-red-950/40 border border-red-900 text-red-300 text-xs rounded">{e}</span>
                             ))
                        ) : (
                            <span className="text-slate-600 text-sm italic">Healthy</span>
                        )}
                    </div>
                </div>
           </div>
        </div>

        {/* Right Column: Details & Inventory */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex gap-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    <span>Character Sheet</span>
                    {visualStyle && <span className="text-slate-600 border-l border-slate-700 pl-4 truncate max-w-[200px]">{visualStyle}</span>}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Appearance Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-800">
                         <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2 uppercase text-xs tracking-wider">
                             <User size={14} /> Physical Traits
                         </div>
                         <p className="text-slate-300 leading-relaxed font-serif text-lg italic">"{player.appearance.physical}"</p>
                    </div>
                    <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-800">
                         <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2 uppercase text-xs tracking-wider">
                             <Shirt size={14} /> Equipment & Clothing
                         </div>
                         <p className="text-slate-300 leading-relaxed font-serif text-lg italic">"{player.appearance.clothing}"</p>
                    </div>
                </div>

                {/* Inventory */}
                <div>
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                        <Package size={16} /> Inventory ({(player.inventory || []).length} items)
                     </h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {(player.inventory || []).map((item, i) => (
                             <div key={i} className="flex flex-col bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition-colors">
                                 <div className="flex justify-between items-start mb-1">
                                     <span className="font-bold text-slate-200">{item.name}</span>
                                     <span className="text-xs bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded-full">x{item.quantity}</span>
                                 </div>
                                 <span className="text-xs text-slate-500 mb-2">{item.description}</span>
                                 <div className="flex flex-wrap gap-1 mt-auto">
                                     {(item.properties || []).map((p, idx) => (
                                         <span key={idx} className="text-[9px] uppercase font-bold text-slate-600 bg-slate-900 px-1 rounded">{p}</span>
                                     ))}
                                 </div>
                             </div>
                         ))}
                     </div>
                     {(player.inventory || []).length === 0 && (
                         <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl text-slate-600">Empty Inventory</div>
                     )}
                </div>

                {/* Rumors/Lore */}
                <div>
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                        <Activity size={16} /> Known Rumors
                     </h3>
                     <ul className="space-y-2">
                         {(player.knownRumors || []).map((r, i) => (
                             <li key={i} className="flex gap-3 text-slate-300 bg-slate-800/20 p-3 rounded-lg">
                                 <span className="text-amber-500 font-serif text-xl">“</span>
                                 <span className="italic">{r}</span>
                             </li>
                         ))}
                         {(player.knownRumors || []).length === 0 && <li className="text-slate-600 italic">No rumors heard yet...</li>}
                     </ul>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default CharacterModal;
