
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { GameState, StorySegment, NPC, WorldLocation } from "../types";
import { SYSTEM_INSTRUCTION, WORLD_GEN_INSTRUCTION } from "../constants";

const cleanJson = (text: string): string => {
  // 1. Remove markdown code blocks (case insensitive)
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
  
  // 2. Aggressively find the outer-most curly braces to ignore "Here is the JSON:" preambles
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
      return match[0];
  }
  
  return cleaned.trim();
};

/**
 * Creates a deep copy of the state and removes all imageUrl fields (Base64 strings)
 * to prevent context overflow and save file bloating.
 */
export const sanitizeStateForAi = (state: GameState): GameState => {
    const cleanState = JSON.parse(JSON.stringify(state)); // Deep clone

    // Clean Player
    if (cleanState.player) {
        delete cleanState.player.imageUrl;
    }

    // Clean Locations
    if (cleanState.locations) {
        cleanState.locations.forEach((loc: any) => {
            delete loc.imageUrl;
        });
    }

    return cleanState;
};

/**
 * Aggressively repairs a game state object to ensure all required arrays and fields exist.
 * This fixes "Cannot read property of undefined" crashes when loading old or partial saves.
 */
export const repairGameState = (state: any): GameState => {
    if (!state) return state;

    // Ensure Top-Level Fields
    if (!state.turnCount) state.turnCount = 1;
    if (!state.currentLocationId) state.currentLocationId = "unknown";
    if (!state.currentTime) state.currentTime = "Unknown Time";
    if (!state.worldTheme) state.worldTheme = "Generic RPG World";
    
    // Arrays
    if (!Array.isArray(state.quests)) state.quests = [];
    if (!Array.isArray(state.npcs)) state.npcs = [];
    if (!Array.isArray(state.locations)) state.locations = [];
    if (!Array.isArray(state.worldLore)) state.worldLore = [];
    if (!Array.isArray(state.activeEvents)) state.activeEvents = [];
    
    // Player
    if (!state.player) {
        state.player = { name: "Survivor", hp: {current: 10, max: 10}, appearance: {}, inventory: [] };
    }
    if (!state.player.hp) state.player.hp = { current: 10, max: 10 };
    if (!state.player.appearance) state.player.appearance = { physical: "Unknown", clothing: "Unknown" };
    if (!Array.isArray(state.player.inventory)) state.player.inventory = [];
    if (!Array.isArray(state.player.statusEffects)) state.player.statusEffects = [];
    if (!Array.isArray(state.player.knownRumors)) state.player.knownRumors = [];

    // Repair Locations (Deep check)
    state.locations.forEach((loc: any) => {
        if (!Array.isArray(loc.connectedLocationIds)) loc.connectedLocationIds = [];
    });

    // Repair NPCs (Memories)
    state.npcs.forEach((npc: any) => {
        if (!Array.isArray(npc.knownFacts)) npc.knownFacts = [];
        if (!Array.isArray(npc.memories)) npc.memories = [];
        if (!npc.plans) npc.plans = "Exist";
    });

    // Opening Scene Normalization
    if (typeof state.openingScene === 'string') {
        state.openingScene = [state.openingScene];
    } else if (!Array.isArray(state.openingScene)) {
        state.openingScene = ["Welcome to the world."];
    }

    return state as GameState;
};

// --- Safety Settings (Disable Censorship) ---
const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- Shared Schemas ---

const itemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        quantity: { type: Type.NUMBER },
        properties: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
};

const questSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        status: { type: Type.STRING, enum: ['Active', 'Completed', 'Failed'] },
        objectives: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["id", "title", "status"]
};

const playerSchema = {
    type: Type.OBJECT,
    properties: {
       name: { type: Type.STRING },
       hp: { type: Type.OBJECT, properties: { current: { type: Type.INTEGER }, max: { type: Type.INTEGER } } },
       appearance: { 
           type: Type.OBJECT,
           properties: {
               physical: { type: Type.STRING },
               clothing: { type: Type.STRING }
           }
       },
       statusEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
       knownRumors: { type: Type.ARRAY, items: { type: Type.STRING } },
       inventory: { type: Type.ARRAY, items: itemSchema },
    },
    required: ["name", "inventory", "hp", "appearance"]
};

const npcSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      name: { type: Type.STRING },
      locationId: { type: Type.STRING },
      status: { type: Type.STRING },
      internalThoughts: { type: Type.STRING },
      emotionalState: { type: Type.STRING },
      currentGoal: { type: Type.STRING },
      plans: { type: Type.STRING, description: "Immediate future plan" },
      opinionOfPlayer: { type: Type.STRING },
      visibleToPlayer: { type: Type.BOOLEAN },
      description: { type: Type.STRING },
      knownFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
      memories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Log of past actions and events" }
    },
    required: ["id", "name", "locationId", "internalThoughts"]
};

const locationConnectionSchema = {
    type: Type.OBJECT,
    properties: {
        targetId: { type: Type.STRING },
        distance: { type: Type.NUMBER, description: "Distance in meters/units" },
        status: { type: Type.STRING, enum: ["Open", "Blocked", "Hidden"] }
    },
    required: ["targetId", "status"]
};

const locationSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        type: { type: Type.STRING, enum: ["City", "Wild", "Dungeon", "Interior"] },
        isVisited: { type: Type.BOOLEAN },
        connectedLocationIds: { type: Type.ARRAY, items: locationConnectionSchema }
    },
    required: ["id", "name", "connectedLocationIds"]
};

const actionSchema = {
    type: Type.OBJECT,
    properties: {
        label: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['Travel', 'Talk', 'Action', 'Investigate'] },
        actionText: { type: Type.STRING }
    }
}

// --- Image Generation ---

export const generateImage = async (apiKey: string, prompt: string): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                safetySettings: SAFETY_SETTINGS 
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Image Gen Error", e);
        return null;
    }
}

// --- Story Generation ---

export const generateStoryTurn = async (
  apiKey: string,
  currentState: GameState,
  history: string[],
  playerAction: string,
  isDirectorMode: boolean = false
): Promise<StorySegment> => {
  const ai = new GoogleGenAI({ apiKey });

  const safeState = sanitizeStateForAi(currentState);
  const SAFE_HISTORY_LIMIT = 200; // Restore high limit
  const slicedHistory = history.slice(-SAFE_HISTORY_LIMIT);

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      narrative: { type: Type.STRING },
      suggestedActions: { type: Type.ARRAY, items: actionSchema },
      updates: {
        type: Type.OBJECT,
        properties: {
          currentLocationId: { type: Type.STRING },
          currentTime: { type: Type.STRING },
          visualStyle: { type: Type.STRING },
          storytellerThoughts: { type: Type.STRING },
          worldTheme: { type: Type.STRING },
          player: playerSchema,
          npcs: { type: Type.ARRAY, items: npcSchema },
          locations: { type: Type.ARRAY, items: locationSchema },
          quests: { type: Type.ARRAY, items: questSchema },
          worldLore: { type: Type.ARRAY, items: { type: Type.STRING } },
          activeEvents: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    required: ["narrative", "updates", "suggestedActions"]
  };

  const modeInstruction = isDirectorMode 
    ? "MODE: DIRECTOR / GOD MODE enabled. The user Input is a META-COMMAND. Execute it immediately to alter the world state, spawn entities, or force narrative events. Ignore normal gameplay logic/limitations."
    : "MODE: PLAYER MODE. Standard RPG logic applies.";

  // Filter out Stasis NPCs to save tokens
  const narrativeState = {
      ...safeState,
      npcs: (safeState.npcs || []).filter(n => n.isActive !== false)
  };

  const prompt = `
    CORE WORLD THEME / ORIGINAL PROMPT (THE ANCHOR):
    "${currentState.worldTheme}"
    (Ensure the tone, atmosphere, and logic remain consistent with this core theme.)

    CURRENT LOCAL STATE (Player + Local Context):
    ${JSON.stringify(narrativeState, null, 2)}

    PLAYER META-PREFERENCES (READ ONLY - DO NOT CHANGE):
    "${currentState.metaPreferences}"

    NARRATIVE HISTORY (Last ${SAFE_HISTORY_LIMIT} Turns):
    ${slicedHistory.join("\n---\n")}

    ${modeInstruction}

    INPUT: "${playerAction}"
    
    INSTRUCTIONS:
    1. Advance the story scene-by-scene. Slow pacing.
    2. Simulate LOCAL NPC behavior only. Do not hallucinate updates for distant NPCs.
    3. Update JSON state (including Quests and Status Effects - keep them clean).
    4. Provide 3 suggested actions.
    5. Update 'storytellerThoughts' with your plan.
    6. **CRITICAL FAIL-SAFE**: If the user's action violates safety policies or you cannot generate the specific scene description (e.g. due to sexual content limits), **DO NOT return an empty string**. Instead, generate a narrative where the protagonist experiences a sudden "Neural Interface Glitch", "Dizziness", or "Fade to Black" that interrupts the specific act but keeps the game running. The 'narrative' field MUST contain text.
    7. **NPC MEMORY**: If the player interacts with an NPC, add a short summary to that NPC's 'memories' array.
  `;

  // Helper to process response
  const processResponse = (text: string) => {
      const cleaned = cleanJson(text);
      if (!cleaned) throw new Error("Empty response received from AI.");
      
      let data;
      try {
        data = JSON.parse(cleaned);
      } catch (e) {
        throw new Error(`JSON Parse Error. The AI might have refused the request. Raw text: "${text.substring(0, 300)}..."`);
      }

      if (!data.updates) data.updates = {};
      
      if (!data.narrative || data.narrative.trim() === "..." || data.narrative.trim().length === 0) {
          throw new Error(`AI returned empty narrative (Safety Block). Raw response was valid JSON but empty text.`);
      }
      return data;
  };

  // 1. Try with Gemini 3.0 Pro
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 2048 },
        safetySettings: SAFETY_SETTINGS
      }
    });

    return {
      narrative: processResponse(response.text || "{}").narrative,
      suggestedActions: processResponse(response.text || "{}").suggestedActions || [],
      stateUpdate: processResponse(response.text || "{}").updates
    };

  } catch (error: any) {
    console.warn("Gemini 3.0 Pro failed. Attempting Fallback to 2.5 Flash...", error);
    
    // 2. Fallback to Gemini 2.5 Flash
    try {
        const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                maxOutputTokens: 8192,
                safetySettings: SAFETY_SETTINGS 
            }
        });

        const data = processResponse(fallbackResponse.text || "{}");
        return {
            narrative: data.narrative,
            suggestedActions: data.suggestedActions || [],
            stateUpdate: data.updates
        };

    } catch (fallbackError: any) {
        console.error("Critical Failure (Fallback also failed):", fallbackError);
        let msg = "The world logic fractured (Both Primary and Backup models failed).";
        
        if (error.response?.text) console.error("Primary Raw:", error.response.text);
        if (fallbackError.response?.text) console.error("Fallback Raw:", fallbackError.response.text);

        throw new Error(`${msg} Details: ${fallbackError.message}`);
    }
  }
};

// --- World Generation ---

export const createWorldState = async (
    apiKey: string, 
    userPrompt: string,
    onLog: (message: string) => void
): Promise<GameState> => {
    const ai = new GoogleGenAI({ apiKey });
    
    const gameStateSchema = {
        type: Type.OBJECT,
        properties: {
            openingScene: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array of paragraphs for the long opening scene."
            },
            turnCount: { type: Type.INTEGER },
            currentLocationId: { type: Type.STRING },
            currentTime: { type: Type.STRING },
            visualStyle: { type: Type.STRING },
            storytellerThoughts: { type: Type.STRING },
            worldTheme: { type: Type.STRING },
            metaPreferences: { type: Type.STRING },
            player: playerSchema,
            npcs: { type: Type.ARRAY, items: npcSchema },
            locations: { type: Type.ARRAY, items: locationSchema },
            quests: { type: Type.ARRAY, items: questSchema },
            worldLore: { type: Type.ARRAY, items: { type: Type.STRING } },
            activeEvents: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["player", "npcs", "locations", "currentLocationId", "currentTime", "openingScene"]
    };

    const prompt = `
      Create a new RPG world setting based on this idea: "${userPrompt}".
      
      Requirements:
      1. Create a protagonist player object (with HP and Appearance).
      2. Create 3-5 interesting NPCs.
      3. Create 3-4 connected Locations (ensure links have targetId, distance, status).
      4. Ensure NPCs have valid 'locationId's matching the locations.
      5. Add 'worldLore' and 'activeEvents'.
      6. Define a cohesive 'visualStyle' for image generation.
      7. Initialize 'storytellerThoughts' (your plan) and 'metaPreferences' (defaults).
      8. WRITE THE OPENING SCENE as an array of strings (paragraphs).
      9. Capture the user prompt in 'worldTheme'.
    `;

    try {
        onLog("Initializing Neural Link (Gemini 2.0)...");
        onLog("Connecting to World Engine Stream...");
        
        const result = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: WORLD_GEN_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: gameStateSchema,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 2048 },
                safetySettings: SAFETY_SETTINGS
            }
        });

        let fullText = "";
        let chunkCount = 0;

        for await (const chunk of result) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                chunkCount++;
                if (chunkCount % 3 === 0) {
                     onLog(`Downloading World Data... (${fullText.length} bytes)`);
                }
            }
        }

        onLog(`Transmission Complete (${fullText.length} bytes).`);
        onLog("Parsing and Validating Construct...");

        const cleanedJson = cleanJson(fullText);
        let newState: GameState;
        
        try {
            newState = JSON.parse(cleanedJson) as GameState;
        } catch (parseError: any) {
             onLog("JSON Parse failed on first attempt. Trying repair...");
             console.error("RAW FAILED JSON:", fullText); // Log raw for debugging
             throw new Error(`Data corruption detected. Raw length: ${fullText.length}`);
        }
        
        if (!newState.worldTheme) newState.worldTheme = userPrompt;

        newState = repairGameState(newState);
        
        onLog("World Generation Complete. Entering simulation.");
        return newState;

    } catch (firstError: any) {
        onLog(`Warning: Deep stream interrupted (${firstError.message}).`);
        onLog("Engaging Emergency Protocols (Standard Generation with Gemini 2.5)...");
        
        try {
             const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: WORLD_GEN_INSTRUCTION,
                    responseMimeType: "application/json",
                    responseSchema: gameStateSchema,
                    maxOutputTokens: 8192,
                    safetySettings: SAFETY_SETTINGS
                }
            });
            
            onLog("Fallback data received.");
            const jsonText = fallbackResponse.text || "{}";
            let newState = JSON.parse(cleanJson(jsonText)) as GameState;
            
            if (!newState.worldTheme) newState.worldTheme = userPrompt;
            newState = repairGameState(newState);
            
            onLog("World stabilized.");
            return newState;
            
        } catch (secondError: any) {
             onLog(`CRITICAL FAILURE: ${secondError.message}`);
             console.error("World Gen Fatal Error", secondError);
             throw new Error("Failed to create world. Please try a simpler prompt.");
        }
    }
}

// --- Background Simulation (Split Brain) ---

export const simulateBackgroundWorld = async (
    apiKey: string,
    state: GameState
): Promise<{ npcs: NPC[] }> => {
    const ai = new GoogleGenAI({ apiKey });
    
    // Filter only distant NPCs that are ACTIVE and ALIVE
    const distantNPCs = (state.npcs || []).filter(n => 
        n.locationId !== state.currentLocationId && 
        n.status === 'Alive' && 
        n.isActive !== false
    );
    
    // If no distant NPCs, we can return early, BUT we want to force simulation if needed
    if (distantNPCs.length === 0) return { npcs: [] };

    // Pass the locations so NPCs know where they can go
    const mapStructure = state.locations.map(l => ({
        id: l.id, 
        name: l.name, 
        connectedTo: l.connectedLocationIds.map(c => c.targetId)
    }));

    const prompt = `
    TASK: Background World Simulation (Autonomous Agents).
    
    You are the simulation engine for NPCs who are NOT in the current scene with the player.
    
    CORE WORLD THEME: "${state.worldTheme}"
    CURRENT TIME: ${state.currentTime}
    MAP: ${JSON.stringify(mapStructure)}

    AGENTS TO SIMULATE:
    ${JSON.stringify(distantNPCs, null, 2)}
    
    INSTRUCTIONS:
    1. **AUTONOMY**: NPCs are NOT statues. They must pursue their 'currentGoal' or daily routine.
    2. **MOVEMENT**: If an NPC needs to go somewhere, CHANGE their 'locationId' to a connected location.
    3. **MEMORY**: YOU MUST add a short log entry to the 'memories' array for each NPC describing what they just did (e.g. "Walked to the market", "Slept", "Argued with a guard").
    4. **PLANS**: Update their 'plans' field for the next turn.
    5. **STRICT ISOLATION**: These NPCs DO NOT KNOW what the player is doing right now. Do NOT reference the player's current actions.
    6. **CLEANUP**: If an NPC is minor/episodic and leaves the map area or story relevance, set status to 'Missing' or 'Gone'.
    
    RETURN: JSON object with 'npcs' array containing the updated distant NPCs.
    `;

    const simSchema = {
        type: Type.OBJECT,
        properties: {
            npcs: { type: Type.ARRAY, items: npcSchema }
        },
        required: ["npcs"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: simSchema,
                safetySettings: SAFETY_SETTINGS
            }
        });

        const text = response.text || "{}";
        const result = JSON.parse(cleanJson(text));
        return result;
    } catch (e) {
        console.warn("Background Sim Failed", e);
        return { npcs: [] };
    }
}
