import { writable, type Writable } from 'svelte/store';

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
	}
	
	disableSkill(agentId: string, skillId: string): void {
		this.settings.update(settings => {
			const enabledSkills = { ...settings.enabledSkills };
			if (enabledSkills[agentId]) {
				enabledSkills[agentId] = enabledSkills[agentId].filter(id => id !== skillId);
			}
			return { ...settings, enabledSkills };
		});
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
	
	// Clear all settings (reset to defaults)
	clear(): void {
		const defaultSettings: SettingsData = {
			enabledSkills: {},
			ownedSkills: {},
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