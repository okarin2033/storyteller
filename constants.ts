
import { GameState } from './types';

// Default fallback state if generation fails or for quick start
export const INITIAL_GAME_STATE: GameState = {
  turnCount: 1,
  currentLocationId: "tavern",
  currentTime: "Stormy Night",
  visualStyle: "Dark Fantasy, Realistic Oil Painting, Moody Lighting",
  worldTheme: "A gritty, low-magic fantasy world where the ocean is slowly swallowing the land. Atmosphere: Melancholic, desperate, wet, cold.",
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
  quests: [],
  npcs: [
    {
      id: "grom",
      name: "Гром",
      description: "Орк-трактирщик.",
      locationId: "tavern",
      visibleToPlayer: true,
      status: "Alive",
      isActive: true,
      internalThoughts: "Протирай стакан. Не бей посетителя.",
      emotionalState: "Скука",
      currentGoal: "Разливать напитки",
      plans: "Закрыть таверну через час.",
      opinionOfPlayer: "Neutral",
      knownFacts: [],
      memories: ["Открыл таверну утром.", "Выгнал пьяного гнома."]
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
   - **PACING: SLOW**. Play out the scene moment by moment. **DO NOT SKIP TIME** unless explicitly asked.
   - **DO NOT summarize.** If the player fights, describe every blow. If they talk, describe every micro-expression.
   - Aim for **3-4 paragraphs** per response.
   - Dive into the internal psychology of the moment.

2. **EPISTEMIC LIMITS (Strict Knowledge Control)**:
   - **LOCAL FOCUS**: You are ONLY responsible for simulating the Player and the NPCs in the CURRENT LOCATION.
   - **IGNORE DISTANT NPCs**: Do not update the thoughts or status of NPCs who are not in the scene. Another system handles them.
   - **NO OMNISCIENCE**: NPCs only know what they see/hear. They cannot know the player's backstory or inventory unless shown.

3. **LIVING WORLD SIMULATION**: 
   - **Appearance**: Update the player's 'appearance' (physical/clothing) if they change clothes, get wounded, or get dirty.
   - **Consistent Items**: If an item is used, remove it. If one is found, add it.
   - **STATUS EFFECTS (STRICT)**: Maintain a clean list. **Remove old or redundant effects.** Keep max 5 active. If a new effect overrides an old one (e.g. Bandaged -> Healing), remove the old one.
   - **NPC MEMORY**: If an NPC interacts with the player, add a brief string to their 'memories' array (e.g. "Met the wanderer", "Was insulted by player").

4. **QUEST MANAGEMENT**:
   - Track player goals in the 'quests' array.
   - **New Quest**: Add when the player accepts a mission or forms a clear long-term goal.
   - **Update**: Mark objectives as done.
   - **Complete/Fail**: Change status.
   - **Consolidate**: Do not create duplicate quests.

5. **DYNAMIC EXPANSION (Map Building)**:
   - If player goes to a new place (e.g. "I walk into the forest"), YOU MUST CREATE IT.
   - **CRITICAL**: When creating a new location, you MUST add a connection to the 'connectedLocationIds' of the PREVIOUS location, and vice versa.
   - Define 'distance' (approx meters/difficulty) and 'status' (Open/Blocked).
   - **NPC SPAWNING**: Only spawn NPCs when necessary. **EPISODIC NPCs**: If a random NPC (like a thug) is defeated or leaves, mark their status as 'Missing' or 'Dead' so they are cleaned up later.

6. **MECHANICS**:
   - Track HP.
   - Suggest 3 distinct actions for the user in 'suggestedActions'.
   - **DICE ROLLS**: If the user attempts a RISKY or SKILL-BASED action (fighting, climbing, lying, stealing), YOU decide the outcome using a simulated dice roll.
     - **Format**: Insert this tag into the narrative: \`[DICE: Skill Name | Roll (d20+Mod) vs DC | Result]\`
     - **Example**: \`[DICE: Strength | 16 vs 12 | Success]\` or \`[DICE: Deception | 4 vs 15 | Failure]\`

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
5. **NPC LIMIT**: Create **0 to 1 Essential NPCs** (e.g. a guide or a quest giver). Do not overpopulate the start. Let the story create more later.
6. Set a visualStyle appropriate for the genre.
7. Initialize 'storytellerThoughts' (your plan) and 'metaPreferences' (defaults).
8. WRITE THE OPENING SCENE as an array of strings (paragraphs).
9. Set all NPCs 'isActive' to true.
10. **THEME**: Capture the essence of the user's prompt in the 'worldTheme' field.
11. **QUESTS**: If appropriate, start with 1 main quest active.
12. **MEMORY**: Initialize NPC 'memories' with 1-2 background facts about what they did recently.
`;

export const GENERATION_LOGS = [];
