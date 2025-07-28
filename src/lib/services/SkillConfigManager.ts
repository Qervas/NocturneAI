import { writable } from 'svelte/store';
import { settingsManager } from './SettingsManager';

export interface SkillConfig {
    id: string;
    name: string;
    description: string;
    category: string;
    configType: 'prompt' | 'parameters' | 'behavior';
    value: string | Record<string, any>;
    isEnabled: boolean;
}

export interface SkillConfiguration {
    skillId: string;
    agentId: string;
    configs: SkillConfig[];
}

class SkillConfigManager {
    public store = writable<Record<string, SkillConfiguration>>({});
    
    constructor() {
        this.initializeDefaultConfigs();
    }
    
    private initializeDefaultConfigs() {
        const defaultConfigs: Record<string, SkillConfiguration> = {
            'read_files_global': {
                skillId: 'read_files',
                agentId: 'global',
                configs: [
                    {
                        id: 'file_analysis_prompt',
                        name: 'File Analysis Prompt',
                        description: 'How to analyze and process files',
                        category: 'prompt',
                        configType: 'prompt',
                        value: `When analyzing files, examine the structure, content, and purpose. Look for patterns, dependencies, and potential issues. Provide actionable insights.`,
                        isEnabled: true
                    },
                    {
                        id: 'file_extensions',
                        name: 'Supported Extensions',
                        description: 'File types this skill can handle',
                        category: 'parameters',
                        configType: 'parameters',
                        value: { extensions: ['.txt', '.md', '.py', '.js', '.json', '.csv', '.xml'] },
                        isEnabled: true
                    }
                ]
            },
            'write_files_global': {
                skillId: 'write_files',
                agentId: 'global',
                configs: [
                    {
                        id: 'file_writing_prompt',
                        name: 'File Writing Prompt',
                        description: 'How to write and structure files',
                        category: 'prompt',
                        configType: 'prompt',
                        value: `When writing files, ensure proper formatting and structure. Use clear, readable code or text. Include appropriate headers and comments.`,
                        isEnabled: true
                    },
                    {
                        id: 'backup_enabled',
                        name: 'Auto Backup',
                        description: 'Create backup before overwriting',
                        category: 'behavior',
                        configType: 'behavior',
                        value: { enabled: true },
                        isEnabled: true
                    }
                ]
            },
            'web_search_global': {
                skillId: 'web_search',
                agentId: 'global',
                configs: [
                    {
                        id: 'search_prompt',
                        name: 'Search Strategy',
                        description: 'How to conduct web searches',
                        category: 'prompt',
                        configType: 'prompt',
                        value: `When searching the web, be specific and targeted. Focus on authoritative sources. Synthesize information from multiple sources when possible.`,
                        isEnabled: true
                    },
                    {
                        id: 'search_engines',
                        name: 'Search Engines',
                        description: 'Preferred search engines',
                        category: 'parameters',
                        configType: 'parameters',
                        value: { engines: ['google', 'bing', 'duckduckgo'] },
                        isEnabled: true
                    }
                ]
            },
            'group_chat_global': {
                skillId: 'group_chat',
                agentId: 'global',
                configs: [
                    {
                        id: 'collaboration_prompt',
                        name: 'Collaboration Style',
                        description: 'How to work with other agents',
                        category: 'prompt',
                        configType: 'prompt',
                        value: `When working with other agents, acknowledge their contributions and build upon their ideas. Facilitate communication and ensure everyone is heard.`,
                        isEnabled: true
                    },
                    {
                        id: 'response_style',
                        name: 'Response Style',
                        description: 'How to format responses in group chat',
                        category: 'behavior',
                        configType: 'behavior',
                        value: { style: 'concise', includeContext: true },
                        isEnabled: true
                    }
                ]
            }
        };
        
        this.store.set(defaultConfigs);
    }
    
    getSkillConfig(skillId: string, agentId: string): SkillConfiguration | null {
        let currentValue: Record<string, SkillConfiguration> = {};
        this.store.subscribe(value => currentValue = value)();
        
        const key = `${skillId}_${agentId}`;
        return currentValue[key] || null;
    }
    
    updateSkillConfig(skillId: string, agentId: string, configId: string, updates: Partial<SkillConfig>) {
        const key = `${skillId}_${agentId}`;
        
        this.store.update(current => {
            const skillConfig = current[key];
            if (!skillConfig) return current;
            
            const updatedConfigs = skillConfig.configs.map(config => 
                config.id === configId ? { ...config, ...updates } : config
            );
            
            const updatedSkillConfig = {
                ...skillConfig,
                configs: updatedConfigs
            };
            
            // Persist to settings
            settingsManager.saveSkillConfig(key, updatedSkillConfig);
            
            return {
                ...current,
                [key]: updatedSkillConfig
            };
        });
    }
    
    getConfigValue(skillId: string, agentId: string, configId: string): any {
        const skillConfig = this.getSkillConfig(skillId, agentId);
        if (!skillConfig) return null;
        
        const config = skillConfig.configs.find(c => c.id === configId);
        return config?.value || null;
    }
    
    isConfigEnabled(skillId: string, agentId: string, configId: string): boolean {
        const skillConfig = this.getSkillConfig(skillId, agentId);
        if (!skillConfig) return false;
        
        const config = skillConfig.configs.find(c => c.id === configId);
        return config?.isEnabled || false;
    }
    
    // Get all enabled configs for a skill
    getEnabledConfigs(skillId: string, agentId: string): SkillConfig[] {
        const skillConfig = this.getSkillConfig(skillId, agentId);
        if (!skillConfig) return [];
        
        return skillConfig.configs.filter(config => config.isEnabled);
    }
    
    // Get all prompt configs for a skill
    getPromptConfigs(skillId: string, agentId: string): string[] {
        const enabledConfigs = this.getEnabledConfigs(skillId, agentId);
        return enabledConfigs
            .filter(config => config.configType === 'prompt')
            .map(config => config.value as string);
    }
    
    // Export/Import for persistence
    exportData(): Record<string, SkillConfiguration> {
        let currentValue: Record<string, SkillConfiguration> = {};
        this.store.subscribe(value => currentValue = value)();
        return currentValue;
    }
    
    importData(data: Record<string, SkillConfiguration>) {
        this.store.set(data);
    }
}

export const skillConfigManager = new SkillConfigManager();
export const skillConfigs = skillConfigManager.store; 