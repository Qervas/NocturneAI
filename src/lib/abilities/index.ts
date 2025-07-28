// Import all abilities to ensure they're registered
import './FileReader';
import './FileWriter';
import './WebSearch';
import './MultiAgentChat';

// Export the ability manager for easy access
export { abilityManager, agentAbilities } from '../services/AbilityManager';
export type { Ability, AgentAbilities } from '../services/AbilityManager';

// Export individual abilities for testing
export { FileReaderAbility } from './FileReader';
export { FileWriterAbility } from './FileWriter';
export { WebSearchAbility } from './WebSearch';
export { MultiAgentChatAbility } from './MultiAgentChat';

console.log('All abilities loaded and registered'); 