/**
 * Task Execution Module Type Definitions
 *
 * Shared types for the iterative task execution system.
 * Used by TaskManager, TaskAnalyzer, IterationLoop, and TaskFormatter.
 */

import type { ProposedAction, ExecutionResult } from '../../../presentation/ui/types.js';

/**
 * Task Todo Item
 *
 * Represents a single step in the task execution plan.
 */
export interface TaskTodo {
  /** Unique identifier */
  id: string;

  /** Todo description (what needs to be done) */
  description: string;

  /** Current status */
  status: 'pending' | 'in_progress' | 'completed';

  /** Active form for display ("Creating file", "Running tests") */
  activeForm?: string;

  /** Result after completion */
  result?: string;

  /** When this todo was added to the list */
  addedAt: Date;
}

/**
 * Task Context
 *
 * Complete state of an ongoing task execution.
 * Maintained across multiple iterations.
 */
export interface TaskContext {
  /** Original user request */
  originalRequest: string;

  /** Is this a simple query that should complete after first success? */
  isSimpleQuery?: boolean;

  /** Dynamic todo list (can grow/shrink during execution) */
  todos: TaskTodo[];

  /** History of executions for context */
  executionHistory: Array<{
    /** Which todo was being executed */
    todo: string;

    /** Actions that were executed */
    actions: ProposedAction[];

    /** Results from execution */
    results: ExecutionResult[];

    /** When this execution happened */
    timestamp: Date;
  }>;

  /** Task metadata */
  startTime: Date;

  /** Current iteration number */
  iterations: number;

  /** Maximum iterations allowed (safety limit) */
  maxIterations: number;
}

/**
 * Analysis Result
 *
 * Result from TaskAnalyzer analyzing progress.
 */
export interface AnalysisResult {
  /** Insights learned from recent executions */
  insights: string[];

  /** New todos that should be added */
  newTodosNeeded: string[];

  /** Todos that should be removed (no longer needed) */
  todosToRemove: string[];

  /** Whether the task is complete */
  isComplete: boolean;

  /** Reasoning for the decision */
  reasoning: string;
}

/**
 * Iteration Result
 *
 * Result from one iteration of the execution loop.
 */
export interface IterationResult {
  /** Type of result */
  type: 'needs_confirmation' | 'task_complete' | 'max_iterations' | 'error';

  /** Current todo (if needs_confirmation) */
  todo?: TaskTodo;

  /** Planned actions (if needs_confirmation) */
  actions?: ProposedAction[];

  /** Message to display to user */
  message?: string;

  /** Updated task context */
  context: TaskContext;
}

/**
 * Task Mode
 *
 * Execution mode for the task.
 */
export type TaskMode = 'edit' | 'agent';
