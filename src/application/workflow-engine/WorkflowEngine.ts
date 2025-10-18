/**
 * Workflow Engine
 *
 * Manages workflow lifecycle, orchestrates step execution, and tracks workflow state.
 *
 * Features:
 * - Workflow lifecycle management (start, pause, resume, stop, cancel)
 * - Step orchestration and dependency resolution
 * - Workflow state management and persistence
 * - Event emission for workflow and step events
 * - Progress tracking and reporting
 * - Error handling and recovery
 * - Workflow context management
 * - Execution history tracking
 * - Parallel workflow execution support
 * - Workflow cancellation and cleanup
 */

import type {
  WorkflowConfig,
  WorkflowStep,
} from "../../infrastructure/config/WorkflowConfigParser.js";
import type { AgentFactory } from "../factories/AgentFactory.js";
import type { ToolFactory } from "../factories/ToolFactory.js";
import {
  WorkflowValidator,
  type ValidationOptions,
} from "./WorkflowValidator.js";
import {
  WorkflowExecutor,
  type StepExecutionContext,
  type StepExecutionResult,
} from "./WorkflowExecutor.js";

/**
 * Workflow Execution Status
 */
export type WorkflowExecutionStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Workflow Event Type
 */
export type WorkflowEventType =
  | "workflow:started"
  | "workflow:completed"
  | "workflow:failed"
  | "workflow:paused"
  | "workflow:resumed"
  | "workflow:cancelled"
  | "step:started"
  | "step:completed"
  | "step:failed"
  | "step:skipped"
  | "progress:updated";

/**
 * Workflow Event
 */
export interface WorkflowEvent {
  /** Event type */
  type: WorkflowEventType;

  /** Workflow ID */
  workflowId: string;

  /** Execution ID */
  executionId: string;

  /** Timestamp */
  timestamp: number;

  /** Event data */
  data?: any;

  /** Step ID (for step events) */
  stepId?: string;

  /** Error (for failure events) */
  error?: string;
}

/**
 * Workflow Execution State
 */
export interface WorkflowExecutionState {
  /** Execution ID */
  executionId: string;

  /** Workflow ID */
  workflowId: string;

  /** Execution status */
  status: WorkflowExecutionStatus;

  /** Workflow configuration */
  workflow: WorkflowConfig;

  /** Current variables */
  variables: Record<string, any>;

  /** Step execution results */
  stepResults: Map<string, StepExecutionResult>;

  /** Current step ID */
  currentStepId?: string;

  /** Completed steps */
  completedSteps: Set<string>;

  /** Failed steps */
  failedSteps: Set<string>;

  /** Skipped steps */
  skippedSteps: Set<string>;

  /** Started at timestamp */
  startedAt?: number;

  /** Completed at timestamp */
  completedAt?: number;

  /** Paused at timestamp */
  pausedAt?: number;

  /** Error message (if failed) */
  error?: string;

  /** Error stack (if failed) */
  errorStack?: string;

  /** Abort controller */
  abortController?: AbortController;

  /** Execution metadata */
  metadata?: Record<string, any>;
}

/**
 * Workflow Progress
 */
export interface WorkflowProgress {
  /** Progress percentage (0-100) */
  percentage: number;

  /** Current step */
  currentStep?: string;

  /** Steps completed */
  stepsCompleted: number;

  /** Total steps */
  totalSteps: number;

  /** Elapsed time (ms) */
  elapsedTime: number;

  /** Estimated remaining time (ms) */
  estimatedRemainingTime?: number;
}

/**
 * Workflow Engine Configuration
 */
export interface WorkflowEngineConfig {
  /** Agent factory */
  agentFactory?: AgentFactory;

  /** Tool factory */
  toolFactory?: ToolFactory;

  /** Default workflow timeout (ms) */
  defaultTimeout?: number;

  /** Default max retries */
  defaultMaxRetries?: number;

  /** Enable parallel execution */
  enableParallel?: boolean;

  /** Max concurrent workflows */
  maxConcurrentWorkflows?: number;

  /** Enable event emission */
  enableEvents?: boolean;

  /** Validation options */
  validationOptions?: ValidationOptions;
}

/**
 * Workflow Event Listener
 */
export type WorkflowEventListener = (event: WorkflowEvent) => void;

/**
 * Workflow Engine
 *
 * Orchestrates workflow execution and manages workflow lifecycle
 */
export class WorkflowEngine {
  private config: WorkflowEngineConfig;
  private validator: WorkflowValidator;
  private executor: WorkflowExecutor;
  private executions: Map<string, WorkflowExecutionState>;
  private eventListeners: Map<
    WorkflowEventType | "*",
    Set<WorkflowEventListener>
  >;

  constructor(config: WorkflowEngineConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      defaultMaxRetries: config.defaultMaxRetries || 3,
      enableParallel: config.enableParallel ?? true,
      maxConcurrentWorkflows: config.maxConcurrentWorkflows || 10,
      enableEvents: config.enableEvents ?? true,
      ...config,
    };

    this.validator = new WorkflowValidator({
      agentFactory: config.agentFactory,
      toolFactory: config.toolFactory,
    });

    this.executor = new WorkflowExecutor({
      agentFactory: config.agentFactory,
      toolFactory: config.toolFactory,
      defaultTimeout: config.defaultTimeout,
      defaultMaxRetries: config.defaultMaxRetries,
      enableParallel: config.enableParallel,
    });

    this.executions = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Start workflow execution
   */
  async startWorkflow(
    workflow: WorkflowConfig,
    options: {
      executionId?: string;
      initialVariables?: Record<string, any>;
      skipValidation?: boolean;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<string> {
    // Generate execution ID
    const executionId = options.executionId || this.generateExecutionId();

    // Check concurrent workflow limit
    const runningWorkflows = Array.from(this.executions.values()).filter(
      (e) => e.status === "running",
    );

    if (runningWorkflows.length >= (this.config.maxConcurrentWorkflows || 10)) {
      throw new Error(
        `Maximum concurrent workflows reached (${this.config.maxConcurrentWorkflows})`,
      );
    }

    // Validate workflow
    if (!options.skipValidation) {
      const validationResult = await this.validator.validate(
        workflow,
        this.config.validationOptions,
      );

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors
          .map((e) => e.message)
          .join("; ");
        throw new Error(`Workflow validation failed: ${errorMessages}`);
      }
    }

    // Initialize execution state
    const state: WorkflowExecutionState = {
      executionId,
      workflowId: workflow.id,
      status: "pending",
      workflow,
      variables: {
        ...workflow.variables,
        ...options.initialVariables,
      },
      stepResults: new Map(),
      completedSteps: new Set(),
      failedSteps: new Set(),
      skippedSteps: new Set(),
      abortController: new AbortController(),
      metadata: options.metadata,
    };

    this.executions.set(executionId, state);

    // Start execution asynchronously
    this.executeWorkflow(executionId).catch((error) => {
      console.error(`Workflow ${executionId} execution error:`, error);
    });

    return executionId;
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    try {
      // Update state
      state.status = "running";
      state.startedAt = Date.now();

      // Emit workflow started event
      this.emitEvent({
        type: "workflow:started",
        workflowId: state.workflowId,
        executionId,
        timestamp: Date.now(),
      });

      // Calculate step execution order
      const stepOrder = this.calculateStepOrder(state.workflow.steps);

      // Execute steps in order
      for (const stepId of stepOrder) {
        // Check if paused or cancelled
        const currentState = this.executions.get(executionId);
        if (!currentState) {
          throw new Error("Execution state lost");
        }

        if (currentState.status === "paused") {
          return;
        }

        if (currentState.status === "cancelled") {
          throw new Error("Workflow cancelled");
        }

        const step = state.workflow.steps.find((s) => s.id === stepId);
        if (!step) {
          throw new Error(`Step not found: ${stepId}`);
        }

        // Check dependencies
        if (step.dependencies) {
          const dependenciesMet = step.dependencies.every((depId) =>
            state.completedSteps.has(depId),
          );

          if (!dependenciesMet) {
            continue; // Skip this step for now
          }
        }

        // Execute step
        await this.executeStep(executionId, step);

        // Update progress
        this.emitProgressUpdate(executionId);
      }

      // Check if all steps completed
      const allStepsCompleted = state.workflow.steps.every(
        (step) =>
          state.completedSteps.has(step.id) ||
          state.skippedSteps.has(step.id) ||
          state.failedSteps.has(step.id),
      );

      if (allStepsCompleted) {
        state.status = "completed";
        state.completedAt = Date.now();

        this.emitEvent({
          type: "workflow:completed",
          workflowId: state.workflowId,
          executionId,
          timestamp: Date.now(),
          data: {
            duration: state.completedAt - (state.startedAt || 0),
            stepsCompleted: state.completedSteps.size,
            stepsFailed: state.failedSteps.size,
            stepsSkipped: state.skippedSteps.size,
          },
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.status = "failed";
      state.error = err.message;
      state.errorStack = err.stack;
      state.completedAt = Date.now();

      this.emitEvent({
        type: "workflow:failed",
        workflowId: state.workflowId,
        executionId,
        timestamp: Date.now(),
        error: err.message,
        data: {
          errorStack: err.stack,
        },
      });
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    executionId: string,
    step: WorkflowStep,
  ): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    state.currentStepId = step.id;

    // Emit step started event
    this.emitEvent({
      type: "step:started",
      workflowId: state.workflowId,
      executionId,
      stepId: step.id,
      timestamp: Date.now(),
      data: { stepName: step.name, stepType: step.type },
    });

    try {
      // Create execution context
      const context: StepExecutionContext = {
        workflowId: state.workflowId,
        executionId,
        variables: state.variables,
        stepResults: state.stepResults,
        timeout:
          step.timeout || state.workflow.timeout || this.config.defaultTimeout,
        signal: state.abortController?.signal,
      };

      // Execute step
      const result = await this.executor.executeStep(step, context);

      // Store result
      state.stepResults.set(step.id, result);

      // Update state based on result
      if (result.status === "completed") {
        state.completedSteps.add(step.id);

        // Update variables with step outputs
        if (result.output) {
          Object.assign(state.variables, result.output);
        }

        this.emitEvent({
          type: "step:completed",
          workflowId: state.workflowId,
          executionId,
          stepId: step.id,
          timestamp: Date.now(),
          data: {
            stepName: step.name,
            executionTime: result.executionTime,
            result: result.result,
          },
        });
      } else if (result.status === "failed") {
        state.failedSteps.add(step.id);

        this.emitEvent({
          type: "step:failed",
          workflowId: state.workflowId,
          executionId,
          stepId: step.id,
          timestamp: Date.now(),
          error: result.error,
          data: {
            stepName: step.name,
            errorStack: result.errorStack,
          },
        });

        // Throw error if continueOnError is not set
        if (!step.continueOnError) {
          throw new Error(result.error || "Step execution failed");
        }
      } else if (result.status === "skipped") {
        state.skippedSteps.add(step.id);

        this.emitEvent({
          type: "step:skipped",
          workflowId: state.workflowId,
          executionId,
          stepId: step.id,
          timestamp: Date.now(),
          data: { stepName: step.name },
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.failedSteps.add(step.id);

      this.emitEvent({
        type: "step:failed",
        workflowId: state.workflowId,
        executionId,
        stepId: step.id,
        timestamp: Date.now(),
        error: err.message,
        data: {
          stepName: step.name,
          errorStack: err.stack,
        },
      });

      throw error;
    }

    state.currentStepId = undefined;
  }

  /**
   * Pause workflow execution
   */
  async pauseWorkflow(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (state.status !== "running") {
      throw new Error(`Cannot pause workflow in status: ${state.status}`);
    }

    state.status = "paused";
    state.pausedAt = Date.now();

    this.emitEvent({
      type: "workflow:paused",
      workflowId: state.workflowId,
      executionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Resume workflow execution
   */
  async resumeWorkflow(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (state.status !== "paused") {
      throw new Error(`Cannot resume workflow in status: ${state.status}`);
    }

    state.status = "running";
    state.pausedAt = undefined;

    this.emitEvent({
      type: "workflow:resumed",
      workflowId: state.workflowId,
      executionId,
      timestamp: Date.now(),
    });

    // Continue execution
    this.executeWorkflow(executionId).catch((error) => {
      console.error(`Workflow ${executionId} execution error:`, error);
    });
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (state.status === "completed" || state.status === "cancelled") {
      throw new Error(`Cannot cancel workflow in status: ${state.status}`);
    }

    // Abort execution
    state.abortController?.abort();
    state.status = "cancelled";
    state.completedAt = Date.now();

    this.emitEvent({
      type: "workflow:cancelled",
      workflowId: state.workflowId,
      executionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Get workflow execution state
   */
  getExecutionState(executionId: string): WorkflowExecutionState | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get workflow progress
   */
  getProgress(executionId: string): WorkflowProgress | undefined {
    const state = this.executions.get(executionId);
    if (!state) {
      return undefined;
    }

    const totalSteps = state.workflow.steps.length;
    const stepsCompleted = state.completedSteps.size + state.skippedSteps.size;
    const percentage = totalSteps > 0 ? (stepsCompleted / totalSteps) * 100 : 0;

    const elapsedTime = state.startedAt ? Date.now() - state.startedAt : 0;

    const avgTimePerStep =
      stepsCompleted > 0 ? elapsedTime / stepsCompleted : 0;
    const remainingSteps = totalSteps - stepsCompleted;
    const estimatedRemainingTime = avgTimePerStep * remainingSteps;

    return {
      percentage,
      currentStep: state.currentStepId,
      stepsCompleted,
      totalSteps,
      elapsedTime,
      estimatedRemainingTime,
    };
  }

  /**
   * List all executions
   */
  listExecutions(filter?: {
    workflowId?: string;
    status?: WorkflowExecutionStatus;
  }): WorkflowExecutionState[] {
    let executions = Array.from(this.executions.values());

    if (filter?.workflowId) {
      executions = executions.filter((e) => e.workflowId === filter.workflowId);
    }

    if (filter?.status) {
      executions = executions.filter((e) => e.status === filter.status);
    }

    return executions;
  }

  /**
   * Clean up completed executions
   */
  cleanupExecutions(olderThan?: number): number {
    const threshold = olderThan || Date.now() - 3600000; // 1 hour ago
    let cleaned = 0;

    for (const [executionId, state] of this.executions.entries()) {
      if (
        (state.status === "completed" ||
          state.status === "failed" ||
          state.status === "cancelled") &&
        state.completedAt &&
        state.completedAt < threshold
      ) {
        this.executions.delete(executionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Add event listener
   */
  on(
    eventType: WorkflowEventType | "*",
    listener: WorkflowEventListener,
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(
    eventType: WorkflowEventType | "*",
    listener: WorkflowEventListener,
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event
   */
  private emitEvent(event: WorkflowEvent): void {
    if (!this.config.enableEvents) {
      return;
    }

    // Emit to specific event listeners
    const specificListeners = this.eventListeners.get(event.type);
    if (specificListeners) {
      for (const listener of specificListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error("Event listener error:", error);
        }
      }
    }

    // Emit to wildcard listeners
    const wildcardListeners = this.eventListeners.get("*");
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error("Event listener error:", error);
        }
      }
    }
  }

  /**
   * Emit progress update event
   */
  private emitProgressUpdate(executionId: string): void {
    const progress = this.getProgress(executionId);
    if (!progress) {
      return;
    }

    const state = this.executions.get(executionId);
    if (!state) {
      return;
    }

    this.emitEvent({
      type: "progress:updated",
      workflowId: state.workflowId,
      executionId,
      timestamp: Date.now(),
      data: progress,
    });
  }

  /**
   * Calculate step execution order
   */
  private calculateStepOrder(steps: WorkflowStep[]): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    const visit = (stepId: string): void => {
      if (visited.has(stepId)) {
        return;
      }

      const step = stepMap.get(stepId);
      if (!step) {
        throw new Error(`Step not found: ${stepId}`);
      }

      // Visit dependencies first
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          visit(depId);
        }
      }

      visited.add(stepId);
      order.push(stepId);
    };

    // Visit all steps
    for (const step of steps) {
      visit(step.id);
    }

    return order;
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Shutdown engine
   */
  async shutdown(): Promise<void> {
    // Cancel all running workflows
    const runningExecutions = Array.from(this.executions.entries()).filter(
      ([_, state]) => state.status === "running" || state.status === "paused",
    );

    for (const [executionId, _] of runningExecutions) {
      try {
        await this.cancelWorkflow(executionId);
      } catch (error) {
        console.error(`Failed to cancel workflow ${executionId}:`, error);
      }
    }

    // Clear all data
    this.executions.clear();
    this.eventListeners.clear();
  }
}
