import { writable, type Writable } from 'svelte/store';
import { abilityManager } from '../core/AbilityManager';

export interface SettingsData {
	// Skills settings
	enabledSkills: Record<string, string[]>; // agentId -> array of enabled skill IDs
	ownedSkills: Record<string, string[]>; // agentId -> array of owned skill IDs
	
	// Agent prompts
	agentPrompts?: Record<string, any>; // agentId -> prompt configuration
	
	// Agent basic info
	agentBasicInfo?: Record<string, any>; // agentId -> basic info (name, specialization, etc.)
	
	// Skill configurations
	skillConfigs?: Record<string, any>; // skillKey -> skill configuration
	
	// LLM Model settings
	llmSettings?: {
		provider: 'ollama' | 'openai' | 'google' | 'anthropic';
		endpoints: {
			ollama?: string;
			openai?: string;
			google?: string;
			anthropic?: string;
		};
		apiKeys: {
			openai?: string;
			google?: string;
			anthropic?: string;
		};
		models: {
			ollama?: string;
			openai?: string;
			google?: string;
			anthropic?: string;
		};
		timeout?: number;
		maxTokens?: number;
		temperature?: number;
	};
	
	// Future settings can be added here
	uiPreferences?: {
		theme?: 'dark' | 'light';
		sidebarCollapsed?: boolean;
		animationsEnabled?: boolean;
	};
	
	simulationSettings?: {
		autoSave?: boolean;
		saveInterval?: number;
		maxAgents?: number;
	};
	
	[key: string]: any; // Allow for future extensibility
}

class SettingsManager {
	private settings: Writable<SettingsData>;
	private storageKey = 'agent-system-settings';
	
	constructor() {
		// Initialize with default settings
		const defaultSettings: SettingsData = {
			enabledSkills: {},
			ownedSkills: {},
			llmSettings: {
				provider: 'ollama',
				endpoints: {
					ollama: 'http://localhost:11434',
					openai: 'https://api.openai.com/v1',
					google: 'https://generativelanguage.googleapis.com',
					anthropic: 'https://api.anthropic.com'
				},
				apiKeys: {
					openai: '',
					google: '',
					anthropic: ''
				},
				models: {
					ollama: 'gemma3:latest',
					openai: 'gpt-4',
					google: 'gemini-pro',
					anthropic: 'claude-3-sonnet-20240229'
				},
				timeout: 30000,
				maxTokens: 4096,
				temperature: 0.7
			},
			uiPreferences: {
				theme: 'dark',
				sidebarCollapsed: false,
				animationsEnabled: true
			},
			simulationSettings: {
				autoSave: true,
				saveInterval: 30000, // 30 seconds
				maxAgents: 10
			}
		};
		
		// Load from localStorage or use defaults
		this.settings = writable(this.loadSettings() || defaultSettings);
		
		// Auto-save when settings change
		this.settings.subscribe(settings => {
			this.saveSettings(settings);
		});
		
		// Sync enabled skills with abilities after initialization
		setTimeout(() => {
			this.syncEnabledSkillsWithAbilities();
		}, 200);
	}
	
	// Get the settings store
	get store() {
		return this.settings;
	}
	
	// Get current settings value safely
	private getCurrentSettings(): SettingsData {
		let value: SettingsData;
		this.settings.subscribe(s => value = s)();
		return value!;
	}
	
	// Load settings from localStorage
	private loadSettings(): SettingsData | null {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) return null;
			
			const parsed = JSON.parse(stored);
			return parsed as SettingsData;
		} catch (error) {
			console.error('Failed to load settings:', error);
			return null;
		}
	}
	
	// Save settings to localStorage
	private saveSettings(settings: SettingsData): void {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(settings));
		} catch (error) {
			console.error('Failed to save settings:', error);
		}
	}
	
	// Update settings
	update(updater: (settings: SettingsData) => SettingsData): void {
		this.settings.update(updater);
	}
	
	// Set a specific setting
	set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
		this.settings.update(settings => ({
			...settings,
			[key]: value
		}));
	}
	
	// Get a specific setting
	get<K extends keyof SettingsData>(key: K): SettingsData[K] {
		return this.getCurrentSettings()[key];
	}
	
	// Skills-specific methods
	enableSkill(agentId: string, skillId: string): void {
		this.settings.update(settings => {
			const enabledSkills = { ...settings.enabledSkills };
			if (!enabledSkills[agentId]) {
				enabledSkills[agentId] = [];
			}
			if (!enabledSkills[agentId].includes(skillId)) {
				enabledSkills[agentId].push(skillId);
			}
			return { ...settings, enabledSkills };
		});
		
		// Grant corresponding ability to the agent
		this.grantAbilityForSkill(agentId, skillId);
	}
	
	disableSkill(agentId: string, skillId: string): void {
		this.settings.update(settings => {
			const enabledSkills = { ...settings.enabledSkills };
			if (enabledSkills[agentId]) {
				enabledSkills[agentId] = enabledSkills[agentId].filter(id => id !== skillId);
			}
			return { ...settings, enabledSkills };
		});
		
		// Revoke corresponding ability from the agent
		this.revokeAbilityForSkill(agentId, skillId);
	}
	
	toggleSkill(agentId: string, skillId: string): void {
		const settings = this.getCurrentSettings();
		const enabledSkills = settings.enabledSkills;
		const isEnabled = enabledSkills[agentId]?.includes(skillId) || false;
		
		if (isEnabled) {
			this.disableSkill(agentId, skillId);
		} else {
			this.enableSkill(agentId, skillId);
		}
	}
	
	isSkillEnabled(agentId: string, skillId: string): boolean {
		const settings = this.getCurrentSettings();
		const enabledSkills = settings.enabledSkills;
		return enabledSkills[agentId]?.includes(skillId) || false;
	}
	
	ownSkill(agentId: string, skillId: string): void {
		this.settings.update(settings => {
			const ownedSkills = { ...settings.ownedSkills };
			if (!ownedSkills[agentId]) {
				ownedSkills[agentId] = [];
			}
			if (!ownedSkills[agentId].includes(skillId)) {
				ownedSkills[agentId].push(skillId);
			}
			return { ...settings, ownedSkills };
		});
	}
	
	isSkillOwned(agentId: string, skillId: string): boolean {
		const settings = this.getCurrentSettings();
		const ownedSkills = settings.ownedSkills;
		return ownedSkills[agentId]?.includes(skillId) || false;
	}
	
	// Get all enabled skills for an agent
	getEnabledSkills(agentId: string): string[] {
		const settings = this.getCurrentSettings();
		return settings.enabledSkills[agentId] || [];
	}
	
	// Get all owned skills for an agent
	getOwnedSkills(agentId: string): string[] {
		const settings = this.getCurrentSettings();
		return settings.ownedSkills[agentId] || [];
	}

	// Grant ability based on skill ID
	private grantAbilityForSkill(agentId: string, skillId: string): void {
		// Map skill IDs to ability IDs
		const skillToAbilityMap: Record<string, string> = {
			'file_read': 'read_files',
			'file_write': 'write_files',
			// Add more mappings as needed
		};

		const abilityId = skillToAbilityMap[skillId];
		if (abilityId) {
			console.log(`🔧 Granting ability ${abilityId} to agent ${agentId} for skill ${skillId}`);
			abilityManager.grantAbility(agentId, abilityId);
			
			// Verify the ability was granted
			const hasAbility = abilityManager.hasAbility(agentId, abilityId);
			console.log(`🔍 Ability ${abilityId} granted to ${agentId}: ${hasAbility}`);
		} else {
			console.log(`⚠️ No ability mapping found for skill ${skillId}`);
		}
	}

	// Revoke ability based on skill ID
	private revokeAbilityForSkill(agentId: string, skillId: string): void {
		// Map skill IDs to ability IDs
		const skillToAbilityMap: Record<string, string> = {
			'file_read': 'read_files',
			'file_write': 'write_files',
			// Add more mappings as needed
		};

		const abilityId = skillToAbilityMap[skillId];
		if (abilityId) {
			console.log(`🔧 Revoking ability ${abilityId} from agent ${agentId} for skill ${skillId}`);
			abilityManager.removeAbility(agentId, abilityId);
			
			// Verify the ability was revoked
			const hasAbility = abilityManager.hasAbility(agentId, abilityId);
			console.log(`🔍 Ability ${abilityId} revoked from ${agentId}: ${!hasAbility}`);
		} else {
			console.log(`⚠️ No ability mapping found for skill ${skillId}`);
		}
	}

	// Sync all enabled skills with abilities
	syncEnabledSkillsWithAbilities(): void {
		const settings = this.getCurrentSettings();
		
		Object.entries(settings.enabledSkills).forEach(([agentId, enabledSkills]) => {
			enabledSkills.forEach(skillId => {
				this.grantAbilityForSkill(agentId, skillId);
			});
		});
		
		console.log('🔄 Synced all enabled skills with abilities');
	}
	
	// Agent prompt methods
	saveAgentPrompts(agentId: string, prompts: any): void {
		console.log(`💾 Saving agent prompts for ${agentId}:`, prompts);
		this.settings.update(settings => ({
			...settings,
			agentPrompts: {
				...settings.agentPrompts,
				[agentId]: prompts
			}
		}));
		console.log(`✅ Agent prompts saved for ${agentId}`);
	}
	
	getAgentPrompts(agentId: string): any {
		const settings = this.getCurrentSettings();
		return settings.agentPrompts?.[agentId] || null;
	}
	
	// Skill configuration methods
	saveSkillConfig(skillKey: string, config: any): void {
		this.settings.update(settings => ({
			...settings,
			skillConfigs: {
				...settings.skillConfigs,
				[skillKey]: config
			}
		}));
	}
	
	getSkillConfig(skillKey: string): any {
		const settings = this.getCurrentSettings();
		return settings.skillConfigs?.[skillKey] || null;
	}
	
	// Agent basic info methods
	saveAgentBasicInfo(agentId: string, basicInfo: any): void {
		this.settings.update(settings => ({
			...settings,
			agentBasicInfo: {
				...settings.agentBasicInfo,
				[agentId]: basicInfo
			}
		}));
	}
	
	getAgentBasicInfo(agentId: string): any {
		const settings = this.getCurrentSettings();
		return settings.agentBasicInfo?.[agentId] || null;
	}
	
	// LLM Settings methods
	getLLMSettings(): any {
		const settings = this.getCurrentSettings();
		return settings.llmSettings || null;
	}
	
	updateLLMSettings(llmSettings: any): void {
		this.settings.update(settings => ({
			...settings,
			llmSettings: { ...settings.llmSettings, ...llmSettings }
		}));
	}
	
	setLLMProvider(provider: 'ollama' | 'openai' | 'google' | 'anthropic'): void {
		this.settings.update(settings => ({
			...settings,
			    llmSettings: { ...settings.llmSettings!, provider }
		}));
	}
	
	setLLMEndpoint(provider: string, endpoint: string): void {
		this.settings.update(settings => ({
			...settings,
			llmSettings: {
				provider: settings.llmSettings?.provider || 'ollama',
				endpoints: { ...settings.llmSettings?.endpoints, [provider]: endpoint },
				apiKeys: settings.llmSettings?.apiKeys || {},
				models: settings.llmSettings?.models || {},
				timeout: settings.llmSettings?.timeout,
				maxTokens: settings.llmSettings?.maxTokens,
				temperature: settings.llmSettings?.temperature
			}
		}));
	}
	
	setLLMApiKey(provider: string, apiKey: string): void {
		this.settings.update(settings => ({
			...settings,
			llmSettings: {
				provider: settings.llmSettings?.provider || 'ollama',
				endpoints: settings.llmSettings?.endpoints || {},
				apiKeys: { ...settings.llmSettings?.apiKeys, [provider]: apiKey },
				models: settings.llmSettings?.models || {},
				timeout: settings.llmSettings?.timeout,
				maxTokens: settings.llmSettings?.maxTokens,
				temperature: settings.llmSettings?.temperature
			}
		}));
	}
	
	setLLMModel(provider: string, model: string): void {
		this.settings.update(settings => ({
			...settings,
			llmSettings: {
				provider: settings.llmSettings?.provider || 'ollama',
				endpoints: settings.llmSettings?.endpoints || {},
				apiKeys: settings.llmSettings?.apiKeys || {},
				models: { ...settings.llmSettings?.models, [provider]: model },
				timeout: settings.llmSettings?.timeout,
				maxTokens: settings.llmSettings?.maxTokens,
				temperature: settings.llmSettings?.temperature
			}
		}));
	}
	
	// Test LLM endpoint
	async testLLMEndpoint(provider: string): Promise<{ success: boolean; message: string; data?: any }> {
		const settings = this.getCurrentSettings();
		const llmSettings = settings.llmSettings;
		
		if (!llmSettings) {
			return { success: false, message: 'LLM settings not configured' };
		}
		
		try {
			const endpoint = llmSettings.endpoints?.[provider as keyof typeof llmSettings.endpoints];
			const apiKey = llmSettings.apiKeys?.[provider as keyof typeof llmSettings.apiKeys];
			const model = llmSettings.models?.[provider as keyof typeof llmSettings.models];
			
			if (!endpoint) {
				return { success: false, message: `No endpoint configured for ${provider}` };
			}
			
			// Test based on provider
			switch (provider) {
				case 'ollama':
					return await this.testOllamaEndpoint(endpoint, model);
				case 'openai':
					return await this.testOpenAIEndpoint(endpoint, apiKey, model);
				case 'google':
					return await this.testGoogleEndpoint(endpoint, apiKey, model);
				case 'anthropic':
					return await this.testAnthropicEndpoint(endpoint, apiKey, model);
				default:
					return { success: false, message: `Unknown provider: ${provider}` };
			}
		} catch (error) {
			return { 
				success: false, 
				message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
			};
		}
	}
	
	private async testOllamaEndpoint(endpoint: string, model?: string): Promise<{ success: boolean; message: string; data?: any }> {
		try {
			const response = await fetch(`${endpoint}/api/tags`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const data = await response.json();
			return { 
				success: true, 
				message: 'Ollama endpoint is accessible', 
				data: { models: data.models || [] }
			};
		} catch (error) {
			return { 
				success: false, 
				message: `Ollama test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
			};
		}
	}
	
	private async testOpenAIEndpoint(endpoint: string, apiKey?: string, model?: string): Promise<{ success: boolean; message: string; data?: any }> {
		if (!apiKey) {
			return { success: false, message: 'OpenAI API key is required' };
		}
		
		try {
			const response = await fetch(`${endpoint}/models`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				}
			});
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const data = await response.json();
			return { 
				success: true, 
				message: 'OpenAI endpoint is accessible', 
				data: { models: data.data || [] }
			};
		} catch (error) {
			return { 
				success: false, 
				message: `OpenAI test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
			};
		}
	}
	
	private async testGoogleEndpoint(endpoint: string, apiKey?: string, model?: string): Promise<{ success: boolean; message: string; data?: any }> {
		if (!apiKey) {
			return { success: false, message: 'Google API key is required' };
		}
		
		try {
			const response = await fetch(`${endpoint}/v1beta/models`, {
				method: 'GET',
				headers: {
					'x-goog-api-key': apiKey,
					'Content-Type': 'application/json'
				}
			});
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const data = await response.json();
			return { 
				success: true, 
				message: 'Google endpoint is accessible', 
				data: { models: data.models || [] }
			};
		} catch (error) {
			return { 
				success: false, 
				message: `Google test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
			};
		}
	}
	
	private async testAnthropicEndpoint(endpoint: string, apiKey?: string, model?: string): Promise<{ success: boolean; message: string; data?: any }> {
		if (!apiKey) {
			return { success: false, message: 'Anthropic API key is required' };
		}
		
		try {
			const response = await fetch(`${endpoint}/v1/messages`, {
				method: 'POST',
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: model || 'claude-3-sonnet-20240229',
					max_tokens: 10,
					messages: [{ role: 'user', content: 'Hello' }]
				})
			});
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			return { 
				success: true, 
				message: 'Anthropic endpoint is accessible'
			};
		} catch (error) {
			return { 
				success: false, 
				message: `Anthropic test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
			};
		}
	}
	
	// Clear all settings (reset to defaults)
	clear(): void {
		const defaultSettings: SettingsData = {
			enabledSkills: {},
			ownedSkills: {},
			llmSettings: {
				provider: 'ollama',
				endpoints: {
					ollama: 'http://localhost:11434',
					openai: 'https://api.openai.com/v1',
					google: 'https://generativelanguage.googleapis.com',
					anthropic: 'https://api.anthropic.com'
				},
				apiKeys: {
					openai: '',
					google: '',
					anthropic: ''
				},
				models: {
					ollama: 'gemma3:latest',
					openai: 'gpt-4',
					google: 'gemini-pro',
					anthropic: 'claude-3-sonnet-20240229'
				},
				timeout: 30000,
				maxTokens: 4096,
				temperature: 0.7
			},
			uiPreferences: {
				theme: 'dark',
				sidebarCollapsed: false,
				animationsEnabled: true
			},
			simulationSettings: {
				autoSave: true,
				saveInterval: 30000,
				maxAgents: 10
			}
		};
		
		this.settings.set(defaultSettings);
		localStorage.removeItem(this.storageKey);
	}
	
	// Export settings (for backup)
	export(): string {
		return JSON.stringify(this.getCurrentSettings(), null, 2);
	}
	
	// Import settings (from backup)
	import(settingsJson: string): boolean {
		try {
			const imported = JSON.parse(settingsJson);
			this.settings.set(imported as SettingsData);
			return true;
		} catch (error) {
			console.error('Failed to import settings:', error);
			return false;
		}
	}
}

// Create singleton instance
export const settingsManager = new SettingsManager();

// Export the store for Svelte components
export const settings = settingsManager.store; 