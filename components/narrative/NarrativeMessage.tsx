
import React, { useState, useMemo } from 'react';
import { ChatMessage } from '../../types';
import { Edit2, Check, X, RefreshCw, Dices, Image as ImageIcon, Loader2, RotateCcw, Trash2 } from 'lucide-react';

interface NarrativeMessageProps {
    message: ChatMessage;
    index: number;
    isLast: boolean;
    isUser: boolean;
    onEdit: (index: number, newContent: string) => void;
    onDelete: (index: number) => void;
    onRollback?: (index: number) => void;
    onRegenerate?: () => void;
    onGenerateImage?: (index: number) => void;
    highlightData: { npcs: string[], items: string[], effects: string[] };
}

const DiceRoll: React.FC<{ raw: string }> = ({ raw }) => {
    const content = raw.replace('[DICE:', '').replace(']', '').trim();
    const parts = content.split('|').map(s => s.trim());
    if (parts.length < 3) return <span className="text-xs bg-slate-800 px-1 rounded">{raw}</span>;
    const isSuccess = parts[2].toLowerCase().includes('success') || parts[2].toLowerCase().includes('успех');
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold mx-1 align-middle my-1 ${isSuccess ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'}`}>
            <Dices size={14} className="pointer-events-none" />
            <span className="uppercase tracking-wider opacity-80">{parts[0]}</span>
            <div className="w-px h-3 bg-current opacity-30" />
            <span>{parts[1]}</span>
            <div className="w-px h-3 bg-current opacity-30" />
            <span className="uppercase">{parts[2]}</span>
        </div>
    );
};

const NarrativeMessage: React.FC<NarrativeMessageProps> = ({ 
    message, index, isLast, isUser, 
    onEdit, onDelete, onRollback, onRegenerate, onGenerateImage,
    highlightData 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState(message.content);
    const [imgLoading, setImgLoading] = useState(false);

    // Regex for syntax highlighting
    const highlightPatterns = useMemo(() => {
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const npcs = highlightData.npcs.filter(n => n.length > 2).map(escape).join('|');
        const items = highlightData.items.filter(n => n.length > 2).map(escape).join('|');
        const effects = highlightData.effects.filter(n => n.length > 2).map(escape).join('|');

        return {
            dialogue: /([«"“][^»"”]*?[»"”])/g,
            actionSound: /(\*[^*]+\*)/g, 
            systemMagic: /(\[[^\]]+\])/g, 
            npc: npcs ? new RegExp(`\\b(${npcs})\\b`, 'gi') : null,
            item: items ? new RegExp(`\\b(${items})\\b`, 'gi') : null,
            effect: effects ? new RegExp(`\\b(${effects})\\b`, 'gi') : null,
        };
    }, [highlightData]);

    const renderRichText = (text: string) => {
        return text.split('\n').map((para, i) => {
            if (!para.trim()) return <div key={i} className="h-4" />;
            const parts = para.split(highlightPatterns.dialogue);
            return (
                <p key={i} className="mb-4 leading-relaxed">
                    {parts.map((part, j) => {
                        if (highlightPatterns.dialogue.test(part)) return <span key={j} className="text-amber-100/90 italic font-serif tracking-wide">{part}</span>;
                        
                        let content: (string | React.ReactNode)[] = [part];
                        
                        const apply = (ptn: RegExp | null, wrap: (m: string, k: any) => React.ReactNode) => {
                            if (!ptn) return;
                            const next: (string | React.ReactNode)[] = [];
                            content.forEach((c) => {
                                if (typeof c !== 'string') { next.push(c); return; }
                                const split = c.split(ptn);
                                split.forEach((s, idx) => {
                                    if (ptn.test(s)) next.push(wrap(s, `${j}-${idx}`));
                                    else if (s) next.push(s);
                                });
                            });
                            content = next;
                        };

                        apply(highlightPatterns.actionSound, (s, k) => <span key={k} className="text-fuchsia-300/80 italic">{s}</span>);
                        apply(highlightPatterns.systemMagic, (s, k) => s.startsWith('[DICE:') ? <DiceRoll key={k} raw={s} /> : <span key={k} className="text-cyan-400 font-mono text-sm bg-cyan-950/30 px-1 rounded">{s}</span>);
                        apply(highlightPatterns.npc, (s, k) => <span key={k} className="text-blue-300 font-medium hover:underline decoration-blue-500/50 cursor-help">{s}</span>);
                        apply(highlightPatterns.item, (s, k) => <span key={k} className="text-emerald-300 font-medium">{s}</span>);
                        apply(highlightPatterns.effect, (s, k) => <span key={k} className="text-purple-300 font-medium">{s}</span>);

                        return <span key={j}>{content}</span>;
                    })}
                </p>
            );
        });
    };

    const handleSaveEdit = () => {
        onEdit(index, editVal);
        setIsEditing(false);
    };

    const handleGenImage = async () => {
        if (!onGenerateImage) return;
        setImgLoading(true);
        await onGenerateImage(index);
        setImgLoading(false);
    };

    if (isEditing) {
        return (
            <div className="bg-slate-900 p-4 rounded-lg border border-indigo-500/50 my-4 shadow-xl">
                <textarea 
                    className="w-full h-40 bg-transparent text-slate-200 focus:outline-none resize-y text-base font-sans p-2"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded"><X size={16}/></button>
                    <button type="button" onClick={handleSaveEdit} className="p-2 text-green-400 hover:text-green-300 bg-slate-800 rounded"><Check size={16}/></button>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative group mb-6 rounded-lg transition-all duration-300 ${isUser ? 'pl-8 pr-4 border-l-2 border-indigo-500/50 text-indigo-200 italic bg-slate-800/20 py-4' : 'hover:bg-slate-900/40 -mx-4 px-4 pb-4'}`}>
            
            {/* --- ACTION BUTTONS (Floating Top Right) --- */}
            <div className="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-950/90 backdrop-blur-md rounded-lg p-1 border border-slate-800 shadow-xl">
                
                {isUser && onRollback && (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRollback(index); }} 
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded"
                        title="Rollback (Undo everything after)"
                    >
                        <RotateCcw size={14} className="pointer-events-none" />
                    </button>
                )}

                {!isUser && isLast && onRegenerate && (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRegenerate(); }} 
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded"
                        title="Regenerate"
                    >
                        <RefreshCw size={14} className="pointer-events-none" />
                    </button>
                )}

                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded"
                    title="Edit"
                >
                    <Edit2 size={14} className="pointer-events-none" />
                </button>

                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(index); }} 
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                    title="Delete"
                >
                    <Trash2 size={14} className="pointer-events-none" />
                </button>
            </div>

            {/* Content */}
            {isUser ? (
                <div className="font-medium opacity-90">&gt; {message.content}</div>
            ) : (
                <div>
                    <div className="text-lg text-slate-300 leading-relaxed font-prose">
                        {renderRichText(message.content)}
                    </div>

                    {message.sceneImage ? (
                        <div className="mt-4 mb-2 rounded-lg overflow-hidden border border-slate-700 shadow-2xl max-w-lg mx-auto">
                            <img src={message.sceneImage} alt="Scene" className="w-full h-auto object-cover" />
                        </div>
                    ) : (
                        onGenerateImage && (
                            <div className="mt-2 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleGenImage(); }}
                                    disabled={imgLoading}
                                    className="text-xs flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {imgLoading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                                    Visualize Scene
                                </button>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default NarrativeMessage;
