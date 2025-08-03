import { writable, type Writable } from 'svelte/store';

export interface Ability {
	id: string;
	name: string;
	description: string;
	category: string;
	execute: (agentId: string, params?: any) => Promise<any>;
	canExecute: (agentId: string, params?: any) => boolean;
}

export interface AgentAbilities {
	agentId: string;
	abilities: Set<string>;
	stats: Record<string, number>;
	features: Set<string>;
}

class AbilityManager {
	private agentAbilities: Writable<Record<string, AgentAbilities>>;
	private abilities: Map<string, Ability> = new Map();
	
	constructor() {
		this.agentAbilities = writable({});
		this.registerDefaultAbilities();
	}
	
	// Get the abilities store
	get store() {
		return this.agentAbilities;
	}
	
	// Register a new ability
	registerAbility(ability: Ability): void {
		this.abilities.set(ability.id, ability);
	}
	
	// Get an ability by ID
	getAbility(abilityId: string): Ability | undefined {
		return this.abilities.get(abilityId);
	}
	
	// Get all registered abilities
	getAllAbilities(): Ability[] {
		return Array.from(this.abilities.values());
	}
	
	// Check if agent has ability
	hasAbility(agentId: string, abilityId: string): boolean {
		console.log(`🔍 AbilityManager: Checking if agent ${agentId} has ability ${abilityId}`);
		const agentData = this.getAgentAbilities(agentId);
		console.log(`🔍 AbilityManager: Agent ${agentId} has ability ${abilityId}:`, agentData.abilities.has(abilityId));
		return agentData.abilities.has(abilityId);
	}
	
	// Grant ability to agent
	grantAbility(agentId: string, abilityId: string): void {
		console.log(`🔍 AbilityManager: Granting ${abilityId} to agent ${agentId}`);
		this.agentAbilities.update(agents => {
			if (!agents[agentId]) {
				console.log(`🔍 AbilityManager: Creating new agent entry for ${agentId}`);
				agents[agentId] = {
					agentId,
					abilities: new Set(),
					stats: {},
					features: new Set()
				};
			}
			agents[agentId].abilities.add(abilityId);
			console.log(`🔍 AbilityManager: Added ${abilityId} to agent ${agentId}`);
			console.log(`🔍 AbilityManager: Agent ${agentId} now has abilities:`, Array.from(agents[agentId].abilities));
			return agents;
		});
	}
	
	// Remove ability from agent
	removeAbility(agentId: string, abilityId: string): void {
		this.agentAbilities.update(agents => {
			if (agents[agentId]) {
				agents[agentId].abilities.delete(abilityId);
			}
			return agents;
		});
	}
	
	// Get all abilities for an agent
	getAgentAbilities(agentId: string): AgentAbilities {
		let agents: Record<string, AgentAbilities>;
		this.agentAbilities.subscribe(value => agents = value)();
		
		if (!agents![agentId]) {
			agents![agentId] = {
				agentId,
				abilities: new Set(),
				stats: {},
				features: new Set()
			};
		}
		
		return agents![agentId];
	}
	
	// Execute an ability
	async executeAbility(agentId: string, abilityId: string, params?: any): Promise<any> {
		if (!this.hasAbility(agentId, abilityId)) {
			throw new Error(`Agent ${agentId} does not have ability ${abilityId}`);
		}
		
		const ability = this.getAbility(abilityId);
		if (!ability) {
			throw new Error(`Ability ${abilityId} not found`);
		}
		
		if (!ability.canExecute(agentId, params)) {
			throw new Error(`Agent ${agentId} cannot execute ability ${abilityId}`);
		}
		
		return await ability.execute(agentId, params);
	}
	
	// Check if agent can execute ability
	canExecuteAbility(agentId: string, abilityId: string, params?: any): boolean {
		if (!this.hasAbility(agentId, abilityId)) {
			return false;
		}
		
		const ability = this.getAbility(abilityId);
		if (!ability) {
			return false;
		}
		
		return ability.canExecute(agentId, params);
	}
	
	// Update agent stats
	updateAgentStat(agentId: string, stat: string, value: number): void {
		this.agentAbilities.update(agents => {
			if (!agents[agentId]) {
				agents[agentId] = {
					agentId,
					abilities: new Set(),
					stats: {},
					features: new Set()
				};
			}
			agents[agentId].stats[stat] = value;
			return agents;
		});
	}
	
	// Get agent stat
	getAgentStat(agentId: string, stat: string): number {
		const agentData = this.getAgentAbilities(agentId);
		return agentData.stats[stat] || 0;
	}
	
	// Grant feature to agent
	grantFeature(agentId: string, feature: string): void {
		this.agentAbilities.update(agents => {
			if (!agents[agentId]) {
				agents[agentId] = {
					agentId,
					abilities: new Set(),
					stats: {},
					features: new Set()
				};
			}
			agents[agentId].features.add(feature);
			return agents;
		});
	}
	
	// Check if agent has feature
	hasFeature(agentId: string, feature: string): boolean {
		const agentData = this.getAgentAbilities(agentId);
		return agentData.features.has(feature);
	}
	
	// Get all features for agent
	getAgentFeatures(agentId: string): string[] {
		const agentData = this.getAgentAbilities(agentId);
		return Array.from(agentData.features);
	}
	
	// Reset agent abilities
	resetAgent(agentId: string): void {
		this.agentAbilities.update(agents => {
			delete agents[agentId];
			return agents;
		});
	}
	
	// Get all agents with abilities
	getAllAgents(): string[] {
		let agents: Record<string, AgentAbilities>;
		this.agentAbilities.subscribe(value => agents = value)();
		return Object.keys(agents!);
	}
	
	// Export abilities data
	exportData(): string {
		let agents: Record<string, AgentAbilities>;
		this.agentAbilities.subscribe(value => agents = value)();
		
		const exportData: Record<string, any> = {};
		Object.keys(agents!).forEach(agentId => {
			const agent = agents![agentId];
			exportData[agentId] = {
				agentId: agent.agentId,
				abilities: Array.from(agent.abilities),
				stats: agent.stats,
				features: Array.from(agent.features)
			};
		});
		
		return JSON.stringify(exportData, null, 2);
	}
	
	// Import abilities data
	importData(data: string): boolean {
		try {
			const imported = JSON.parse(data);
			
			this.agentAbilities.update(agents => {
				Object.keys(imported).forEach(agentId => {
					const agentData = imported[agentId];
					agents[agentId] = {
						agentId: agentData.agentId,
						abilities: new Set(agentData.abilities),
						stats: agentData.stats,
						features: new Set(agentData.features)
					};
				});
				return agents;
			});
			
			return true;
		} catch (error) {
			console.error('Failed to import abilities data:', error);
			return false;
		}
	}
	
	// Register default abilities
	private registerDefaultAbilities(): void {
		// Import and register abilities
		import('./abilities').then(({ 
			simpleFileReaderAbility, 
			simpleFileWriterAbility,
			simpleTerminalAbility,
			terminalSkill,
			workspaceDirectoryAbility,
			webSearchAbility,
			multiAgentChatAbility
		}) => {
			this.registerAbility(simpleFileReaderAbility);
			this.registerAbility(simpleFileWriterAbility);
			this.registerAbility(simpleTerminalAbility);
			this.registerAbility(terminalSkill);
			this.registerAbility(workspaceDirectoryAbility);
			this.registerAbility(webSearchAbility);
			this.registerAbility(multiAgentChatAbility);
			console.log('✅ Registered all abilities: file operations, terminal skills, workspace, web search, communication');
		}).catch(error => {
			console.error('❌ Failed to register abilities:', error);
		});
	}
}

// Create singleton instance
export const abilityManager = new AbilityManager();

// Export the store for Svelte components
export const agentAbilities = abilityManager.store; 