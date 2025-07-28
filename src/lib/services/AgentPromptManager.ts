import { writable } from 'svelte/store';
import { settingsManager } from './SettingsManager';
import { promptManager } from './PromptManager';

export interface AgentPrompt {
    id: string;
    name: string;
    description: string;
    prompt: string;
    category: 'system' | 'behavior' | 'custom';
    isEnabled: boolean;
}

export interface AgentPrompts {
    agentId: string;
    prompts: AgentPrompt[];
    defaultSystemPrompt: string;
    defaultBehaviorPrompt: string;
}

class AgentPromptManager {
    public store = writable<Record<string, AgentPrompts>>({});
    
    constructor() {
        this.initializeDefaultPrompts();
        this.loadPersistedPrompts();
    }
    
    private initializeDefaultPrompts() {
        // Initialize with empty prompts - they will be loaded from files
        this.store.set({});
    }
    
    private loadPersistedPrompts() {
        try {
            console.log('🔄 Loading persisted prompts...');
            
            // Load individual agent prompts
            const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
            let loadedPrompts: Record<string, AgentPrompts> = {};
            
            agents.forEach(agentId => {
                const persisted = settingsManager.getAgentPrompts(agentId);
                if (persisted) {
                    console.log(`✅ Loaded persisted prompts for ${agentId}:`, persisted);
                    loadedPrompts[agentId] = persisted;
                } else {
                    console.log(`📝 No persisted prompts found for ${agentId}, using defaults`);
                }
            });
            
            // Update store with persisted prompts
            if (Object.keys(loadedPrompts).length > 0) {
                this.store.update(current => ({ ...current, ...loadedPrompts }));
                console.log('✅ Loaded all persisted prompts');
            } else {
                console.log('📝 No persisted prompts found, using defaults');
            }
        } catch (error) {
            console.error('❌ Failed to load persisted prompts:', error);
        }
    }
    
    // Save all current prompts to persistence
    saveAllPrompts() {
        console.log('💾 Saving all prompts to persistence...');
        
        let currentPrompts: Record<string, AgentPrompts> = {};
        this.store.subscribe(prompts => {
            currentPrompts = prompts;
        })();
        
        Object.entries(currentPrompts).forEach(([agentId, prompts]) => {
            settingsManager.saveAgentPrompts(agentId, prompts);
        });
        
        console.log('✅ All prompts saved to persistence');
    }
    
    // Reset all prompts to vanilla versions
    resetAllPrompts() {
        console.log('Resetting all agent prompts to vanilla versions...');
        this.initializeDefaultPrompts();
        
        // Clear individual agent prompts
        const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
        agents.forEach(agentId => {
            settingsManager.saveAgentPrompts(agentId, null);
        });
        
        console.log('All prompts reset to vanilla versions');
    }
    
    // Reset prompts for a specific agent
    resetAgentPrompts(agentId: string) {
        console.log(`Resetting prompts for agent: ${agentId}`);
        
        let defaultPrompts: Record<string, AgentPrompts> = {};
        this.store.subscribe(prompts => {
            defaultPrompts = prompts;
        })();
        
        const agentPrompts = defaultPrompts[agentId];
        
        if (agentPrompts) {
            this.store.update(current => ({
                ...current,
                [agentId]: agentPrompts
            }));
            
            // Clear persisted prompts for this agent
            settingsManager.saveAgentPrompts(agentId, null);
            console.log(`Prompts reset for agent: ${agentId}`);
        }
    }
    
    getAgentPrompts(agentId: string): AgentPrompts | null {
        const promptData = promptManager.getAgentPromptData(agentId);
        if (!promptData) return null;
        
        // Convert PromptManager format to AgentPromptManager format
        return {
            agentId: promptData.agentId,
            defaultSystemPrompt: promptData.prompts.find(p => p.category === 'system')?.prompt || '',
            defaultBehaviorPrompt: promptData.prompts.find(p => p.category === 'behavior')?.prompt || '',
            prompts: promptData.prompts.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                prompt: p.prompt,
                category: p.category,
                isEnabled: p.isEnabled
            }))
        };
    }
    
    updateAgentPrompt(agentId: string, promptId: string, updates: Partial<AgentPrompt>) {
        console.log(`🔄 Updating prompt for ${agentId}, promptId: ${promptId}`, updates);
        
        this.store.update(prompts => {
            const agentPrompts = prompts[agentId];
            if (!agentPrompts) {
                console.error(`❌ No agent prompts found for ${agentId}`);
                return prompts;
            }
            
            const updatedPrompts = agentPrompts.prompts.map(prompt => 
                prompt.id === promptId ? { ...prompt, ...updates } : prompt
            );
            
            const updatedAgentPrompts = {
                ...agentPrompts,
                prompts: updatedPrompts
            };
            
            // Persist to settings
            settingsManager.saveAgentPrompts(agentId, updatedAgentPrompts);
            console.log(`✅ Updated and persisted prompts for ${agentId}`);
            
            // Also save all prompts to ensure consistency
            this.saveAllPrompts();
            
            return {
                ...prompts,
                [agentId]: updatedAgentPrompts
            };
        });
    }
    
    addAgentPrompt(agentId: string, prompt: Omit<AgentPrompt, 'id'>) {
        const newPrompt: AgentPrompt = {
            ...prompt,
            id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        this.store.update(prompts => {
            const agentPrompts = prompts[agentId];
            if (!agentPrompts) return prompts;
            
            const updatedAgentPrompts = {
                ...agentPrompts,
                prompts: [...agentPrompts.prompts, newPrompt]
            };
            
            // Persist to settings
            settingsManager.saveAgentPrompts(agentId, updatedAgentPrompts);
            
            return {
                ...prompts,
                [agentId]: updatedAgentPrompts
            };
        });
    }
    
    removeAgentPrompt(agentId: string, promptId: string) {
        this.store.update(prompts => {
            const agentPrompts = prompts[agentId];
            if (!agentPrompts) return prompts;
            
            const updatedPrompts = agentPrompts.prompts.filter(prompt => prompt.id !== promptId);
            
            const updatedAgentPrompts = {
                ...agentPrompts,
                prompts: updatedPrompts
            };
            
            // Persist to settings
            settingsManager.saveAgentPrompts(agentId, updatedAgentPrompts);
            
            return {
                ...prompts,
                [agentId]: updatedAgentPrompts
            };
        });
    }
    
    getActivePrompts(agentId: string): string[] {
        const agentPrompts = this.getAgentPrompts(agentId);
        if (!agentPrompts) return [];
        
        return agentPrompts.prompts
            .filter(prompt => prompt.isEnabled)
            .map(prompt => prompt.prompt);
    }
    
    getCombinedPrompt(agentId: string): string {
        return promptManager.getCombinedPrompt(agentId);
    }
    
    exportData(): Record<string, AgentPrompts> {
        let data: Record<string, AgentPrompts> = {};
        this.store.subscribe(prompts => {
            data = { ...prompts };
        })();
        return data;
    }
    
    importData(data: Record<string, AgentPrompts>) {
        this.store.set(data);
        
        // Persist imported data
        Object.entries(data).forEach(([agentId, prompts]) => {
            settingsManager.saveAgentPrompts(agentId, prompts);
        });
    }
}

// Create singleton instance
export const agentPromptManager = new AgentPromptManager();

// Create a reactive store for UI components
export const agentPromptsStore = agentPromptManager.store;

// Global function for easy console access
if (typeof window !== 'undefined') {
  (window as any).resetAllAgentPrompts = () => {
    agentPromptManager.resetAllPrompts();
    console.log('✅ All agent prompts reset to vanilla versions');
  };
  
  (window as any).resetAgentPrompts = (agentId: string) => {
    agentPromptManager.resetAgentPrompts(agentId);
    console.log(`✅ Prompts reset for agent: ${agentId}`);
  };
  
  (window as any).testAgentPrompts = () => {
    console.log('🧪 Testing all agent prompts:');
    const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
    agents.forEach(agentId => {
      const combined = agentPromptManager.getCombinedPrompt(agentId);
      console.log(`  ${agentId}: "${combined}"`);
    });
  };

  (window as any).setCustomPrompt = (agentId: string, prompt: string) => {
    agentPromptManager.updateAgentPrompt(agentId, 'system_prompt', { prompt });
    console.log(`✅ Set custom prompt for ${agentId}: "${prompt}"`);
  };

  (window as any).testPromptSaving = () => {
    console.log('🧪 Testing prompt saving...');
    
    // Test saving a prompt
    agentPromptManager.updateAgentPrompt('agent_alpha', 'system_prompt', {
      prompt: 'You are Alpha, a test AI assistant. This is a test prompt!'
    });
    
    // Check if it was saved
    const savedPrompts = agentPromptManager.getAgentPrompts('agent_alpha');
    const combinedPrompt = agentPromptManager.getCombinedPrompt('agent_alpha');
    
    console.log('📝 Saved prompts:', savedPrompts);
    console.log('🔗 Combined prompt:', combinedPrompt);
    
    // Check localStorage
    const localStorageData = localStorage.getItem('agent-system-settings');
    console.log('💾 localStorage data:', localStorageData ? JSON.parse(localStorageData) : 'None');
  };

  (window as any).testPersistence = () => {
    console.log('🧪 Testing persistence...');
    
    // Set a distinctive prompt
    agentPromptManager.updateAgentPrompt('agent_alpha', 'system_prompt', {
      prompt: 'You are Alpha, a persistence test assistant. This should survive refresh!'
    });
    
    console.log('✅ Set test prompt');
    console.log('🔄 Now refresh the page and check if the prompt persists');
    console.log('📝 You can also check localStorage:', localStorage.getItem('agent-system-settings'));
  };
  
  console.log('🔄 Global functions available:');
  console.log('  - resetAllAgentPrompts() - Reset all agents to vanilla prompts');
  console.log('  - resetAgentPrompts("agent_alpha") - Reset specific agent');
  console.log('  - testAgentPrompts() - Test current prompts');
  console.log('  - setCustomPrompt("agent_alpha", "Your custom prompt") - Set custom prompt');
  console.log('  - testPromptSaving() - Test prompt saving functionality');
  console.log('  - testPersistence() - Test persistence across page refresh');
} 