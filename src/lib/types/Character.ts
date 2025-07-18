export type CharacterType = 'npc' | 'user';
export type CharacterRole = 'agent' | 'player' | 'admin' | 'observer';
export type CharacterStatus = 'online' | 'offline' | 'busy' | 'idle';

export interface Character {
  id: string;
  name: string;
  type: CharacterType;
  role: CharacterRole;
  status: CharacterStatus;
  position: { x: number; y: number };
  color: string;
  avatar?: string;
  level: number;
  experience: number;
  skills: string[];
  isActive: boolean;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export interface NPCAgent extends Character {
  type: 'npc';
  role: 'agent';
  aiModel: string;
  personality: string;
  specialization: string;
  taskQueue: string[];
  currentTask?: string;
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
  };
}

export interface UserPlayer extends Character {
  type: 'user';
  role: 'player' | 'admin' | 'observer';
  permissions: string[];
  preferences: {
    theme: string;
    notifications: boolean;
    autoSave: boolean;
  };
}

export type CharacterManager = {
  characters: Character[];
  activeCharacter?: Character;
  addCharacter: (character: Character) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  getCharacter: (id: string) => Character | undefined;
  getNPCs: () => NPCAgent[];
  getUsers: () => UserPlayer[];
  setActiveCharacter: (id: string) => void;
}; 