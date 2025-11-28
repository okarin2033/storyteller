
import React, { useState } from 'react';
import { Settings, X, Save, Download } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    visualStyle: string;
    onSaveStyle: (style: string) => void;
    apiKey: string;
    onSaveKey: (key: string) => void;
    onExportSave?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, visualStyle, onSaveStyle, apiKey, onSaveKey, onExportSave }) => {
    const [tempStyle, setTempStyle] = useState(visualStyle);
    const [tempKey, setTempKey] = useState(apiKey);

    if (!isOpen) return null;

    const handleSave = () => {
        onSaveStyle(tempStyle);
        onSaveKey(tempKey);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>
                
                <h2 className="text-xl font-heading font-bold text-slate-100 flex items-center gap-2 mb-6">
                    <Settings className="text-indigo-500" /> Settings
                </h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Visual Style Prompt</label>
                        <p className="text-xs text-slate-500 mb-2">Defines the art style for all image generations (Locations, Characters).</p>
                        <textarea 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 h-24 resize-none"
                            value={tempStyle}
                            onChange={(e) => setTempStyle(e.target.value)}
                            placeholder="e.g. Dark Fantasy, Oil Painting, Moody Lighting..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gemini API Key</label>
                        <input 
                            type="password"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                            value={tempKey}
                            onChange={(e) => setTempKey(e.target.value)}
                            placeholder="Current Session Key"
                        />
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
                        {onExportSave && (
                            <button 
                                onClick={onExportSave}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-slate-700"
                            >
                                <Download size={18} /> Save Game to File
                            </button>
                        )}

                        <button 
                            onClick={handleSave}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <Save size={18} /> Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
