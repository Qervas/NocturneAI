/**
 * Workflow Factory
 *
 * Factory for creating and configuring workflow instances from configurations.
 *
 * Features:
 * - Parse workflow configurations
 * - Validate workflow definitions
 * - Build workflow execution graphs
 * - Resolve step dependencies
 * - Handle workflow variables and inputs/outputs
 * - Support for different workflow step types
 * - Circular dependency detection
 */

import type {
  WorkflowConfig,
  WorkflowStep,
  WorkflowStepType,
} from "../../infrastructure/config/WorkflowConfigParser.js";
import { WorkflowConfigParser } from "../../infrastructure/config/WorkflowConfigParser.js";
import { AgentFactory } from "./AgentFactory.js";
import { ToolFactory } from "./ToolFactory.js";

/**
 * Workflow Factory Configuration
 */
export interface WorkflowFactoryConfig {
  /** Agent factory for creating agents */
  agentFactory?: AgentFactory;

  /** Tool factory for resolving tools */
  toolFactory?: ToolFactory;

  /** Default timeout for workflow execution (ms) */
  defaultTimeout?: number;

  /** Default max retries */
  defaultMaxRetries?: number;

  /** Workflow configuration directory */
  workflowConfigDir?: string;

  /** Whether to validate workflows */
  validateWorkflows?: boolean;

  /** Whether to allow circular dependencies */
  allowCircularDependencies?: boolean;
}

/**
 * Workflow Creation Options
 */
export interface WorkflowCreationOptions {
  /** Override workflow ID */
  id?: string;

  /** Override workflow name */
  name?: string;

  /** Initial variable values */
  variables?: Record<string, any>;

  /** Override timeout */
  timeout?: number;

  /** Override max retries */
  maxRetries?: number;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Workflow Instance
 */
export interface WorkflowInstance {
  /** Workflow ID */
  id: string;

  /** Workflow name */
  name: string;

  /** Workflow description */
  description?: string;

  /** Workflow configuration */
  config: WorkflowConfig;

  /** Execution graph */
  executionGraph: ExecutionGraph;

  /** Variable context */
  variables: Record<string, any>;

  /** Creation timestamp */
  createdAt: number;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Execution Graph
 */
export interface ExecutionGraph {
  /** All steps indexed by ID */
  steps: Map<string, ExecutionNode>;

  /** Entry points (steps with no dependencies) */
  entryPoints: string[];

  /** Exit points (steps with no dependents) */
  exitPoints: string[];

  /** Dependency relationships */
  dependencies: Map<string, string[]>;

  /** Reverse dependencies (dependents) */
  dependents: Map<string, string[]>;

  /** Execution order (topologically sorted) */
  executionOrder: string[];
}

/**
 * Execution Node
 */
export interface ExecutionNode {
  /** Step configuration */
  step: WorkflowStep;

  /** Step index in execution order */
  index: number;

  /** Whether step is a leaf node */
  isLeaf: boolean;

  /** Whether step is a root node */
  isRoot: boolean;

  /** Parallel group ID (if part of parallel execution) */
  parallelGroup?: string;
}

/**
 * Workflow Validation Result
 */
export interface WorkflowValidationResult {
  /** Whether workflow is valid */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}

/**
 * Workflow Factory
 */
export class WorkflowFactory {
  private config: WorkflowFactoryConfig;
  private configParser: WorkflowConfigParser;
  private agentFactory?: AgentFactory;
  private toolFactory?: ToolFactory;

  constructor(config: WorkflowFactoryConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      defaultMaxRetries: config.defaultMaxRetries || 3,
      workflowConfigDir: config.workflowConfigDir,
      validateWorkflows: config.validateWorkflows !== false,
      allowCircularDependencies: config.allowCircularDependencies || false,
    };

    this.agentFactory = config.agentFactory;
    this.toolFactory = config.toolFactory;
    this.configParser = new WorkflowConfigParser();
  }

  /**
   * Create a workflow instance from configuration
   */
  async createWorkflow(
    config: WorkflowConfig,
    options: WorkflowCreationOptions = {},
  ): Promise<WorkflowInstance> {
    // Merge with options
    const mergedConfig = this.mergeConfig(config, options);

    // Validate workflow
    if (this.config.validateWorkflows) {
      const validation = await this.validateWorkflow(mergedConfig);
      if (!validation.valid) {
        throw new Error(
          `Invalid workflow configuration: ${validation.errors.join(", ")}`,
        );
      }
    }

    // Build execution graph
    const executionGraph = this.buildExecutionGraph(mergedConfig);

    // Initialize variables
    const variables = this.initializeVariables(mergedConfig, options);

    return {
      id: mergedConfig.id,
      name: mergedConfig.name,
      description: mergedConfig.description,
      config: mergedConfig,
      executionGraph,
      variables,
      createdAt: Date.now(),
      metadata: options.metadata,
    };
  }

  /**
   * Create a workflow from configuration file
   */
  async createWorkflowFromFile(
    filePath: string,
    options: WorkflowCreationOptions = {},
  ): Promise<WorkflowInstance> {
    // For now, we need to manually parse the file
    // The configParser.parseFile method needs to be implemented
    throw new Error("createWorkflowFromFile not yet implemented");
  }

  /**
   * Create multiple workflows from configurations
   */
  async createWorkflows(
    configs: WorkflowConfig[],
    options: WorkflowCreationOptions = {},
  ): Promise<WorkflowInstance[]> {
    const workflows: WorkflowInstance[] = [];

    for (const config of configs) {
      try {
        const workflow = await this.createWorkflow(config, options);
        workflows.push(workflow);
      } catch (error) {
        console.warn(`Failed to create workflow ${config.name}:`, error);
      }
    }

    return workflows;
  }

  /**
   * Validate a workflow configuration
   */
  async validateWorkflow(
    config: WorkflowConfig,
  ): Promise<WorkflowValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic structure
    if (!config.id) {
      errors.push("Workflow ID is required");
    }

    if (!config.name) {
      errors.push("Workflow name is required");
    }

    if (!config.steps || config.steps.length === 0) {
      errors.push("Workflow must have at least one step");
    }

    // Validate steps
    if (config.steps) {
      const stepIds = new Set<string>();

      for (const step of config.steps) {
        // Check for duplicate step IDs
        if (stepIds.has(step.id)) {
          errors.push(`Duplicate step ID: ${step.id}`);
        }
        stepIds.add(step.id);

        // Validate step structure
        if (!step.name) {
          errors.push(`Step ${step.id} is missing a name`);
        }

        if (!step.type) {
          errors.push(`Step ${step.id} is missing a type`);
        }

        // Validate step type specific requirements
        if (step.type === "agent" && !step.agentId) {
          errors.push(`Agent step ${step.id} is missing agentId`);
        }

        if (step.type === "task" && !step.task) {
          errors.push(`Task step ${step.id} is missing task configuration`);
        }

        if (step.type === "tool" && !step.toolId) {
          errors.push(`Tool step ${step.id} is missing toolId`);
        }

        // Validate dependencies exist
        if (step.dependencies) {
          for (const depId of step.dependencies) {
            if (!stepIds.has(depId)) {
              errors.push(
                `Step ${step.id} depends on non-existent step: ${depId}`,
              );
            }
          }
        }
      }

      // Check for circular dependencies
      if (!this.config.allowCircularDependencies) {
        const circular = this.detectCircularDependencies(config.steps);
        if (circular.length > 0) {
          errors.push(
            `Circular dependencies detected: ${circular.join(" -> ")}`,
          );
        }
      }

      // Check for unreachable steps
      const reachable = this.findReachableSteps(config.steps);
      if (reachable.size < stepIds.size) {
        const unreachable = Array.from(stepIds).filter(
          (id) => !reachable.has(id),
        );
        warnings.push(`Unreachable steps detected: ${unreachable.join(", ")}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build execution graph from workflow steps
   */
  private buildExecutionGraph(config: WorkflowConfig): ExecutionGraph {
    const steps = new Map<string, ExecutionNode>();
    const dependencies = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    // Initialize maps
    for (const step of config.steps) {
      dependencies.set(step.id, step.dependencies || []);
      dependents.set(step.id, []);
    }

    // Build reverse dependencies (dependents)
    for (const [stepId, deps] of dependencies.entries()) {
      for (const depId of deps) {
        const stepDependents = dependents.get(depId) || [];
        stepDependents.push(stepId);
        dependents.set(depId, stepDependents);
      }
    }

    // Find entry and exit points
    const entryPoints: string[] = [];
    const exitPoints: string[] = [];

    for (const step of config.steps) {
      const isRoot = (dependencies.get(step.id) || []).length === 0;
      const isLeaf = (dependents.get(step.id) || []).length === 0;

      if (isRoot) {
        entryPoints.push(step.id);
      }

      if (isLeaf) {
        exitPoints.push(step.id);
      }

      steps.set(step.id, {
        step,
        index: 0, // Will be set during topological sort
        isLeaf,
        isRoot,
      });
    }

    // Perform topological sort to get execution order
    const executionOrder = this.topologicalSort(config.steps, dependencies);

    // Update indices
    executionOrder.forEach((stepId, index) => {
      const node = steps.get(stepId);
      if (node) {
        node.index = index;
      }
    });

    return {
      steps,
      entryPoints,
      exitPoints,
      dependencies,
      dependents,
      executionOrder,
    };
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(
    steps: WorkflowStep[],
    dependencies: Map<string, string[]>,
  ): string[] {
    const sorted: string[] = [];
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // Calculate in-degrees
    for (const step of steps) {
      inDegree.set(step.id, (dependencies.get(step.id) || []).length);
      if (inDegree.get(step.id) === 0) {
        queue.push(step.id);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const stepId = queue.shift()!;
      sorted.push(stepId);

      // Reduce in-degree for dependents
      for (const step of steps) {
        const deps = dependencies.get(step.id) || [];
        if (deps.includes(stepId)) {
          const degree = inDegree.get(step.id)! - 1;
          inDegree.set(step.id, degree);

          if (degree === 0) {
            queue.push(step.id);
          }
        }
      }
    }

    return sorted;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(steps: WorkflowStep[]): string[] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycle: string[] = [];

    const dfs = (stepId: string, path: string[]): boolean => {
      visited.add(stepId);
      recStack.add(stepId);
      path.push(stepId);

      const step = steps.find((s) => s.id === stepId);
      if (step && step.dependencies) {
        for (const depId of step.dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId, path)) {
              return true;
            }
          } else if (recStack.has(depId)) {
            // Found cycle
            const cycleStart = path.indexOf(depId);
            cycle.push(...path.slice(cycleStart), depId);
            return true;
          }
        }
      }

      recStack.delete(stepId);
      path.pop();
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (dfs(step.id, [])) {
          break;
        }
      }
    }

    return cycle;
  }

  /**
   * Find reachable steps from entry points
   */
  private findReachableSteps(steps: WorkflowStep[]): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [];

    // Find entry points (steps with no dependencies)
    for (const step of steps) {
      if (!step.dependencies || step.dependencies.length === 0) {
        queue.push(step.id);
        reachable.add(step.id);
      }
    }

    // BFS to find all reachable steps
    while (queue.length > 0) {
      const stepId = queue.shift()!;

      for (const step of steps) {
        if (step.dependencies && step.dependencies.includes(stepId)) {
          if (!reachable.has(step.id)) {
            reachable.add(step.id);
            queue.push(step.id);
          }
        }
      }
    }

    return reachable;
  }

  /**
   * Initialize workflow variables
   */
  private initializeVariables(
    config: WorkflowConfig,
    options: WorkflowCreationOptions,
  ): Record<string, any> {
    const variables: Record<string, any> = {
      ...config.variables,
      ...options.variables,
    };

    // Initialize input variables with default values
    if (config.inputs) {
      for (const input of config.inputs) {
        if (
          variables[input.name] === undefined &&
          input.default !== undefined
        ) {
          variables[input.name] = input.default;
        }
      }
    }

    return variables;
  }

  /**
   * Merge configuration with options
   */
  private mergeConfig(
    config: WorkflowConfig,
    options: WorkflowCreationOptions,
  ): WorkflowConfig {
    return {
      ...config,
      id: options.id || config.id,
      name: options.name || config.name,
      timeout: options.timeout || config.timeout || this.config.defaultTimeout,
      maxRetries:
        options.maxRetries ||
        config.maxRetries ||
        this.config.defaultMaxRetries,
      variables: {
        ...config.variables,
        ...options.variables,
      },
      metadata: {
        ...config.metadata,
        ...options.metadata,
      },
    };
  }

  /**
   * Get agent factory
   */
  getAgentFactory(): AgentFactory | undefined {
    return this.agentFactory;
  }

  /**
   * Set agent factory
   */
  setAgentFactory(factory: AgentFactory): void {
    this.agentFactory = factory;
  }

  /**
   * Get tool factory
   */
  getToolFactory(): ToolFactory | undefined {
    return this.toolFactory;
  }

  /**
   * Set tool factory
   */
  setToolFactory(factory: ToolFactory): void {
    this.toolFactory = factory;
  }

  /**
   * Get factory configuration
   */
  getConfig(): Readonly<WorkflowFactoryConfig> {
    return { ...this.config };
  }

  /**
   * Get workflow configuration parser
   */
  getConfigParser(): WorkflowConfigParser {
    return this.configParser;
  }

  /**
   * Create a simple sequential workflow
   */
  async createSequentialWorkflow(
    name: string,
    steps: Array<{
      id: string;
      name: string;
      type: WorkflowStepType;
      config?: any;
    }>,
    options: WorkflowCreationOptions = {},
  ): Promise<WorkflowInstance> {
    const workflowSteps: WorkflowStep[] = steps.map((step, index) => ({
      id: step.id,
      name: step.name,
      type: step.type,
      dependencies: index > 0 ? [steps[index - 1].id] : [],
      ...step.config,
    }));

    const config: WorkflowConfig = {
      id: options.id || this.generateWorkflowId(),
      name,
      steps: workflowSteps,
    };

    return this.createWorkflow(config, options);
  }

  /**
   * Create a parallel workflow
   */
  async createParallelWorkflow(
    name: string,
    steps: Array<{
      id: string;
      name: string;
      type: WorkflowStepType;
      config?: any;
    }>,
    options: WorkflowCreationOptions = {},
  ): Promise<WorkflowInstance> {
    const workflowSteps: WorkflowStep[] = steps.map((step) => ({
      id: step.id,
      name: step.name,
      type: step.type,
      dependencies: [], // No dependencies - all run in parallel
      ...step.config,
    }));

    const config: WorkflowConfig = {
      id: options.id || this.generateWorkflowId(),
      name,
      steps: workflowSteps,
    };

    return this.createWorkflow(config, options);
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
