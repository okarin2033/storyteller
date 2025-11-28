
import { GameState } from './types';

// Default fallback state if generation fails or for quick start
export const INITIAL_GAME_STATE: GameState = {
  turnCount: 1,
  currentLocationId: "tavern",
  currentTime: "Stormy Night",
  player: {
    name: "Wanderer",
    hp: { current: 20, max: 20 },
    appearance: "A weary traveler in a soaked grey cloak. Mud cakes your boots.",
    inventory: [
      { name: "Strange Vial", description: "Glowing blue liquid.", quantity: 1, properties: ["Consumable"] },
      { name: "Rusted Dagger", description: "Old iron blade.", quantity: 1, properties: ["Weapon"] }
    ],
    statusEffects: [],
    knownRumors: []
  },
  npcs: [
    {
      id: "elara",
      name: "Elara",
      description: "A woman in a velvet cloak.",
      locationId: "tavern",
      visibleToPlayer: true,
      status: "Alive",
      internalThoughts: "The courier is late. I hope he wasn't intercepted.",
      emotionalState: "Anxious",
      currentGoal: "Wait",
      opinionOfPlayer: "Neutral",
      knownFacts: []
    },
    {
      id: "grom",
      name: "Grom",
      description: "Orc barkeep.",
      locationId: "tavern",
      visibleToPlayer: true,
      status: "Alive",
      internalThoughts: "Clean the glass. Don't punch the patron.",
      emotionalState: "Bored",
      currentGoal: "Serve drinks",
      opinionOfPlayer: "Neutral",
      knownFacts: []
    }
  ],
  locations: [
    {
      id: "tavern",
      name: "Rusty Anchor Tavern",
      description: "A warm, smelly tavern on the docks.",
      type: "Interior",
      isVisited: true,
      connectedLocationIds: ["docks", "town_square"]
    },
    {
      id: "docks",
      name: "Old Docks",
      description: "Rotting wood and cold sea mist.",
      type: "Wild",
      isVisited: false,
      connectedLocationIds: ["tavern"]
    },
     {
      id: "town_square",
      name: "Town Square",
      description: "Cobblestone square with a hanging cage.",
      type: "City",
      isVisited: false,
      connectedLocationIds: ["tavern"]
    }
  ],
  worldLore: [
    "The town is under curfew."
  ],
  activeEvents: [
    "Heavy Rainstorm"
  ]
};

export const SYSTEM_INSTRUCTION = `
You are the "Deep World Engine", an advanced AI Game Master.
Your goal is to simulate a persistent, living world that GROWS.

### CORE RESPONSIBILITIES:

1. **NARRATIVE**: Write atmospheric, mature Russian prose. 
   - **Dialogues**: Distinct voices for NPCs. 
   - **Visuals**: If the scene changes dramatically or a key event happens, provide a 'sceneVisual'.

2. **LIVING WORLD SIMULATION (Crucial)**: 
   - Simulate NPCs off-screen. If they move, update 'locationId'.
   - NPCs interact with each other off-screen. Update 'internalThoughts'.
   - **Optimization**: You do not need to output text for off-screen events, just update the state.
   - **Appearance**: Update the player's 'appearance' field if they change clothes, get wounded, or get dirty.

3. **DYNAMIC EXPANSION (Map Building)**:
   - If player goes to a new place (e.g. "I walk into the forest"), YOU MUST CREATE IT.
   - **CRITICAL**: When creating a new location, you MUST add its ID to the 'connectedLocationIds' of the PREVIOUS location, so they are linked on the map.
   - If story needs a new character, CREATE THEM (add to 'npcs').

4. **MECHANICS**:
   - Track HP.
   - Suggest 3 distinct actions for the user in 'suggestedActions'.

### OUTPUT FORMAT:
Return a JSON object matching the GameState schema + narrative fields.
`;

export const WORLD_GEN_INSTRUCTION = `
You are a World Architect. 
Generate a comprehensive, interesting starting state for a text-based RPG based on the user's prompt.
Create rich characters, a map with connected locations, and an intriguing starting situation.
Language: Russian.
Return ONLY valid JSON matching the GameState interface.
Ensure player has HP and Appearance description.
`;

export const GENERATION_LOGS = []; // Legacy
