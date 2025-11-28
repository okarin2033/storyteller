import React from 'react';
import { WorldLocation, NPC } from '../types';
import WorldMap from './WorldMap';
import { X, Map as MapIcon } from 'lucide-react';

interface MapModalProps {
  locations: WorldLocation[];
  currentLocationId: string;
  npcs: NPC[];
  onTravel: (locationName: string) => void;
  onClose: () => void;
}

const MapModal: React.FC<MapModalProps> = ({ locations, currentLocationId, npcs, onTravel, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full h-full max-w-6xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
           <div className="flex items-center gap-2 text-indigo-400 font-heading font-bold text-lg">
               <MapIcon size={20} />
               <span>World Atlas</span>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
               <X size={24} />
           </button>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-slate-900">
           <WorldMap 
              locations={locations} 
              currentLocationId={currentLocationId} 
              npcs={npcs} 
              onTravel={(name) => {
                  onTravel(name);
                  onClose(); // Close map when traveling
              }}
              onMaximize={onClose} // Maximize button acts as Minimize/Close here
              isFullScreen={true}
           />
        </div>
      </div>
    </div>
  );
};

export default MapModal;