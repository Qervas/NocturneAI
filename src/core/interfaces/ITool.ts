/**
 * Tool System Interfaces
 *
 * Interfaces for tool registration, execution, and management.
 */

import type { ToolDefinition } from '../types/llm.types.js';

/**
 * Tool execution context
 */
export interface ToolContext {
  /** Current working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** User-provided context */
  userContext?: Record<string, unknown>;

  /** Timeout for tool execution (ms) */
  timeout?: number;

  /** Whether to run in dry-run mode */
  dryRun?: boolean;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  /** Whether execution was successful */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** Execution metadata */
  metadata?: {
    executionTime?: number;
    toolName?: string;
    toolVersion?: string;
    [key: string]: unknown;
  };
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  /** Tool version */
  version: string;

  /** Tool author */
  author?: string;

  /** Tool category */
  category?: string;

  /** Tool tags for discovery */
  tags?: string[];

  /** Whether tool requires confirmation */
  requiresConfirmation?: boolean;

  /** Whether tool has side effects */
  hasSideEffects?: boolean;

  /** Custom metadata */
  [key: string]: unknown;
}

/**
 * Tool statistics
 */
export interface ToolStats {
  /** Total number of executions */
  executionCount: number;

  /** Number of successful executions */
  successCount: number;

  /** Number of failed executions */
  failureCount: number;

  /** Average execution time (ms) */
  averageExecutionTime: number;

  /** Last execution timestamp */
  lastExecuted?: number;

  /** Last error message */
  lastError?: string;
}

/**
 * Tool configuration
 */
export interface ToolConfig {
  /** Whether tool is enabled */
  enabled: boolean;

  /** Maximum execution time (ms) */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoff?: 'linear' | 'exponential';
  };

  /** Custom configuration */
  [key: string]: unknown;
}

/**
 * Tool interface
 */
export interface ITool {
  /**
   * Tool name (unique identifier)
   */
  readonly name: string;

  /**
   * Tool description
   */
  readonly description: string;

  /**
   * Tool metadata
   */
  readonly metadata: ToolMetadata;

  /**
   * Tool configuration
   */
  config: ToolConfig;

  /**
   * Get tool definition for LLM
   *
   * @returns Tool definition in OpenAI format
   */
  getDefinition(): ToolDefinition;

  /**
   * Execute the tool
   *
   * @param args - Tool arguments (JSON parsed)
   * @param context - Execution context
   * @returns Promise resolving to tool result
   */
  execute(args: Record<string, unknown>, context?: ToolContext): Promise<ToolResult>;

  /**
   * Validate tool arguments
   *
   * @param args - Arguments to validate
   * @returns True if valid, error message if invalid
   */
  validate(args: Record<string, unknown>): boolean | string;

  /**
   * Get tool statistics
   *
   * @returns Tool execution statistics
   */
  getStats(): ToolStats;

  /**
   * Reset tool statistics
   */
  resetStats(): void;

  /**
   * Enable the tool
   */
  enable(): void;

  /**
   * Disable the tool
   */
  disable(): void;

  /**
   * Check if tool is enabled
   *
   * @returns True if enabled
   */
  isEnabled(): boolean;
}

/**
 * Tool filter criteria
 */
export interface ToolFilterCriteria {
  /** Filter by category */
  category?: string;

  /** Filter by tags (matches any) */
  tags?: string[];

  /** Filter by enabled status */
  enabled?: boolean;

  /** Filter by name pattern (regex) */
  namePattern?: string;

  /** Custom filter function */
  filter?: (tool: ITool) => boolean;
}

/**
 * Tool registry statistics
 */
export interface ToolRegistryStats {
  /** Total number of registered tools */
  totalTools: number;

  /** Number of enabled tools */
  enabledTools: number;

  /** Number of disabled tools */
  disabledTools: number;

  /** Tools by category */
  toolsByCategory: Record<string, number>;

  /** Most used tool */
  mostUsedTool?: {
    name: string;
    executionCount: number;
  };
}

/**
 * Tool registry interface
 */
export interface IToolRegistry {
  /**
   * Register a tool
   *
   * @param tool - Tool to register
   * @throws Error if tool with same name already exists
   */
  register(tool: ITool): void;

  /**
   * Unregister a tool
   *
   * @param name - Tool name
   * @returns True if tool was removed, false if not found
   */
  unregister(name: string): boolean;

  /**
   * Get a tool by name
   *
   * @param name - Tool name
   * @returns Tool or undefined if not found
   */
  get(name: string): ITool | undefined;

  /**
   * Get all registered tools
   *
   * @returns Array of all tools
   */
  getAll(): ITool[];

  /**
   * Get tools matching criteria
   *
   * @param criteria - Filter criteria
   * @returns Array of matching tools
   */
  find(criteria: ToolFilterCriteria): ITool[];

  /**
   * Check if a tool is registered
   *
   * @param name - Tool name
   * @returns True if tool exists
   */
  has(name: string): boolean;

  /**
   * Get all tool names
   *
   * @returns Array of tool names
   */
  getNames(): string[];

  /**
   * Get all tool definitions for LLM
   *
   * @param filter - Optional filter criteria
   * @returns Array of tool definitions
   */
  getDefinitions(filter?: ToolFilterCriteria): ToolDefinition[];

  /**
   * Enable a tool
   *
   * @param name - Tool name
   * @returns True if tool was enabled, false if not found
   */
  enable(name: string): boolean;

  /**
   * Disable a tool
   *
   * @param name - Tool name
   * @returns True if tool was disabled, false if not found
   */
  disable(name: string): boolean;

  /**
   * Enable all tools
   */
  enableAll(): void;

  /**
   * Disable all tools
   */
  disableAll(): void;

  /**
   * Get registry statistics
   *
   * @returns Registry statistics
   */
  getStats(): ToolRegistryStats;

  /**
   * Clear all tools
   */
  clear(): void;
}

/**
 * Tool executor interface
 */
export interface IToolExecutor {
  /**
   * Execute a tool by name
   *
   * @param name - Tool name
   * @param args - Tool arguments
   * @param context - Execution context
   * @returns Promise resolving to tool result
   */
  execute(
    name: string,
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult>;

  /**
   * Execute multiple tools in sequence
   *
   * @param calls - Array of tool calls
   * @param context - Execution context
   * @returns Promise resolving to array of results
   */
  executeMany(
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    context?: ToolContext,
  ): Promise<ToolResult[]>;

  /**
   * Execute multiple tools in parallel
   *
   * @param calls - Array of tool calls
   * @param context - Execution context
   * @returns Promise resolving to array of results
   */
  executeParallel(
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    context?: ToolContext,
  ): Promise<ToolResult[]>;
}

/**
 * Tool loader interface
 */
export interface IToolLoader {
  /**
   * Load tools from directory
   *
   * @param directory - Directory path
   * @returns Promise resolving to array of loaded tools
   */
  loadFromDirectory(directory: string): Promise<ITool[]>;

  /**
   * Load a single tool from file
   *
   * @param filePath - File path
   * @returns Promise resolving to loaded tool
   */
  loadFromFile(filePath: string): Promise<ITool>;

  /**
   * Reload all tools
   *
   * @returns Promise resolving to array of reloaded tools
   */
  reload(): Promise<ITool[]>;
}

/**
 * Tool validator interface
 */
export interface IToolValidator {
  /**
   * Validate tool definition
   *
   * @param tool - Tool to validate
   * @returns True if valid, error message if invalid
   */
  validateTool(tool: ITool): boolean | string;

  /**
   * Validate tool name
   *
   * @param name - Tool name
   * @returns True if valid, error message if invalid
   */
  validateName(name: string): boolean | string;

  /**
   * Validate tool arguments
   *
   * @param tool - Tool definition
   * @param args - Arguments to validate
   * @returns True if valid, error message if invalid
   */
  validateArgs(tool: ITool, args: Record<string, unknown>): boolean | string;

  /**
   * Validate tool definition schema
   *
   * @param definition - Tool definition
   * @returns True if valid, error message if invalid
   */
  validateDefinition(definition: ToolDefinition): boolean | string;
}
