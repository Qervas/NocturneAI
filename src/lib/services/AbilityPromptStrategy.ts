import { abilityManager } from './AbilityManager';
import type { Ability } from './AbilityManager';

export interface AbilityTrigger {
	abilityId: string;
	keywords: string[];
	patterns: RegExp[];
	priority: number;
	description: string;
	examples: string[];
}

export interface PromptEnhancement {
	originalPrompt: string;
	enhancedPrompt: string;
	abilitiesUsed: string[];
	reasoning: string;
}

export interface TaskAnalysis {
	task: string;
	detectedAbilities: string[];
	confidence: number;
	suggestedActions: string[];
	enhancedPrompt: string;
}

class AbilityPromptStrategy {
	private triggers: Map<string, AbilityTrigger> = new Map();
	
	constructor() {
		this.initializeTriggers();
	}
	
	// Initialize ability triggers
	private initializeTriggers(): void {
		// File Reader triggers
		this.addTrigger({
			abilityId: 'read_files',
			keywords: ['read', 'file', 'content', 'open', 'load', 'access', 'readme', 'document'],
			patterns: [
				/\b(read|open|load|access)\s+(?:the\s+)?(?:file|document|content)\b/i,
				/\b(show|display|get)\s+(?:the\s+)?(?:content|text|data)\s+(?:of|from)\b/i,
				/\b(file|document)\s+(?:named|called|titled)\b/i
			],
			priority: 1,
			description: 'Detect when agent needs to read files',
			examples: [
				'Read the file example.txt',
				'Show me the content of the document',
				'Open the README file',
				'What is in the config.json file?'
			]
		});
		
		// File Writer triggers
		this.addTrigger({
			abilityId: 'write_files',
			keywords: ['write', 'create', 'save', 'generate', 'make', 'build', 'produce', 'output'],
			patterns: [
				/\b(write|create|save|generate)\s+(?:a\s+)?(?:file|document|code|script)\b/i,
				/\b(make|build|produce)\s+(?:a\s+)?(?:new\s+)?(?:file|output)\b/i,
				/\b(save|store)\s+(?:the\s+)?(?:result|output|data)\b/i
			],
			priority: 1,
			description: 'Detect when agent needs to write files',
			examples: [
				'Create a new file called output.txt',
				'Write the code to a file',
				'Generate a report and save it',
				'Make a new document with the results'
			]
		});
		
		// Web Search triggers
		this.addTrigger({
			abilityId: 'web_search',
			keywords: ['search', 'find', 'lookup', 'research', 'information', 'data', 'news', 'latest'],
			patterns: [
				/\b(search|find|lookup)\s+(?:for|about|information\s+on)\b/i,
				/\b(get|find)\s+(?:the\s+)?(?:latest|current|recent)\s+(?:information|news|data)\b/i,
				/\b(research|investigate)\s+(?:about|on)\b/i
			],
			priority: 2,
			description: 'Detect when agent needs to search the web',
			examples: [
				'Search for information about AI',
				'Find the latest news about technology',
				'Look up current market trends',
				'Research the best practices for coding'
			]
		});
		
		// Group Chat triggers
		this.addTrigger({
			abilityId: 'group_chat',
			keywords: ['discuss', 'share', 'tell', 'announce', 'inform', 'notify', 'collaborate', 'team'],
			patterns: [
				/\b(discuss|share|tell)\s+(?:with|to)\s+(?:everyone|team|group)\b/i,
				/\b(announce|inform|notify)\s+(?:the\s+)?(?:team|group|everyone)\b/i,
				/\b(collaborate|work\s+together)\s+(?:on|with)\b/i
			],
			priority: 3,
			description: 'Detect when agent needs to communicate with group',
			examples: [
				'Share this information with the team',
				'Tell everyone about the new findings',
				'Discuss this with the group',
				'Announce the completion of the task'
			]
		});
	}
	
	// Add a new trigger
	addTrigger(trigger: AbilityTrigger): void {
		this.triggers.set(trigger.abilityId, trigger);
	}
	
	// Analyze a task and detect needed abilities
	analyzeTask(task: string, agentId: string): TaskAnalysis {
		const detectedAbilities: string[] = [];
		const suggestedActions: string[] = [];
		let confidence = 0;
		
		// Check each trigger
		for (const [abilityId, trigger] of this.triggers) {
			const score = this.calculateTriggerScore(task, trigger);
			
			if (score > 0.3) { // Threshold for detection
				detectedAbilities.push(abilityId);
				confidence += score;
				
				// Check if agent has this ability
				if (abilityManager.hasAbility(agentId, abilityId)) {
					suggestedActions.push(`Use ${trigger.description}`);
				} else {
					suggestedActions.push(`Need to unlock ${trigger.description}`);
				}
			}
		}
		
		// Normalize confidence
		confidence = Math.min(confidence, 1.0);
		
		// Generate enhanced prompt
		const enhancedPrompt = this.enhancePrompt(task, detectedAbilities, agentId);
		
		return {
			task,
			detectedAbilities,
			confidence,
			suggestedActions,
			enhancedPrompt
		};
	}
	
	// Calculate how well a task matches a trigger
	private calculateTriggerScore(task: string, trigger: AbilityTrigger): number {
		let score = 0;
		const lowerTask = task.toLowerCase();
		
		// Check keywords
		for (const keyword of trigger.keywords) {
			if (lowerTask.includes(keyword.toLowerCase())) {
				score += 0.2;
			}
		}
		
		// Check patterns
		for (const pattern of trigger.patterns) {
			if (pattern.test(task)) {
				score += 0.4;
			}
		}
		
		// Bonus for multiple matches
		if (score > 0.6) {
			score += 0.2;
		}
		
		return Math.min(score, 1.0);
	}
	
	// Enhance a prompt with ability-specific instructions
	enhancePrompt(originalPrompt: string, abilities: string[], agentId: string): string {
		let enhancedPrompt = originalPrompt;
		const abilityInstructions: string[] = [];
		
		for (const abilityId of abilities) {
			const ability = abilityManager.getAbility(abilityId);
			if (ability && abilityManager.hasAbility(agentId, abilityId)) {
				const instruction = this.generateAbilityInstruction(abilityId, originalPrompt);
				if (instruction) {
					abilityInstructions.push(instruction);
				}
			}
		}
		
		if (abilityInstructions.length > 0) {
			enhancedPrompt += '\n\n**Available Abilities:**\n' + abilityInstructions.join('\n');
		}
		
		return enhancedPrompt;
	}
	
	// Generate specific instructions for each ability
	private generateAbilityInstruction(abilityId: string, context: string): string | null {
		switch (abilityId) {
			case 'read_files':
				return `📖 **File Reader**: You can read files from the system. If the task involves reading files, use your file reading ability to access and analyze file content.`;
			
			case 'write_files':
				return `✏️ **File Writer**: You can create and modify files. If the task involves generating content or saving data, use your file writing ability to create appropriate files.`;
			
			case 'web_search':
				return `🔍 **Web Search**: You can search the internet for information. If the task requires current information or research, use your web search ability to find relevant data.`;
			
			case 'group_chat':
				return `👥 **Group Communication**: You can communicate with other agents. If the task involves sharing information or collaboration, use your group chat ability to coordinate with the team.`;
			
			default:
				return null;
		}
	}
	
	// Execute abilities based on task analysis
	async executeTaskAbilities(task: string, agentId: string): Promise<any[]> {
		const analysis = this.analyzeTask(task, agentId);
		const results: any[] = [];
		
		for (const abilityId of analysis.detectedAbilities) {
			if (abilityManager.hasAbility(agentId, abilityId)) {
				try {
					const params = this.extractAbilityParams(task, abilityId);
					const result = await abilityManager.executeAbility(agentId, abilityId, params);
					results.push({
						abilityId,
						success: true,
						result,
						task
					});
				} catch (error) {
					results.push({
						abilityId,
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
						task
					});
				}
			}
		}
		
		return results;
	}
	
	// Extract parameters for ability execution from task
	private extractAbilityParams(task: string, abilityId: string): any {
		switch (abilityId) {
			case 'read_files':
				return this.extractFileReadParams(task);
			
			case 'write_files':
				return this.extractFileWriteParams(task);
			
			case 'web_search':
				return this.extractWebSearchParams(task);
			
			case 'group_chat':
				return this.extractGroupChatParams(task);
			
			default:
				return {};
		}
	}
	
	// Extract file reading parameters
	private extractFileReadParams(task: string): any {
		const fileMatch = task.match(/\b(file|document)\s+(?:named|called|titled)?\s+["']?([^"'\s]+)["']?/i);
		if (fileMatch) {
			return { filePath: fileMatch[2] };
		}
		
		// Default file for testing
		return { filePath: 'example.txt' };
	}
	
	// Extract file writing parameters
	private extractFileWriteParams(task: string): any {
		const fileMatch = task.match(/\b(?:create|write|save)\s+(?:a\s+)?(?:file|document)\s+(?:called|named)?\s+["']?([^"'\s]+)["']?/i);
		if (fileMatch) {
			return { 
				filePath: fileMatch[1],
				content: 'Generated content based on task',
				mode: 'write'
			};
		}
		
		return { 
			filePath: 'output.txt',
			content: 'Generated content based on task',
			mode: 'write'
		};
	}
	
	// Extract web search parameters
	private extractWebSearchParams(task: string): any {
		const searchMatch = task.match(/\b(?:search|find|lookup)\s+(?:for|about)?\s+(.+?)(?:\s|$)/i);
		if (searchMatch) {
			return { 
				query: searchMatch[1].trim(),
				maxResults: 5
			};
		}
		
		return { 
			query: 'general information',
			maxResults: 5
		};
	}
	
	// Extract group chat parameters
	private extractGroupChatParams(task: string): any {
		return {
			message: task,
			roomId: 'general',
			targetAgents: []
		};
	}
	
	// Get all triggers
	getAllTriggers(): AbilityTrigger[] {
		return Array.from(this.triggers.values());
	}
	
	// Get trigger for specific ability
	getTrigger(abilityId: string): AbilityTrigger | undefined {
		return this.triggers.get(abilityId);
	}
}

// Create singleton instance
export const abilityPromptStrategy = new AbilityPromptStrategy(); 