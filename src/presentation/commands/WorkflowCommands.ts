/**
 * Workflow Commands
 *
 * CLI commands for managing and executing workflows.
 *
 * Commands:
 * - workflow run <file> - Execute a workflow from file
 * - workflow validate <file> - Validate workflow configuration
 * - workflow list - List workflow executions
 * - workflow status <id> - Get workflow execution status
 * - workflow cancel <id> - Cancel running workflow
 */

import type { Command } from "commander";
import chalk from "chalk";
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
} from "./BaseCommand.js";
import { AgentService } from "../../application/services/AgentService.js";
import { WorkflowFactory } from "../../application/factories/WorkflowFactory.js";
import { AgentFactory } from "../../application/factories/AgentFactory.js";
import { ToolFactory } from "../../application/factories/ToolFactory.js";
import { ContextFactory } from "../../application/factories/ContextFactory.js";
import { RunWorkflow } from "../../application/use-cases/RunWorkflow.js";
import { WorkflowEngine } from "../../application/workflow-engine/WorkflowEngine.js";
import { WorkflowValidator } from "../../application/workflow-engine/WorkflowValidator.js";
import type { WorkflowConfig } from "../../infrastructure/config/WorkflowConfigParser.js";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Workflow Run Command
 */
export class WorkflowRunCommand extends BaseCommand {
  private runWorkflow?: RunWorkflow;

  constructor() {
    super("run", "Execute a workflow from file");
  }

  register(program: Command): void {
    program
      .command("run <file>")
      .description(this.description)
      .option("-v, --variables <json>", "Workflow variables as JSON")
      .option("--timeout <ms>", "Workflow timeout in milliseconds", parseInt)
      .option("--skip-validation", "Skip workflow validation")
      .option("--watch", "Watch workflow progress")
      .action(async (file, options) => {
        await this.run(options, file);
      });
  }

  protected async execute(
    context: CommandContext,
    workflowFile: string,
  ): Promise<CommandResult> {
    const spinner = this.spinner(
      `Loading workflow from ${chalk.cyan(workflowFile)}...`,
    );

    try {
      // Read workflow file
      const filePath = resolve(context.cwd, workflowFile);
      let workflowConfig: WorkflowConfig;

      try {
        const fileContent = readFileSync(filePath, "utf-8");
        workflowConfig = JSON.parse(fileContent);
        spinner.succeed(`Workflow loaded: ${chalk.green(workflowConfig.name)}`);
      } catch (error) {
        spinner.fail("Failed to read workflow file");
        return {
          success: false,
          error: `Failed to read workflow file: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Initialize services if not already done
      if (!this.runWorkflow) {
        this.verbose("Initializing workflow engine...");

        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        const workflowFactory = new WorkflowFactory({
          agentFactory,
          toolFactory,
        });

        const agentService = new AgentService();

        this.runWorkflow = new RunWorkflow(workflowFactory, agentService);
      }

      const opts = context.options as any;

      // Parse variables if provided
      let variables: Record<string, any> = {};
      if (opts.variables) {
        try {
          variables = JSON.parse(opts.variables);
        } catch (error) {
          return {
            success: false,
            error: "Invalid JSON for variables",
          };
        }
      }

      // Execute workflow
      this.info(
        `Starting workflow execution: ${chalk.cyan(workflowConfig.id)}`,
      );

      const result = await this.runWorkflow.execute({
        workflowConfig: workflowConfig,
        variables: variables,
        timeout: opts.timeout,
        onProgress: (progress) => {
          if (opts.watch || context.options.verbose) {
            const bar = "█".repeat(Math.floor(progress.percentage / 5));
            const empty = "░".repeat(20 - Math.floor(progress.percentage / 5));
            this.verbose(
              `Progress: [${bar}${empty}] ${progress.percentage.toFixed(1)}% - ${progress.currentStep || "Starting"}`,
            );
          }
        },
        onStepComplete: (step: any) => {
          if (opts.watch || context.options.verbose) {
            this.success(`Step completed: ${step.stepName}`);
          }
        },
      });

      if (!result.success) {
        this.error(`Workflow failed: ${result.error}`);
        return {
          success: false,
          error: result.error,
          data: result,
        };
      }

      this.success(
        `Workflow completed successfully in ${result.executionTime}ms`,
      );

      if (context.options.verbose && result.results) {
        console.log(`\n${chalk.bold("Step Results:")}`);
        result.results.forEach((step: any) => {
          const icon = step.success ? "✓" : "✗";
          const color = step.success ? chalk.green : chalk.red;
          console.log(
            `  ${color(icon)} ${step.stepName} (${step.executionTime || 0}ms)`,
          );
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      spinner.fail("Workflow execution failed");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }
}

/**
 * Workflow Validate Command
 */
export class WorkflowValidateCommand extends BaseCommand {
  private validator?: WorkflowValidator;

  constructor() {
    super("validate", "Validate a workflow configuration");
  }

  register(program: Command): void {
    program
      .command("validate <file>")
      .description(this.description)
      .option("--strict", "Enable strict validation mode")
      .action(async (file, options) => {
        await this.run(options, file);
      });
  }

  protected async execute(
    context: CommandContext,
    workflowFile: string,
  ): Promise<CommandResult> {
    try {
      // Read workflow file
      const filePath = resolve(context.cwd, workflowFile);
      let workflowConfig: WorkflowConfig;

      try {
        const fileContent = readFileSync(filePath, "utf-8");
        workflowConfig = JSON.parse(fileContent);
      } catch (error) {
        return {
          success: false,
          error: `Failed to read workflow file: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Initialize validator if not already done
      if (!this.validator) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        this.validator = new WorkflowValidator({
          agentFactory,
          toolFactory,
        });
      }

      const opts = context.options as any;

      this.info(`Validating workflow: ${chalk.cyan(workflowConfig.name)}`);

      // Validate workflow
      const result = await this.validator.validate(workflowConfig, {
        strict: opts.strict,
      });

      if (result.valid) {
        this.success("Workflow is valid!");

        if (result.warnings && result.warnings.length > 0) {
          console.log(`\n${chalk.yellow("Warnings:")}`);
          result.warnings.forEach((warning) => {
            console.log(`  ${chalk.yellow("⚠")} ${warning.message}`);
            if (warning.suggestion) {
              console.log(`    ${chalk.gray(warning.suggestion)}`);
            }
          });
        }

        if (result.stepOrder && context.options.verbose) {
          console.log(`\n${chalk.bold("Execution Order:")}`);
          result.stepOrder.forEach((stepId, index) => {
            console.log(`  ${index + 1}. ${stepId}`);
          });
        }
      } else {
        this.error("Workflow validation failed!");

        console.log(`\n${chalk.red("Errors:")}`);
        result.errors.forEach((error) => {
          console.log(
            `  ${chalk.red("✗")} ${error.message}${error.stepId ? ` (step: ${error.stepId})` : ""}`,
          );
          if (error.suggestion && context.options.verbose) {
            console.log(`    ${chalk.gray(error.suggestion)}`);
          }
        });
      }

      return {
        success: result.valid,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }
}

/**
 * Workflow List Command
 */
export class WorkflowListCommand extends BaseCommand {
  private workflowEngine?: WorkflowEngine;

  constructor() {
    super("list", "List workflow executions");
  }

  register(program: Command): void {
    program
      .command("list")
      .description(this.description)
      .option("-s, --status <status>", "Filter by status")
      .option("--json", "Output as JSON")
      .action(async (options) => {
        await this.run(options);
      });
  }

  protected async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Initialize engine if not already done
      if (!this.workflowEngine) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        this.workflowEngine = new WorkflowEngine({
          agentFactory,
          toolFactory,
        });
      }

      const opts = context.options as any;

      // List executions
      const executions = this.workflowEngine.listExecutions({
        status: opts.status,
      });

      if (opts.json) {
        console.log(JSON.stringify(executions, null, 2));
      } else {
        if (executions.length === 0) {
          this.info("No workflow executions found");
        } else {
          console.log(
            chalk.bold(`\nFound ${executions.length} workflow execution(s):\n`),
          );

          this.table(
            executions.map((exec) => ({
              ID: exec.executionId,
              Workflow: exec.workflow.name,
              Status: exec.status,
              Steps: `${exec.completedSteps.size}/${exec.workflow.steps.length}`,
              Started: exec.startedAt
                ? new Date(exec.startedAt).toLocaleTimeString()
                : "N/A",
            })),
          );
        }
      }

      return {
        success: true,
        data: executions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }
}

/**
 * Workflow Status Command
 */
export class WorkflowStatusCommand extends BaseCommand {
  private workflowEngine?: WorkflowEngine;

  constructor() {
    super("status", "Get workflow execution status");
  }

  register(program: Command): void {
    program
      .command("status <id>")
      .description(this.description)
      .option("--json", "Output as JSON")
      .action(async (id, options) => {
        await this.run(options, id);
      });
  }

  protected async execute(
    context: CommandContext,
    executionId: string,
  ): Promise<CommandResult> {
    try {
      // Initialize engine if not already done
      if (!this.workflowEngine) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        this.workflowEngine = new WorkflowEngine({
          agentFactory,
          toolFactory,
        });
      }

      // Get execution state
      const state = this.workflowEngine.getExecutionState(executionId);
      if (!state) {
        return {
          success: false,
          error: `Workflow execution not found: ${executionId}`,
        };
      }

      // Get progress
      const progress = this.workflowEngine.getProgress(executionId);

      const opts = context.options as any;

      if (opts.json) {
        console.log(JSON.stringify({ state, progress }, null, 2));
      } else {
        console.log(chalk.bold(`\nWorkflow: ${state.workflow.name}`));
        console.log(`${"─".repeat(50)}`);
        console.log(`Execution ID: ${state.executionId}`);
        console.log(`Status:       ${this.colorStatus(state.status)}`);

        if (progress) {
          const bar = "█".repeat(Math.floor(progress.percentage / 5));
          const empty = "░".repeat(20 - Math.floor(progress.percentage / 5));
          console.log(
            `Progress:     [${bar}${empty}] ${progress.percentage.toFixed(1)}%`,
          );
          console.log(
            `Steps:        ${progress.stepsCompleted}/${progress.totalSteps}`,
          );
          console.log(`Current:      ${progress.currentStep || "N/A"}`);

          if (progress.estimatedRemainingTime) {
            const remaining = Math.round(
              progress.estimatedRemainingTime / 1000,
            );
            console.log(`Remaining:    ~${remaining}s`);
          }
        }

        if (state.error) {
          console.log(`\n${chalk.red("Error:")} ${state.error}`);
        }

        if (state.completedSteps.size > 0 && context.options.verbose) {
          console.log(`\n${chalk.bold("Completed Steps:")}`);
          state.completedSteps.forEach((stepId) => {
            console.log(`  ${chalk.green("✓")} ${stepId}`);
          });
        }

        if (state.failedSteps.size > 0) {
          console.log(`\n${chalk.bold("Failed Steps:")}`);
          state.failedSteps.forEach((stepId) => {
            console.log(`  ${chalk.red("✗")} ${stepId}`);
          });
        }
      }

      return {
        success: true,
        data: { state, progress },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }

  private colorStatus(status: string): string {
    switch (status) {
      case "running":
        return chalk.blue(status);
      case "completed":
        return chalk.green(status);
      case "failed":
        return chalk.red(status);
      case "paused":
        return chalk.yellow(status);
      case "cancelled":
        return chalk.gray(status);
      default:
        return status;
    }
  }
}

/**
 * Workflow Cancel Command
 */
export class WorkflowCancelCommand extends BaseCommand {
  private workflowEngine?: WorkflowEngine;

  constructor() {
    super("cancel", "Cancel a running workflow");
  }

  register(program: Command): void {
    program
      .command("cancel <id>")
      .description(this.description)
      .option("-f, --force", "Force cancellation without confirmation")
      .action(async (id, options) => {
        await this.run(options, id);
      });
  }

  protected async execute(
    context: CommandContext,
    executionId: string,
  ): Promise<CommandResult> {
    try {
      const opts = context.options as any;

      // Confirm cancellation unless forced
      if (!opts.force) {
        const confirmed = await this.confirm(
          `Are you sure you want to cancel workflow ${chalk.cyan(executionId)}?`,
        );
        if (!confirmed) {
          this.info("Cancellation aborted");
          return { success: true };
        }
      }

      // Initialize engine if not already done
      if (!this.workflowEngine) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        this.workflowEngine = new WorkflowEngine({
          agentFactory,
          toolFactory,
        });
      }

      // Cancel workflow
      await this.workflowEngine.cancelWorkflow(executionId);

      this.success(
        `Workflow ${chalk.cyan(executionId)} cancelled successfully`,
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }
}

/**
 * Register all workflow commands
 */
export function registerWorkflowCommands(program: Command): void {
  const workflowCommand = program
    .command("workflow")
    .description("Execute and manage workflows");

  const commands = [
    new WorkflowRunCommand(),
    new WorkflowValidateCommand(),
    new WorkflowListCommand(),
    new WorkflowStatusCommand(),
    new WorkflowCancelCommand(),
  ];

  commands.forEach((command) => command.register(workflowCommand));
}
