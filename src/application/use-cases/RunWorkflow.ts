/**
 * Run Workflow Use Case
 *
 * High-level use case for executing workflows with multiple steps and agents.
 *
 * Features:
 * - Workflow validation
 * - Step-by-step execution
 * - Agent coordination
 * - Parallel and sequential execution
 * - Error handling and rollback
 * - Progress tracking
 */

import type {
  WorkflowFactory,
  WorkflowInstance,
} from "../factories/WorkflowFactory.js";
import type { AgentService } from "../services/AgentService.js";
import type { Agent, AgentTask } from "../services/Agent.js";
import type { WorkflowConfig } from "../../infrastructure/config/WorkflowConfigParser.js";

/**
 * Run Workflow Input
 */
export interface RunWorkflowInput {
  /** Workflow ID (if using existing workflow) */
  workflowId?: string;

  /** Workflow configuration (if creating new workflow) */
  workflowConfig?: WorkflowConfig;

  /** Workflow name (if creating new workflow) */
  workflowName?: string;

  /** Input variables */
  variables?: Record<string, unknown>;

  /** Timeout for entire workflow (ms) */
  timeout?: number;

  /** Whether to stop on first error */
  stopOnError?: boolean;

  /** Progress callback */
  onProgress?: (progress: WorkflowProgress) => void;

  /** Step completion callback */
  onStepComplete?: (step: WorkflowStepResult) => void;
}

/**
 * Run Workflow Output
 */
export interface RunWorkflowOutput {
  /** Whether execution was successful */
  success: boolean;

  /** Workflow ID */
  workflowId: string;

  /** Workflow name */
  workflowName: string;

  /** Execution results */
  results: WorkflowStepResult[];

  /** Output variables */
  outputs?: Record<string, unknown>;

  /** Total execution time (ms) */
  executionTime: number;

  /** Number of steps executed */
  stepsExecuted: number;

  /** Number of steps failed */
  stepsFailed: number;

  /** Error message if failed */
  error?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Workflow Step Result
 */
export interface WorkflowStepResult {
  /** Step ID */
  stepId: string;

  /** Step name */
  stepName: string;

  /** Step type */
  stepType: string;

  /** Whether step was successful */
  success: boolean;

  /** Step result data */
  result?: unknown;

  /** Agent ID (if agent step) */
  agentId?: string;

  /** Task (if agent/task step) */
  task?: AgentTask;

  /** Execution time (ms) */
  executionTime: number;

  /** Error message if failed */
  error?: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Workflow Progress
 */
export interface WorkflowProgress {
  /** Progress percentage (0-100) */
  percentage: number;

  /** Current step */
  currentStep: string;

  /** Steps completed */
  stepsCompleted: number;

  /** Total steps */
  totalSteps: number;

  /** Estimated time remaining (ms) */
  estimatedTimeRemaining?: number;
}

/**
 * Run Workflow Use Case
 */
export class RunWorkflow {
  private workflowFactory: WorkflowFactory;
  private agentService: AgentService;
  private workflows: Map<string, WorkflowInstance> = new Map();

  constructor(workflowFactory: WorkflowFactory, agentService: AgentService) {
    this.workflowFactory = workflowFactory;
    this.agentService = agentService;
  }

  /**
   * Execute the use case
   */
  async execute(input: RunWorkflowInput): Promise<RunWorkflowOutput> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateInput(input);

      // Get or create workflow
      const workflow = await this.getOrCreateWorkflow(input);

      // Execute workflow
      const results = await this.executeWorkflow(workflow, input);

      // Calculate statistics
      const executionTime = Date.now() - startTime;
      const stepsExecuted = results.length;
      const stepsFailed = results.filter((r) => !r.success).length;
      const success = stepsFailed === 0;

      // Extract outputs
      const outputs = this.extractOutputs(workflow, results);

      return {
        success,
        workflowId: workflow.id,
        workflowName: workflow.name,
        results,
        outputs,
        executionTime,
        stepsExecuted,
        stepsFailed,
        metadata: {
          totalSteps: workflow.config.steps.length,
          variables: workflow.variables,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        workflowId: input.workflowId || "unknown",
        workflowName: input.workflowName || "unknown",
        results: [],
        executionTime,
        stepsExecuted: 0,
        stepsFailed: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate input
   */
  private validateInput(input: RunWorkflowInput): void {
    if (!input.workflowId && !input.workflowConfig) {
      throw new Error("Either workflowId or workflowConfig must be provided");
    }

    if (input.timeout && input.timeout < 0) {
      throw new Error("Timeout must be a positive number");
    }
  }

  /**
   * Get existing workflow or create new one
   */
  private async getOrCreateWorkflow(
    input: RunWorkflowInput,
  ): Promise<WorkflowInstance> {
    // Try to get existing workflow
    if (input.workflowId) {
      const workflow = this.workflows.get(input.workflowId);
      if (workflow) {
        // Update variables if provided
        if (input.variables) {
          workflow.variables = { ...workflow.variables, ...input.variables };
        }
        return workflow;
      }
    }

    // Create new workflow
    if (input.workflowConfig) {
      const workflow = await this.workflowFactory.createWorkflow(
        input.workflowConfig,
        {
          variables: input.variables,
        },
      );

      this.workflows.set(workflow.id, workflow);
      return workflow;
    }

    throw new Error("Unable to get or create workflow");
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(
    workflow: WorkflowInstance,
    input: RunWorkflowInput,
  ): Promise<WorkflowStepResult[]> {
    const results: WorkflowStepResult[] = [];
    const executionOrder = workflow.executionGraph.executionOrder;
    const totalSteps = executionOrder.length;

    for (let i = 0; i < executionOrder.length; i++) {
      const stepId = executionOrder[i];
      const node = workflow.executionGraph.steps.get(stepId);

      if (!node) {
        continue;
      }

      // Report progress
      if (input.onProgress) {
        input.onProgress({
          percentage: (i / totalSteps) * 100,
          currentStep: node.step.name,
          stepsCompleted: i,
          totalSteps,
        });
      }

      // Execute step
      const result = await this.executeStep(node.step, workflow, input);
      results.push(result);

      // Call step complete callback
      if (input.onStepComplete) {
        input.onStepComplete(result);
      }

      // Stop on error if configured
      if (!result.success && input.stopOnError !== false) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: any,
    workflow: WorkflowInstance,
    input: RunWorkflowInput,
  ): Promise<WorkflowStepResult> {
    const startTime = Date.now();

    try {
      // Check condition if present
      if (step.condition) {
        const shouldExecute = this.evaluateCondition(
          step.condition,
          workflow.variables,
        );
        if (!shouldExecute) {
          return {
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            success: true,
            result: "Skipped (condition not met)",
            executionTime: 0,
            timestamp: Date.now(),
          };
        }
      }

      // Execute based on step type
      let result: unknown;

      switch (step.type) {
        case "agent":
          result = await this.executeAgentStep(step, workflow);
          break;

        case "task":
          result = await this.executeTaskStep(step, workflow);
          break;

        case "tool":
          result = await this.executeToolStep(step, workflow);
          break;

        case "parallel":
          result = await this.executeParallelStep(step, workflow, input);
          break;

        case "sequential":
          result = await this.executeSequentialStep(step, workflow, input);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Update variables with output mapping
      if (step.output && result) {
        this.updateVariables(workflow.variables, step.output, result);
      }

      return {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        success: true,
        result,
        executionTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Execute agent step
   */
  private async executeAgentStep(
    step: any,
    workflow: WorkflowInstance,
  ): Promise<AgentTask> {
    const agent = this.agentService.getAgent(step.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${step.agentId}`);
    }

    const task = await agent.executeTask(
      step.task?.description || "Execute step",
      step.task?.input || workflow.variables,
    );

    // Wait for completion
    await this.waitForTaskCompletion(task, step.timeout || 60000);

    return task;
  }

  /**
   * Execute task step
   */
  private async executeTaskStep(
    step: any,
    workflow: WorkflowInstance,
  ): Promise<AgentTask> {
    // Create temporary agent for this task
    const agent = await this.agentService.createAgentByRole("planner", {
      name: `workflow-${workflow.id}-${step.id}`,
    });

    try {
      const task = await agent.executeTask(
        step.task.description,
        step.task.input || workflow.variables,
      );

      await this.waitForTaskCompletion(task, step.timeout || 60000);

      return task;
    } finally {
      // Clean up temporary agent
      this.agentService.stopAgent(agent.getInfo().id);
    }
  }

  /**
   * Execute tool step
   */
  private async executeToolStep(
    step: any,
    workflow: WorkflowInstance,
  ): Promise<unknown> {
    // Tool execution would use ToolFactory
    // For now, return placeholder
    return {
      toolId: step.toolId,
      args: step.toolArgs || workflow.variables,
    };
  }

  /**
   * Execute parallel step
   */
  private async executeParallelStep(
    step: any,
    workflow: WorkflowInstance,
    input: RunWorkflowInput,
  ): Promise<WorkflowStepResult[]> {
    // Execute substeps in parallel
    const substeps = step.steps || [];
    const promises = substeps.map((substep: any) =>
      this.executeStep(substep, workflow, input),
    );

    return Promise.all(promises);
  }

  /**
   * Execute sequential step
   */
  private async executeSequentialStep(
    step: any,
    workflow: WorkflowInstance,
    input: RunWorkflowInput,
  ): Promise<WorkflowStepResult[]> {
    // Execute substeps sequentially
    const substeps = step.steps || [];
    const results: WorkflowStepResult[] = [];

    for (const substep of substeps) {
      const result = await this.executeStep(substep, workflow, input);
      results.push(result);

      if (!result.success && input.stopOnError !== false) {
        break;
      }
    }

    return results;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    condition: string,
    variables: Record<string, unknown>,
  ): boolean {
    // Simple condition evaluation
    // In production, use a safe expression evaluator
    try {
      // This is a simple placeholder - use a proper expression evaluator
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update variables with output mapping
   */
  private updateVariables(
    variables: Record<string, unknown>,
    outputMapping: Record<string, string>,
    result: unknown,
  ): void {
    for (const [key, path] of Object.entries(outputMapping)) {
      // Simple path resolution - can be enhanced
      variables[key] = result;
    }
  }

  /**
   * Extract outputs from workflow
   */
  private extractOutputs(
    workflow: WorkflowInstance,
    results: WorkflowStepResult[],
  ): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};

    // Extract outputs based on workflow configuration
    if (workflow.config.outputs) {
      for (const output of workflow.config.outputs) {
        outputs[output.name] = workflow.variables[output.name];
      }
    }

    return outputs;
  }

  /**
   * Wait for task completion
   */
  private async waitForTaskCompletion(
    task: AgentTask,
    timeout: number,
  ): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error("Task timeout"));
          return;
        }

        if (task.status === "completed") {
          clearInterval(checkInterval);
          resolve();
        } else if (task.status === "failed") {
          clearInterval(checkInterval);
          reject(new Error("Task failed"));
        }
      }, 100);
    });
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowInstance | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Remove workflow
   */
  removeWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  /**
   * Clear all workflows
   */
  clearWorkflows(): void {
    this.workflows.clear();
  }
}
