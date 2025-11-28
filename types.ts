
export interface NPC {
  id: string;
  name: string;
  description: string;
  locationId: string; // Links to a WorldLocation id
  visibleToPlayer: boolean; // If false, they are in the scene but hiding, or just not noticed yet
  status: 'Alive' | 'Dead' | 'Unconscious' | 'Missing';
  
  // The "Deep" Internal State
  internalThoughts: string;
  emotionalState: string;
  currentGoal: string;
  opinionOfPlayer: string;
  knownFacts: string[];
}

export interface WorldItem {
  name: string;
  description: string;
  quantity: number;
  properties: string[];
}

export interface LocationConnection {
    targetId: string;
    distance: number; // arbitrary units, e.g. "minutes walking"
    status: 'Open' | 'Blocked' | 'Hidden';
}

export interface WorldLocation {
  id: string;
  name: string;
  description: string;
  type: 'City' | 'Wild' | 'Dungeon' | 'Interior';
  isVisited: boolean;
  connectedLocationIds: LocationConnection[]; // Graph structure for movement
  imageUrl?: string;
}

export interface PlayerStats {
  name: string;
  hp: { current: number; max: number };
  appearance: {
    physical: string;
    clothing: string;
  };
  inventory: WorldItem[];
  statusEffects: string[];
  knownRumors: string[];
  imageUrl?: string;
}

export interface GameState {
  turnCount: number;
  currentLocationId: string; 
  currentTime: string;
  visualStyle: string; // Global art style setting
  
  // New Narrative Control Fields
  storytellerThoughts: string; // The AI's hidden plan/analysis of the plot
  metaPreferences: string; // The player's wish for the story (e.g. "More combat", "Romance focus")
  openingScene?: string[]; // CHANGED: Array of paragraphs for stability

  player: PlayerStats;

  npcs: NPC[];
  locations: WorldLocation[];
  
  worldLore: string[];
  activeEvents: string[];
}

export interface SuggestedAction {
  label: string;
  type: 'Travel' | 'Talk' | 'Action' | 'Investigate';
  actionText: string;
}

export interface StorySegment {
  narrative: string;
  suggestedActions: SuggestedAction[];
  stateUpdate: Partial<GameState>;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: number;
  sceneImage?: string; // Generated visualization of this specific turn
}

export interface SaveFile {
    version: number;
    timestamp: number;
    name: string;
    gameState: GameState;
    history: ChatMessage[];
    stateHistory: GameState[];
}
