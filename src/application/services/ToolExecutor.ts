/**
 * ToolExecutor
 *
 * Simple helper for executing tool calls in mode handlers.
 * Converts natural language actions to tool executions.
 *
 * This bridges the gap between ReActAgent's action planning
 * and actual tool execution with proper ITool interface.
 */

import type { ITool, ToolResult } from '../../core/interfaces/ITool.js';
import type { ProposedAction, ExecutionResult } from '../../presentation/ui/types.js';
import { Logger } from '../../infrastructure/logging/Logger.js';

// Import built-in tools
import { FileReadTool } from '../../infrastructure/tools/builtin/FileReadTool.js';
import { FileWriteTool } from '../../infrastructure/tools/builtin/FileWriteTool.js';
import { FileEditTool } from '../../infrastructure/tools/builtin/FileEditTool.js';
import { FileDeleteTool } from '../../infrastructure/tools/builtin/FileDeleteTool.js';
import { FileListTool } from '../../infrastructure/tools/builtin/FileListTool.js';
import { FileCopyTool } from '../../infrastructure/tools/builtin/FileCopyTool.js';
import { FileMoveTool } from '../../infrastructure/tools/builtin/FileMoveTool.js';
import { CommandExecuteTool } from '../../infrastructure/tools/builtin/CommandExecuteTool.js';
import { GitStatusTool } from '../../infrastructure/tools/builtin/GitStatusTool.js';
import { GitCommitTool } from '../../infrastructure/tools/builtin/GitCommitTool.js';
import { GitDiffTool } from '../../infrastructure/tools/builtin/GitDiffTool.js';
import { GitLogTool } from '../../infrastructure/tools/builtin/GitLogTool.js';
import { CodeSearchTool } from '../../infrastructure/tools/builtin/CodeSearchTool.js';
import { FileSearchTool } from '../../infrastructure/tools/builtin/FileSearchTool.js';
import { SymbolSearchTool } from '../../infrastructure/tools/builtin/SymbolSearchTool.js';

/**
 * Tool Executor Configuration
 */
export interface ToolExecutorConfig {
  /**
   * Available tools for execution
   */
  tools: ITool[];

  /**
   * Logger instance (optional)
   */
  logger?: Logger;

  /**
   * Enable logging
   */
  enableLogging?: boolean;

  /**
   * Tool execution timeout (ms)
   */
  timeout?: number;
}

/**
 * Tool Call (internal representation)
 */
interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Tool Executor
 *
 * Executes tools based on proposed actions from mode handlers.
 */
export class ToolExecutor {
  private tools: Map<string, ITool>;
  private logger?: Logger;
  private enableLogging: boolean;
  private timeout: number;

  constructor(config: ToolExecutorConfig) {
    this.tools = new Map();
    for (const tool of config.tools) {
      this.tools.set(tool.name, tool);
    }

    this.logger = config.logger;
    this.enableLogging = config.enableLogging ?? true;
    this.timeout = config.timeout ?? 30000;

    this.log('info', `ToolExecutor initialized with ${this.tools.size} tools`);
  }

  /**
   * Execute proposed actions using available tools
   *
   * @param actions Proposed actions from ReActAgent
   * @returns Execution results
   */
  async executeActions(actions: ProposedAction[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const action of actions) {
      try {
        // Convert action to tool call
        const toolCall = this.actionToToolCall(action);

        if (!toolCall) {
          // Not a tool action, skip
          results.push({
            success: false,
            message: `Skipped: ${action.description}`,
            error: 'Action does not map to a tool',
            action
          });
          continue;
        }

        // Execute tool
        const result = await this.executeTool(toolCall, action);
        results.push(result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log('error', `Failed to execute action: ${errorMessage}`);

        results.push({
          success: false,
          message: `Failed: ${action.description}`,
          error: errorMessage,
          action
        });
      }
    }

    return results;
  }

  /**
   * Convert ProposedAction to ToolCall
   *
   * Maps common action descriptions to tool calls.
   *
   * @param action Proposed action
   * @returns Tool call or null if not mappable
   */
  private actionToToolCall(action: ProposedAction): ToolCall | null {
    const params = action.parameters || {};

    // TRUST THE AI: If AI specified a tool and it exists, use it directly (Claude Code approach)
    if (action.command && this.tools.has(action.command)) {
      this.log('info', `Using AI-selected tool: ${action.command}`);
      return {
        toolName: action.command,
        args: params
      };
    }

    // Fallback: Try to infer tool from description (legacy/backward compatibility)
    // SAFE: Ensure description is always a string before toLowerCase
    const desc = (action.description || '').toLowerCase();

    // File operations
    if (desc.includes('list') && (desc.includes('file') || desc.includes('director'))) {
      return {
        toolName: 'file_list',
        args: {
          path: params.path || params.directory || '.',
          pattern: params.pattern || '*'
        }
      };
    }

    if (desc.includes('read') && desc.includes('file')) {
      return {
        toolName: 'file_read',
        args: {
          path: params.path || params.file || ''
        }
      };
    }

    if (desc.includes('write') || desc.includes('create')) {
      if (desc.includes('file')) {
        return {
          toolName: 'file_write',
          args: {
            path: params.path || params.file || '',
            content: params.content || ''
          }
        };
      }
    }

    if (desc.includes('delete') && desc.includes('file')) {
      return {
        toolName: 'file_delete',
        args: {
          path: params.path || params.file || ''
        }
      };
    }

    if (desc.includes('copy') && desc.includes('file')) {
      return {
        toolName: 'file_copy',
        args: {
          source: params.source || params.from || '',
          destination: params.destination || params.to || ''
        }
      };
    }

    if (desc.includes('move') && desc.includes('file')) {
      return {
        toolName: 'file_move',
        args: {
          source: params.source || params.from || '',
          destination: params.destination || params.to || ''
        }
      };
    }

    // Git operations
    if (desc.includes('git') && desc.includes('status')) {
      return {
        toolName: 'git_status',
        args: {}
      };
    }

    if (desc.includes('git') && desc.includes('diff')) {
      return {
        toolName: 'git_diff',
        args: {
          file: params.file || params.path
        }
      };
    }

    if (desc.includes('git') && desc.includes('log')) {
      return {
        toolName: 'git_log',
        args: {
          limit: params.limit || 10
        }
      };
    }

    // Search operations
    if (desc.includes('search') && desc.includes('code')) {
      return {
        toolName: 'code_search',
        args: {
          query: params.query || params.search || '',
          path: params.path || '.'
        }
      };
    }

    if (desc.includes('search') && desc.includes('file')) {
      return {
        toolName: 'file_search',
        args: {
          pattern: params.pattern || params.query || '',
          path: params.path || '.'
        }
      };
    }

    // Command execution
    if (desc.includes('run') || desc.includes('execute')) {
      if (params.command || action.command) {
        return {
          toolName: 'command_execute',
          args: {
            command: params.command || action.command || '',
            cwd: params.cwd || '.'
          }
        };
      }
    }

    // Default: return null if no mapping found
    this.log('warn', `No tool mapping found for action: ${action.description}`);
    return null;
  }

  /**
   * Execute a tool call
   *
   * @param toolCall Tool call to execute
   * @param action Original proposed action
   * @returns Execution result
   */
  private async executeTool(toolCall: ToolCall, action: ProposedAction): Promise<ExecutionResult> {
    const tool = this.tools.get(toolCall.toolName);

    if (!tool) {
      return {
        success: false,
        message: `Tool not found: ${toolCall.toolName}`,
        error: `No tool named "${toolCall.toolName}" is available`,
        action
      };
    }

    this.log('info', `Executing tool: ${toolCall.toolName}`);

    try {
      // Execute tool with timeout
      const result = await Promise.race([
        tool.execute(toolCall.args, {}),
        this.createTimeout(this.timeout)
      ]);

      if (result.success) {
        return {
          success: true,
          message: `✓ ${action.description}`,
          output: typeof result.data === 'string' ? result.data : JSON.stringify(result.data),
          action
        };
      } else {
        return {
          success: false,
          message: `✗ ${action.description}`,
          error: result.error || 'Tool execution failed',
          action
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Tool execution failed: ${errorMessage}`);

      return {
        success: false,
        message: `✗ ${action.description}`,
        error: errorMessage,
        action
      };
    }
  }

  /**
   * Create a timeout promise
   *
   * @param ms Timeout in milliseconds
   * @returns Promise that rejects after timeout
   */
  private createTimeout(ms: number): Promise<ToolResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Get list of available tool names
   *
   * @returns Array of tool names
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Create default built-in tools
   *
   * @returns Array of built-in tool instances
   */
  static createBuiltinTools(): ITool[] {
    return [
      // File tools
      new FileReadTool(),
      new FileWriteTool(),
      new FileEditTool(),
      new FileDeleteTool(),
      new FileListTool(),
      new FileCopyTool(),
      new FileMoveTool(),

      // Command tools
      new CommandExecuteTool(),

      // Git tools
      new GitStatusTool(),
      new GitCommitTool(),
      new GitDiffTool(),
      new GitLogTool(),

      // Search tools
      new CodeSearchTool(),
      new FileSearchTool(),
      new SymbolSearchTool(),
    ];
  }

  /**
   * Log a message
   *
   * @param level Log level
   * @param message Message to log
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (!this.enableLogging) {
      return;
    }

    if (this.logger) {
      this.logger.log(level, message, { service: 'ToolExecutor' });
    } else {
      console.log(`[ToolExecutor] ${level.toUpperCase()}: ${message}`);
    }
  }
}
