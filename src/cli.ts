#!/usr/bin/env node
/**
 * NocturneAI - CLI Entry Point
 *
 * Command-line interface for NocturneAI autonomous agent system.
 */

import { Command } from "commander";
import chalk from "chalk";
import { VERSION } from "./index.js";
import {
  registerAgentCommands,
  registerWorkflowCommands,
  registerToolCommands,
  registerProjectCommands,
  createUICommand,
} from "./presentation/commands/index.js";
import { startChatUI } from "./presentation/commands/chat.js";

/**
 * Main CLI program
 */
const program = new Command();

program
  .name("nocturne")
  .description("Autonomous multi-agent system powered by AI")
  .version(VERSION, "-v, --version", "Display version number")
  .option("-V, --verbose", "Enable verbose output")
  .option("-q, --quiet", "Suppress output")
  .option("-d, --debug", "Enable debug mode")
  .option("--format <format>", "Output format (text, json)", "text");

/**
 * Register all command groups
 */
registerAgentCommands(program);
registerWorkflowCommands(program);
registerToolCommands(program);
registerProjectCommands(program);

/**
 * Register UI command
 */
program.addCommand(createUICommand());

/**
 * Help command - show detailed help
 */
program
  .command("help [command]")
  .description("Display help for a command")
  .action((command) => {
    if (command) {
      const cmd = program.commands.find((c) => c.name() === command);
      if (cmd) {
        cmd.help();
      } else {
        console.error(chalk.red(`Unknown command: ${command}`));
        program.help();
      }
    } else {
      displayWelcome();
      program.help();
    }
  });

/**
 * Display welcome message
 */
function displayWelcome(): void {
  console.log(chalk.cyan.bold("\n╔═══════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("║                                       ║"));
  console.log(
    chalk.cyan.bold("║          ") +
      chalk.white.bold("NocturneAI v" + VERSION) +
      chalk.cyan.bold("          ║"),
  );
  console.log(chalk.cyan.bold("║                                       ║"));
  console.log(
    chalk.cyan.bold("║  ") +
      chalk.white("Autonomous Multi-Agent System") +
      chalk.cyan.bold("    ║"),
  );
  console.log(chalk.cyan.bold("║                                       ║"));
  console.log(chalk.cyan.bold("╚═══════════════════════════════════════╝\n"));
}

/**
 * Custom help output
 */
program.on("--help", () => {
  console.log("");
  console.log(chalk.bold("Command Groups:"));
  console.log("");
  console.log("  " + chalk.cyan("agent") + "      Manage AI agents");
  console.log(
    "  " + chalk.cyan("workflow") + "   Execute and manage workflows",
  );
  console.log("  " + chalk.cyan("tool") + "       Manage and inspect tools");
  console.log(
    "  " + chalk.cyan("project") + "    Initialize and configure projects",
  );
  console.log(
    "  " + chalk.cyan("ui") + "         Launch interactive Terminal UI",
  );
  console.log("");
  console.log(chalk.bold("Examples:"));
  console.log("");
  console.log(chalk.gray("  # Initialize a new project"));
  console.log("  $ nocturne project init my-project");
  console.log("");
  console.log(chalk.gray("  # Create a new agent"));
  console.log("  $ nocturne agent create my-coder --role coder");
  console.log("");
  console.log(chalk.gray("  # Run an agent task"));
  console.log('  $ nocturne agent run my-coder "Write a hello world function"');
  console.log("");
  console.log(chalk.gray("  # Execute a workflow"));
  console.log("  $ nocturne workflow run ./workflow.json");
  console.log("");
  console.log(chalk.gray("  # List available tools"));
  console.log("  $ nocturne tool list");
  console.log("");
  console.log(chalk.gray("  # Launch interactive UI"));
  console.log("  $ nocturne ui");
  console.log("");
  console.log(chalk.bold("Documentation:"));
  console.log("  https://github.com/yourusername/nocturne-ai#readme");
  console.log("");
});

/**
 * Handle unknown commands
 */
program.on("command:*", (operands) => {
  console.error(chalk.red(`\nError: Unknown command '${operands[0]}'`));
  console.log(chalk.gray("\nRun 'nocturne help' for usage information.\n"));
  process.exit(1);
});

/**
 * Launch chat UI by default if no arguments provided
 */
if (!process.argv.slice(2).length) {
  startChatUI();
} else {
  /**
   * Parse command line arguments and execute
   */
  program.parse(process.argv);
}
