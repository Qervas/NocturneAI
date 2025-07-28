import type { Ability } from '../services/AbilityManager';
import { abilityManager } from '../services/AbilityManager';

export const MultiAgentChatAbility: Ability = {
	id: 'group_chat',
	name: 'Group Communicator',
	description: 'Participate in multi-agent conversations',
	category: 'communication',
	
	canExecute: (agentId: string, params?: any): boolean => {
		// Check if agent has the ability
		if (!abilityManager.hasAbility(agentId, 'group_chat')) {
			return false;
		}
		
		// Check if message is provided
		if (!params || !params.message) {
			return false;
		}
		
		// Basic validation - message should be a string
		if (typeof params.message !== 'string') {
			return false;
		}
		
		// Check message length
		if (params.message.trim().length === 0) {
			return false;
		}
		
		return true;
	},
	
	execute: async (agentId: string, params?: any): Promise<any> => {
		try {
			const { message, roomId = 'general', targetAgents = [] } = params;
			
			// Validate message
			if (!message || typeof message !== 'string') {
				throw new Error('Invalid message provided');
			}
			
			if (message.trim().length === 0) {
				throw new Error('Message cannot be empty');
			}
			
			// Simulate group chat
			const chatResult = await simulateGroupChat(agentId, message, roomId, targetAgents);
			
			// Log the action
			console.log(`Agent ${agentId} sent group message in room ${roomId}: "${message}"`);
			
			return {
				success: true,
				message,
				roomId,
				targetAgents,
				result: chatResult,
				agentId,
				timestamp: new Date().toISOString()
			};
			
		} catch (error) {
			console.error(`MultiAgentChat ability error for agent ${agentId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				agentId,
				timestamp: new Date().toISOString()
			};
		}
	}
};

// Simulate group chat (placeholder for real implementation)
async function simulateGroupChat(
	agentId: string, 
	message: string, 
	roomId: string, 
	targetAgents: string[]
): Promise<any> {
	// In a real implementation, this would:
	// - Connect to a real-time chat system
	// - Use WebSockets or similar for real-time communication
	// - Handle message routing and delivery
	// - Manage chat rooms and participants
	
	// Simulate network delay
	await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
	
	// Generate simulated responses from other agents
	const responses = [];
	const otherAgents = ['alpha', 'beta', 'gamma'].filter(id => id !== agentId);
	
	// Simulate responses from other agents in the room
	for (const otherAgent of otherAgents) {
		if (Math.random() > 0.3) { // 70% chance of response
			const responseDelay = Math.random() * 2000 + 500; // 0.5-2.5 seconds
			
			responses.push({
				agentId: otherAgent,
				message: generateSimulatedResponse(message, otherAgent),
				delay: responseDelay,
				timestamp: new Date(Date.now() + responseDelay).toISOString()
			});
		}
	}
	
	return {
		roomId,
		participants: [agentId, ...otherAgents],
		messageDelivered: true,
		responses,
		messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	};
}

// Generate simulated responses from other agents
function generateSimulatedResponse(originalMessage: string, agentId: string): string {
	const responses = [
		`Interesting point about "${originalMessage}"!`,
		`I agree with that perspective.`,
		`That's a good observation.`,
		`Let me think about that...`,
		`I have a different view on this.`,
		`Thanks for sharing that information.`,
		`I'd like to add to that discussion.`,
		`That reminds me of something similar.`,
		`I'm processing what you just said.`,
		`Good contribution to the conversation.`
	];
	
	const randomResponse = responses[Math.floor(Math.random() * responses.length)];
	return `${agentId}: ${randomResponse}`;
}

// Register the ability with the AbilityManager
abilityManager.registerAbility(MultiAgentChatAbility); 