import { writable } from 'svelte/store';
import { settingsManager } from './SettingsManager';

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
        const defaultPrompts: Record<string, AgentPrompts> = {
            'agent_alpha': {
                agentId: 'agent_alpha',
                defaultSystemPrompt: `You are Alpha, an analytical AI agent specialized in data analysis and logical reasoning. You excel at breaking down complex problems and providing structured solutions.`,
                defaultBehaviorPrompt: `Always approach problems methodically. Ask clarifying questions when needed. Provide detailed explanations for your reasoning.`,
                prompts: [
                    {
                        id: 'system_prompt',
                        name: 'System Prompt',
                        description: 'Core identity and capabilities',
                        prompt: `You are Alpha, an analytical AI agent specialized in data analysis and logical reasoning. You excel at breaking down complex problems and providing structured solutions.`,
                        category: 'system',
                        isEnabled: true
                    },
                    {
                        id: 'behavior_prompt',
                        name: 'Behavior Prompt',
                        description: 'How to approach tasks and interact',
                        prompt: `Always approach problems methodically. Ask clarifying questions when needed. Provide detailed explanations for your reasoning.`,
                        category: 'behavior',
                        isEnabled: true
                    },

                ]
            },
            'agent_beta': {
                agentId: 'agent_beta',
                defaultSystemPrompt: `You are Beta, a creative AI agent specialized in innovative solutions and out-of-the-box thinking. You excel at finding unique approaches to problems.`,
                defaultBehaviorPrompt: `Think creatively and explore unconventional solutions. Don't be afraid to suggest bold ideas. Balance creativity with practicality.`,
                prompts: [
                    {
                        id: 'system_prompt',
                        name: 'System Prompt',
                        description: 'Core identity and capabilities',
                        prompt: `You are Beta, a creative AI agent specialized in innovative solutions and out-of-the-box thinking. You excel at finding unique approaches to problems.`,
                        category: 'system',
                        isEnabled: true
                    },
                    {
                        id: 'behavior_prompt',
                        name: 'Behavior Prompt',
                        description: 'How to approach tasks and interact',
                        prompt: `Think creatively and explore unconventional solutions. Don't be afraid to suggest bold ideas. Balance creativity with practicality.`,
                        category: 'behavior',
                        isEnabled: true
                    },

                ]
            },
            'agent_gamma': {
                agentId: 'agent_gamma',
                defaultSystemPrompt: `You are Gamma, a collaborative AI agent specialized in teamwork and coordination. You excel at facilitating group discussions and synthesizing input from multiple sources.`,
                defaultBehaviorPrompt: `Foster collaboration and encourage participation from all team members. Summarize discussions and identify action items.`,
                prompts: [
                    {
                        id: 'system_prompt',
                        name: 'System Prompt',
                        description: 'Core identity and capabilities',
                        prompt: `You are Gamma, a collaborative AI agent specialized in teamwork and coordination. You excel at facilitating group discussions and synthesizing input from multiple sources.`,
                        category: 'system',
                        isEnabled: true
                    },
                    {
                        id: 'behavior_prompt',
                        name: 'Behavior Prompt',
                        description: 'How to approach tasks and interact',
                        prompt: `Foster collaboration and encourage participation from all team members. Summarize discussions and identify action items.`,
                        category: 'behavior',
                        isEnabled: true
                    },

                ]
            }
        };
        
        this.store.set(defaultPrompts);
    }
    
    private loadPersistedPrompts() {
        // Load any persisted prompts from settings
        let currentValue: Record<string, AgentPrompts> = {};
        this.store.subscribe(value => currentValue = value)();
        
        Object.keys(currentValue).forEach(agentId => {
            const persistedPrompts = settingsManager.getAgentPrompts(agentId);
            if (persistedPrompts) {
                this.store.update(current => ({
                    ...current,
                    [agentId]: {
                        ...current[agentId],
                        prompts: persistedPrompts.prompts || current[agentId].prompts
                    }
                }));
            }
        });
    }
    
    getAgentPrompts(agentId: string): AgentPrompts | null {
        let currentValue: Record<string, AgentPrompts> = {};
        this.store.subscribe(value => currentValue = value)();
        return currentValue[agentId] || null;
    }
    
    updateAgentPrompt(agentId: string, promptId: string, updates: Partial<AgentPrompt>) {
        this.store.update(current => {
            const agentPrompts = current[agentId];
            if (!agentPrompts) return current;
            
            const updatedPrompts = agentPrompts.prompts.map(prompt => 
                prompt.id === promptId ? { ...prompt, ...updates } : prompt
            );
            
            const updatedAgentPrompts = {
                ...agentPrompts,
                prompts: updatedPrompts
            };
            
            // Persist to settings
            settingsManager.saveAgentPrompts(agentId, updatedAgentPrompts);
            
            return {
                ...current,
                [agentId]: updatedAgentPrompts
            };
        });
    }
    
    addAgentPrompt(agentId: string, prompt: Omit<AgentPrompt, 'id'>) {
        const newPrompt: AgentPrompt = {
            ...prompt,
            id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        this.store.update(current => {
            const agentPrompts = current[agentId];
            if (!agentPrompts) return current;
            
            const updatedAgentPrompts = {
                ...agentPrompts,
                prompts: [...agentPrompts.prompts, newPrompt]
            };
            
            // Persist to settings
            settingsManager.saveAgentPrompts(agentId, updatedAgentPrompts);
            
            return {
                ...current,
                [agentId]: updatedAgentPrompts
            };
        });
    }
    
    removeAgentPrompt(agentId: string, promptId: string) {
        this.store.update(current => {
            const agentPrompts = current[agentId];
            if (!agentPrompts) return current;
            
            const updatedAgentPrompts = {
                ...agentPrompts,
                prompts: agentPrompts.prompts.filter(p => p.id !== promptId)
            };
            
            // Persist to settings
            settingsManager.saveAgentPrompts(agentId, updatedAgentPrompts);
            
            return {
                ...current,
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
        const activePrompts = this.getActivePrompts(agentId);
        return activePrompts.join('\n\n');
    }
    
    // Export/Import for persistence
    exportData(): Record<string, AgentPrompts> {
        let currentValue: Record<string, AgentPrompts> = {};
        this.store.subscribe(value => currentValue = value)();
        return currentValue;
    }
    
    importData(data: Record<string, AgentPrompts>) {
        this.store.set(data);
    }
}

export const agentPromptManager = new AgentPromptManager();
export const agentPrompts = agentPromptManager.store; 