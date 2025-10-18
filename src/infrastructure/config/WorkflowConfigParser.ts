/**
 * Workflow Configuration Parser
 *
 * Parses and validates workflow configuration files.
 *
 * Features:
 * - Parse workflow definitions
 * - Validate workflow steps
 * - Task dependencies
 * - Condition evaluation
 * - Error handling configuration
 * - Workflow variables
 */

import { ConfigValidator, type ValidationSchema } from "./ConfigValidator.js";

/**
 * Workflow Configuration
 */
export interface WorkflowConfig {
  /** Workflow ID */
  id: string;

  /** Workflow name */
  name: string;

  /** Description */
  description?: string;

  /** Workflow version */
  version?: string;

  /** Workflow steps */
  steps: WorkflowStep[];

  /** Input variables */
  inputs?: WorkflowVariable[];

  /** Output variables */
  outputs?: WorkflowVariable[];

  /** Global variables */
  variables?: Record<string, any>;

  /** Timeout (ms) */
  timeout?: number;

  /** Max retries */
  maxRetries?: number;

  /** Error handling strategy */
  errorHandling?: ErrorHandling;

  /** Trigger configuration */
  trigger?: WorkflowTrigger;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Workflow Step
 */
export interface WorkflowStep {
  /** Step ID */
  id: string;

  /** Step name */
  name: string;

  /** Step type */
  type: WorkflowStepType;

  /** Agent ID (for agent steps) */
  agentId?: string;

  /** Task configuration (for task steps) */
  task?: TaskConfig;

  /** Tool ID (for tool steps) */
  toolId?: string;

  /** Tool arguments (for tool steps) */
  toolArgs?: Record<string, any>;

  /** Condition to execute this step */
  condition?: string;

  /** Dependencies (step IDs that must complete first) */
  dependencies?: string[];

  /** Timeout (ms) */
  timeout?: number;

  /** Retry configuration */
  retry?: RetryConfig;

  /** Continue on error */
  continueOnError?: boolean;

  /** Output mapping */
  output?: Record<string, string>;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Workflow Step Type
 */
export type WorkflowStepType =
  | "agent"
  | "task"
  | "tool"
  | "parallel"
  | "sequential"
  | "condition"
  | "loop"
  | "wait";

/**
 * Task Configuration
 */
export interface TaskConfig {
  /** Task type */
  type: string;

  /** Task description */
  description: string;

  /** Task input */
  input?: Record<string, any>;

  /** Task priority */
  priority?: number;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  /** Max attempts */
  maxAttempts: number;

  /** Initial delay (ms) */
  initialDelay?: number;

  /** Max delay (ms) */
  maxDelay?: number;

  /** Backoff multiplier */
  backoffMultiplier?: number;

  /** Retry on errors matching pattern */
  retryOnError?: string[];
}

/**
 * Error Handling
 */
export interface ErrorHandling {
  /** Strategy */
  strategy: "fail-fast" | "continue" | "retry" | "compensate";

  /** Max errors before failing */
  maxErrors?: number;

  /** Compensation steps */
  compensationSteps?: string[];

  /** Error notification */
  notifyOnError?: boolean;
}

/**
 * Workflow Variable
 */
export interface WorkflowVariable {
  /** Variable name */
  name: string;

  /** Variable type */
  type: string;

  /** Description */
  description?: string;

  /** Required */
  required?: boolean;

  /** Default value */
  default?: any;
}

/**
 * Workflow Trigger
 */
export interface WorkflowTrigger {
  /** Trigger type */
  type: "manual" | "schedule" | "event" | "webhook";

  /** Schedule (cron format for scheduled triggers) */
  schedule?: string;

  /** Event type (for event triggers) */
  event?: string;

  /** Webhook configuration */
  webhook?: WebhookConfig;
}

/**
 * Webhook Configuration
 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string;

  /** HTTP method */
  method?: string;

  /** Headers */
  headers?: Record<string, string>;

  /** Authentication */
  auth?: {
    type: "bearer" | "basic" | "apikey";
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
}

/**
 * Workflow Configuration Parser
 */
export class WorkflowConfigParser {
  private validator: ConfigValidator;

  /**
   * Workflow configuration schema
   */
  private static readonly WORKFLOW_SCHEMA: ValidationSchema = {
    id: {
      type: "string",
      required: true,
      pattern: /^[a-zA-Z0-9_-]+$/,
      description: "Workflow ID",
    },
    name: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 100,
      description: "Workflow name",
    },
    description: {
      type: "string",
      required: false,
      maxLength: 500,
      description: "Workflow description",
    },
    version: {
      type: "string",
      required: false,
      pattern: /^\d+\.\d+\.\d+$/,
      description: "Semantic version (e.g., 1.0.0)",
    },
    steps: {
      type: "array",
      required: true,
      minLength: 1,
      items: {
        type: "object",
        required: true,
        schema: {
          id: {
            type: "string",
            required: true,
            pattern: /^[a-zA-Z0-9_-]+$/,
          },
          name: {
            type: "string",
            required: true,
          },
          type: {
            type: "enum",
            required: true,
            enum: ["agent", "task", "tool", "parallel", "sequential", "condition", "loop", "wait"],
          },
          agentId: {
            type: "string",
            required: false,
          },
          task: {
            type: "object",
            required: false,
          },
          toolId: {
            type: "string",
            required: false,
          },
          toolArgs: {
            type: "object",
            required: false,
          },
          condition: {
            type: "string",
            required: false,
          },
          dependencies: {
            type: "array",
            required: false,
            items: {
              type: "string",
              required: false,
            },
          },
          timeout: {
            type: "number",
            required: false,
            min: 1000,
            max: 3600000,
          },
          retry: {
            type: "object",
            required: false,
          },
          continueOnError: {
            type: "boolean",
            required: false,
            default: false,
          },
          output: {
            type: "object",
            required: false,
          },
          metadata: {
            type: "object",
            required: false,
          },
        },
      },
    },
    inputs: {
      type: "array",
      required: false,
      items: {
        type: "object",
        required: false,
      },
    },
    outputs: {
      type: "array",
      required: false,
      items: {
        type: "object",
        required: false,
      },
    },
    variables: {
      type: "object",
      required: false,
    },
    timeout: {
      type: "number",
      required: false,
      min: 1000,
      max: 86400000,
      default: 3600000,
    },
    maxRetries: {
      type: "number",
      required: false,
      min: 0,
      max: 10,
      default: 3,
    },
    errorHandling: {
      type: "object",
      required: false,
      schema: {
        strategy: {
          type: "enum",
          required: true,
          enum: ["fail-fast", "continue", "retry", "compensate"],
        },
        maxErrors: {
          type: "number",
          required: false,
          min: 1,
          max: 100,
        },
        compensationSteps: {
          type: "array",
          required: false,
          items: {
            type: "string",
            required: false,
          },
        },
        notifyOnError: {
          type: "boolean",
          required: false,
          default: false,
        },
      },
    },
    trigger: {
      type: "object",
      required: false,
      schema: {
        type: {
          type: "enum",
          required: true,
          enum: ["manual", "schedule", "event", "webhook"],
        },
        schedule: {
          type: "string",
          required: false,
        },
        event: {
          type: "string",
          required: false,
        },
        webhook: {
          type: "object",
          required: false,
        },
      },
    },
    metadata: {
      type: "object",
      required: false,
    },
  };

  constructor() {
    this.validator = new ConfigValidator(WorkflowConfigParser.WORKFLOW_SCHEMA);
  }

  /**
   * Parse workflow configuration
   */
  parse(data: any): { config: WorkflowConfig; errors: string[]; warnings: string[] } {
    const validation = this.validator.validate(data);

    if (!validation.valid) {
      return {
        config: data,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const config = validation.data as WorkflowConfig;

    // Apply defaults
    this.applyDefaults(config);

    // Post-validation
    const postErrors = this.postValidate(config);

    return {
      config,
      errors: postErrors,
      warnings: validation.warnings,
    };
  }

  /**
   * Parse multiple workflow configurations
   */
  parseMultiple(
    data: any[]
  ): {
    configs: WorkflowConfig[];
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const configs: WorkflowConfig[] = [];
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    for (let i = 0; i < data.length; i++) {
      const result = this.parse(data[i]);

      if (result.errors.length > 0) {
        errors[`workflow_${i}`] = result.errors;
      } else {
        configs.push(result.config);
      }

      if (result.warnings.length > 0) {
        warnings[`workflow_${i}`] = result.warnings;
      }
    }

    return { configs, errors, warnings };
  }

  /**
   * Validate workflow configuration
   */
  validate(config: WorkflowConfig): { valid: boolean; errors: string[] } {
    const validation = this.validator.validate(config);
    const postErrors = validation.valid ? this.postValidate(config) : [];

    return {
      valid: validation.valid && postErrors.length === 0,
      errors: [...validation.errors, ...postErrors],
    };
  }

  /**
   * Apply default values
   */
  private applyDefaults(config: WorkflowConfig): void {
    if (config.timeout === undefined) {
      config.timeout = 3600000; // 1 hour
    }

    if (config.maxRetries === undefined) {
      config.maxRetries = 3;
    }

    if (config.version === undefined) {
      config.version = "1.0.0";
    }

    // Apply defaults to steps
    for (const step of config.steps) {
      if (step.continueOnError === undefined) {
        step.continueOnError = false;
      }

      if (step.retry) {
        if (step.retry.initialDelay === undefined) {
          step.retry.initialDelay = 1000;
        }
        if (step.retry.maxDelay === undefined) {
          step.retry.maxDelay = 30000;
        }
        if (step.retry.backoffMultiplier === undefined) {
          step.retry.backoffMultiplier = 2;
        }
      }
    }

    // Apply defaults to error handling
    if (config.errorHandling) {
      if (config.errorHandling.notifyOnError === undefined) {
        config.errorHandling.notifyOnError = false;
      }
    }
  }

  /**
   * Post-validation checks
   */
  private postValidate(config: WorkflowConfig): string[] {
    const errors: string[] = [];

    // Check step IDs are unique
    const stepIds = new Set<string>();
    for (const step of config.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Validate step dependencies
    for (const step of config.steps) {
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (!stepIds.has(depId)) {
            errors.push(`Step ${step.id}: unknown dependency ${depId}`);
          }

          // Check for circular dependencies (simple check)
          if (depId === step.id) {
            errors.push(`Step ${step.id}: circular dependency on itself`);
          }
        }
      }

      // Validate step type requirements
      switch (step.type) {
        case "agent":
          if (!step.agentId) {
            errors.push(`Step ${step.id}: agent step requires agentId`);
          }
          if (!step.task) {
            errors.push(`Step ${step.id}: agent step requires task configuration`);
          }
          break;

        case "tool":
          if (!step.toolId) {
            errors.push(`Step ${step.id}: tool step requires toolId`);
          }
          break;

        case "condition":
          if (!step.condition) {
            errors.push(`Step ${step.id}: condition step requires condition expression`);
          }
          break;
      }
    }

    // Validate error handling compensation steps
    if (config.errorHandling?.compensationSteps) {
      for (const stepId of config.errorHandling.compensationSteps) {
        if (!stepIds.has(stepId)) {
          errors.push(`Error handling: unknown compensation step ${stepId}`);
        }
      }
    }

    // Validate trigger configuration
    if (config.trigger) {
      switch (config.trigger.type) {
        case "schedule":
          if (!config.trigger.schedule) {
            errors.push("Schedule trigger requires schedule (cron) expression");
          }
          break;

        case "event":
          if (!config.trigger.event) {
            errors.push("Event trigger requires event type");
          }
          break;

        case "webhook":
          if (!config.trigger.webhook?.url) {
            errors.push("Webhook trigger requires webhook URL");
          }
          break;
      }
    }

    // Validate input/output variables
    if (config.inputs) {
      const inputNames = new Set<string>();
      for (const input of config.inputs) {
        if (inputNames.has(input.name)) {
          errors.push(`Duplicate input variable: ${input.name}`);
        }
        inputNames.add(input.name);
      }
    }

    if (config.outputs) {
      const outputNames = new Set<string>();
      for (const output of config.outputs) {
        if (outputNames.has(output.name)) {
          errors.push(`Duplicate output variable: ${output.name}`);
        }
        outputNames.add(output.name);
      }
    }

    return errors;
  }

  /**
   * Get default workflow configuration
   */
  static getDefaultConfig(id: string, name: string): WorkflowConfig {
    return {
      id,
      name,
      version: "1.0.0",
      steps: [],
      timeout: 3600000,
      maxRetries: 3,
      errorHandling: {
        strategy: "fail-fast",
        notifyOnError: false,
      },
    };
  }

  /**
   * Validate workflow for circular dependencies (advanced check)
   */
  static hasCircularDependencies(config: WorkflowConfig): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true;
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = config.steps.find((s) => s.id === stepId);
      if (step?.dependencies) {
        for (const depId of step.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of config.steps) {
      if (hasCycle(step.id)) {
        return true;
      }
    }

    return false;
  }
}
