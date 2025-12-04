
import { useState, useCallback } from 'react';
import { GameState, ChatMessage, SuggestedAction, NPC, WorldLocation, SaveFile } from '../types';
import { INITIAL_GAME_STATE } from '../constants';
import { generateStoryTurn, createWorldState, generateImage, sanitizeStateForAi, simulateBackgroundWorld, repairGameState } from '../services/geminiService';

export const useGameEngine = (apiKey: string) => {
    const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [stateHistory, setStateHistory] = useState<GameState[]>([]); // Undo stack
    const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirectorMode, setIsDirectorMode] = useState(false);

    // --- Actions ---

    const handleAction = useCallback(async (actionText: string) => {
        if (!actionText.trim() || isProcessing) return;
        if (!apiKey) { setError("API Key is missing."); return; }

        setIsProcessing(true);
        setError(null);
        setSuggestedActions([]);

        // 1. Save Snapshot for Rollback (Time Travel)
        // We save the state BEFORE the action happens.
        setStateHistory(prev => [...prev, JSON.parse(JSON.stringify(gameState))]);

        // 2. Optimistic UI Update
        const newHistoryEntry: ChatMessage = { role: 'user', content: actionText, timestamp: Date.now() };
        const newHistory = [...history, newHistoryEntry];
        setHistory(newHistory);

        try {
            // 3. Prepare Context
            const narrativeContext = newHistory.map(h => 
                `${h.role === 'user' ? (isDirectorMode ? 'DIRECTOR' : 'PLAYER') : 'GM'}: ${h.content}`
            );

            // 4. Call AI
            const result = await generateStoryTurn(apiKey, gameState, narrativeContext, actionText, isDirectorMode);

            // 5. Apply Updates
            setGameState(prevState => {
                const updates = result.stateUpdate || {};
                
                // Smart Merge for Arrays to avoid wiping data if AI returns partial lists
                
                // Merge Lore
                const prevLore = prevState.worldLore || [];
                const newLore = updates.worldLore || [];
                const mergedLore = [...prevLore, ...newLore.filter(l => !prevLore.includes(l))];

                // Merge NPCs (Update existing by ID, add new)
                let updatedNPCs = [...(prevState.npcs || [])];
                if (updates.npcs) {
                    updates.npcs.forEach((uNPC: Partial<NPC>) => {
                        const idx = updatedNPCs.findIndex(n => n.id === uNPC.id);
                        if (idx !== -1) {
                            updatedNPCs[idx] = { ...updatedNPCs[idx], ...uNPC, isActive: uNPC.isActive ?? updatedNPCs[idx].isActive };
                        } else if (uNPC.id && uNPC.name) {
                            updatedNPCs.push({ isActive: true, ...uNPC } as NPC);
                        }
                    });
                }

                // Merge Locations
                let updatedLocations = [...(prevState.locations || [])];
                if (updates.locations) {
                    updates.locations.forEach((uLoc: Partial<WorldLocation>) => {
                        const idx = updatedLocations.findIndex(l => l.id === uLoc.id);
                        if (idx !== -1) {
                            updatedLocations[idx] = { 
                                ...updatedLocations[idx], 
                                ...uLoc,
                                // Preserve client-side images if AI sends partial update
                                imageUrl: uLoc.imageUrl || updatedLocations[idx].imageUrl,
                                connectedLocationIds: uLoc.connectedLocationIds || updatedLocations[idx].connectedLocationIds
                            };
                        } else if (uLoc.id) {
                            updatedLocations.push({ ...uLoc, connectedLocationIds: uLoc.connectedLocationIds || [] } as WorldLocation);
                        }
                    });
                }

                // Merge Quests
                let updatedQuests = [...(prevState.quests || [])];
                if (updates.quests) {
                    updates.quests.forEach((uQuest) => {
                        const idx = updatedQuests.findIndex(q => q.id === uQuest.id);
                        if (idx !== -1) updatedQuests[idx] = { ...updatedQuests[idx], ...uQuest };
                        else updatedQuests.push(uQuest);
                    });
                }

                const newState = {
                    ...prevState,
                    ...updates,
                    turnCount: prevState.turnCount + 1,
                    player: {
                        ...prevState.player,
                        ...updates.player,
                        // Preserve complex player fields if not updated
                        imageUrl: updates.player?.imageUrl || prevState.player.imageUrl,
                        inventory: updates.player?.inventory || prevState.player.inventory || [],
                        statusEffects: updates.player?.statusEffects || prevState.player.statusEffects || [],
                        knownRumors: updates.player?.knownRumors || prevState.player.knownRumors || []
                    },
                    npcs: updatedNPCs,
                    locations: updatedLocations,
                    quests: updatedQuests,
                    worldLore: mergedLore,
                    activeEvents: updates.activeEvents || prevState.activeEvents || [],
                    storytellerThoughts: updates.storytellerThoughts || prevState.storytellerThoughts,
                    // Locks
                    metaPreferences: prevState.metaPreferences, 
                    worldTheme: updates.worldTheme || prevState.worldTheme
                };
                
                // Trigger Background Sim (Fire and Forget)
                simulateBackgroundWorld(apiKey, newState).then(bgRes => {
                    if (bgRes.npcs?.length) {
                        setGameState(curr => {
                            const finalNPCs = [...curr.npcs];
                            bgRes.npcs.forEach(bgNPC => {
                                const i = finalNPCs.findIndex(n => n.id === bgNPC.id);
                                if (i !== -1) finalNPCs[i] = { ...finalNPCs[i], ...bgNPC };
                            });
                            return { ...curr, npcs: finalNPCs };
                        });
                    }
                });

                return newState;
            });

            setHistory(prev => [...prev, { role: 'model', content: result.narrative, timestamp: Date.now() }]);
            setSuggestedActions(result.suggestedActions || []);

        } catch (err: any) {
            setError(err.message || "Unknown error occurred.");
            // Rollback optimistic update on critical failure? 
            setHistory(h => h.slice(0, -1)); // Remove the user message that failed
            setStateHistory(s => s.slice(0, -1)); // Remove the snapshot
        } finally {
            setIsProcessing(false);
        }
    }, [apiKey, gameState, history, isDirectorMode, isProcessing]);

    // --- Time Travel / Edit ---

    const handleRollback = useCallback((messageIndex: number) => {
        // Find how many user turns exist up to this point
        let userTurnsBefore = 0;
        for (let i = 0; i < messageIndex; i++) {
            if (history[i].role === 'user') userTurnsBefore++;
        }

        const targetSnapshot = stateHistory[userTurnsBefore];

        if (!targetSnapshot) {
            console.error("Snapshot missing for index", userTurnsBefore);
            return undefined;
        }

        // Apply Rollback
        setGameState(JSON.parse(JSON.stringify(targetSnapshot)));
        setHistory(prev => prev.slice(0, messageIndex));
        setStateHistory(prev => prev.slice(0, userTurnsBefore));
        
        return history[messageIndex].content;
    }, [history, stateHistory]);

    const handleDeleteMessage = useCallback((index: number) => {
        // Just remove from view. 
        // Note: This does NOT rollback the world state associated with it, 
        // it just removes the text from the log/context.
        setHistory(prev => prev.filter((_, i) => i !== index));
        
        // If we delete a user message, we should probably remove the corresponding snapshot 
        // to keep indices aligned, but that's complex. 
        // Simple approach: Delete is purely cosmetic/context pruning.
    }, []);

    const handleEditMessage = useCallback((index: number, newContent: string) => {
        // 1. Check if we are editing the MOST RECENT user message (Retry Scenario)
        const isLastUserMsg = index === history.length - 1 || (index === history.length - 2 && history[history.length-1].role === 'model');
        const msgRole = history[index].role;

        if (isLastUserMsg && msgRole === 'user') {
            // RETRY LOGIC: Rollback to before this message, then trigger action with new text
            // We return 'true' to tell the UI to call handleAction
            const oldText = handleRollback(index);
            if (oldText !== undefined) {
                return true; 
            }
        } 
        
        // 2. Cosmetic Edit (Fixing typos in old messages or AI text)
        setHistory(prev => prev.map((msg, i) => i === index ? { ...msg, content: newContent } : msg));
        return false;
    }, [history, handleRollback]);

    // --- Load/Save ---
    
    const loadGame = (file: SaveFile) => {
        const safeState = repairGameState(file.gameState);
        const safeHistory = (file.stateHistory || []).map(repairGameState);
        setGameState(safeState);
        setHistory(file.history);
        setStateHistory(safeHistory);
    };

    return {
        gameState, setGameState,
        history, setHistory,
        stateHistory,
        suggestedActions,
        isProcessing, setIsProcessing,
        error, setError,
        isDirectorMode, setIsDirectorMode,
        handleAction,
        handleRollback,
        handleDeleteMessage,
        handleEditMessage,
        loadGame
    };
};
