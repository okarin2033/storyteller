
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, StorySegment } from "../types";
import { SYSTEM_INSTRUCTION, WORLD_GEN_INSTRUCTION } from "../constants";

const cleanJson = (text: string): string => {
  // 1. Remove markdown code blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  // 2. Find the first '{' and the last '}' to ignore preamble/postscript text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned.trim();
};

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
       appearance: { type: Type.STRING },
       statusEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
       knownRumors: { type: Type.ARRAY, items: { type: Type.STRING } },
       inventory: { type: Type.ARRAY, items: itemSchema }
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

const locationSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        type: { type: Type.STRING, enum: ["City", "Wild", "Dungeon", "Interior"] },
        isVisited: { type: Type.BOOLEAN },
        connectedLocationIds: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["id", "name", "connectedLocationIds"]
};

const visualSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        mood: { type: Type.STRING, enum: ['Dark', 'Bright', 'Mysterious', 'Dangerous', 'Peaceful'] }
    }
};

const actionSchema = {
    type: Type.OBJECT,
    properties: {
        label: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['Travel', 'Talk', 'Action', 'Investigate'] },
        actionText: { type: Type.STRING }
    }
}

// --- Story Generation ---

export const generateStoryTurn = async (
  apiKey: string,
  currentState: GameState,
  history: string[],
  playerAction: string
): Promise<StorySegment> => {
  const ai = new GoogleGenAI({ apiKey });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      narrative: { type: Type.STRING },
      sceneVisual: visualSchema,
      suggestedActions: { type: Type.ARRAY, items: actionSchema },
      updates: {
        type: Type.OBJECT,
        properties: {
          currentLocationId: { type: Type.STRING },
          currentTime: { type: Type.STRING },
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

  const prompt = `
    CURRENT WORLD STATE:
    ${JSON.stringify(currentState, null, 2)}

    NARRATIVE HISTORY (Last 3 turns):
    ${history.join("\n---\n")}

    PLAYER ACTION:
    "${playerAction}"
    
    INSTRUCTIONS:
    1. Advance the story.
    2. Simulate NPC behavior (off-screen movement/thoughts).
    3. Update JSON state.
    4. Provide 3 suggested actions for the player.
    5. Optionally provide a 'sceneVisual' if the scene is striking.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: {
          thinkingBudget: 2048,
        } 
      }
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(cleanJson(jsonText));

    return {
      narrative: data.narrative,
      sceneVisual: data.sceneVisual,
      suggestedActions: data.suggestedActions || [],
      stateUpdate: data.updates
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("The world logic fractured. Please try again.");
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
            turnCount: { type: Type.INTEGER },
            currentLocationId: { type: Type.STRING },
            currentTime: { type: Type.STRING },
            player: playerSchema,
            npcs: { type: Type.ARRAY, items: npcSchema },
            locations: { type: Type.ARRAY, items: locationSchema },
            worldLore: { type: Type.ARRAY, items: { type: Type.STRING } },
            activeEvents: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["player", "npcs", "locations", "currentLocationId", "currentTime"]
    };

    const prompt = `
      Create a new RPG world setting based on this idea: "${userPrompt}".
      
      Requirements:
      1. Create a protagonist player object (with HP and Appearance).
      2. Create 3-5 interesting NPCs.
      3. Create 3-4 connected Locations.
      4. Ensure NPCs have valid 'locationId's matching the locations.
      5. Add 'worldLore' and 'activeEvents'.
    `;

    // Strategy: Streaming response to prevent timeout perception
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
                // Using thinking budget for depth, but streaming prevents "hanging" feel
                thinkingConfig: { thinkingBudget: 2048 }
            }
        });

        let fullText = "";
        let chunkCount = 0;

        for await (const chunk of result) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                chunkCount++;
                // Update log every few chunks to show activity without spamming
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
        } catch (parseError) {
             onLog("JSON Parse failed on first attempt. Trying repair...");
             // Fallback: sometimes model repeats JSON or adds extra text despite schema.
             // We already cleaned, but let's try a simpler parse if schema enforcement failed slightly
             throw new Error("Data corruption detected during transfer.");
        }
        
        validateState(newState);
        
        onLog("World Generation Complete. Entering simulation.");
        return newState;

    } catch (firstError: any) {
        onLog(`Warning: Deep stream interrupted (${firstError.message}).`);
        onLog("Engaging Emergency Protocols (Standard Generation)...");
        
        // Fallback to non-streaming, low-latency call if streaming fails
        try {
             const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Fast fallback
                contents: prompt,
                config: {
                    systemInstruction: WORLD_GEN_INSTRUCTION,
                    responseMimeType: "application/json",
                    responseSchema: gameStateSchema,
                    // No thinking config for fallback
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
    if (!state.player || !state.npcs || !state.locations) {
        throw new Error("Generated world was incomplete (missing core tables).");
    }
    // Fix missing defaults if AI forgot them
    if (!state.turnCount) state.turnCount = 1;
    if (!state.player.hp) state.player.hp = { current: 20, max: 20 };
    if (!state.player.appearance) state.player.appearance = "Обычный путник.";
    if (!state.player.inventory) state.player.inventory = [];
}
