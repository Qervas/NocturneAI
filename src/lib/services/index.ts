// Re-export all services from modules
export * from './ai';
export * from './context';
export * from './data';
export * from './ui';
export * from './agents';
export * from './core';

// Legacy exports for backward compatibility
export { llmService } from './ai/LLMService';
export { contextManager } from './context/ContextManager';
export { databaseManager } from './data/DatabaseManager';
export { tilingLayoutManager } from './ui/TilingLayoutManager';
export { characterManager } from './agents/CharacterManager';
export { abilityManager } from './core/AbilityManager';
export { settingsManager } from './ui/SettingsManager';
export { agentSelectionManager } from './agents/AgentSelectionManager';
export { communicationManager } from './agents/CommunicationManager';
export { fileOperationsService } from './data/FileOperationsService';
export { uploadedFiles, addFile, removeFile, updateFile, writeFileContent, getFileById, clearFiles } from './data/FileStore';
export { skillTreeManager } from './core/PerkManager';
export { simulationController } from './core/SimulationController';
export { advancedContextService } from './context/AdvancedContextService';
export { perkContextManager } from './context/PerkContextManager';
export { agentPromptManager } from './ai/AgentPromptManager';
export { promptManager } from './ai/PromptManager';
export { semanticAnalysisService } from './ai/SemanticAnalysisService'; 