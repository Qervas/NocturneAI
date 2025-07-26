/**
 * Ability Types - MCP-inspired atomic ability system
 * Following Step 1 refined requirements:
 * - 5 atomic abilities (perceive, think, act, reflect, communicate)
 * - MCP-like unified interface for execution
 * - Hierarchical composition (basic -> advanced)
 * - XP-based unlocking system
 */

import type { Agent } from './Agent';

// Core atomic ability categories (the fundamental 5)
export type AbilityCategory = 'perceive' | 'think' | 'act' | 'reflect' | 'communicate';

// Base interface for all abilities - MCP-inspired unified execution
export interface AtomicAbility {
  id: string;
  name: string;
  category: AbilityCategory;
  description: string;
  
  // Gamification
  requiredXP: number;
  prerequisites: string[]; // Other ability IDs required
  
  // Execution
  execute(input: AbilityInput, context: AbilityContext): Promise<AbilityResult>;
  
  // Metadata
  version: string;
  tags: string[];
}

// Unified input interface - MCP-style standardized format
export interface AbilityInput {
  type: string; // Specific operation type (e.g., 'web_search', 'llm_query', 'write_code')
  data: any; // Payload specific to the operation
  options?: AbilityOptions;
  previousResult?: any; // For chaining abilities
}

// Execution context provided to abilities
export interface AbilityContext {
  agent: Agent;
  gateway: any; // AbilityGateway instance (avoiding circular import)
  timestamp: Date;
  sessionId?: string;
}

// Options for ability execution
export interface AbilityOptions {
  timeout?: number; // Max execution time in ms
  retries?: number; // Number of retry attempts
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, any>;
}

// Standardized result format - MCP-inspired
export interface AbilityResult {
  success: boolean;
  output?: any; // The actual result data
  error?: string; // Error message if failed
  confidence?: number; // 0-100, how confident the ability is in the result
  
  // Execution metrics
  executionTime?: number; // milliseconds
  tokensUsed?: number; // For LLM abilities
  resourcesUsed?: number; // For file/network operations
  xpGained?: number; // Filled by gateway
  
  // Additional metadata
  metadata?: Record<string, any>;
  chainResults?: any[]; // For chained ability execution
}

// Specific input types for each atomic ability category

// PERCEIVE: Gathering information
export interface PerceiveInput extends AbilityInput {
  type: 'web_search' | 'read_file' | 'browse_page' | 'scan_directory' | 'watch_changes';
  data: {
    query?: string;
    url?: string;
    filePath?: string;
    filters?: any;
  };
}

// THINK: Reasoning and planning
export interface ThinkInput extends AbilityInput {
  type: 'llm_query' | 'analyze' | 'plan' | 'reason' | 'categorize';
  data: {
    prompt?: string;
    context?: any;
    model?: string;
    temperature?: number;
  };
}

// ACT: Executing actions
export interface ActInput extends AbilityInput {
  type: 'write_file' | 'run_code' | 'send_request' | 'execute_command' | 'modify_file';
  data: {
    content?: string;
    code?: string;
    language?: string;
    filePath?: string;
    command?: string;
    url?: string;
    method?: string;
    payload?: any;
  };
}

// REFLECT: Analyzing and learning
export interface ReflectInput extends AbilityInput {
  type: 'summarize' | 'evaluate' | 'learn' | 'compare' | 'validate';
  data: {
    content?: any;
    criteria?: string[];
    previousResults?: any[];
    targetMetrics?: any;
  };
}

// COMMUNICATE: Sending and receiving messages
export interface CommunicateInput extends AbilityInput {
  type: 'send_message' | 'broadcast' | 'delegate' | 'request_help' | 'collaborate';
  data: {
    recipient?: string;
    content: string;
    intent?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    expectedResponse?: string;
  };
}

// Composite ability interface (built from atomic abilities)
export interface CompositeAbility {
  id: string;
  name: string;
  description: string;
  atomicAbilities: string[]; // IDs of required atomic abilities
  
  // How to combine the atomic abilities
  composition: AbilityComposition;
  
  // Same as atomic for consistency
  requiredXP: number;
  prerequisites: string[];
}

export interface AbilityComposition {
  type: 'sequence' | 'parallel' | 'conditional' | 'loop';
  steps: CompositionStep[];
}

export interface CompositionStep {
  abilityId: string;
  input: AbilityInput;
  condition?: string; // For conditional execution
  onSuccess?: CompositionStep[];
  onFailure?: CompositionStep[];
}

// Predefined ability templates for common combinations
export interface AbilityTemplate {
  id: string;
  name: string;
  category: string;
  atomicSequence: string[]; // Order of atomic abilities to execute
  defaultConfig: Record<string, any>;
  examples: AbilityExample[];
}

export interface AbilityExample {
  description: string;
  input: AbilityInput;
  expectedOutput: any;
}

// XP and progression types
export interface AbilityProgression {
  abilityId: string;
  currentLevel: number;
  xpInLevel: number;
  xpToNextLevel: number;
  totalXP: number;
  unlockHistory: AbilityUnlock[];
}

export interface AbilityUnlock {
  abilityId: string;
  unlockedAt: Date;
  xpCost: number;
  triggerEvent: string; // What caused the unlock
}

// Statistics and analytics
export interface AbilityStats {
  abilityId: string;
  usageCount: number;
  successRate: number;
  averageExecutionTime: number;
  averageConfidence: number;
  lastUsed: Date;
  commonFailures: string[];
  performanceTrend: 'improving' | 'stable' | 'declining';
}

// Error types for ability execution
export class AbilityError extends Error {
  constructor(
    message: string,
    public abilityId: string,
    public category: AbilityCategory,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AbilityError';
  }
}

export class AbilityTimeoutError extends AbilityError {
  constructor(abilityId: string, timeout: number) {
    super(`Ability ${abilityId} timed out after ${timeout}ms`, abilityId, 'act', 'TIMEOUT', true);
    this.name = 'AbilityTimeoutError';
  }
}

export class AbilityAccessError extends AbilityError {
  constructor(abilityId: string, reason: string) {
    super(`Access denied to ability ${abilityId}: ${reason}`, abilityId, 'act', 'ACCESS_DENIED', false);
    this.name = 'AbilityAccessError';
  }
}
