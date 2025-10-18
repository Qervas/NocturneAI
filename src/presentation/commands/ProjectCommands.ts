/**
 * Project Commands
 *
 * CLI commands for project management.
 *
 * Commands:
 * - project init - Initialize a new NocturneAI project
 * - project config - Configure project settings
 */

import type { Command } from "commander";
import chalk from "chalk";
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
} from "./BaseCommand.js";
import { CreateProject } from "../../application/use-cases/CreateProject.js";
import { AgentFactory } from "../../application/factories/AgentFactory.js";
import { ToolFactory } from "../../application/factories/ToolFactory.js";
import { ContextFactory } from "../../application/factories/ContextFactory.js";
import { WorkflowFactory } from "../../application/factories/WorkflowFactory.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * Project Init Command
 */
export class ProjectInitCommand extends BaseCommand {
  private createProject?: CreateProject;

  constructor() {
    super("init", "Initialize a new NocturneAI project");
  }

  register(program: Command): void {
    program
      .command("init [directory]")
      .description(this.description)
      .option("-n, --name <name>", "Project name")
      .option(
        "-t, --template <template>",
        "Project template (basic, workflow, multi-agent)",
        "basic",
      )
      .option("--skip-git", "Skip git initialization")
      .option("--skip-install", "Skip npm install")
      .option("-f, --force", "Force initialization even if directory exists")
      .action(async (directory, options) => {
        await this.run(options, directory || ".");
      });
  }

  protected async execute(
    context: CommandContext,
    directory: string,
  ): Promise<CommandResult> {
    const spinner = this.spinner("Initializing NocturneAI project...");

    try {
      const projectPath = join(context.cwd, directory);
      const opts = context.options as any;

      // Check if directory exists
      if (existsSync(projectPath) && !opts.force) {
        spinner.fail("Directory already exists");
        return {
          success: false,
          error: `Directory ${directory} already exists. Use --force to override.`,
        };
      }

      // Initialize factories
      if (!this.createProject) {
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

        this.createProject = new CreateProject({
          agentFactory,
          toolFactory,
          workflowFactory,
        });
      }

      // Get project name
      const projectName =
        opts.name || directory.split("/").pop() || "nocturne-project";

      // Create project
      const result = await this.createProject.execute({
        name: projectName,
        path: projectPath,
        template: opts.template,
        initGit: !opts["skip-git"],
        installDependencies: !opts["skip-install"],
      });

      if (!result.success) {
        spinner.fail("Project initialization failed");
        return {
          success: false,
          error: result.error,
        };
      }

      spinner.succeed(
        `Project initialized successfully: ${chalk.green(projectName)}`,
      );

      // Display next steps
      console.log(`\n${chalk.bold("Next steps:")}`);
      console.log(`  ${chalk.cyan("cd")} ${directory}`);

      if (opts["skip-install"]) {
        console.log(`  ${chalk.cyan("npm install")}`);
      }

      console.log(
        `  ${chalk.cyan("nocturne agent create")} my-agent --role coder`,
      );
      console.log(
        `  ${chalk.cyan("nocturne agent run")} my-agent "Your task here"`,
      );

      console.log(`\n${chalk.bold("Project structure:")}`);
      console.log(
        `  ${chalk.gray("├─")} .nocturne/          ${chalk.gray("# Configuration directory")}`,
      );
      console.log(
        `  ${chalk.gray("├─")} agents/             ${chalk.gray("# Agent configurations")}`,
      );
      console.log(
        `  ${chalk.gray("├─")} workflows/          ${chalk.gray("# Workflow definitions")}`,
      );
      console.log(
        `  ${chalk.gray("├─")} tools/              ${chalk.gray("# Custom tools")}`,
      );
      console.log(
        `  ${chalk.gray("└─")} .env                ${chalk.gray("# Environment variables")}`,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      spinner.fail("Project initialization failed");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }
}

/**
 * Project Config Command
 */
export class ProjectConfigCommand extends BaseCommand {
  constructor() {
    super("config", "Configure project settings");
  }

  register(program: Command): void {
    program
      .command("config [key] [value]")
      .description(this.description)
      .option("-l, --list", "List all configuration")
      .option("-g, --global", "Use global configuration")
      .option("--unset <key>", "Unset configuration key")
      .action(async (key, value, options) => {
        await this.run(options, key, value);
      });
  }

  protected async execute(
    context: CommandContext,
    key?: string,
    value?: string,
  ): Promise<CommandResult> {
    try {
      const opts = context.options as any;
      const configDir = join(context.cwd, ".nocturne");
      const configFile = join(configDir, "config.json");

      // Ensure config directory exists
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }

      // Load existing config
      let config: Record<string, any> = {};
      if (existsSync(configFile)) {
        try {
          config = JSON.parse(require("fs").readFileSync(configFile, "utf-8"));
        } catch {
          config = {};
        }
      }

      // List configuration
      if (opts.list || (!key && !value)) {
        if (Object.keys(config).length === 0) {
          this.info("No configuration set");
        } else {
          console.log(chalk.bold("\nProject Configuration:\n"));
          Object.entries(config).forEach(([k, v]) => {
            console.log(`  ${chalk.cyan(k)} = ${v}`);
          });
        }

        return {
          success: true,
          data: config,
        };
      }

      // Unset configuration
      if (opts.unset) {
        delete config[opts.unset];
        writeFileSync(configFile, JSON.stringify(config, null, 2));
        this.success(`Configuration unset: ${opts.unset}`);

        return {
          success: true,
          data: config,
        };
      }

      // Get configuration value
      if (key && !value) {
        const val = config[key];
        if (val === undefined) {
          this.info(`Configuration key not set: ${key}`);
        } else {
          console.log(val);
        }

        return {
          success: true,
          data: { [key]: val },
        };
      }

      // Set configuration value
      if (key && value) {
        // Parse value (try JSON first, fallback to string)
        let parsedValue: any = value;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string
        }

        config[key] = parsedValue;
        writeFileSync(configFile, JSON.stringify(config, null, 2));
        this.success(`Configuration set: ${chalk.cyan(key)} = ${parsedValue}`);

        return {
          success: true,
          data: config,
        };
      }

      return {
        success: true,
        data: config,
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
 * Register all project commands
 */
export function registerProjectCommands(program: Command): void {
  const projectCommand = program
    .command("project")
    .description("Initialize and configure projects");

  const commands = [new ProjectInitCommand(), new ProjectConfigCommand()];

  commands.forEach((command) => command.register(projectCommand));
}
