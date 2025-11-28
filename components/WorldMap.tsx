
import React, { useRef, useState, useEffect } from 'react';
import { WorldLocation, NPC } from '../types';
import { MapPin, Move, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface WorldMapProps {
  locations: WorldLocation[];
  currentLocationId: string;
  npcs: NPC[];
  onTravel: (locationName: string) => void;
}

interface Point { x: number; y: number }

const WorldMap: React.FC<WorldMapProps> = ({ locations, currentLocationId, npcs, onTravel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Record<string, Point>>({});
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  
  // Dragging states
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });

  // Initialize Nodes on first load or new locations
  useEffect(() => {
    setNodes(prev => {
      const newNodes = { ...prev };
      let hasChanges = false;
      
      locations.forEach((loc, index) => {
        if (!newNodes[loc.id]) {
            hasChanges = true;
            // Place connected nodes near parents if possible
            const connectedParentId = loc.connectedLocationIds.find(id => newNodes[id]);
            if (connectedParentId) {
                const parent = newNodes[connectedParentId];
                // Random angle
                const angle = Math.random() * Math.PI * 2;
                newNodes[loc.id] = {
                    x: parent.x + Math.cos(angle) * 150,
                    y: parent.y + Math.sin(angle) * 150
                };
            } else {
                // Spiral layout for initial or disconnected
                const angle = index * 0.5;
                const r = 100 + (index * 20);
                newNodes[loc.id] = {
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r
                };
            }
        }
      });
      return hasChanges ? newNodes : prev;
    });
  }, [locations]);

  // Handle Map Pan
  const handleMouseDown = (e: React.MouseEvent) => {
      if (isDraggingNode) return;
      setIsDraggingMap(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDraggingNode) {
          const newX = (e.clientX - dragStart.x) / scale;
          const newY = (e.clientY - dragStart.y) / scale;
          setNodes(prev => ({ ...prev, [isDraggingNode]: { x: newX, y: newY } }));
          return;
      }
      if (isDraggingMap) {
          setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
  };

  const handleMouseUp = () => {
      setIsDraggingMap(false);
      setIsDraggingNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setIsDraggingNode(id);
      // We need to calculate offset relative to scale
      // This is a simplification; for perfect drag we need inverse matrix, 
      // but for relative movement, we just reset start logic
      const node = nodes[id];
      // Store screen coord offset relative to node pos * scale
      setDragStart({ 
          x: e.clientX - (node.x * scale), 
          y: e.clientY - (node.y * scale) 
      });
  };

  // Center on current player
  const centerOnPlayer = () => {
      const currentPos = nodes[currentLocationId];
      if (currentPos && containerRef.current) {
         const { width, height } = containerRef.current.getBoundingClientRect();
         setOffset({
             x: (width / 2) - (currentPos.x * scale),
             y: (height / 2) - (currentPos.y * scale)
         });
      }
  };

  // Auto center on mount/change if not dragging
  useEffect(() => {
     if (!isDraggingMap && !isDraggingNode && locations.length > 0) {
         centerOnPlayer();
     }
  }, [currentLocationId, locations.length === 0]); // Only re-center on location change

  return (
    <div className="w-full h-full bg-slate-900 relative overflow-hidden select-none" ref={containerRef}>
        
        {/* Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 bg-slate-800 text-slate-200 rounded shadow hover:bg-slate-700"><ZoomIn size={16} /></button>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} className="p-2 bg-slate-800 text-slate-200 rounded shadow hover:bg-slate-700"><ZoomOut size={16} /></button>
            <button onClick={centerOnPlayer} className="p-2 bg-slate-800 text-slate-200 rounded shadow hover:bg-slate-700"><Maximize size={16} /></button>
        </div>

        <div className="absolute top-4 left-4 z-20 bg-black/50 px-3 py-1 rounded text-[10px] text-slate-400 pointer-events-none border border-slate-700">
            Drag map to pan. Drag icons to rearrange.
        </div>

        <div 
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div 
                style={{ 
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: '0 0',
                    width: '100%', height: '100%',
                    position: 'absolute'
                }}
            >
                {/* Connections (Lines) */}
                <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none" style={{ opacity: 0.5 }}>
                    {locations.map(loc => 
                        loc.connectedLocationIds.map(targetId => {
                            const start = nodes[loc.id];
                            const end = nodes[targetId];
                            if (!start || !end) return null;
                            // Draw line only once per pair (id check)
                            if (loc.id > targetId) return null; 

                            return (
                                <line 
                                    key={`${loc.id}-${targetId}`}
                                    x1={5000 + start.x} y1={5000 + start.y}
                                    x2={5000 + end.x} y2={5000 + end.y}
                                    stroke="#64748b" strokeWidth="2" strokeDasharray="5 5"
                                />
                            )
                        })
                    )}
                </svg>

                {/* Nodes */}
                {locations.map(loc => {
                    const pos = nodes[loc.id];
                    if (!pos) return null;
                    const isCurrent = loc.id === currentLocationId;
                    const npcsHere = npcs.filter(n => n.locationId === loc.id);

                    return (
                        <div 
                            key={loc.id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-colors duration-200`}
                            style={{ left: pos.x, top: pos.y }}
                            onMouseDown={(e) => handleNodeMouseDown(e, loc.id)}
                        >
                            {/* Icon Circle */}
                            <div className={`
                                w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-xl z-10 
                                ${isCurrent 
                                    ? 'bg-indigo-600 border-white shadow-indigo-500/50' 
                                    : 'bg-slate-800 border-slate-600 hover:border-slate-400'
                                }
                            `}>
                                <div className="text-xl">
                                    {loc.type === 'Wild' ? '🌲' : loc.type === 'City' ? '🏰' : loc.type === 'Dungeon' ? '💀' : '🏠'}
                                </div>
                            </div>

                            {/* Label */}
                            <div className={`mt-2 px-2 py-0.5 rounded text-[10px] whitespace-nowrap border z-20 pointer-events-none select-none
                                ${isCurrent ? 'bg-indigo-900/80 text-white border-indigo-500' : 'bg-black/60 text-slate-300 border-slate-700'}
                            `}>
                                {loc.name}
                            </div>

                             {/* NPC Indicators */}
                             {npcsHere.length > 0 && (
                                <div className="absolute -top-2 -right-2 flex -space-x-1">
                                    {npcsHere.map(npc => (
                                        <div key={npc.id} className="w-4 h-4 rounded-full bg-green-500 border border-slate-900" title={npc.name} />
                                    ))}
                                </div>
                             )}

                             {/* Travel Button (only if connected) */}
                             {!isCurrent && locations.find(l => l.id === currentLocationId)?.connectedLocationIds.includes(loc.id) && (
                                 <button 
                                    className="absolute -bottom-8 bg-indigo-600 text-white text-[9px] px-2 py-1 rounded shadow-lg hover:bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTravel(loc.name);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag
                                 >
                                     Travel
                                 </button>
                             )}
                        </div>
                    );
                })}

            </div>
        </div>
    </div>
  );
};

export default WorldMap;
