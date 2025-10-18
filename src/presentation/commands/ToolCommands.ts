/**
 * Tool Commands
 *
 * CLI commands for managing tools.
 *
 * Commands:
 * - tool list - List all available tools
 * - tool inspect <name> - Inspect tool details
 * - tool register <file> - Register a custom tool
 */

import type { Command } from "commander";
import chalk from "chalk";
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
} from "./BaseCommand.js";
import { ToolFactory } from "../../application/factories/ToolFactory.js";
import { RegisterTool } from "../../application/use-cases/RegisterTool.js";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Tool List Command
 */
export class ToolListCommand extends BaseCommand {
  private toolFactory?: ToolFactory;

  constructor() {
    super("list", "List all available tools");
  }

  register(program: Command): void {
    program
      .command("list")
      .description(this.description)
      .option("-c, --category <category>", "Filter by category")
      .option("--json", "Output as JSON")
      .action(async (options) => {
        await this.run(options);
      });
  }

  protected async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Initialize factory if not already done
      if (!this.toolFactory) {
        this.toolFactory = new ToolFactory();
        await this.toolFactory.initialize();
      }

      const opts = context.options as any;

      // Get all tools
      const allTools = this.toolFactory.listTools();

      // Filter by category if specified
      let tools = allTools;
      if (opts.category) {
        tools = allTools.filter(
          (tool) => tool.metadata?.category === opts.category,
        );
      }

      if (opts.json) {
        console.log(JSON.stringify(tools, null, 2));
      } else {
        if (tools.length === 0) {
          this.info("No tools found");
        } else {
          console.log(chalk.bold(`\nFound ${tools.length} tool(s):\n`));

          // Group by category
          const byCategory = new Map<string, typeof tools>();
          tools.forEach((tool) => {
            const category = tool.metadata?.category || "uncategorized";
            if (!byCategory.has(category)) {
              byCategory.set(category, []);
            }
            byCategory.get(category)!.push(tool);
          });

          // Display by category
          byCategory.forEach((toolsInCategory, category) => {
            console.log(chalk.cyan.bold(`\n${category.toUpperCase()}`));
            console.log("─".repeat(40));

            toolsInCategory.forEach((tool) => {
              console.log(`  ${chalk.green("•")} ${chalk.bold(tool.name)}`);
              console.log(`    ${tool.description}`);
              if (context.options.verbose && tool.metadata?.version) {
                console.log(
                  chalk.gray(`    Version: ${tool.metadata.version}`),
                );
              }
            });
          });
        }
      }

      return {
        success: true,
        data: tools,
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
 * Tool Inspect Command
 */
export class ToolInspectCommand extends BaseCommand {
  private toolFactory?: ToolFactory;

  constructor() {
    super("inspect", "Inspect tool details");
  }

  register(program: Command): void {
    program
      .command("inspect <name>")
      .description(this.description)
      .option("--json", "Output as JSON")
      .action(async (name, options) => {
        await this.run(options, name);
      });
  }

  protected async execute(
    context: CommandContext,
    toolName: string,
  ): Promise<CommandResult> {
    try {
      // Initialize factory if not already done
      if (!this.toolFactory) {
        this.toolFactory = new ToolFactory();
        await this.toolFactory.initialize();
      }

      // Get tool
      const tool = this.toolFactory.getTool(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool not found: ${toolName}`,
        };
      }

      const opts = context.options as any;

      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
              metadata: tool.metadata,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(chalk.bold(`\nTool: ${tool.name}`));
        console.log("─".repeat(50));
        console.log(`Description: ${tool.description}`);

        if (tool.metadata?.category) {
          console.log(`Category:    ${tool.metadata.category}`);
        }

        if (tool.metadata?.version) {
          console.log(`Version:     ${tool.metadata.version}`);
        }

        // Display parameters
        console.log(`\n${chalk.bold("Parameters:")}`);
        if (tool.parameters && Object.keys(tool.parameters).length > 0) {
          Object.entries(tool.parameters).forEach(([name, param]) => {
            const required = param.required ? chalk.red("*") : " ";
            console.log(`  ${required} ${chalk.cyan(name)}: ${param.type}`);
            console.log(`    ${param.description}`);
            if (param.default !== undefined) {
              console.log(chalk.gray(`    Default: ${param.default}`));
            }
          });
        } else {
          console.log("  No parameters");
        }

        // Display examples if available
        if (tool.metadata?.examples && context.options.verbose) {
          console.log(`\n${chalk.bold("Examples:")}`);
          if (Array.isArray(tool.metadata.examples)) {
            tool.metadata.examples.forEach((example: any, index: number) => {
              console.log(
                `\n  ${index + 1}. ${example.description || "Example"}`,
              );
              console.log(chalk.gray(`     ${JSON.stringify(example.input)}`));
            });
          }
        }
      }

      return {
        success: true,
        data: tool,
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
 * Tool Register Command
 */
export class ToolRegisterCommand extends BaseCommand {
  private registerTool?: RegisterTool;

  constructor() {
    super("register", "Register a custom tool");
  }

  register(program: Command): void {
    program
      .command("register <file>")
      .description(this.description)
      .option("-n, --name <name>", "Tool name (override)")
      .option("-c, --category <category>", "Tool category")
      .option("--validate", "Validate tool before registering")
      .action(async (file, options) => {
        await this.run(options, file);
      });
  }

  protected async execute(
    context: CommandContext,
    toolFile: string,
  ): Promise<CommandResult> {
    const spinner = this.spinner(
      `Registering tool from ${chalk.cyan(toolFile)}...`,
    );

    try {
      // Read tool file
      const filePath = resolve(context.cwd, toolFile);
      let toolDefinition: any;

      try {
        const fileContent = readFileSync(filePath, "utf-8");
        toolDefinition = JSON.parse(fileContent);
      } catch (error) {
        spinner.fail("Failed to read tool file");
        return {
          success: false,
          error: `Failed to read tool file: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Initialize use case if not already done
      if (!this.registerTool) {
        const toolFactory = new ToolFactory();
        await toolFactory.initialize();

        this.registerTool = new RegisterTool(toolFactory);
      }

      const opts = context.options as any;

      // Register tool
      const result = await this.registerTool.execute({
        toolDefinition,
        toolName: opts.name,
        metadata: {
          category: opts.category,
          source: toolFile,
        },
        validate: opts.validate,
      });

      if (!result.success) {
        spinner.fail(`Failed to register tool: ${result.error}`);
        return {
          success: false,
          error: result.error,
        };
      }

      spinner.succeed(
        `Tool registered successfully: ${chalk.green(result.toolName)}`,
      );

      if (context.options.verbose && result.tool) {
        console.log("\nTool Details:");
        console.log(`  Name:        ${result.tool.name}`);
        console.log(`  Description: ${result.tool.description}`);
        console.log(
          `  Parameters:  ${Object.keys(result.tool.parameters || {}).length}`,
        );
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      spinner.fail("Tool registration failed");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      };
    }
  }
}

/**
 * Register all tool commands
 */
export function registerToolCommands(program: Command): void {
  const toolCommand = program
    .command("tool")
    .description("Manage and inspect tools");

  const commands = [
    new ToolListCommand(),
    new ToolInspectCommand(),
    new ToolRegisterCommand(),
  ];

  commands.forEach((command) => command.register(toolCommand));
}
