
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

export interface WorldLocation {
  id: string;
  name: string;
  description: string;
  type: 'City' | 'Wild' | 'Dungeon' | 'Interior';
  isVisited: boolean;
  connectedLocationIds: string[]; // Graph structure for movement
}

export interface PlayerStats {
  name: string;
  hp: { current: number; max: number };
  appearance: string; // Replaces currency
  inventory: WorldItem[];
  statusEffects: string[];
  knownRumors: string[];
}

export interface GameState {
  turnCount: number;
  currentLocationId: string; 
  currentTime: string;
  
  player: PlayerStats;

  npcs: NPC[];
  locations: WorldLocation[];
  
  worldLore: string[];
  activeEvents: string[];
}

export interface SceneVisual {
  title: string;
  description: string;
  mood: 'Dark' | 'Bright' | 'Mysterious' | 'Dangerous' | 'Peaceful';
}

export interface SuggestedAction {
  label: string;
  type: 'Travel' | 'Talk' | 'Action' | 'Investigate';
  actionText: string;
}

export interface StorySegment {
  narrative: string;
  sceneVisual?: SceneVisual | null;
  suggestedActions: SuggestedAction[];
  stateUpdate: Partial<GameState>;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  sceneVisual?: SceneVisual | null; // Attach visual to message history
  timestamp?: number;
}
