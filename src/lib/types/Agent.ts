/**
 * Agent Types - Unified "less dumb" agent model
 * Following Step 1 refined requirements:
 * - Unified Agent interface (no NPC/User split unless necessary)
 * - Abilities-driven identity (traits computed from abilities)
 * - Experience-based progression system
 * - Minimal memory focused on tasks
 */

// Core Agent interface - unified, ability-driven
export interface Agent {
  id: string;
  name: string;
  type: 'ai' | 'human'; // Minimal differentiation
  
  // Ability system
  abilities: Set<string>; // AbilityIds that agent has unlocked
  experience: number; // Total XP for unlocking new abilities
  
  // Computed traits (derived from abilities, not hardcoded)
  traits: AgentTraits;
  
  // Task-focused memory only
  memory: AgentMemory;
  
  // Status
  status: 'online' | 'offline' | 'busy';
  currentTask?: string; // TaskId if working on something
  
  // Metadata
  createdAt: Date;
  lastActive: Date;
}

// Traits computed from abilities (not hardcoded personalities)
export interface AgentTraits {
  // These are calculated based on which abilities the agent has
  analyticalLevel: number; // Based on analysis/thinking abilities
  creativityLevel: number; // Based on creative/generation abilities  
  technicalLevel: number; // Based on coding/technical abilities
  socialLevel: number; // Based on communication abilities
  
  // Primary specialization (computed from strongest ability category)
  primarySpecialization: 'analyst' | 'creator' | 'technician' | 'communicator' | 'generalist';
  
  // Communication style (derived from abilities and experience)
  communicationStyle: 'precise' | 'creative' | 'logical' | 'collaborative';
}

// Task-focused memory (not social chat history)
export interface AgentMemory {
  // Working memory for current tasks
  currentContext: TaskContext[];
  
  // Learning from completed tasks
  experiences: TaskExperience[];
  
  // Knowledge gained from using abilities
  skillKnowledge: SkillKnowledge[];
  
  // User preferences (for human agents)
  userPreferences?: UserPreferences;
}

export interface TaskContext {
  taskId: string;
  description: string;
  relevantInfo: any;
  startedAt: Date;
}

export interface TaskExperience {
  taskType: string;
  outcome: 'success' | 'failure' | 'partial';
  abilitiesUsed: string[];
  lessonsLearned: string[];
  completedAt: Date;
  xpGained: number;
}

export interface SkillKnowledge {
  abilityId: string;
  usageCount: number;
  successRate: number;
  averagePerformance: number;
  lastUsed: Date;
  improvements: string[]; // What the agent learned about using this ability
}

export interface UserPreferences {
  preferredCommunicationStyle: string;
  taskTypes: string[]; // What kinds of tasks user likes to assign
  feedbackStyle: 'detailed' | 'summary' | 'minimal';
}

// Visualization data (separate from core agent model)
export interface AgentVisualization {
  agentId: string;
  position?: { x: number; y: number };
  color?: string;
  size?: number;
  animationState?: AnimationState;
}

export interface AnimationState {
  isBreathing: boolean;
  isActive: boolean;
  isHovered: boolean;
  energyParticles: boolean;
  glowIntensity: number;
}

// Legacy compatibility (for gradual migration)
// TODO: Remove these once we migrate existing code
export interface Character extends Agent {
  // Temporary bridge to existing Character interface
  position: { x: number; y: number };
  color: string;
  level?: number;
  performance?: any;
}

export type NPCAgent = Agent & { type: 'ai' };
export type UserPlayer = Agent & { type: 'human' };
