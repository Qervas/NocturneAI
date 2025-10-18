/**
 * Agent Commands
 *
 * CLI commands for managing agents.
 *
 * Commands:
 * - agent create <name> - Create a new agent
 * - agent list - List all agents
 * - agent run <id> <task> - Run an agent task
 * - agent delete <id> - Delete an agent
 * - agent inspect <id> - Inspect agent configuration
 */

import type { Command } from "commander";
import chalk from "chalk";
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
} from "./BaseCommand.js";
import { AgentService } from "../../application/services/AgentService.js";
import { AgentFactory } from "../../application/factories/AgentFactory.js";
import { ToolFactory } from "../../application/factories/ToolFactory.js";
import { ContextFactory } from "../../application/factories/ContextFactory.js";
import { ManageAgent } from "../../application/use-cases/ManageAgent.js";
import { ExecuteAgentTask } from "../../application/use-cases/ExecuteAgentTask.js";

/**
 * Agent Create Command
 */
export class AgentCreateCommand extends BaseCommand {
  private manageAgent?: ManageAgent;

  constructor() {
    super("create", "Create a new agent");
  }

  register(parentCommand: Command): void {
    parentCommand
      .command("create <name>")
      .description(this.description)
      .option(
        "-r, --role <role>",
        "Agent role (coder, reviewer, tester, architect, researcher, planner)",
      )
      .option("-m, --model <model>", "LLM model to use")
      .option("-p, --prompt <prompt>", "System prompt")
      .option("--temperature <value>", "Temperature for generation", parseFloat)
      .option("--max-tokens <value>", "Max tokens for context", parseInt)
      .action(async (name, options) => {
        await this.run(options, name);
      });
  }

  protected async execute(
    context: CommandContext,
    name: string,
  ): Promise<CommandResult> {
    this.info(`Creating agent: ${chalk.cyan(name)}`);

    try {
      // Initialize services if not already done
      if (!this.manageAgent) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        const agentService = new AgentService();

        this.manageAgent = new ManageAgent(agentService, agentFactory);
      }

      const opts = context.options as any;

      // Create agent using role shortcut if provided
      const result = await this.manageAgent.createAgent({
        name,
        role: opts.role as
          | "coder"
          | "reviewer"
          | "tester"
          | "architect"
          | "researcher"
          | "planner",
        metadata: {
          model: opts.model,
          prompt: opts.prompt,
          temperature: opts.temperature,
          maxTokens: opts["max-tokens"],
        },
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      this.success(
        `Agent created successfully: ${chalk.green(result.agent?.id)}`,
      );

      if (context.options.verbose && result.agent) {
        console.log("\nAgent Details:");
        console.log(`  ID: ${result.agent.id}`);
        console.log(`  Name: ${result.agent.name}`);
        console.log(`  Role: ${result.agent.role || "N/A"}`);
        console.log(`  Type: ${result.agent.type || "N/A"}`);
        console.log(`  State: ${result.agent.state}`);
        console.log(`  Tools: ${result.agent.toolCount}`);
      }

      return {
        success: true,
        data: result.agent,
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
 * Agent List Command
 */
export class AgentListCommand extends BaseCommand {
  private manageAgent?: ManageAgent;

  constructor() {
    super("list", "List all agents");
  }

  register(parentCommand: Command): void {
    parentCommand
      .command("list")
      .description(this.description)
      .option("-f, --filter <filter>", "Filter by role or status")
      .option("--role <role>", "Filter by specific role")
      .action(async (options) => {
        await this.run(options);
      });
  }

  protected async execute(context: CommandContext): Promise<CommandResult> {
    this.verbose("Listing agents...");

    try {
      // Initialize services if not already done
      if (!this.manageAgent) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        const agentService = new AgentService();

        this.manageAgent = new ManageAgent(agentService, agentFactory);
      }

      const result = await this.manageAgent.listAgents({});

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      const agents = result.agents || [];
      const opts = context.options as any;

      if (opts.json) {
        console.log(JSON.stringify(agents, null, 2));
      } else {
        if (agents.length === 0) {
          this.info("No agents found");
        } else {
          console.log(chalk.bold(`\nFound ${agents.length} agent(s):\n`));

          this.table(
            agents.map((agent) => ({
              ID: agent.id,
              Name: agent.name,
              Role: agent.role || "N/A",
              Type: agent.type || "N/A",
              State: agent.state,
              Tasks: agent.queuedTasks,
            })),
          );
        }
      }

      return {
        success: true,
        data: agents,
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
 * Agent Run Command
 */
export class AgentRunCommand extends BaseCommand {
  private executeTask?: ExecuteAgentTask;

  constructor() {
    super("run", "Run an agent task");
  }

  register(program: Command): void {
    program
      .command("run <id> <task>")
      .description(this.description)
      .option("-c, --context <json>", "Task context as JSON")
      .option("--timeout <value>", "Timeout in milliseconds", parseInt)
      .option("--no-wait", "Don't wait for completion")
      .action(async (id, task, options) => {
        await this.run(options, id, task);
      });
  }

  protected async execute(
    context: CommandContext,
    agentId: string,
    taskDescription: string,
  ): Promise<CommandResult> {
    const spinner = this.spinner(
      `Running agent ${chalk.cyan(agentId)} on task...`,
    );

    try {
      // Initialize services if not already done
      if (!this.executeTask) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        const agentService = new AgentService();

        this.executeTask = new ExecuteAgentTask(agentService, agentFactory);
      }

      const opts = context.options as any;

      // Parse context if provided
      let taskContext: Record<string, unknown> = {};
      if (opts.context) {
        try {
          taskContext = JSON.parse(opts.context);
        } catch (error) {
          spinner.fail("Invalid JSON context");
          return {
            success: false,
            error: "Invalid JSON context",
          };
        }
      }

      // Execute task
      const result = await this.executeTask.execute({
        description: taskDescription,
        agentId,
        context: taskContext,
        timeout: opts.timeout,
        waitForCompletion: opts.wait !== false,
        onProgress: (progress) => {
          if (context.options.verbose) {
            this.verbose(
              `Progress: ${progress.percentage.toFixed(1)}% - ${progress.status}`,
            );
          }
        },
      });

      if (!result.success) {
        spinner.fail(`Task failed: ${result.error}`);
        return {
          success: false,
          error: result.error,
        };
      }

      spinner.succeed("Task completed successfully");

      if (result.result) {
        console.log("\n" + chalk.bold("Result:"));
        console.log(result.result);
      }

      if (context.options.verbose) {
        console.log("\n" + chalk.bold("Statistics:"));
        console.log(`  Actions: ${result.actionsCount}`);
        console.log(`  Tool Calls: ${result.toolCallsCount}`);
        console.log(`  Duration: ${result.executionTime}ms`);
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      spinner.fail("Task execution failed");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }
}

/**
 * Agent Delete Command
 */
export class AgentDeleteCommand extends BaseCommand {
  private manageAgent?: ManageAgent;

  constructor() {
    super("delete", "Delete an agent");
  }

  register(parentCommand: Command): void {
    parentCommand
      .command("delete <id>")
      .description(this.description)
      .option("-f, --force", "Force deletion without confirmation")
      .action(async (id, options) => {
        await this.run(options, id);
      });
  }

  protected async execute(
    context: CommandContext,
    agentId: string,
  ): Promise<CommandResult> {
    try {
      const opts = context.options as any;

      // Confirm deletion unless forced
      if (!opts.force) {
        const confirmed = await this.confirm(
          `Are you sure you want to delete agent ${chalk.cyan(agentId)}?`,
        );
        if (!confirmed) {
          this.info("Deletion cancelled");
          return { success: true };
        }
      }

      // Initialize services if not already done
      if (!this.manageAgent) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        const agentService = new AgentService();

        this.manageAgent = new ManageAgent(agentService, agentFactory);
      }

      const result = await this.manageAgent.deleteAgent({
        agentId,
        force: opts.force,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      this.success(`Agent ${chalk.cyan(agentId)} deleted successfully`);

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
 * Agent Inspect Command
 */
export class AgentInspectCommand extends BaseCommand {
  private manageAgent?: ManageAgent;

  constructor() {
    super("inspect", "Inspect agent configuration");
  }

  register(parentCommand: Command): void {
    parentCommand
      .command("inspect <id>")
      .description(this.description)
      .option("--json", "Output as JSON")
      .action(async (id, options) => {
        await this.run(options, id);
      });
  }

  protected async execute(
    context: CommandContext,
    agentId: string,
  ): Promise<CommandResult> {
    try {
      // Initialize services if not already done
      if (!this.manageAgent) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        const contextFactory = new ContextFactory();
        const agentFactory = new AgentFactory({
          toolFactory,
          contextFactory,
        });

        const agentService = new AgentService();

        this.manageAgent = new ManageAgent(agentService, agentFactory);
      }

      const result = await this.manageAgent.getAgent(agentId);

      if (!result.success || !result.agent) {
        return {
          success: false,
          error: result.error || "Agent not found",
        };
      }

      const agent = result.agent;
      const opts = context.options as any;

      if (opts.json) {
        console.log(JSON.stringify(agent, null, 2));
      } else {
        console.log(chalk.bold(`\nAgent: ${agent.name}`));
        console.log(`${"─".repeat(40)}`);
        console.log(`ID:          ${agent.id}`);
        console.log(`Role:        ${agent.role || "N/A"}`);
        console.log(`Type:        ${agent.type || "N/A"}`);
        console.log(`State:       ${agent.state}`);
        console.log(`Tools:       ${agent.toolCount}`);
        console.log(`Queued:      ${agent.queuedTasks} tasks`);

        if (agent.stats) {
          console.log(`\n${chalk.bold("Statistics:")}`);
          console.log(`  Completed:   ${agent.stats.tasksCompleted}`);
          console.log(`  Failed:      ${agent.stats.tasksFailed}`);
          console.log(`  Actions:     ${agent.stats.actionsTaken}`);
          console.log(`  Tool Calls:  ${agent.stats.toolCalls}`);
          console.log(`  LLM Calls:   ${agent.stats.llmCalls}`);
        }

        if (agent.lastActive) {
          const lastActive = new Date(agent.lastActive);
          console.log(`\nLast Active: ${lastActive.toLocaleString()}`);
        }
      }

      return {
        success: true,
        data: agent,
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
 * Register all agent commands
 */
export function registerAgentCommands(program: Command): void {
  const agentCommand = program.command("agent").description("Manage AI agents");

  const commands = [
    new AgentCreateCommand(),
    new AgentListCommand(),
    new AgentRunCommand(),
    new AgentDeleteCommand(),
    new AgentInspectCommand(),
  ];

  commands.forEach((command) => command.register(agentCommand));
}
