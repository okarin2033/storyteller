
import React, { useRef, useState, useEffect } from 'react';
import { WorldLocation, NPC } from '../types';
import { ZoomIn, ZoomOut, Move, Maximize, Minimize, Eye, EyeOff, Lock, Footprints } from 'lucide-react';

interface WorldMapProps {
  locations: WorldLocation[];
  currentLocationId: string;
  npcs: NPC[];
  onTravel: (locationName: string) => void;
  onMaximize?: () => void;
  isFullScreen?: boolean;
}

interface Point { x: number; y: number }

const WorldMap: React.FC<WorldMapProps> = ({ locations, currentLocationId, npcs, onTravel, onMaximize, isFullScreen = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Persistent storage for node positions so they don't jump around
  const [nodes, setNodes] = useState<Record<string, Point>>({});
  const [initialized, setInitialized] = useState(false);
  
  const [scale, setScale] = useState(isFullScreen ? 1.0 : 0.7);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  
  const [showNPCs, setShowNPCs] = useState(false);
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);

  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });

  // --- STABLE LAYOUT ALGORITHM ---
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    setNodes(prevNodes => {
        const newNodes = { ...prevNodes };
        let hasChanges = false;
        const placedIds = new Set(Object.keys(prevNodes));

        // 1. If it's the VERY first load, place the current location at 0,0
        if (locations.length > 0 && Object.keys(newNodes).length === 0) {
            const startLoc = locations.find(l => l.id === currentLocationId) || locations[0];
            newNodes[startLoc.id] = { x: 0, y: 0 };
            placedIds.add(startLoc.id);
            hasChanges = true;
        }

        // 2. Iterate multiple times to resolve dependencies (A connects to B, but B isn't placed yet)
        // We do a simplified Breadth-First placement
        let somethingChanged = true;
        while (somethingChanged) {
            somethingChanged = false;
            
            locations.forEach(loc => {
                if (placedIds.has(loc.id)) return; // Already placed

                // Find a neighbor that is already placed
                const connections = loc.connectedLocationIds || [];
                const parentLink = connections.find(link => placedIds.has(link.targetId));

                if (parentLink) {
                    const parentPos = newNodes[parentLink.targetId];
                    
                    // Determine angle: avoid overlapping existing nodes if possible
                    // Simple heuristic: Use the index or ID hash to determine a consistent angle
                    const angleOffset = (loc.id.length + loc.name.length) % 8; // Pseudo-random consistent number
                    const baseAngle = (angleOffset / 8) * Math.PI * 2;
                    
                    // Visual distance clamping
                    const distRaw = parentLink.distance || 50;
                    const visualDist = Math.min(200, Math.max(120, distRaw * 0.5)); // Clamp visual length

                    newNodes[loc.id] = {
                        x: parentPos.x + Math.cos(baseAngle) * visualDist,
                        y: parentPos.y + Math.sin(baseAngle) * visualDist
                    };

                    // Collision avoidance (Super basic)
                    // If too close to another node, nudge it
                    Object.keys(newNodes).forEach(otherId => {
                        if (otherId === loc.id) return;
                        const other = newNodes[otherId];
                        const dx = newNodes[loc.id].x - other.x;
                        const dy = newNodes[loc.id].y - other.y;
                        const d = Math.sqrt(dx*dx + dy*dy);
                        if (d < 80) {
                             newNodes[loc.id].x += 40;
                             newNodes[loc.id].y += 40;
                        }
                    });

                    placedIds.add(loc.id);
                    hasChanges = true;
                    somethingChanged = true;
                }
            });
        }
        
        // 3. Catch orphans (nodes with no placed neighbors yet, rare but possible in disjoint graphs)
        locations.forEach(loc => {
            if (!placedIds.has(loc.id)) {
                // Just place them far away in a spiral
                const idx = locations.indexOf(loc);
                const angle = idx * 0.5;
                const r = 300 + (idx * 50);
                newNodes[loc.id] = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
                placedIds.add(loc.id);
                hasChanges = true;
            }
        });

        return hasChanges ? newNodes : prevNodes;
    });

    setInitialized(true);
  }, [locations]); // We depend on locations, but we only ADD to state, never reset it completely.

  // Center on player ONLY on initial load or full screen toggle
  useEffect(() => {
      if (initialized && locations.length > 0 && nodes[currentLocationId]) {
          // Only auto-center if we haven't dragged significantly? 
          // For now, let's just center on mount/resize
          if (offset.x === 0 && offset.y === 0) centerOnPlayer();
      }
  }, [initialized, isFullScreen]);

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
            {isFullScreen ? "Fullscreen Map" : "Drag to pan / Drag nodes"}
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
                                        opacity={0.5}
                                    />
                                    {/* Distance Label */}
                                    <text
                                        x={5000 + (start.x + end.x) / 2}
                                        y={5000 + (start.y + end.y) / 2 - 5}
                                        fill="#64748b"
                                        fontSize="10"
                                        textAnchor="middle"
                                        className="font-mono"
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
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-300`}
                            style={{ left: pos.x, top: pos.y }}
                            onMouseDown={(e) => handleNodeMouseDown(e, loc.id)}
                        >
                            <div className={`
                                w-10 h-10 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center shadow-xl z-10 
                                ${isCurrent 
                                    ? 'bg-indigo-600 border-white shadow-indigo-500/50 scale-110' 
                                    : 'bg-slate-800 border-slate-600 hover:border-slate-400'
                                }
                            `}>
                                <div className="text-lg md:text-2xl">
                                    {loc.type === 'Wild' ? '🌲' : loc.type === 'City' ? '🏰' : loc.type === 'Dungeon' ? '💀' : '🏠'}
                                </div>
                            </div>

                            <div className={`mt-2 px-2 py-0.5 rounded text-[9px] md:text-[10px] whitespace-nowrap border z-20 pointer-events-none select-none
                                ${isCurrent ? 'bg-indigo-900/90 text-white border-indigo-500' : 'bg-black/60 text-slate-300 border-slate-700'}
                            `}>
                                {loc.name}
                            </div>

                             {/* NPC Indicators */}
                             {showNPCs && npcsHere.length > 0 && (
                                <div className="absolute -top-4 md:-top-6 left-1/2 transform -translate-x-1/2 flex -space-x-1">
                                    {npcsHere.map((npc, idx) => (
                                        <div 
                                            key={npc.id} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedNPC(npc.id); }}
                                            className={`
                                                w-4 h-4 md:w-5 md:h-5 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold text-white shadow-lg z-30
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

                             {/* Travel Button Logic */}
                             {!isCurrent && (
                                 <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                     {(locations || []).find(l => l.id === currentLocationId)?.connectedLocationIds?.find(link => link.targetId === loc.id) && (
                                        <button 
                                            className="bg-indigo-600 text-white text-[9px] px-2 py-1 rounded shadow-lg hover:bg-indigo-500 flex items-center gap-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTravel(loc.name);
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()} 
                                        >
                                            <Footprints size={8} /> Go
                                        </button>
                                     )}
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
