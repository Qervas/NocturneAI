/**
 * Execute Agent Task Use Case
 *
 * High-level use case for executing a single task with an agent.
 *
 * Features:
 * - Input validation
 * - Agent selection and creation
 * - Task execution orchestration
 * - Result formatting
 * - Error handling
 * - Progress tracking
 */

import type { AgentService } from "../services/AgentService.js";
import type { Agent, AgentTask } from "../services/Agent.js";
import type { AgentFactory } from "../factories/AgentFactory.js";
import type { AgentConfig } from "../../infrastructure/config/AgentConfigParser.js";

/**
 * Execute Agent Task Input
 */
export interface ExecuteAgentTaskInput {
  /** Task description */
  description: string;

  /** Agent ID (optional - will create new agent if not provided) */
  agentId?: string;

  /** Agent role (if creating new agent) */
  agentRole?: "coder" | "reviewer" | "tester" | "architect" | "researcher" | "planner";

  /** Agent configuration (if creating new agent) */
  agentConfig?: AgentConfig;

  /** Task context/input data */
  context?: Record<string, unknown>;

  /** Task timeout (ms) */
  timeout?: number;

  /** Task priority */
  priority?: number;

  /** Whether to wait for completion */
  waitForCompletion?: boolean;

  /** Progress callback */
  onProgress?: (progress: TaskProgress) => void;
}

/**
 * Execute Agent Task Output
 */
export interface ExecuteAgentTaskOutput {
  /** Whether execution was successful */
  success: boolean;

  /** Task result */
  result?: string;

  /** Task object */
  task: AgentTask;

  /** Agent ID used */
  agentId: string;

  /** Execution time (ms) */
  executionTime: number;

  /** Number of actions taken */
  actionsCount: number;

  /** Number of tool calls */
  toolCallsCount: number;

  /** Error message if failed */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Task Progress
 */
export interface TaskProgress {
  /** Progress percentage (0-100) */
  percentage: number;

  /** Current status */
  status: string;

  /** Actions taken so far */
  actionsTaken: number;

  /** Current iteration */
  iteration: number;

  /** Estimated time remaining (ms) */
  estimatedTimeRemaining?: number;
}

/**
 * Execute Agent Task Use Case
 */
export class ExecuteAgentTask {
  private agentService: AgentService;
  private agentFactory: AgentFactory;

  constructor(agentService: AgentService, agentFactory: AgentFactory) {
    this.agentService = agentService;
    this.agentFactory = agentFactory;
  }

  /**
   * Execute the use case
   */
  async execute(input: ExecuteAgentTaskInput): Promise<ExecuteAgentTaskOutput> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateInput(input);

      // Get or create agent
      const { agent, agentId, wasCreated } = await this.getOrCreateAgent(input);

      // Execute task
      const task = await this.executeTask(agent, input);

      // Wait for completion if requested
      if (input.waitForCompletion !== false) {
        await this.waitForTaskCompletion(task, input);
      }

      // Calculate statistics
      const executionTime = Date.now() - startTime;
      const actionsCount = task.actions.length;
      const toolCallsCount = task.actions.filter(
        (a) => a.type === "tool_call",
      ).length;

      // Clean up temporary agent
      if (wasCreated && task.status === "completed") {
        this.agentService.stopAgent(agentId);
      }

      return {
        success: task.status === "completed",
        result: task.result,
        task,
        agentId,
        executionTime,
        actionsCount,
        toolCallsCount,
        metadata: {
          wasCreated,
          agentName: agent.getInfo().name,
          agentRole: agent.getInfo().config.role,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        task: {
          id: "unknown",
          description: input.description,
          status: "failed",
          actions: [],
          createdAt: startTime,
          completedAt: Date.now(),
        },
        agentId: input.agentId || "unknown",
        executionTime,
        actionsCount: 0,
        toolCallsCount: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate input
   */
  private validateInput(input: ExecuteAgentTaskInput): void {
    if (!input.description || input.description.trim().length === 0) {
      throw new Error("Task description is required");
    }

    if (input.description.length > 10000) {
      throw new Error("Task description is too long (max 10000 characters)");
    }

    if (input.timeout && input.timeout < 0) {
      throw new Error("Timeout must be a positive number");
    }

    if (input.priority && (input.priority < 0 || input.priority > 10)) {
      throw new Error("Priority must be between 0 and 10");
    }

    // Validate that either agentId or agentRole/agentConfig is provided
    if (!input.agentId && !input.agentRole && !input.agentConfig) {
      throw new Error(
        "Either agentId, agentRole, or agentConfig must be provided",
      );
    }
  }

  /**
   * Get existing agent or create new one
   */
  private async getOrCreateAgent(
    input: ExecuteAgentTaskInput,
  ): Promise<{ agent: Agent; agentId: string; wasCreated: boolean }> {
    // Try to get existing agent
    if (input.agentId) {
      const agent = this.agentService.getAgent(input.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${input.agentId}`);
      }
      return { agent, agentId: input.agentId, wasCreated: false };
    }

    // Create new agent by role
    if (input.agentRole) {
      const agent = await this.agentService.createAgentByRole(
        input.agentRole,
        {
          name: `${input.agentRole}-${Date.now()}`,
        },
      );
      return {
        agent,
        agentId: agent.getInfo().id,
        wasCreated: true,
      };
    }

    // Create new agent with custom config
    if (input.agentConfig) {
      const agent = await this.agentService.createAgent(input.agentConfig);
      return {
        agent,
        agentId: agent.getInfo().id,
        wasCreated: true,
      };
    }

    throw new Error("Unable to get or create agent");
  }

  /**
   * Execute task
   */
  private async executeTask(
    agent: Agent,
    input: ExecuteAgentTaskInput,
  ): Promise<AgentTask> {
    const task = await agent.executeTask(input.description, input.context);

    return task;
  }

  /**
   * Wait for task completion with progress tracking
   */
  private async waitForTaskCompletion(
    task: AgentTask,
    input: ExecuteAgentTaskInput,
  ): Promise<void> {
    const timeout = input.timeout || 300000; // 5 minutes default
    const startTime = Date.now();
    const pollInterval = 100; // 100ms

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        // Check timeout
        if (elapsed > timeout) {
          clearInterval(checkInterval);
          reject(new Error("Task execution timeout"));
          return;
        }

        // Report progress
        if (input.onProgress) {
          const progress = this.calculateProgress(task, elapsed, timeout);
          input.onProgress(progress);
        }

        // Check completion
        if (task.status === "completed") {
          clearInterval(checkInterval);
          resolve();
        } else if (task.status === "failed") {
          clearInterval(checkInterval);
          reject(new Error("Task execution failed"));
        }
      }, pollInterval);
    });
  }

  /**
   * Calculate task progress
   */
  private calculateProgress(
    task: AgentTask,
    elapsed: number,
    timeout: number,
  ): TaskProgress {
    const actionsCount = task.actions.length;

    // Estimate progress based on actions and time
    // This is a simple heuristic - can be improved
    const actionProgress = Math.min(actionsCount * 10, 50);
    const timeProgress = Math.min((elapsed / timeout) * 50, 50);
    const percentage = Math.min(actionProgress + timeProgress, 99);

    return {
      percentage,
      status: this.getTaskStatusString(task.status),
      actionsTaken: actionsCount,
      iteration: actionsCount,
      estimatedTimeRemaining: timeout - elapsed,
    };
  }

  /**
   * Get human-readable task status
   */
  private getTaskStatusString(
    status: AgentTask["status"],
  ): string {
    switch (status) {
      case "pending":
        return "Waiting to start...";
      case "in_progress":
        return "Executing task...";
      case "completed":
        return "Task completed";
      case "failed":
        return "Task failed";
      case "cancelled":
        return "Task cancelled";
      default:
        return "Unknown status";
    }
  }
}
