
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { GameState, StorySegment } from "../types";
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
      opinionOfPlayer: { type: Type.STRING },
      visibleToPlayer: { type: Type.BOOLEAN },
      description: { type: Type.STRING },
      knownFacts: { type: Type.ARRAY, items: { type: Type.STRING } }
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
  const SAFE_HISTORY_LIMIT = 50;
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
          metaPreferences: { type: Type.STRING },
          player: playerSchema,
          npcs: { type: Type.ARRAY, items: npcSchema },
          locations: { type: Type.ARRAY, items: locationSchema },
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

  const prompt = `
    CURRENT WORLD STATE:
    ${JSON.stringify(safeState, null, 2)}

    PLAYER META-PREFERENCES:
    "${currentState.metaPreferences}"

    NARRATIVE HISTORY (Last ${SAFE_HISTORY_LIMIT} Turns):
    ${slicedHistory.join("\n---\n")}

    ${modeInstruction}

    INPUT: "${playerAction}"
    
    INSTRUCTIONS:
    1. Advance the story.
    2. Simulate NPC behavior (off-screen movement/thoughts).
    3. Update JSON state.
    4. Provide 3 suggested actions for the user.
    5. Update 'storytellerThoughts' with your plan for the next scenes based on 'metaPreferences'.
  `;

  // Helper to process response
  const processResponse = (text: string) => {
      const cleaned = cleanJson(text);
      if (!cleaned) throw new Error("Empty response received");
      
      let data;
      try {
        data = JSON.parse(cleaned);
      } catch (e) {
        throw new Error(`JSON Parse Error. Raw text starts with: ${text.substring(0, 100)}...`);
      }

      if (!data.updates) data.updates = {};
      
      // Safety check for empty narrative
      if (!data.narrative || data.narrative.trim() === "..." || data.narrative.trim().length === 0) {
          throw new Error("AI returned empty narrative (Safety Block or Generation Error).");
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
                safetySettings: SAFETY_SETTINGS // Disable censorship even on fallback
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
        
        // Log raw outputs if available for debugging
        const raw1 = error.response?.text || error.message;
        const raw2 = fallbackError.response?.text || fallbackError.message;

        throw new Error(`${msg}\n\n[Debug Info]\nErr1: ${raw1?.substring(0, 200)}\nErr2: ${raw2?.substring(0, 200)}`);
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
            metaPreferences: { type: Type.STRING },
            player: playerSchema,
            npcs: { type: Type.ARRAY, items: npcSchema },
            locations: { type: Type.ARRAY, items: locationSchema },
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
        
        validateState(newState);
        
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
            const newState = JSON.parse(cleanJson(jsonText)) as GameState;
            validateState(newState);
            
            onLog("World stabilized.");
            return newState;
            
        } catch (secondError: any) {
             onLog(`CRITICAL FAILURE: ${secondError.message}`);
             console.error("World Gen Fatal Error", secondError);
             throw new Error("Failed to create world. Please try a simpler prompt.");
        }
    }
}

function validateState(state: any) {
    if (!state.player || !state.locations) {
        console.warn("Partial state detected during validation.");
    }
    
    if (!state.turnCount) state.turnCount = 1;
    if (!state.player) state.player = { name: "Survivor", hp: {current:10,max:10}, appearance: {}, inventory: []};
    if (!state.player.hp) state.player.hp = { current: 20, max: 20 };
    if (!state.player.appearance) state.player.appearance = { physical: "Неизвестно", clothing: "Неизвестно" };
    
    if (!state.player.inventory) state.player.inventory = [];
    if (!state.player.statusEffects) state.player.statusEffects = [];
    if (!state.player.knownRumors) state.player.knownRumors = [];
    
    delete state.player.imageUrl;
    
    if (!state.worldLore) state.worldLore = [];
    if (!state.activeEvents) state.activeEvents = [];
    
    if (!state.locations) state.locations = [];
    state.locations.forEach((loc: any) => {
        if (!loc.connectedLocationIds) loc.connectedLocationIds = [];
        delete loc.imageUrl;
    });
    
    if (!state.npcs) state.npcs = [];
    state.npcs.forEach((npc: any) => {
        if (!npc.knownFacts) npc.knownFacts = [];
    });

    if (!state.visualStyle) state.visualStyle = "Fantasy, Detailed, Digital Art";
    if (!state.storytellerThoughts) state.storytellerThoughts = "Analyzing input...";
    if (!state.metaPreferences) state.metaPreferences = "Balanced adventure.";
    
    if (!state.openingScene) {
        state.openingScene = [`**${state.currentTime}**`, `Вы находитесь в ${state.locations.find((l:any) => l.id === state.currentLocationId)?.name || 'Unknown'}.`];
    } else if (typeof state.openingScene === 'string') {
        state.openingScene = [state.openingScene];
    }
}
