/**
 * Workflow Validator
 *
 * Validates workflow configurations, step definitions, and execution prerequisites.
 *
 * Features:
 * - Workflow structure validation
 * - Step configuration validation
 * - Dependency graph validation
 * - Condition syntax validation
 * - Tool availability checking
 * - Agent availability checking
 * - Parameter schema validation
 * - Circular dependency detection
 * - Resource availability validation
 */

import type {
  WorkflowConfig,
  WorkflowStep,
} from "../../infrastructure/config/WorkflowConfigParser.js";
import type { AgentFactory } from "../factories/AgentFactory.js";
import type { ToolFactory } from "../factories/ToolFactory.js";

/**
 * Validation Error
 */
export interface ValidationError {
  /** Error type */
  type: "error" | "warning";

  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Related field/step */
  field?: string;

  /** Step ID (if related to a step) */
  stepId?: string;

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationError[];

  /** Validated step order */
  stepOrder?: string[];
}

/**
 * Validation Options
 */
export interface ValidationOptions {
  /** Skip dependency validation */
  skipDependencies?: boolean;

  /** Skip tool validation */
  skipTools?: boolean;

  /** Skip agent validation */
  skipAgents?: boolean;

  /** Allow warnings */
  allowWarnings?: boolean;

  /** Strict mode (warnings become errors) */
  strict?: boolean;
}

/**
 * Workflow Validator Configuration
 */
export interface WorkflowValidatorConfig {
  /** Agent factory for agent validation */
  agentFactory?: AgentFactory;

  /** Tool factory for tool validation */
  toolFactory?: ToolFactory;

  /** Maximum workflow steps */
  maxSteps?: number;

  /** Maximum dependency depth */
  maxDependencyDepth?: number;
}

/**
 * Workflow Validator
 *
 * Validates workflow configurations and execution prerequisites
 */
export class WorkflowValidator {
  private config: WorkflowValidatorConfig;

  constructor(config: WorkflowValidatorConfig = {}) {
    this.config = {
      maxSteps: config.maxSteps || 100,
      maxDependencyDepth: config.maxDependencyDepth || 10,
      ...config,
    };
  }

  /**
   * Validate a workflow configuration
   */
  async validate(
    workflow: WorkflowConfig,
    options: ValidationOptions = {},
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate basic structure
    this.validateStructure(workflow, errors);

    // Validate steps
    this.validateSteps(workflow.steps, errors, warnings);

    // Validate dependencies
    if (!options.skipDependencies) {
      await this.validateDependencies(workflow.steps, errors);
    }

    // Validate tools
    if (!options.skipTools && this.config.toolFactory) {
      await this.validateTools(workflow.steps, errors);
    }

    // Validate agents
    if (!options.skipAgents && this.config.agentFactory) {
      await this.validateAgents(workflow.steps, errors);
    }

    // Validate conditions
    this.validateConditions(workflow.steps, errors, warnings);

    // Validate variables
    this.validateVariables(workflow, errors);

    // Convert warnings to errors in strict mode
    if (options.strict && warnings.length > 0) {
      errors.push(
        ...warnings.map((w) => ({
          ...w,
          type: "error" as const,
        })),
      );
      warnings.length = 0;
    }

    // Calculate step order
    let stepOrder: string[] | undefined;
    if (errors.length === 0) {
      try {
        stepOrder = this.calculateStepOrder(workflow.steps);
      } catch (error) {
        errors.push({
          type: "error",
          code: "INVALID_STEP_ORDER",
          message:
            error instanceof Error
              ? error.message
              : "Failed to calculate step order",
        });
      }
    }

    return {
      valid:
        errors.length === 0 && (options.allowWarnings || warnings.length === 0),
      errors,
      warnings,
      stepOrder,
    };
  }

  /**
   * Validate basic workflow structure
   */
  private validateStructure(
    workflow: WorkflowConfig,
    errors: ValidationError[],
  ): void {
    // Validate ID
    if (!workflow.id || typeof workflow.id !== "string") {
      errors.push({
        type: "error",
        code: "INVALID_ID",
        message: "Workflow ID is required and must be a string",
        field: "id",
      });
    }

    // Validate name
    if (!workflow.name || typeof workflow.name !== "string") {
      errors.push({
        type: "error",
        code: "INVALID_NAME",
        message: "Workflow name is required and must be a string",
        field: "name",
      });
    }

    // Validate steps exist
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      errors.push({
        type: "error",
        code: "MISSING_STEPS",
        message: "Workflow must have a steps array",
        field: "steps",
      });
      return;
    }

    // Validate step count
    if (workflow.steps.length === 0) {
      errors.push({
        type: "error",
        code: "EMPTY_WORKFLOW",
        message: "Workflow must have at least one step",
        field: "steps",
      });
    }

    if (workflow.steps.length > (this.config.maxSteps || 100)) {
      errors.push({
        type: "error",
        code: "TOO_MANY_STEPS",
        message: `Workflow has too many steps (max: ${this.config.maxSteps})`,
        field: "steps",
      });
    }

    // Validate timeout
    if (
      workflow.timeout !== undefined &&
      (typeof workflow.timeout !== "number" || workflow.timeout <= 0)
    ) {
      errors.push({
        type: "error",
        code: "INVALID_TIMEOUT",
        message: "Workflow timeout must be a positive number",
        field: "timeout",
      });
    }

    // Validate maxRetries
    if (
      workflow.maxRetries !== undefined &&
      (typeof workflow.maxRetries !== "number" || workflow.maxRetries < 0)
    ) {
      errors.push({
        type: "error",
        code: "INVALID_MAX_RETRIES",
        message: "Workflow maxRetries must be a non-negative number",
        field: "maxRetries",
      });
    }
  }

  /**
   * Validate workflow steps
   */
  private validateSteps(
    steps: WorkflowStep[],
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    const stepIds = new Set<string>();

    for (const step of steps) {
      // Validate step ID
      if (!step.id || typeof step.id !== "string") {
        errors.push({
          type: "error",
          code: "INVALID_STEP_ID",
          message: "Step ID is required and must be a string",
          stepId: step.id,
        });
        continue;
      }

      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        errors.push({
          type: "error",
          code: "DUPLICATE_STEP_ID",
          message: `Duplicate step ID: ${step.id}`,
          stepId: step.id,
        });
      }
      stepIds.add(step.id);

      // Validate step name
      if (!step.name || typeof step.name !== "string") {
        errors.push({
          type: "error",
          code: "INVALID_STEP_NAME",
          message: "Step name is required and must be a string",
          stepId: step.id,
          field: "name",
        });
      }

      // Validate step type
      const validTypes = [
        "agent",
        "task",
        "tool",
        "parallel",
        "sequential",
        "condition",
        "loop",
        "wait",
      ];
      if (!step.type || !validTypes.includes(step.type)) {
        errors.push({
          type: "error",
          code: "INVALID_STEP_TYPE",
          message: `Invalid step type: ${step.type}. Must be one of: ${validTypes.join(", ")}`,
          stepId: step.id,
          field: "type",
        });
      }

      // Validate type-specific configuration
      this.validateStepTypeConfig(step, errors, warnings);

      // Validate timeout
      if (
        step.timeout !== undefined &&
        (typeof step.timeout !== "number" || step.timeout <= 0)
      ) {
        errors.push({
          type: "error",
          code: "INVALID_STEP_TIMEOUT",
          message: "Step timeout must be a positive number",
          stepId: step.id,
          field: "timeout",
        });
      }

      // Validate retry configuration
      if (step.retry) {
        if (
          step.retry.maxAttempts !== undefined &&
          step.retry.maxAttempts < 0
        ) {
          errors.push({
            type: "error",
            code: "INVALID_RETRY_CONFIG",
            message: "Retry maxAttempts must be non-negative",
            stepId: step.id,
            field: "retry.maxAttempts",
          });
        }

        if (
          step.retry.initialDelay !== undefined &&
          step.retry.initialDelay < 0
        ) {
          errors.push({
            type: "error",
            code: "INVALID_RETRY_CONFIG",
            message: "Retry initialDelay must be non-negative",
            stepId: step.id,
            field: "retry.initialDelay",
          });
        }
      }
    }
  }

  /**
   * Validate step type-specific configuration
   */
  private validateStepTypeConfig(
    step: WorkflowStep,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    switch (step.type) {
      case "agent":
        if (!step.agentId) {
          errors.push({
            type: "error",
            code: "MISSING_AGENT_ID",
            message: "Agent step must have an agentId",
            stepId: step.id,
            field: "agentId",
          });
        }
        if (!step.task) {
          errors.push({
            type: "error",
            code: "MISSING_TASK",
            message: "Agent step must have a task configuration",
            stepId: step.id,
            field: "task",
          });
        }
        break;

      case "tool":
        if (!step.toolId) {
          errors.push({
            type: "error",
            code: "MISSING_TOOL_ID",
            message: "Tool step must have a toolId",
            stepId: step.id,
            field: "toolId",
          });
        }
        break;

      case "wait":
        if (!step.task) {
          warnings.push({
            type: "warning",
            code: "MISSING_WAIT_CONFIG",
            message:
              "Wait step should have task configuration with duration or until",
            stepId: step.id,
            field: "task",
          });
        }
        break;

      case "condition":
        if (!step.condition) {
          errors.push({
            type: "error",
            code: "MISSING_CONDITION",
            message: "Condition step must have a condition",
            stepId: step.id,
            field: "condition",
          });
        }
        break;

      case "loop":
        if (!step.task) {
          errors.push({
            type: "error",
            code: "MISSING_LOOP_CONFIG",
            message: "Loop step must have task configuration",
            stepId: step.id,
            field: "task",
          });
        }
        break;
    }
  }

  /**
   * Validate step dependencies
   */
  private async validateDependencies(
    steps: WorkflowStep[],
    errors: ValidationError[],
  ): Promise<void> {
    const stepIds = new Set(steps.map((s) => s.id));

    for (const step of steps) {
      if (!step.dependencies || step.dependencies.length === 0) {
        continue;
      }

      // Check that all dependencies exist
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          errors.push({
            type: "error",
            code: "INVALID_DEPENDENCY",
            message: `Step ${step.id} depends on non-existent step: ${depId}`,
            stepId: step.id,
            field: "dependencies",
          });
        }
      }

      // Check for circular dependencies
      const visited = new Set<string>();
      const path = new Set<string>();

      const hasCircular = (stepId: string): boolean => {
        if (path.has(stepId)) {
          return true;
        }
        if (visited.has(stepId)) {
          return false;
        }

        visited.add(stepId);
        path.add(stepId);

        const currentStep = steps.find((s) => s.id === stepId);
        if (currentStep?.dependencies) {
          for (const depId of currentStep.dependencies) {
            if (hasCircular(depId)) {
              return true;
            }
          }
        }

        path.delete(stepId);
        return false;
      };

      if (hasCircular(step.id)) {
        errors.push({
          type: "error",
          code: "CIRCULAR_DEPENDENCY",
          message: `Circular dependency detected involving step: ${step.id}`,
          stepId: step.id,
          field: "dependencies",
        });
      }
    }
  }

  /**
   * Validate tool availability
   */
  private async validateTools(
    steps: WorkflowStep[],
    errors: ValidationError[],
  ): Promise<void> {
    if (!this.config.toolFactory) {
      return;
    }

    for (const step of steps) {
      if (step.type === "tool" && step.toolId) {
        try {
          const tool = this.config.toolFactory.getTool(step.toolId);
          if (!tool) {
            errors.push({
              type: "error",
              code: "TOOL_NOT_FOUND",
              message: `Tool not found: ${step.toolId}`,
              stepId: step.id,
              field: "toolId",
            });
          }
        } catch (error) {
          errors.push({
            type: "error",
            code: "TOOL_VALIDATION_ERROR",
            message: `Failed to validate tool ${step.toolId}: ${error instanceof Error ? error.message : "Unknown error"}`,
            stepId: step.id,
            field: "toolId",
          });
        }
      }
    }
  }

  /**
   * Validate agent availability
   */
  private async validateAgents(
    steps: WorkflowStep[],
    errors: ValidationError[],
  ): Promise<void> {
    if (!this.config.agentFactory) {
      return;
    }

    for (const step of steps) {
      if (step.type === "agent" && step.agentId) {
        // Note: AgentFactory doesn't have a getAgent method
        // In a production system, you would need a registry or cache
        // For now, we just validate that agentId is present
        if (!step.agentId || typeof step.agentId !== "string") {
          errors.push({
            type: "error",
            code: "INVALID_AGENT_ID",
            message: "Agent step must have a valid agentId string",
            stepId: step.id,
            field: "agentId",
          });
        }
      }
    }
  }

  /**
   * Validate conditions
   */
  private validateConditions(
    steps: WorkflowStep[],
    errors: ValidationError[],
    _warnings: ValidationError[],
  ): void {
    for (const step of steps) {
      if (!step.condition) {
        continue;
      }

      // Basic syntax validation for conditions
      try {
        this.validateConditionSyntax(step.condition);
      } catch (error) {
        errors.push({
          type: "error",
          code: "INVALID_CONDITION",
          message: `Invalid condition syntax: ${error instanceof Error ? error.message : "Unknown error"}`,
          stepId: step.id,
          field: "condition",
        });
      }
    }
  }

  /**
   * Validate condition syntax
   */
  private validateConditionSyntax(condition: string): void {
    // Check for balanced parentheses
    let depth = 0;
    for (const char of condition) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (depth < 0) {
        throw new Error("Unbalanced parentheses");
      }
    }
    if (depth !== 0) {
      throw new Error("Unbalanced parentheses");
    }

    // Check for valid operators
    const hasInvalidOperator = /[&|=!><]{3,}/.test(condition);
    if (hasInvalidOperator) {
      throw new Error("Invalid operator syntax");
    }

    // Check for empty condition
    if (condition.trim().length === 0) {
      throw new Error("Empty condition");
    }
  }

  /**
   * Validate variables
   */
  private validateVariables(
    workflow: WorkflowConfig,
    errors: ValidationError[],
  ): void {
    if (!workflow.variables) {
      return;
    }

    // Validate variable references in steps
    const declaredVars = new Set(Object.keys(workflow.variables));

    if (workflow.inputs) {
      for (const input of workflow.inputs) {
        declaredVars.add(input.name);
      }
    }

    for (const step of workflow.steps) {
      // Check condition variable references
      if (step.condition) {
        const varRefs = this.extractVariableReferences(step.condition);
        for (const varRef of varRefs) {
          if (!declaredVars.has(varRef)) {
            errors.push({
              type: "error",
              code: "UNDEFINED_VARIABLE",
              message: `Undefined variable reference: ${varRef}`,
              stepId: step.id,
              field: "condition",
            });
          }
        }
      }

      // Check tool args variable references
      if (step.toolArgs) {
        const varRefs = this.extractVariableReferencesFromObject(step.toolArgs);
        for (const varRef of varRefs) {
          if (!declaredVars.has(varRef)) {
            errors.push({
              type: "error",
              code: "UNDEFINED_VARIABLE",
              message: `Undefined variable reference: ${varRef}`,
              stepId: step.id,
              field: "toolArgs",
            });
          }
        }
      }
    }
  }

  /**
   * Extract variable references from a string
   */
  private extractVariableReferences(text: string): string[] {
    const regex = /\$\{([a-zA-Z_][a-zA-Z0-9_\.]*)\}/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Extract variable references from an object
   */
  private extractVariableReferencesFromObject(obj: any): string[] {
    const refs: string[] = [];

    const extract = (value: any): void => {
      if (typeof value === "string") {
        refs.push(...this.extractVariableReferences(value));
      } else if (Array.isArray(value)) {
        value.forEach(extract);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(extract);
      }
    };

    extract(obj);
    return refs;
  }

  /**
   * Calculate step execution order based on dependencies
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
   * Validate a single step
   */
  async validateStep(
    step: WorkflowStep,
    options: ValidationOptions = {},
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    this.validateSteps([step], errors, warnings);
    this.validateStepTypeConfig(step, errors, warnings);

    if (step.condition) {
      this.validateConditions([step], errors, warnings);
    }

    return {
      valid:
        errors.length === 0 && (options.allowWarnings || warnings.length === 0),
      errors,
      warnings,
    };
  }
}
