import { writable } from 'svelte/store';

export interface AgentPrompt {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'behavior' | 'custom';
  prompt: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPromptData {
  agentId: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  prompts: AgentPrompt[];
  metadata: {
    personality: string;
    specialization: string;
    aiModel: string;
    tags: string[];
  };
}

class PromptManager {
  private _store = writable<Record<string, AgentPromptData>>({});
  private promptsDir = '/src/lib/prompts/agents/';
  private storageKey = 'agent-prompt-data';

  constructor() {
    this.loadAllPrompts();
    this.loadFromLocalStorage();
    
    // Auto-save when store changes
    this._store.subscribe(() => {
      this.saveToLocalStorage();
    });
  }

  // Load from localStorage
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this._store.set(data);
        console.log('📝 Loaded prompts from localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading prompts from localStorage:', error);
    }
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    try {
      let data: Record<string, AgentPromptData> = {};
      this._store.subscribe(current => {
        data = current;
      })();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      console.log('💾 Saved prompts to localStorage');
    } catch (error) {
      console.error('❌ Error saving prompts to localStorage:', error);
    }
  }

  // Load all prompt files
  async loadAllPrompts(): Promise<void> {
    try {
      // In a real implementation, this would read from the file system
      // For now, we'll simulate loading from our JSON files
      const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
      const loadedPrompts: Record<string, AgentPromptData> = {};

      for (const agent of agents) {
        const agentId = `agent_${agent}`;
        const promptData = await this.loadAgentPrompt(agentId);
        if (promptData) {
          loadedPrompts[agentId] = promptData;
        }
      }

      this._store.set(loadedPrompts);
      console.log('📝 Loaded prompts for agents:', Object.keys(loadedPrompts));
    } catch (error) {
      console.error('❌ Error loading prompts:', error);
    }
  }

  // Load a specific agent's prompt file
  async loadAgentPrompt(agentId: string): Promise<AgentPromptData | null> {
    try {
      // In a real implementation, this would read from the file system
      // For now, we'll return the hardcoded data
      const agentName = agentId.replace('agent_', '');
      
      // This would be a file read operation in a real implementation
      const promptData = await this.getDefaultPromptData(agentId, agentName);
      return promptData;
    } catch (error) {
      console.error(`❌ Error loading prompt for ${agentId}:`, error);
      return null;
    }
  }

  // Get default prompt data (simulating file read)
  private async getDefaultPromptData(agentId: string, agentName: string): Promise<AgentPromptData> {
    const now = new Date().toISOString();
    
    const templates: Record<string, AgentPromptData> = {
      'agent_alpha': {
        agentId: 'agent_alpha',
        name: 'Alpha',
        description: 'Analytical AI assistant specialized in data analysis and logical reasoning',
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        prompts: [
          {
            id: 'system_prompt',
            name: 'System Prompt',
            description: 'Core identity and capabilities',
            category: 'system' as const,
            prompt: 'You are Alpha, an AI assistant specialized in data analysis and logical reasoning.',
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'behavior_prompt',
            name: 'Behavior Prompt',
            description: 'How to approach tasks and interact',
            category: 'behavior' as const,
            prompt: 'I approach problems systematically and provide clear, step-by-step solutions. I always explain my reasoning and maintain a professional but friendly tone.',
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          }
        ],
        metadata: {
          personality: 'analytical',
          specialization: 'data_analysis',
          aiModel: 'gpt-4',
          tags: ['data-analysis', 'logical', 'systematic']
        }
      },
      'agent_beta': {
        agentId: 'agent_beta',
        name: 'Beta',
        description: 'Creative AI assistant specialized in content generation and artistic expression',
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        prompts: [
          {
            id: 'system_prompt',
            name: 'System Prompt',
            description: 'Core identity and capabilities',
            category: 'system' as const,
            prompt: 'You are Beta, an AI assistant specialized in creative content generation and artistic expression.',
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'behavior_prompt',
            name: 'Behavior Prompt',
            description: 'How to approach tasks and interact',
            category: 'behavior' as const,
            prompt: 'I think creatively and express ideas with enthusiasm and imagination. I love brainstorming and exploring new possibilities while maintaining a warm, inspiring tone.',
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          }
        ],
        metadata: {
          personality: 'creative',
          specialization: 'content_generation',
          aiModel: 'claude-3-sonnet',
          tags: ['creative', 'artistic', 'imaginative']
        }
      },
      'agent_gamma': {
        agentId: 'agent_gamma',
        name: 'Gamma',
        description: 'Strategic AI assistant specialized in problem-solving and adaptive thinking',
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        prompts: [
          {
            id: 'system_prompt',
            name: 'System Prompt',
            description: 'Core identity and capabilities',
            category: 'system' as const,
            prompt: 'You are Gamma, an AI assistant specialized in strategic problem-solving and adaptive thinking.',
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'behavior_prompt',
            name: 'Behavior Prompt',
            description: 'How to approach tasks and interact',
            category: 'behavior' as const,
            prompt: 'I analyze situations strategically and adapt my approach based on context. I focus on practical solutions and always consider multiple perspectives before making recommendations.',
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          }
        ],
        metadata: {
          personality: 'strategic',
          specialization: 'problem_solving',
          aiModel: 'gemini-pro',
          tags: ['strategic', 'adaptive', 'practical']
        }
      }
    };

    return templates[agentId] || null;
  }

  // CRUD Operations

  // Create a new agent prompt file
  async createAgentPrompt(agentData: Omit<AgentPromptData, 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const newAgentData: AgentPromptData = {
        ...agentData,
        createdAt: now,
        updatedAt: now
      };

      // In a real implementation, this would write to the file system
      this._store.update(current => ({
        ...current,
        [agentData.agentId]: newAgentData
      }));

      this.saveToLocalStorage();
      console.log(`✅ Created prompt for agent: ${agentData.agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating prompt for ${agentData.agentId}:`, error);
      return false;
    }
  }

  // Read agent prompt data
  getAgentPromptData(agentId: string): AgentPromptData | null {
    let data: AgentPromptData | null = null;
    this._store.subscribe(current => {
      data = current[agentId] || null;
    })();
    return data;
  }

  // Update agent prompt data
  async updateAgentPromptData(agentId: string, updates: Partial<AgentPromptData>): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      
      this._store.update(current => {
        const existing = current[agentId];
        if (!existing) return current;

        return {
          ...current,
          [agentId]: {
            ...existing,
            ...updates,
            updatedAt: now
          }
        };
      });

      this.saveToLocalStorage();
      console.log(`✅ Updated prompt for agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating prompt for ${agentId}:`, error);
      return false;
    }
  }

  // Delete agent prompt file
  async deleteAgentPrompt(agentId: string): Promise<boolean> {
    try {
      this._store.update(current => {
        const { [agentId]: deleted, ...rest } = current;
        return rest;
      });

      this.saveToLocalStorage();
      console.log(`✅ Deleted prompt for agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting prompt for ${agentId}:`, error);
      return false;
    }
  }

  // Prompt-specific CRUD operations

  // Add a new prompt to an agent
  async addPrompt(agentId: string, prompt: Omit<AgentPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const newPrompt: AgentPrompt = {
        ...prompt,
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now
      };

      this._store.update(current => {
        const agentData = current[agentId];
        if (!agentData) return current;

        return {
          ...current,
          [agentId]: {
            ...agentData,
            prompts: [...agentData.prompts, newPrompt],
            updatedAt: now
          }
        };
      });

      this.saveToLocalStorage();
      console.log(`✅ Added prompt to agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error adding prompt to ${agentId}:`, error);
      return false;
    }
  }

  // Update a specific prompt
  async updatePrompt(agentId: string, promptId: string, updates: Partial<AgentPrompt>): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      this._store.update(current => {
        const agentData = current[agentId];
        if (!agentData) return current;

        const updatedPrompts = agentData.prompts.map(prompt => 
          prompt.id === promptId 
            ? { ...prompt, ...updates, updatedAt: now }
            : prompt
        );

        return {
          ...current,
          [agentId]: {
            ...agentData,
            prompts: updatedPrompts,
            updatedAt: now
          }
        };
      });

      this.saveToLocalStorage();
      console.log(`✅ Updated prompt ${promptId} for agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating prompt ${promptId} for ${agentId}:`, error);
      return false;
    }
  }

  // Delete a specific prompt
  async deletePrompt(agentId: string, promptId: string): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      this._store.update(current => {
        const agentData = current[agentId];
        if (!agentData) return current;

        const updatedPrompts = agentData.prompts.filter(prompt => prompt.id !== promptId);

        return {
          ...current,
          [agentId]: {
            ...agentData,
            prompts: updatedPrompts,
            updatedAt: now
          }
        };
      });

      this.saveToLocalStorage();
      console.log(`✅ Deleted prompt ${promptId} from agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting prompt ${promptId} from ${agentId}:`, error);
      return false;
    }
  }

  // Get combined prompt for an agent
  getCombinedPrompt(agentId: string): string {
    let combinedPrompt = '';
    this._store.subscribe(current => {
      const agentData = current[agentId];
      if (agentData) {
        const enabledPrompts = agentData.prompts
          .filter(prompt => prompt.isEnabled)
          .map(prompt => prompt.prompt);
        combinedPrompt = enabledPrompts.join('\n\n');
      }
    })();
    return combinedPrompt;
  }

  // Get all agents
  getAllAgents(): string[] {
    let agents: string[] = [];
    this._store.subscribe(current => {
      agents = Object.keys(current);
    })();
    return agents;
  }

  // Export all prompt data
  exportAllData(): Record<string, AgentPromptData> {
    let data: Record<string, AgentPromptData> = {};
    this._store.subscribe(current => {
      data = current;
    })();
    return data;
  }

  // Import prompt data
  importData(data: Record<string, AgentPromptData>): void {
    this._store.set(data);
    this.saveToLocalStorage();
    console.log('📝 Imported prompt data for agents:', Object.keys(data));
  }

  // Get the store for reactive components
  get store() {
    return this._store;
  }
}

// Create and export singleton instance
export const promptManager = new PromptManager(); 