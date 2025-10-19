/**
 * Task Execution Module
 *
 * Modular components for iterative task execution with dynamic todo lists.
 * Implements the Claude Code pattern: Think → Plan → Act → Observe → Repeat
 *
 * Components:
 * - TaskManager: Todo list CRUD operations
 * - TaskAnalyzer: Progress analysis and decision-making
 * - TaskFormatter: Display formatting
 * - IterationLoop: Main execution loop coordination
 *
 * Usage:
 * ```typescript
 * const taskManager = new TaskManager(llmClient);
 * const taskAnalyzer = new TaskAnalyzer(llmClient);
 * const taskFormatter = new TaskFormatter();
 * const iterationLoop = new IterationLoop(
 *   taskManager,
 *   taskAnalyzer,
 *   toolExecutor,
 *   llmClient
 * );
 *
 * const context = await taskManager.createInitialTask(userRequest);
 * const result = await iterationLoop.executeNextIteration(context, 'edit');
 * ```
 */

// Export types
export type {
  TaskTodo,
  TaskContext,
  AnalysisResult,
  IterationResult,
  TaskMode
} from './types.js';

// Export classes
export { TaskManager } from './TaskManager.js';
export { TaskAnalyzer } from './TaskAnalyzer.js';
export { TaskFormatter } from './TaskFormatter.js';
export { IterationLoop } from './IterationLoop.js';
