import type { Ability } from '../services/AbilityManager';
import { abilityManager } from '../services/AbilityManager';

export const WebSearchAbility: Ability = {
	id: 'web_search',
	name: 'Web Search',
	description: 'Search the internet for information',
	category: 'web_operations',
	
	canExecute: (agentId: string, params?: any): boolean => {
		// Check if agent has the ability
		if (!abilityManager.hasAbility(agentId, 'web_search')) {
			return false;
		}
		
		// Check if search query is provided
		if (!params || !params.query) {
			return false;
		}
		
		// Basic validation - query should be a string
		if (typeof params.query !== 'string') {
			return false;
		}
		
		// Check query length
		if (params.query.trim().length < 2) {
			return false;
		}
		
		return true;
	},
	
	execute: async (agentId: string, params?: any): Promise<any> => {
		try {
			const { query, maxResults = 5 } = params;
			
			// Validate search query
			if (!query || typeof query !== 'string') {
				throw new Error('Invalid search query provided');
			}
			
			if (query.trim().length < 2) {
				throw new Error('Search query too short');
			}
			
			// Simulate web search
			const searchResults = await simulateWebSearch(query, maxResults);
			
			// Log the action
			console.log(`Agent ${agentId} searched for: "${query}"`);
			
			return {
				success: true,
				query,
				results: searchResults,
				agentId,
				timestamp: new Date().toISOString()
			};
			
		} catch (error) {
			console.error(`WebSearch ability error for agent ${agentId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				agentId,
				timestamp: new Date().toISOString()
			};
		}
	}
};

// Simulate web search (placeholder for real implementation)
async function simulateWebSearch(query: string, maxResults: number): Promise<any[]> {
	// In a real implementation, this would use:
	// - Google Search API
	// - Bing Search API
	// - DuckDuckGo API
	// - Or web scraping techniques
	
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
	
	// Generate simulated search results
	const results = [];
	const topics = [
		'programming', 'technology', 'science', 'history', 'art', 
		'medicine', 'space', 'nature', 'culture', 'politics'
	];
	
	for (let i = 0; i < Math.min(maxResults, 5); i++) {
		const topic = topics[Math.floor(Math.random() * topics.length)];
		const relevance = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
		
		results.push({
			title: `Simulated result for "${query}" - ${topic}`,
			url: `https://example.com/search-result-${i + 1}`,
			snippet: `This is a simulated search result for "${query}" in the ${topic} category. Relevance score: ${relevance.toFixed(2)}`,
			relevance: relevance,
			domain: 'example.com',
			lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
		});
	}
	
	// Sort by relevance
	results.sort((a, b) => b.relevance - a.relevance);
	
	return results;
}

// Register the ability with the AbilityManager
abilityManager.registerAbility(WebSearchAbility); 