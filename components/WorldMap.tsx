
import React, { useRef, useState, useEffect } from 'react';
import { WorldLocation, NPC, LocationConnection } from '../types';
import { MapPin, Move, ZoomIn, ZoomOut, Maximize, Minimize, Eye, EyeOff, Lock, Footprints } from 'lucide-react';

interface WorldMapProps {
  locations: WorldLocation[];
  currentLocationId: string;
  npcs: NPC[];
  onTravel: (locationName: string) => void;
  onMaximize?: () => void; // Trigger external modal
  isFullScreen?: boolean;   // Are we inside the modal?
}

interface Point { x: number; y: number }

const WorldMap: React.FC<WorldMapProps> = ({ locations, currentLocationId, npcs, onTravel, onMaximize, isFullScreen = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Record<string, Point>>({});
  const [scale, setScale] = useState(isFullScreen ? 1.2 : 0.8);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  
  const [showNPCs, setShowNPCs] = useState(false);
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);

  // Dragging states
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });

  // Initialize Nodes on first load or new locations
  useEffect(() => {
    setNodes(prev => {
      const newNodes = { ...prev };
      let hasChanges = false;
      
      (locations || []).forEach((loc, index) => {
        if (!newNodes[loc.id]) {
            hasChanges = true;
            // Place connected nodes near parents if possible
            const connectedParentLink = (loc.connectedLocationIds || []).find(link => newNodes[link.targetId]);
            if (connectedParentLink) {
                const parent = newNodes[connectedParentLink.targetId];
                // Random angle
                const angle = Math.random() * Math.PI * 2;
                
                // VISUAL DISTANCE LOGIC:
                // Cap the visual distance. Even if it's 1000m away, we don't want it 1000px away.
                // Min 100px, Max 250px. This keeps things compact.
                const rawDist = connectedParentLink.distance || 50;
                const visualDist = Math.min(250, Math.max(100, rawDist * 0.4));

                newNodes[loc.id] = {
                    x: parent.x + Math.cos(angle) * visualDist,
                    y: parent.y + Math.sin(angle) * visualDist
                };
            } else {
                // Spiral layout for initial or disconnected
                const angle = index * 0.8;
                const r = 100 + (index * 60);
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
      const node = nodes[id];
      setDragStart({ 
          x: e.clientX - (node.x * scale), 
          y: e.clientY - (node.y * scale) 
      });
  };

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

  // Center once when nodes are ready
  useEffect(() => {
     if (!isDraggingMap && !isDraggingNode && (locations || []).length > 0 && Object.keys(nodes).length > 0) {
         // Only center if we haven't moved yet (offset is 0,0) or if it's the very first render
         if (offset.x === 0 && offset.y === 0) {
            centerOnPlayer();
         }
     }
  }, [currentLocationId, Object.keys(nodes).length, isFullScreen]); 

  return (
    <div 
        className={`bg-slate-900 relative overflow-hidden select-none w-full h-full ${isFullScreen ? 'cursor-grab active:cursor-grabbing' : ''}`} 
        ref={containerRef}
    >
        
        {/* Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button 
                onClick={() => setShowNPCs(!showNPCs)} 
                className={`p-2 rounded shadow transition-colors ${showNPCs ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                title={showNPCs ? "Hide NPCs" : "Show NPCs"}
            >
                {showNPCs ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <div className="h-px bg-slate-700 my-1" />
            <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2 bg-slate-800 text-slate-200 rounded shadow hover:bg-slate-700"><ZoomIn size={16} /></button>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} className="p-2 bg-slate-800 text-slate-200 rounded shadow hover:bg-slate-700"><ZoomOut size={16} /></button>
            <button onClick={centerOnPlayer} className="p-2 bg-slate-800 text-slate-200 rounded shadow hover:bg-slate-700" title="Center on Player"><Move size={16} /></button>
            
            {onMaximize && (
                <button onClick={onMaximize} className="p-2 bg-slate-800 text-indigo-400 rounded shadow hover:bg-slate-700 mt-2">
                    {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
            )}
        </div>

        <div className="absolute top-4 left-4 z-20 bg-black/50 px-3 py-1 rounded text-[10px] text-slate-400 pointer-events-none border border-slate-700 backdrop-blur-sm">
            {isFullScreen ? "Fullscreen Map" : "Drag to pan"}
        </div>

        <div 
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedNPC(null)}
        >
            <div 
                style={{ 
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: '0 0',
                    width: '100%', height: '100%',
                    position: 'absolute'
                }}
            >
                {/* Connections */}
                <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none">
                    {(locations || []).map(loc => 
                        (loc.connectedLocationIds || []).map(link => {
                            const start = nodes[loc.id];
                            const end = nodes[link.targetId];
                            if (!start || !end) return null;
                            if (loc.id > link.targetId) return null; // Draw once per pair

                            return (
                                <g key={`${loc.id}-${link.targetId}`}>
                                    <line 
                                        x1={5000 + start.x} y1={5000 + start.y}
                                        x2={5000 + end.x} y2={5000 + end.y}
                                        stroke={link.status === 'Blocked' ? '#ef4444' : '#64748b'} 
                                        strokeWidth={link.status === 'Blocked' ? 3 / scale : 2 / scale} 
                                        strokeDasharray={link.status === 'Blocked' ? "0" : "5 5"}
                                        opacity={0.6}
                                    />
                                    {/* Distance Label */}
                                    <rect 
                                        x={5000 + (start.x + end.x) / 2 - 14} 
                                        y={5000 + (start.y + end.y) / 2 - 10}
                                        width="28" height="20" fill="#0f172a" rx="4"
                                        stroke="#1e293b" strokeWidth="1"
                                    />
                                    <text
                                        x={5000 + (start.x + end.x) / 2}
                                        y={5000 + (start.y + end.y) / 2 + 4}
                                        fill="#94a3b8"
                                        fontSize="10"
                                        textAnchor="middle"
                                        className="font-mono font-bold"
                                    >
                                        {link.distance}
                                    </text>
                                </g>
                            )
                        })
                    )}
                </svg>

                {/* Nodes */}
                {(locations || []).map(loc => {
                    const pos = nodes[loc.id];
                    if (!pos) return null;
                    const isCurrent = loc.id === currentLocationId;
                    const npcsHere = (npcs || []).filter(n => n.locationId === loc.id);

                    return (
                        <div 
                            key={loc.id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-colors duration-200`}
                            style={{ left: pos.x, top: pos.y }}
                            onMouseDown={(e) => handleNodeMouseDown(e, loc.id)}
                        >
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

                            <div className={`mt-2 px-2 py-0.5 rounded text-[10px] whitespace-nowrap border z-20 pointer-events-none select-none
                                ${isCurrent ? 'bg-indigo-900/80 text-white border-indigo-500' : 'bg-black/60 text-slate-300 border-slate-700'}
                            `}>
                                {loc.name}
                            </div>

                             {/* NPC Indicators */}
                             {showNPCs && npcsHere.length > 0 && (
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex -space-x-2">
                                    {npcsHere.map((npc, idx) => (
                                        <div 
                                            key={npc.id} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedNPC(npc.id); }}
                                            className={`
                                                w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white shadow-lg z-30
                                                cursor-pointer hover:scale-125 transition-transform
                                                ${npc.status === 'Alive' ? 'bg-green-600' : 'bg-red-600'}
                                            `} 
                                            title={npc.name}
                                            style={{ zIndex: 30 + idx }}
                                        >
                                            {npc.name[0]}
                                        </div>
                                    ))}
                                </div>
                             )}

                             {/* Selected NPC Info Card */}
                             {selectedNPC && npcsHere.find(n => n.id === selectedNPC) && (
                                 <div 
                                    className="absolute bottom-14 bg-black/90 border border-slate-600 p-2 rounded w-40 z-50 pointer-events-none animate-in fade-in zoom-in-95"
                                    onClick={(e) => e.stopPropagation()}
                                 >
                                     <div className="font-bold text-xs text-white mb-1">{npcsHere.find(n => n.id === selectedNPC)?.name}</div>
                                     <div className="text-[10px] text-slate-400 italic">"{npcsHere.find(n => n.id === selectedNPC)?.internalThoughts}"</div>
                                 </div>
                             )}

                             {/* Travel Button Logic */}
                             {!isCurrent && (
                                 <div className="absolute -bottom-8">
                                     {(locations || []).find(l => l.id === currentLocationId)?.connectedLocationIds?.find(link => link.targetId === loc.id) ? (
                                         (() => {
                                             const connection = (locations || []).find(l => l.id === currentLocationId)?.connectedLocationIds?.find(link => link.targetId === loc.id);
                                             if (connection?.status === 'Blocked') {
                                                  return (
                                                      <span className="bg-red-900/80 text-white text-[9px] px-2 py-1 rounded flex items-center gap-1">
                                                          <Lock size={8} /> Blocked
                                                      </span>
                                                  )
                                             }
                                             return (
                                                <button 
                                                    className="bg-indigo-600 text-white text-[9px] px-2 py-1 rounded shadow-lg hover:bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTravel(loc.name);
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()} 
                                                >
                                                    <Footprints size={8} /> Go ({connection?.distance})
                                                </button>
                                             )
                                         })()
                                     ) : null}
                                 </div>
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
