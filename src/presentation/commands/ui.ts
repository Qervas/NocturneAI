/**
 * UI Command
 *
 * Launches the interactive Terminal UI for monitoring and managing
 * agents and workflows in real-time.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { startUI } from '../ui/index.js';
import { EventEmitter } from 'events';
import { LogLevel, UIEventType } from '../ui/types.js';

/**
 * Create UI command
 *
 * @returns Commander command instance
 */
export function createUICommand(): Command {
  const command = new Command('ui');

  command
    .description('Launch the interactive Terminal UI')
    .option('-v, --view <type>', 'Initial view to display (dashboard, agents, workflows, logs, help)', 'dashboard')
    .option('--no-auto-refresh', 'Disable automatic refresh')
    .option('--refresh-interval <ms>', 'Refresh interval in milliseconds', '5000')
    .option('--max-logs <count>', 'Maximum number of logs to keep', '1000')
    .action(async (options) => {
      try {
        console.log(chalk.cyan('🚀 Starting NocturneAI Terminal UI...\n'));

        // Create event bus for UI communication
        const eventBus = new EventEmitter();

        // Map view option to ViewType
        const viewMap: Record<string, string> = {
          dashboard: 'dashboard',
          agents: 'agent_status',
          workflows: 'workflow_progress',
          logs: 'logs',
          help: 'help'
        };

        const initialView = viewMap[options.view.toLowerCase()] || 'dashboard';

        // Set up event bus logging (for demonstration)
        if (process.env.DEBUG) {
          eventBus.on(UIEventType.AGENT_CREATED, (agent) => {
            console.log(chalk.green(`[EVENT] Agent created: ${agent.name}`));
          });

          eventBus.on(UIEventType.WORKFLOW_STARTED, (workflow) => {
            console.log(chalk.yellow(`[EVENT] Workflow started: ${workflow.name}`));
          });

          eventBus.on(UIEventType.LOG_ENTRY, (log) => {
            console.log(chalk.gray(`[LOG] ${log.level}: ${log.message}`));
          });
        }

        // Add some sample data for demonstration
        setTimeout(() => {
          // Emit sample agent
          eventBus.emit(UIEventType.AGENT_CREATED, {
            id: 'agent-001',
            name: 'Sample Agent',
            status: 'idle',
            currentTask: undefined,
            progress: 0,
            startTime: new Date(),
            metrics: {
              tasksCompleted: 0,
              tasksInProgress: 0,
              tasksFailed: 0,
              avgExecutionTime: 0
            }
          });

          // Emit sample log
          eventBus.emit(UIEventType.LOG_ENTRY, {
            timestamp: new Date(),
            level: LogLevel.INFO,
            source: 'system',
            message: 'Terminal UI initialized successfully'
          });
        }, 100);

        // Handle exit gracefully
        const handleExit = () => {
          console.log(chalk.cyan('\n👋 Exiting NocturneAI Terminal UI...'));
          process.exit(0);
        };

        // Start the UI
        const { waitUntilExit } = startUI({
          initialView: initialView as any,
          eventBus,
          onExit: handleExit
        });

        // Set up refresh timer if enabled
        if (options.autoRefresh) {
          const refreshInterval = parseInt(options.refreshInterval, 10);
          const timer = setInterval(() => {
            eventBus.emit('refresh');
          }, refreshInterval);

          // Clean up timer on exit
          process.on('SIGINT', () => {
            clearInterval(timer);
            handleExit();
          });

          process.on('SIGTERM', () => {
            clearInterval(timer);
            handleExit();
          });
        }

        // Wait for UI to exit
        await waitUntilExit();
      } catch (error) {
        console.error(chalk.red('Error starting Terminal UI:'), error);
        process.exit(1);
      }
    });

  // Add subcommands for specific views
  command
    .command('dashboard')
    .description('Launch UI with dashboard view')
    .action(async () => {
      const { startUI } = await import('../ui/index.js');
      const eventBus = new EventEmitter();

      const { waitUntilExit } = startUI({
        initialView: 'dashboard' as any,
        eventBus
      });

      await waitUntilExit();
    });

  command
    .command('agents')
    .description('Launch UI with agent status view')
    .action(async () => {
      const { startUI } = await import('../ui/index.js');
      const eventBus = new EventEmitter();

      const { waitUntilExit } = startUI({
        initialView: 'agent_status' as any,
        eventBus
      });

      await waitUntilExit();
    });

  command
    .command('workflows')
    .description('Launch UI with workflow progress view')
    .action(async () => {
      const { startUI } = await import('../ui/index.js');
      const eventBus = new EventEmitter();

      const { waitUntilExit } = startUI({
        initialView: 'workflow_progress' as any,
        eventBus
      });

      await waitUntilExit();
    });

  command
    .command('logs')
    .description('Launch UI with log viewer')
    .action(async () => {
      const { startUI } = await import('../ui/index.js');
      const eventBus = new EventEmitter();

      const { waitUntilExit } = startUI({
        initialView: 'logs' as any,
        eventBus
      });

      await waitUntilExit();
    });

  return command;
}
