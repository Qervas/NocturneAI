/**
 * Workflow Executor
 *
 * Executes individual workflow steps and manages step-level state.
 *
 * Features:
 * - Execute different step types (agent, tool, task, etc.)
 * - Handle step dependencies and prerequisites
 * - Evaluate conditions before execution
 * - Manage step retries and error handling
 * - Track step execution state and results
 * - Support parallel and sequential execution
 * - Variable interpolation and output mapping
 * - Step-level timeout management
 */

import type { WorkflowStep } from "../../infrastructure/config/WorkflowConfigParser.js";
import type { AgentFactory } from "../factories/AgentFactory.js";
import type { ToolFactory } from "../factories/ToolFactory.js";
import { Agent } from "../services/Agent.js";

/**
 * Step Execution Status
 */
export type StepExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

/**
 * Step Execution Context
 */
export interface StepExecutionContext {
  /** Workflow ID */
  workflowId: string;

  /** Execution ID */
  executionId: string;

  /** Current variables */
  variables: Record<string, any>;

  /** Previous step results */
  stepResults: Map<string, StepExecutionResult>;

  /** Execution timeout */
  timeout?: number;

  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Step Execution Result
 */
export interface StepExecutionResult {
  /** Step ID */
  stepId: string;

  /** Step name */
  stepName: string;

  /** Step type */
  stepType: string;

  /** Execution status */
  status: StepExecutionStatus;

  /** Result data */
  result?: any;

  /** Error message (if failed) */
  error?: string;

  /** Error stack (if failed) */
  errorStack?: string;

  /** Output variables */
  output?: Record<string, any>;

  /** Started at timestamp */
  startedAt: number;

  /** Completed at timestamp */
  completedAt?: number;

  /** Execution time (ms) */
  executionTime?: number;

  /** Number of retry attempts */
  retryAttempts?: number;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Workflow Executor Configuration
 */
export interface WorkflowExecutorConfig {
  /** Agent factory for resolving agents */
  agentFactory?: AgentFactory;

  /** Tool factory for resolving tools */
  toolFactory?: ToolFactory;

  /** Default step timeout (ms) */
  defaultTimeout?: number;

  /** Default max retries */
  defaultMaxRetries?: number;

  /** Enable parallel execution */
  enableParallel?: boolean;
}

/**
 * Workflow Executor
 *
 * Executes workflow steps with state management
 */
export class WorkflowExecutor {
  private config: WorkflowExecutorConfig;

  constructor(config: WorkflowExecutorConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout || 60000, // 1 minute
      defaultMaxRetries: config.defaultMaxRetries || 3,
      enableParallel: config.enableParallel ?? true,
      ...config,
    };
  }

  /**
   * Execute a workflow step
   */
  async executeStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<StepExecutionResult> {
    const startedAt = Date.now();

    const result: StepExecutionResult = {
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      status: "running",
      startedAt,
    };

    try {
      // Check if step should be skipped based on condition
      if (step.condition && !this.evaluateCondition(step.condition, context)) {
        result.status = "skipped";
        result.completedAt = Date.now();
        result.executionTime = result.completedAt - startedAt;
        return result;
      }

      // Check for cancellation
      if (context.signal?.aborted) {
        result.status = "cancelled";
        result.completedAt = Date.now();
        result.executionTime = result.completedAt - startedAt;
        return result;
      }

      // Execute step with retry logic
      const stepTimeout = step.timeout || this.config.defaultTimeout || 60000;
      const maxRetries =
        step.retry?.maxAttempts ?? this.config.defaultMaxRetries ?? 3;

      let lastError: Error | null = null;
      let retryAttempts = 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const stepResult = await this.executeStepWithTimeout(
            step,
            context,
            stepTimeout,
          );

          result.result = stepResult;
          result.status = "completed";
          result.retryAttempts = retryAttempts;

          // Map outputs
          if (step.output) {
            result.output = this.mapOutputs(step.output, stepResult, context);
          }

          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retryAttempts++;

          // Check if we should retry
          if (attempt < maxRetries && this.shouldRetry(error, step)) {
            // Wait before retry
            const delay = this.calculateRetryDelay(attempt, step.retry);
            await this.sleep(delay);
            continue;
          }

          // No more retries or shouldn't retry
          throw lastError;
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      result.status = "failed";
      result.error = err.message;
      result.errorStack = err.stack;

      // Continue on error if configured
      if (!step.continueOnError) {
        throw error;
      }
    } finally {
      result.completedAt = Date.now();
      result.executionTime = result.completedAt - startedAt;
    }

    return result;
  }

  /**
   * Execute a step with timeout
   */
  private async executeStepWithTimeout(
    step: WorkflowStep,
    context: StepExecutionContext,
    timeout: number,
  ): Promise<any> {
    return Promise.race([
      this.executeStepByType(step, context),
      this.createTimeoutPromise(timeout),
    ]);
  }

  /**
   * Execute step based on its type
   */
  private async executeStepByType(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    switch (step.type) {
      case "agent":
        return this.executeAgentStep(step, context);

      case "task":
        return this.executeTaskStep(step, context);

      case "tool":
        return this.executeToolStep(step, context);

      case "parallel":
        return this.executeParallelStep(step, context);

      case "sequential":
        return this.executeSequentialStep(step, context);

      case "condition":
        return this.executeConditionStep(step, context);

      case "loop":
        return this.executeLoopStep(step, context);

      case "wait":
        return this.executeWaitStep(step, context);

      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }
  }

  /**
   * Execute an agent step
   */
  private async executeAgentStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    if (!this.config.agentFactory) {
      throw new Error("Agent factory not configured");
    }

    if (!step.agentId) {
      throw new Error("Agent ID not specified");
    }

    if (!step.task) {
      throw new Error("Task configuration not specified");
    }

    // Get agent configuration and create agent
    // Note: In a production system, you would need an agent registry
    // For now, we assume the agent is created from the agentId
    // This is a placeholder - actual implementation would need agent lookup/creation
    const agentConfig = {
      id: step.agentId,
      name: step.agentId,
      role: "executor" as const,
      type: "autonomous" as const,
    };
    const agentDeps = await this.config.agentFactory.createAgent(agentConfig);

    // Create Agent instance from dependencies
    const agent = new Agent({
      id: agentDeps.config.id,
      name: agentDeps.config.name,
      config: agentDeps.config,
      llmClient: agentDeps.llmClient,
      contextManager: agentDeps.contextManager,
      tools: agentDeps.tools,
      memoryStore: agentDeps.memoryStore,
      vectorStore: agentDeps.vectorStore,
    });

    // Interpolate task description
    const taskDescription = this.interpolateVariables(
      step.task.description || "",
      context.variables,
    );

    // Execute task
    const taskConfig = step.task as any;
    const result = await agent.executeTask(
      taskDescription,
      taskConfig.context || {},
    );

    return result;
  }

  /**
   * Execute a task step
   */
  private async executeTaskStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    if (!step.task) {
      throw new Error("Task configuration not specified");
    }

    // Interpolate task description
    const description = this.interpolateVariables(
      step.task.description || "",
      context.variables,
    );

    // Execute task (simple execution - could be extended)
    return {
      description,
      completed: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute a tool step
   */
  private async executeToolStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    if (!this.config.toolFactory) {
      throw new Error("Tool factory not configured");
    }

    if (!step.toolId) {
      throw new Error("Tool ID not specified");
    }

    // Get tool
    const tool = this.config.toolFactory.getTool(step.toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${step.toolId}`);
    }

    // Interpolate tool arguments
    const args = this.interpolateVariables(
      step.toolArgs || {},
      context.variables,
    );

    // Execute tool
    const result = await tool.execute(args, {
      userContext: {
        workflowId: context.workflowId,
        executionId: context.executionId,
        stepId: step.id,
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Tool execution failed");
    }

    return result.data;
  }

  /**
   * Execute a parallel step
   */
  private async executeParallelStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    if (!this.config.enableParallel) {
      throw new Error("Parallel execution not enabled");
    }

    const taskConfig = step.task as any;
    if (!taskConfig?.steps || !Array.isArray(taskConfig.steps)) {
      throw new Error("Parallel step must have steps array");
    }

    // Execute all steps in parallel
    const results = await Promise.allSettled(
      taskConfig.steps.map((subStep: WorkflowStep) =>
        this.executeStep(subStep, context),
      ),
    );

    // Check for failures
    const failures = results.filter(
      (r: PromiseSettledResult<StepExecutionResult>) => r.status === "rejected",
    );
    if (failures.length > 0 && !step.continueOnError) {
      throw new Error(
        `Parallel execution failed: ${failures.length} steps failed`,
      );
    }

    return results.map((r: PromiseSettledResult<StepExecutionResult>) =>
      r.status === "fulfilled"
        ? r.value
        : { error: (r.reason as Error).message },
    );
  }

  /**
   * Execute a sequential step
   */
  private async executeSequentialStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    const taskConfig = step.task as any;
    if (!taskConfig?.steps || !Array.isArray(taskConfig.steps)) {
      throw new Error("Sequential step must have steps array");
    }

    const results: StepExecutionResult[] = [];

    for (const subStep of taskConfig.steps) {
      const result = await this.executeStep(subStep, context);
      results.push(result);

      // Stop on failure unless continueOnError is set
      if (result.status === "failed" && !step.continueOnError) {
        throw new Error(`Sequential execution failed at step: ${subStep.id}`);
      }
    }

    return results;
  }

  /**
   * Execute a condition step
   */
  private async executeConditionStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    if (!step.condition) {
      throw new Error("Condition not specified");
    }

    const conditionResult = this.evaluateCondition(step.condition, context);

    return {
      condition: step.condition,
      result: conditionResult,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute a loop step
   */
  private async executeLoopStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    if (!step.task) {
      throw new Error("Loop configuration not specified");
    }

    const results: any[] = [];

    // Determine iteration count or items
    let iterations: any[] = [];
    const taskConfig = step.task as any;

    if (taskConfig.items) {
      // Loop over items
      const items = this.interpolateVariables(
        taskConfig.items,
        context.variables,
      );
      iterations = Array.isArray(items) ? items : [items];
    } else if (taskConfig.count) {
      // Loop count times
      const count =
        typeof taskConfig.count === "number"
          ? taskConfig.count
          : parseInt(String(taskConfig.count), 10);
      iterations = Array.from({ length: count }, (_, i) => i);
    } else {
      throw new Error("Loop must specify either items or count");
    }

    // Execute loop
    for (let i = 0; i < iterations.length; i++) {
      const item = iterations[i];

      // Create loop context
      const loopContext: StepExecutionContext = {
        ...context,
        variables: {
          ...context.variables,
          item,
          index: i,
          count: iterations.length,
        },
      };

      // Execute loop body
      if (taskConfig.steps && Array.isArray(taskConfig.steps)) {
        const stepResults: StepExecutionResult[] = [];

        for (const subStep of taskConfig.steps) {
          const result = await this.executeStep(subStep, loopContext);
          stepResults.push(result);

          if (result.status === "failed" && !step.continueOnError) {
            throw new Error(`Loop execution failed at iteration ${i}`);
          }
        }

        results.push(stepResults);
      }
    }

    return results;
  }

  /**
   * Execute a wait step
   */
  private async executeWaitStep(
    step: WorkflowStep,
    context: StepExecutionContext,
  ): Promise<any> {
    if (!step.task) {
      throw new Error("Wait configuration not specified");
    }

    const taskConfig = step.task as any;

    if (taskConfig.duration) {
      // Wait for duration
      const duration =
        typeof taskConfig.duration === "number"
          ? taskConfig.duration
          : parseInt(String(taskConfig.duration), 10);

      await this.sleep(duration);

      return {
        type: "duration",
        duration,
        timestamp: Date.now(),
      };
    } else if (taskConfig.until) {
      // Wait until condition
      const checkInterval = taskConfig.checkInterval || 1000;
      const maxWait = taskConfig.maxWait || 300000; // 5 minutes default
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        if (this.evaluateCondition(taskConfig.until, context)) {
          return {
            type: "condition",
            condition: taskConfig.until,
            waitTime: Date.now() - startTime,
            timestamp: Date.now(),
          };
        }

        await this.sleep(checkInterval);

        // Check for cancellation
        if (context.signal?.aborted) {
          throw new Error("Wait cancelled");
        }
      }

      throw new Error("Wait timeout exceeded");
    }

    throw new Error("Wait step must specify duration or until condition");
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: string,
    context: StepExecutionContext,
  ): boolean {
    try {
      // Interpolate variables in condition
      const interpolated = this.interpolateVariables(
        condition,
        context.variables,
      );

      // Simple evaluation (in production, use a proper expression evaluator)
      // This is a basic implementation - should be enhanced with a safe evaluator
      const evalContext: Record<string, any> = {
        ...context.variables,
        stepResults: Object.fromEntries(context.stepResults),
      };

      // Create a safe evaluation function
      const evalFunction = new Function(
        ...Object.keys(evalContext),
        `return ${interpolated}`,
      );

      return Boolean(evalFunction(...Object.values(evalContext)));
    } catch (error) {
      console.error("Condition evaluation error:", error);
      return false;
    }
  }

  /**
   * Interpolate variables in a value
   */
  private interpolateVariables(
    value: any,
    variables: Record<string, any>,
  ): any {
    if (typeof value === "string") {
      // Replace ${variable} patterns
      return value.replace(
        /\$\{([a-zA-Z_][a-zA-Z0-9_\.]*)\}/g,
        (_, varName) => {
          const parts = varName.split(".");
          let current: any = variables;

          for (const part of parts) {
            if (current && typeof current === "object" && part in current) {
              current = current[part];
            } else {
              return `\${${varName}}`; // Keep original if not found
            }
          }

          return String(current);
        },
      );
    } else if (Array.isArray(value)) {
      return value.map((item) => this.interpolateVariables(item, variables));
    } else if (value && typeof value === "object") {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.interpolateVariables(val, variables);
      }
      return result;
    }

    return value;
  }

  /**
   * Map step outputs to variables
   */
  private mapOutputs(
    outputMapping: Record<string, string>,
    result: any,
    _context: StepExecutionContext,
  ): Record<string, any> {
    const output: Record<string, any> = {};

    for (const [targetVar, sourcePath] of Object.entries(outputMapping)) {
      // Extract value from result using path
      const value = this.extractValue(result, sourcePath);
      output[targetVar] = value;
    }

    return output;
  }

  /**
   * Extract value from object using path
   */
  private extractValue(obj: any, path: string): any {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: any, step: WorkflowStep): boolean {
    // Don't retry on cancellation
    if (error.name === "AbortError") {
      return false;
    }

    // Check retry configuration
    const retryConfig = step.retry as any;
    if (retryConfig?.retryOn) {
      const retryOn = retryConfig.retryOn;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (Array.isArray(retryOn)) {
        return retryOn.some((pattern: string) =>
          errorMessage.toLowerCase().includes(pattern.toLowerCase()),
        );
      }
    }

    // Default: retry on most errors
    return true;
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(attempt: number, retryConfig?: any): number {
    const baseDelay = retryConfig?.delay || 1000;
    const strategy = retryConfig?.strategy || "exponential";

    switch (strategy) {
      case "exponential":
        return baseDelay * Math.pow(2, attempt);

      case "linear":
        return baseDelay * (attempt + 1);

      case "fixed":
      default:
        return baseDelay;
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step execution timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Sleep for a duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
