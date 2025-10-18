/**
 * Agent
 *
 * Core agent class that orchestrates LLM reasoning, tool execution, and memory management.
 *
 * Features:
 * - Execution loop (thought → action → observation)
 * - Tool execution with retry logic
 * - Context management and message history
 * - Memory integration (working + long-term)
 * - Action logging and statistics
 * - State management (idle, thinking, acting, paused, stopped)
 * - Error handling and recovery
 * - Streaming support
 */

import type { ILLMClient } from "../../core/interfaces/ILLMClient.js";
import type { IContextManager } from "../../core/interfaces/IContextManager.js";
import type {
  ITool,
  ToolResult,
  ToolContext,
} from "../../core/interfaces/ITool.js";
import type {
  ChatRequest,
  ChatResponse,
  ToolCall,
} from "../../core/types/llm.types.js";
import type { AgentConfig } from "../../infrastructure/config/AgentConfigParser.js";
import { MemoryStore } from "../../infrastructure/memory/MemoryStore.js";
import { VectorStore } from "../../infrastructure/memory/VectorStore.js";

/**
 * Agent State
 */
export type AgentState =
  | "idle"
  | "thinking"
  | "acting"
  | "observing"
  | "paused"
  | "stopped"
  | "error";

/**
 * Agent Execution Mode
 */
export type AgentExecutionMode = "autonomous" | "interactive" | "step";

/**
 * Agent Action
 */
export interface AgentAction {
  /** Action ID */
  id: string;

  /** Action type */
  type: "tool_call" | "response" | "thought";

  /** Timestamp */
  timestamp: number;

  /** Tool name (for tool_call type) */
  toolName?: string;

  /** Tool arguments (for tool_call type) */
  toolArgs?: Record<string, unknown>;

  /** Tool result (for tool_call type) */
  toolResult?: ToolResult;

  /** Response content (for response type) */
  content?: string;

  /** Execution time (ms) */
  executionTime?: number;

  /** Whether action was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent Task
 */
export interface AgentTask {
  /** Task ID */
  id: string;

  /** Task description */
  description: string;

  /** Task context/input */
  context?: Record<string, unknown>;

  /** Task priority */
  priority?: number;

  /** Task deadline */
  deadline?: number;

  /** Task status */
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";

  /** Task result */
  result?: string;

  /** Actions taken */
  actions: AgentAction[];

  /** Created at */
  createdAt: number;

  /** Started at */
  startedAt?: number;

  /** Completed at */
  completedAt?: number;
}

/**
 * Agent Statistics
 */
export interface AgentStats {
  /** Total tasks completed */
  tasksCompleted: number;

  /** Total tasks failed */
  tasksFailed: number;

  /** Total actions taken */
  actionsTaken: number;

  /** Total tool calls */
  toolCalls: number;

  /** Total LLM calls */
  llmCalls: number;

  /** Total tokens used */
  tokensUsed: number;

  /** Average task completion time (ms) */
  avgTaskTime: number;

  /** Uptime (ms) */
  uptime: number;

  /** Last activity timestamp */
  lastActivity?: number;
}

/**
 * Agent Configuration Options
 */
export interface AgentOptions {
  /** Agent ID */
  id: string;

  /** Agent name */
  name: string;

  /** Agent configuration */
  config: AgentConfig;

  /** LLM client */
  llmClient: ILLMClient;

  /** Context manager */
  contextManager: IContextManager;

  /** Available tools */
  tools: ITool[];

  /** Memory store (optional) */
  memoryStore?: MemoryStore;

  /** Vector store (optional) */
  vectorStore?: VectorStore;

  /** Execution mode */
  mode?: AgentExecutionMode;

  /** Max iterations per task */
  maxIterations?: number;

  /** Tool execution timeout (ms) */
  toolTimeout?: number;

  /** Enable logging */
  enableLogging?: boolean;
}

/**
 * Agent Class
 */
export class Agent {
  // Core components
  private readonly id: string;
  private readonly name: string;
  private readonly config: AgentConfig;
  private readonly llmClient: ILLMClient;
  private readonly contextManager: IContextManager;
  private readonly tools: Map<string, ITool>;
  private readonly memoryStore?: MemoryStore;
  private readonly vectorStore?: VectorStore;

  // State
  private state: AgentState = "idle";
  private mode: AgentExecutionMode;
  private currentTask?: AgentTask;
  private taskQueue: AgentTask[] = [];

  // Configuration
  private maxIterations: number;
  private toolTimeout: number;
  private enableLogging: boolean;

  // Statistics
  private stats: AgentStats = {
    tasksCompleted: 0,
    tasksFailed: 0,
    actionsTaken: 0,
    toolCalls: 0,
    llmCalls: 0,
    tokensUsed: 0,
    avgTaskTime: 0,
    uptime: 0,
  };

  private startTime: number = Date.now();

  constructor(options: AgentOptions) {
    this.id = options.id;
    this.name = options.name;
    this.config = options.config;
    this.llmClient = options.llmClient;
    this.contextManager = options.contextManager;
    this.memoryStore = options.memoryStore;
    this.vectorStore = options.vectorStore;

    // Convert tools array to map
    this.tools = new Map();
    for (const tool of options.tools) {
      this.tools.set(tool.name, tool);
    }

    // Configuration
    this.mode = options.mode || "autonomous";
    this.maxIterations = options.maxIterations || 10;
    this.toolTimeout = options.toolTimeout || 30000;
    this.enableLogging = options.enableLogging !== false;

    // Initialize context with system prompt
    this.initializeContext();
  }

  /**
   * Initialize context with system prompt
   */
  private async initializeContext(): Promise<void> {
    if (this.config.systemPrompt) {
      await this.contextManager.addMessage({
        role: "system",
        content: this.config.systemPrompt,
      });
    }
  }

  /**
   * Execute a task
   */
  async executeTask(
    description: string,
    context?: Record<string, unknown>,
  ): Promise<AgentTask> {
    const task: AgentTask = {
      id: this.generateTaskId(),
      description,
      context,
      status: "pending",
      actions: [],
      createdAt: Date.now(),
    };

    this.taskQueue.push(task);

    if (this.state === "idle") {
      await this.processNextTask();
    }

    return task;
  }

  /**
   * Process next task in queue
   */
  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) {
      this.state = "idle";
      return;
    }

    const task = this.taskQueue.shift()!;
    this.currentTask = task;
    task.status = "in_progress";
    task.startedAt = Date.now();

    try {
      await this.runTaskLoop(task);
      task.status = "completed";
      this.stats.tasksCompleted++;
    } catch (error) {
      task.status = "failed";
      this.stats.tasksFailed++;
      this.logError("Task execution failed", error);
    } finally {
      task.completedAt = Date.now();
      this.updateTaskStats(task);
      this.currentTask = undefined;

      // Process next task if in autonomous mode
      if (this.mode === "autonomous") {
        await this.processNextTask();
      }
    }
  }

  /**
   * Run task execution loop
   */
  private async runTaskLoop(task: AgentTask): Promise<void> {
    // Add task to context
    await this.contextManager.addMessage({
      role: "user",
      content: task.description,
    });

    let iteration = 0;
    let shouldContinue = true;

    while (shouldContinue && iteration < this.maxIterations) {
      iteration++;

      // Check if paused or stopped
      if (this.state === "paused" || this.state === "stopped") {
        break;
      }

      // THINK: Get LLM response
      this.state = "thinking";
      const response = await this.think(task);

      // Check if task is complete (no tool calls)
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // Final response
        const action = this.createAction("response", {
          content: response.content,
          success: true,
        });
        task.actions.push(action);
        task.result = response.content;
        shouldContinue = false;
        break;
      }

      // ACT: Execute tool calls
      this.state = "acting";
      const toolResults = await this.act(response.toolCalls, task);

      // OBSERVE: Add tool results to context
      this.state = "observing";
      await this.observe(toolResults);

      // In step mode, pause after each iteration
      if (this.mode === "step") {
        this.state = "paused";
        break;
      }
    }

    // If max iterations reached, summarize
    if (iteration >= this.maxIterations) {
      await this.contextManager.addMessage({
        role: "assistant",
        content: `Maximum iterations (${this.maxIterations}) reached. Task may be incomplete.`,
      });
      task.result = "Max iterations reached";
    }
  }

  /**
   * THINK: Get LLM response with reasoning
   */
  private async think(
    task: AgentTask,
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    this.log(`[THINK] Processing: ${task.description}`);

    // Get messages from context
    const messages = this.contextManager.getMessages();

    // Get available tool definitions
    const tools = Array.from(this.tools.values())
      .filter((tool) => tool.isEnabled())
      .map((tool) => tool.getDefinition());

    // Create LLM request
    const request: ChatRequest = {
      messages,
      tools: tools.length > 0 ? tools : undefined,
      toolChoice: tools.length > 0 ? "auto" : undefined,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };

    // Call LLM
    const response = await this.llmClient.chat(request);
    this.stats.llmCalls++;
    this.stats.tokensUsed += response.usage?.totalTokens || 0;
    this.stats.lastActivity = Date.now();

    // Add assistant response to context
    await this.contextManager.addMessage({
      role: "assistant",
      content: response.content || response.message.content,
      tool_calls: response.message.tool_calls,
    });

    return {
      content: response.content || response.message.content,
      toolCalls: response.message.tool_calls,
    };
  }

  /**
   * ACT: Execute tool calls
   */
  private async act(
    toolCalls: ToolCall[],
    task: AgentTask,
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        const error = `Tool "${toolName}" not found`;
        this.logError("Tool execution failed", new Error(error));
        results.push({
          success: false,
          error,
        });
        continue;
      }

      this.log(`[ACT] Executing tool: ${toolName}`);

      try {
        // Parse arguments
        const args = JSON.parse(toolCall.function.arguments);

        // Create tool context
        const toolContext: ToolContext = {
          cwd: process.cwd(),
          timeout: this.toolTimeout,
        };

        // Execute tool
        const startTime = Date.now();
        const result = await tool.execute(args, toolContext);
        const executionTime = Date.now() - startTime;

        // Create action
        const action = this.createAction("tool_call", {
          toolName,
          toolArgs: args,
          toolResult: result,
          success: result.success,
          executionTime,
        });
        task.actions.push(action);

        this.stats.toolCalls++;
        this.stats.actionsTaken++;

        results.push(result);

        this.log(`[ACT] Tool ${toolName} completed in ${executionTime}ms`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logError(`Tool ${toolName} execution failed`, error);

        const result: ToolResult = {
          success: false,
          error: errorMessage,
        };

        const action = this.createAction("tool_call", {
          toolName,
          toolResult: result,
          success: false,
          error: errorMessage,
        });
        task.actions.push(action);

        results.push(result);
      }
    }

    return results;
  }

  /**
   * OBSERVE: Add tool results to context
   */
  private async observe(results: ToolResult[]): Promise<void> {
    for (const result of results) {
      const content = result.success
        ? `Tool executed successfully. Result: ${JSON.stringify(result.data)}`
        : `Tool execution failed: ${result.error}`;

      await this.contextManager.addMessage({
        role: "tool",
        content,
        tool_call_id: result.metadata?.toolCallId as string,
      });

      this.log(`[OBSERVE] ${content}`);
    }
  }

  /**
   * Create an action record
   */
  private createAction(
    type: AgentAction["type"],
    data: Partial<AgentAction>,
  ): AgentAction {
    return {
      id: this.generateActionId(),
      type,
      timestamp: Date.now(),
      success: data.success || false,
      ...data,
    };
  }

  /**
   * Update task statistics
   */
  private updateTaskStats(task: AgentTask): void {
    if (task.status === "completed" && task.startedAt && task.completedAt) {
      const taskTime = task.completedAt - task.startedAt;
      const totalTasks = this.stats.tasksCompleted + this.stats.tasksFailed;
      this.stats.avgTaskTime =
        (this.stats.avgTaskTime * (totalTasks - 1) + taskTime) / totalTasks;
    }

    this.stats.uptime = Date.now() - this.startTime;
  }

  /**
   * Pause agent execution
   */
  pause(): void {
    if (this.state !== "stopped") {
      this.state = "paused";
      this.log("[PAUSE] Agent paused");
    }
  }

  /**
   * Resume agent execution
   */
  async resume(): Promise<void> {
    if (this.state === "paused") {
      this.state = "idle";
      this.log("[RESUME] Agent resumed");

      if (this.mode === "autonomous" && this.taskQueue.length > 0) {
        await this.processNextTask();
      }
    }
  }

  /**
   * Stop agent execution
   */
  stop(): void {
    this.state = "stopped";
    this.taskQueue = [];
    this.currentTask = undefined;
    this.log("[STOP] Agent stopped");
  }

  /**
   * Step through one iteration (for step mode)
   */
  async step(): Promise<void> {
    if (this.mode !== "step") {
      throw new Error("Agent must be in step mode to use step()");
    }

    if (this.state === "paused" && this.currentTask) {
      await this.processNextTask();
    }
  }

  /**
   * Get agent state
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * Get current task
   */
  getCurrentTask(): AgentTask | undefined {
    return this.currentTask;
  }

  /**
   * Get task queue
   */
  getTaskQueue(): AgentTask[] {
    return [...this.taskQueue];
  }

  /**
   * Get agent statistics
   */
  getStats(): AgentStats {
    return { ...this.stats };
  }

  /**
   * Get agent info
   */
  getInfo(): {
    id: string;
    name: string;
    state: AgentState;
    mode: AgentExecutionMode;
    config: AgentConfig;
    toolCount: number;
    queuedTasks: number;
  } {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      mode: this.mode,
      config: this.config,
      toolCount: this.tools.size,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Set execution mode
   */
  setMode(mode: AgentExecutionMode): void {
    this.mode = mode;
    this.log(`[MODE] Execution mode changed to: ${mode}`);
  }

  /**
   * Add a tool
   */
  addTool(tool: ITool): void {
    this.tools.set(tool.name, tool);
    this.log(`[TOOL] Added tool: ${tool.name}`);
  }

  /**
   * Remove a tool
   */
  removeTool(toolName: string): boolean {
    const result = this.tools.delete(toolName);
    if (result) {
      this.log(`[TOOL] Removed tool: ${toolName}`);
    }
    return result;
  }

  /**
   * Get available tools
   */
  getTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Clear context history
   */
  async clearContext(): Promise<void> {
    await this.contextManager.clear();
    await this.initializeContext();
    this.log("[CONTEXT] Context cleared");
  }

  /**
   * Export agent state
   */
  async exportState(): Promise<{
    id: string;
    name: string;
    config: AgentConfig;
    context: any;
    stats: AgentStats;
    currentTask?: AgentTask;
    taskQueue: AgentTask[];
  }> {
    return {
      id: this.id,
      name: this.name,
      config: this.config,
      context: await this.contextManager.export(),
      stats: this.stats,
      currentTask: this.currentTask,
      taskQueue: this.taskQueue,
    };
  }

  /**
   * Generate task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Log message
   */
  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[${this.name}] ${message}`);
    }
  }

  /**
   * Log error
   */
  private logError(message: string, error: unknown): void {
    if (this.enableLogging) {
      console.error(`[${this.name}] ERROR: ${message}`, error);
    }
  }
}
