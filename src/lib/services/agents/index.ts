// Agent Services
export { agentSelectionManager } from './AgentSelectionManager';
export { characterManager } from './CharacterManager';
export { communicationManager } from './CommunicationManager';

// Re-export types
export type { Agent, AgentSelectionState } from './AgentSelectionManager';
export type { Character, NPCAgent, UserPlayer } from '../../types/Character';
export type { AgentMessage, CommunicationIntent, AgentRelationship, AgentSocialNetwork, CommunicationStyle } from '../../types/Communication'; 