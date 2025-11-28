
import React, { useState } from 'react';
import { PlayerStats, WorldLocation } from '../types';
import CharacterSheet from './CharacterSheet';
import { MapPin, Clock, Camera, Loader2, Maximize2 } from 'lucide-react';

interface LeftPanelProps {
    player: PlayerStats;
    location: WorldLocation | undefined;
    time: string;
    onItemUse: (itemName: string) => void;
    onGenerateLocationImage?: (locId: string, description: string) => Promise<void>;
    onGenerateCharacterImage?: (description: string) => Promise<void>;
    onMaximizeCharacter?: () => void;
    visualStyle: string;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ player, location, time, onItemUse, onGenerateLocationImage, onGenerateCharacterImage, onMaximizeCharacter, visualStyle }) => {
    const [loadingImage, setLoadingImage] = useState(false);

    // Generate Abstract CSS Art based on location type
    const getVisualizerClass = (type: string | undefined) => {
        switch(type) {
            case 'City': return 'bg-gradient-to-br from-indigo-900 via-slate-800 to-amber-900/40';
            case 'Wild': return 'bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-900/40';
            case 'Dungeon': return 'bg-gradient-to-br from-red-950 via-black to-slate-900';
            case 'Interior': return 'bg-gradient-to-br from-orange-950 via-amber-950 to-black';
            default: return 'bg-slate-900';
        }
    };

    const getIcon = (type: string | undefined) => {
         switch(type) {
            case 'City': return '🏰';
            case 'Wild': return '🌲';
            case 'Dungeon': return '💀';
            case 'Interior': return '🏠';
            default: return '❓';
        }
    }

    const handleGenImage = async () => {
        if (!location || !onGenerateLocationImage) return;
        setLoadingImage(true);
        // Combine style + prompt
        await onGenerateLocationImage(location.id, `Style: ${visualStyle}. ${location.name}: ${location.description}. Mood: ${location.type}. High quality.`);
        setLoadingImage(false);
    }

    return (
        <div className="w-full h-full flex flex-col bg-slate-950 border-r border-slate-800">
            {/* Visualizer Block */}
            <div className={`relative h-48 w-full flex flex-col justify-end transition-all duration-1000 group ${!location?.imageUrl ? getVisualizerClass(location?.type) : 'bg-slate-900'}`}>
                 
                 {location?.imageUrl ? (
                     <>
                        <img src={location.imageUrl} alt={location.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                     </>
                 ) : (
                    <>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                    </>
                 )}
                 
                 <div className="relative z-10 p-4">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                            <MapPin size={12} />
                            <span className="uppercase tracking-widest">{location?.type || "Unknown"}</span>
                        </div>
                        {onGenerateLocationImage && !location?.imageUrl && (
                            <button 
                                onClick={handleGenImage}
                                disabled={loadingImage}
                                className="text-xs text-slate-400 hover:text-white bg-black/50 p-1.5 rounded-full hover:bg-indigo-600 transition-colors"
                                title="Visualize Location"
                            >
                                {loadingImage ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                            </button>
                        )}
                    </div>
                    
                    <h2 className="text-2xl font-heading font-bold text-white leading-tight mb-2 shadow-black drop-shadow-lg">
                        {getIcon(location?.type)} {location?.name || "Unknown Location"}
                    </h2>
                    <div className="flex items-center gap-1 text-xs text-amber-200/80 bg-black/60 w-fit px-2 py-1 rounded backdrop-blur-sm border border-slate-800">
                        <Clock size={10} />
                        <span>{time}</span>
                    </div>
                 </div>
            </div>

            {/* Description Text */}
            <div className="p-4 bg-slate-950 border-b border-slate-800">
                <p className="text-xs text-slate-400 italic leading-relaxed line-clamp-4">
                    {location?.description}
                </p>
            </div>

            {/* Character Sheet Header with Maximize */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center">
                 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Character Overview</span>
                 {onMaximizeCharacter && (
                     <button onClick={onMaximizeCharacter} className="text-slate-500 hover:text-indigo-400 p-1 rounded hover:bg-slate-800" title="Full Profile">
                         <Maximize2 size={14} />
                     </button>
                 )}
            </div>

            {/* Character Sheet */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
                <CharacterSheet 
                    player={player} 
                    onItemUse={onItemUse} 
                    onGenerateImage={onGenerateCharacterImage}
                    visualStyle={visualStyle}
                />
            </div>
        </div>
    );
};

export default LeftPanel;
