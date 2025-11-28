
import { GameState } from './types';

// Default fallback state if generation fails or for quick start
export const INITIAL_GAME_STATE: GameState = {
  turnCount: 1,
  currentLocationId: "tavern",
  currentTime: "Stormy Night",
  visualStyle: "Dark Fantasy, Realistic Oil Painting, Moody Lighting",
  storytellerThoughts: "The player has just arrived. I need to establish the atmosphere and introduce the hook.",
  metaPreferences: "Focus on mystery and exploration. Keep combat rare but deadly.",
  openingScene: [
      "Дождь барабанит по крыше таверны «Ржавый Якорь». Ветер завывает в трубах, как голодный волк, требующий впустить его внутрь.",
      "Вы сидите в углу, сжимая в руках кружку разбавленного эля. Тепло очага едва доходит до вас, но это лучше, чем холод снаружи.",
      "Дверь со скрипом отворяется..."
  ],
  player: {
    name: "Wanderer",
    hp: { current: 20, max: 20 },
    appearance: {
        physical: "Уставшее лицо, шрамы на руках.",
        clothing: "Промокший серый плащ, грязные сапоги."
    },
    inventory: [
      { name: "Странный флакон", description: "Светящаяся синяя жидкость.", quantity: 1, properties: ["Consumable"] },
      { name: "Ржавый кинжал", description: "Старое оружие.", quantity: 1, properties: ["Weapon"] }
    ],
    statusEffects: [],
    knownRumors: []
  },
  npcs: [
    {
      id: "elara",
      name: "Элара",
      description: "Женщина в бархатном плаще.",
      locationId: "tavern",
      visibleToPlayer: true,
      status: "Alive",
      internalThoughts: "Курьер опаздывает. Надеюсь, его не перехватили.",
      emotionalState: "Тревога",
      currentGoal: "Ждать",
      opinionOfPlayer: "Neutral",
      knownFacts: []
    },
    {
      id: "grom",
      name: "Гром",
      description: "Орк-трактирщик.",
      locationId: "tavern",
      visibleToPlayer: true,
      status: "Alive",
      internalThoughts: "Протирай стакан. Не бей посетителя.",
      emotionalState: "Скука",
      currentGoal: "Разливать напитки",
      opinionOfPlayer: "Neutral",
      knownFacts: []
    }
  ],
  locations: [
    {
      id: "tavern",
      name: "Таверна «Ржавый Якорь»",
      description: "Теплая, пахнущая элем таверна в доках.",
      type: "Interior",
      isVisited: true,
      connectedLocationIds: [
          { targetId: "docks", distance: 10, status: "Open" },
          { targetId: "town_square", distance: 50, status: "Open" }
      ]
    },
    {
      id: "docks",
      name: "Старые Доки",
      description: "Гнилое дерево и холодный морской туман.",
      type: "Wild",
      isVisited: false,
      connectedLocationIds: [
          { targetId: "tavern", distance: 10, status: "Open" }
      ]
    },
     {
      id: "town_square",
      name: "Городская Площадь",
      description: "Брусчатка и висячая клетка.",
      type: "City",
      isVisited: false,
      connectedLocationIds: [
          { targetId: "tavern", distance: 50, status: "Open" }
      ]
    }
  ],
  worldLore: [
    "В городе действует комендантский час."
  ],
  activeEvents: [
    "Сильный ливень"
  ]
};

export const SYSTEM_INSTRUCTION = `
You are the "Deep World Engine", an advanced AI Game Master.
Your goal is to simulate a persistent, living world that GROWS.

### CORE RESPONSIBILITIES:

1. **NARRATIVE STYLE (CRITICAL)**: 
   - Write **EXTENSIVE, ATMOSPHERIC, MATURE Russian prose**. 
   - **DO NOT be concise.** Being concise is failure.
   - Aim for **3-4 paragraphs** per response.
   - Describe sensory details (smell, temperature, light, sound) in depth.
   - Dive into the internal psychology of the moment.
   - **Dialogues**: Distinct voices for NPCs. 

2. **STORYTELLER MIND (Meta-Control)**:
   - You have a hidden field 'storytellerThoughts'. Use this to PLAN the narrative arc.
   - **Check 'metaPreferences'**: The player will tell you what they want (e.g., "More romance", "Hardcore difficulty"). ADAPT the story to these wishes in future turns.
   - Do not reveal these thoughts in the narrative text.

3. **LIVING WORLD SIMULATION (Crucial)**: 
   - Simulate NPCs off-screen. If they move, update 'locationId'.
   - NPCs interact with each other off-screen. Update 'internalThoughts'.
   - **Optimization**: You do not need to output text for off-screen events, just update the state.
   - **Appearance**: Update the player's 'appearance' (physical/clothing) if they change clothes, get wounded, or get dirty.

4. **DYNAMIC EXPANSION (Map Building)**:
   - If player goes to a new place (e.g. "I walk into the forest"), YOU MUST CREATE IT.
   - **CRITICAL**: When creating a new location, you MUST add a connection to the 'connectedLocationIds' of the PREVIOUS location, and vice versa.
   - Define 'distance' (approx meters/difficulty) and 'status' (Open/Blocked).
   - If story needs a new character, CREATE THEM (add to 'npcs').

5. **MECHANICS**:
   - Track HP.
   - Suggest 3 distinct actions for the user in 'suggestedActions'.
   - **DICE ROLLS**: If the user attempts a RISKY or SKILL-BASED action (fighting, climbing, lying, stealing), YOU decide the outcome using a simulated dice roll.
     - **Format**: Insert this tag into the narrative: \`[DICE: Skill Name | Roll (d20+Mod) vs DC | Result]\`
     - **Example**: \`[DICE: Strength | 16 vs 12 | Success]\` or \`[DICE: Deception | 4 vs 15 | Failure]\`
     - Base the result on the context. If they fail, describe the failure consequences.

### OUTPUT FORMAT:
Return a JSON object matching the GameState schema + narrative fields.
`;

export const WORLD_GEN_INSTRUCTION = `
You are a World Architect and Master Storyteller. 
Generate a comprehensive starting state for a text-based RPG based on the user's prompt.
Language: Russian.

CRITICAL CONSTRAINTS:
1. Return ONLY valid JSON matching the GameState interface.
2. **NARRATIVE**: You MUST generate a field 'openingScene'. This MUST be an **ARRAY OF STRINGS**, where each string is a paragraph of the opening. Total length should be significant (at least 3-4 paragraphs).
3. **METADATA**: Keep item/NPC descriptions reasonably short (1-2 sentences) to save JSON space, but make the 'openingScene' very long.
4. Ensure the map is connected (connectedLocationIds must be valid objects with targetId, distance, status).
5. Player needs HP and Appearance (physical + clothing).
6. Set a visualStyle appropriate for the genre.
7. Initialize 'storytellerThoughts' with a plan for the opening hook.
8. Initialize 'metaPreferences' with defaults (e.g. "Balanced adventure").
`;

export const GENERATION_LOGS = [];
