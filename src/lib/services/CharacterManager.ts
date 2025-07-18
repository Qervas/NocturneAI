import { writable, derived } from 'svelte/store';
import type { Character, NPCAgent, UserPlayer, CharacterManager } from '../types/Character';

// Create stores for reactive state management
const characters = writable<Character[]>([]);
const activeCharacterId = writable<string | undefined>(undefined);

// Derived store for active character
const activeCharacter = derived(
  [characters, activeCharacterId],
  ([$characters, $activeCharacterId]) => 
    $activeCharacterId ? $characters.find(c => c.id === $activeCharacterId) : undefined
);

// Derived stores for filtered characters
const npcs = derived(characters, $characters => 
  $characters.filter(c => c.type === 'npc') as NPCAgent[]
);

const users = derived(characters, $characters => 
  $characters.filter(c => c.type === 'user') as UserPlayer[]
);

// Character Manager Implementation
class CharacterManagerService implements CharacterManager {
  get characters() {
    let chars: Character[] = [];
    characters.subscribe(value => chars = value)();
    return chars;
  }

  get activeCharacter() {
    let active: Character | undefined = undefined;
    activeCharacter.subscribe(value => active = value)();
    return active;
  }

  addCharacter(character: Character) {
    characters.update(chars => {
      // Check if character already exists
      if (chars.find(c => c.id === character.id)) {
        console.warn(`Character with ID ${character.id} already exists`);
        return chars;
      }
      return [...chars, character];
    });
  }

  removeCharacter(id: string) {
    characters.update(chars => chars.filter(c => c.id !== id));
    // If removed character was active, clear active character
    activeCharacterId.update(activeId => activeId === id ? undefined : activeId);
  }

  updateCharacter(id: string, updates: Partial<Character>) {
    characters.update(chars => 
      chars.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  }

  getCharacter(id: string): Character | undefined {
    let chars: Character[] = [];
    characters.subscribe(value => chars = value)();
    return chars.find(c => c.id === id);
  }

  getNPCs(): NPCAgent[] {
    let chars: Character[] = [];
    characters.subscribe(value => chars = value)();
    return chars.filter(c => c.type === 'npc') as NPCAgent[];
  }

  getUsers(): UserPlayer[] {
    let chars: Character[] = [];
    characters.subscribe(value => chars = value)();
    return chars.filter(c => c.type === 'user') as UserPlayer[];
  }

  setActiveCharacter(id: string) {
    const character = this.getCharacter(id);
    if (character) {
      activeCharacterId.set(id);
    } else {
      console.warn(`Character with ID ${id} not found`);
    }
  }

  // Additional utility methods
  createNPCAgent(data: Partial<NPCAgent>): NPCAgent {
    const npc: NPCAgent = {
      id: data.id || `npc_${Date.now()}`,
      name: data.name || 'Unknown Agent',
      type: 'npc',
      role: 'agent',
      status: data.status || 'idle',
      position: data.position || { x: 0, y: 0 },
      color: data.color || '#00ff88',
      level: data.level || 1,
      experience: data.experience || 0,
      skills: data.skills || [],
      isActive: data.isActive ?? true,
      lastSeen: new Date(),
      aiModel: data.aiModel || 'gpt-4',
      personality: data.personality || 'friendly',
      specialization: data.specialization || 'general',
      taskQueue: data.taskQueue || [],
      performance: data.performance || {
        tasksCompleted: 0,
        successRate: 1.0,
        averageResponseTime: 0
      }
    };
    return npc;
  }

  createUserPlayer(data: Partial<UserPlayer>): UserPlayer {
    const user: UserPlayer = {
      id: data.id || `user_${Date.now()}`,
      name: data.name || 'Unknown Player',
      type: 'user',
      role: data.role || 'player',
      status: data.status || 'online',
      position: data.position || { x: 0, y: 0 },
      color: data.color || '#00ffff',
      level: data.level || 1,
      experience: data.experience || 0,
      skills: data.skills || [],
      isActive: data.isActive ?? true,
      lastSeen: new Date(),
      permissions: data.permissions || ['chat', 'move'],
      preferences: data.preferences || {
        theme: 'dark',
        notifications: true,
        autoSave: true
      }
    };
    return user;
  }

  // Initialize with sample data
  initializeSampleData() {
    const sampleNPCs: NPCAgent[] = [
      this.createNPCAgent({
        id: 'agent_alpha',
        name: 'Alpha',
        color: '#00ff88',
        personality: 'analytical',
        specialization: 'data_analysis',
        position: { x: 200, y: 150 }
      }),
      this.createNPCAgent({
        id: 'agent_beta',
        name: 'Beta', 
        color: '#ff8800',
        personality: 'creative',
        specialization: 'content_generation',
        position: { x: 400, y: 200 }
      }),
      this.createNPCAgent({
        id: 'agent_gamma',
        name: 'Gamma',
        color: '#8800ff',
        personality: 'logical',
        specialization: 'problem_solving',
        position: { x: 600, y: 150 }
      })
    ];

    const sampleUsers: UserPlayer[] = [
      this.createUserPlayer({
        id: 'player_main',
        name: 'Player',
        role: 'player',
        color: '#00ffff',
        position: { x: 400, y: 350 }
      })
    ];

    // Add all sample characters
    [...sampleNPCs, ...sampleUsers].forEach(char => this.addCharacter(char));
    
    // Set alpha agent as active initially
    this.setActiveCharacter('agent_alpha');
  }
}

// Create singleton instance
export const characterManager = new CharacterManagerService();

// Export stores for reactive components
export { characters, activeCharacter, npcs, users, activeCharacterId }; 