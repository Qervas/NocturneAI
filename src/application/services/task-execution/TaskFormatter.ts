/**
 * TaskFormatter
 *
 * Formats task-related messages for display.
 * Handles confirmation messages, progress updates, and summaries.
 *
 * Single Responsibility: Display formatting
 */

import type { TaskContext, TaskTodo } from './types.js';
import type { ProposedAction } from '../../../presentation/ui/types.js';

/**
 * Task Formatter
 *
 * Responsible for formatting task information for user display.
 * Pure formatting functions with no business logic.
 */
export class TaskFormatter {
  /**
   * Format confirmation message with todo list and action details
   *
   * @param todo Current todo being executed
   * @param actions Proposed actions
   * @param context Task context
   * @returns Formatted confirmation message
   */
  formatConfirmationWithTodos(
    todo: TaskTodo,
    actions: ProposedAction[],
    context: TaskContext
  ): string {
    let message = `📋 Task Progress (Step ${context.iterations}):\n\n`;

    // Show all todos with status
    message += this.formatTodoList(context) + '\n\n';

    // Show current step details
    message += `🎯 Current Step: ${todo.description}\n\n`;
    message += `I'll perform ${actions.length} action(s):\n\n`;

    actions.forEach((action, i) => {
      message += `${i + 1}. ${action.description}\n`;

      // Show command transparency
      if (action.command === 'command_execute' && action.parameters) {
        const cmd = action.parameters.command || '';
        const args = action.parameters.args || [];
        if (cmd) {
          message += `   → Command: ${cmd}${args.length > 0 ? ' ' + (Array.isArray(args) ? args.join(' ') : args) : ''}\n`;
        }
      }

      // Show diff preview for file_edit
      if (action.command === 'file_edit' && action.parameters) {
        const oldStr = action.parameters.old_string || '';
        const newStr = action.parameters.new_string || '';
        const path = action.parameters.path || '';

        if (oldStr && newStr && path) {
          message += `   → File: ${path}\n`;
          message += `   → Preview:\n`;

          const oldLines = oldStr.split('\n');
          const newLines = newStr.split('\n');
          const maxPreviewLines = 3;

          // Show removals
          oldLines.slice(0, maxPreviewLines).forEach((line) => {
            message += `   - ${line}\n`;
          });
          if (oldLines.length > maxPreviewLines) {
            message += `   ... (${oldLines.length - maxPreviewLines} more)\n`;
          }

          // Show additions
          newLines.slice(0, maxPreviewLines).forEach((line) => {
            message += `   + ${line}\n`;
          });
          if (newLines.length > maxPreviewLines) {
            message += `   ... (${newLines.length - maxPreviewLines} more)\n`;
          }
        }
      }
    });

    message += '\nDo you want to proceed?';

    return message;
  }

  /**
   * Format task complete message
   *
   * @param context Task context
   * @returns Formatted completion message
   */
  formatTaskComplete(context: TaskContext): string {
    let message = '✓ Task complete!\n\n';
    message += this.formatCompletedSummary(context);
    return message;
  }

  /**
   * Format task progress message (for agent mode)
   *
   * @param context Task context
   * @returns Formatted progress message
   */
  formatTaskProgress(context: TaskContext): string {
    let message = `📋 Task Progress (Step ${context.iterations}):\n\n`;
    message += this.formatTodoList(context);
    return message;
  }

  /**
   * Format iteration start message (for agent mode)
   *
   * @param iteration Current iteration
   * @param todo Current todo
   * @param context Task context
   * @returns Formatted message
   */
  formatIterationStart(
    iteration: number,
    todo: TaskTodo,
    context: TaskContext
  ): string {
    let message = `🤖 Executing step ${iteration}:\n\n`;
    message += this.formatTodoList(context) + '\n\n';
    message += `Current: ${todo.description}`;
    return message;
  }

  /**
   * Format initial plan message
   *
   * @param context Task context
   * @returns Formatted initial plan
   */
  formatInitialPlan(context: TaskContext): string {
    let message = `I'll help you with that! Here's my plan:\n\n`;
    message += this.formatTodoList(context) + '\n\n';
    message += 'Starting with the first step...';
    return message;
  }

  /**
   * Format max iterations reached message
   *
   * @param context Task context
   * @returns Formatted warning message
   */
  formatMaxIterations(context: TaskContext): string {
    let message = '⚠️ Reached maximum iteration limit (15 steps).\n\n';
    message += 'Task may be incomplete:\n\n';
    message += this.formatTodoList(context);
    return message;
  }

  /**
   * Format task cancelled message
   *
   * @param context Task context
   * @returns Formatted cancellation message
   */
  formatTaskCancelled(context: TaskContext): string {
    let message = 'Task cancelled.\n\n';
    message += this.formatTodoList(context) + '\n\n';
    message += 'Let me know if you need anything else!';
    return message;
  }

  /**
   * Format todo list for display
   *
   * @param context Task context
   * @returns Formatted todo list
   */
  private formatTodoList(context: TaskContext): string {
    let output = '';

    context.todos.forEach((todo, i) => {
      const icon = todo.status === 'completed' ? '✓' :
                   todo.status === 'in_progress' ? '⟳' : '○';

      output += `${icon} ${i + 1}. ${todo.description}`;

      if (todo.result) {
        output += ` (${todo.result})`;
      }

      output += '\n';
    });

    return output;
  }

  /**
   * Format completed task summary
   *
   * @param context Task context
   * @returns Formatted summary
   */
  private formatCompletedSummary(context: TaskContext): string {
    let output = '📋 Task Summary:\n\n';

    context.todos.forEach((todo, i) => {
      const icon = todo.status === 'completed' ? '✓' : '○';
      output += `${icon} ${i + 1}. ${todo.description}`;

      if (todo.result) {
        output += ` (${todo.result})`;
      }

      output += '\n';
    });

    const duration = Date.now() - context.startTime.getTime();
    const seconds = Math.round(duration / 1000);
    output += `\nCompleted in ${seconds} second${seconds !== 1 ? 's' : ''} `;
    output += `(${context.iterations} iteration${context.iterations !== 1 ? 's' : ''})`;

    return output;
  }
}
