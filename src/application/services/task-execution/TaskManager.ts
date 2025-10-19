/**
 * TaskManager
 *
 * Manages the todo list for task execution.
 * Handles CRUD operations on todos and task context.
 *
 * Single Responsibility: Todo list management
 */

import type { CopilotClient } from '../../../infrastructure/llm/CopilotClient.js';
import type { TaskTodo, TaskContext } from './types.js';

/**
 * Task Manager
 *
 * Responsible for creating, updating, and managing the todo list.
 */
export class TaskManager {
  constructor(private llmClient: CopilotClient) {}

  /**
   * Create initial task context with todos from user request
   *
   * @param userRequest Original user request
   * @returns New task context with initial todos
   */
  async createInitialTask(userRequest: string): Promise<TaskContext> {
    const initialTodos = await this.createInitialTodos(userRequest);

    return {
      originalRequest: userRequest,
      todos: initialTodos,
      executionHistory: [],
      startTime: new Date(),
      iterations: 0,
      maxIterations: 15
    };
  }

  /**
   * Create initial todo list by asking LLM to break down the request
   *
   * @param request User request
   * @returns Initial todo list
   */
  private async createInitialTodos(request: string): Promise<TaskTodo[]> {
    const prompt = `Break down this request into a step-by-step todo list.

User request: "${request}"

Create a list of specific, actionable todos. Be thorough but not overly detailed.
Focus on the main steps needed to complete the request.

IMPORTANT RULES:
1. Do NOT create overlapping todos that do the same thing
2. Each todo should be a distinct action - don't split one action across multiple todos
3. If the request is simple (like "list files"), create just ONE todo
4. Combine related actions into single todos

Examples:

GOOD - Simple request with one action:
- Request: "list all files"
  [
    {"description": "List all files in the current directory"}
  ]

GOOD - Multiple distinct steps:
- Request: "create fibonacci and test with 10"
  [
    {"description": "Create fibonacci.py with fibonacci function"},
    {"description": "Execute the function with input 10"},
    {"description": "Verify the output is correct"}
  ]

BAD - Overlapping todos:
- Request: "list files"
  [
    {"description": "Open terminal"},          ❌ Don't split into sub-steps
    {"description": "Run ls command"},         ❌ This IS listing files
    {"description": "List all files"}          ❌ Duplicate of above
  ]

GOOD - Complex request:
- Request: "fix the bug in login.ts where users can't log out"
  [
    {"description": "Read login.ts to understand the logout functionality"},
    {"description": "Identify and fix the logout bug"},
    {"description": "Test the logout functionality"}
  ]

Respond with ONLY a JSON array (no markdown, no explanation):
[
  {"description": "First step to do"},
  {"description": "Second step to do"}
]`;

    try {
      const response = await this.llmClient.chat({
        messages: [
          { role: 'system', content: 'You are a task planner. Create clear, actionable todo lists from user requests.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        maxTokens: 500
      });

      const content = response.content || response.message?.content || '[]';

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Fallback: create single todo
        return this.createFallbackTodo(request);
      }

      const todoDescriptions = JSON.parse(jsonMatch[0]);

      return todoDescriptions.map((desc: any, idx: number) => ({
        id: `todo-${Date.now()}-${idx}`,
        description: desc.description,
        status: 'pending' as const,
        activeForm: this.getActiveForm(desc.description),
        addedAt: new Date()
      }));

    } catch (error) {
      console.error('[TaskManager] Failed to create initial todos:', error);
      return this.createFallbackTodo(request);
    }
  }

  /**
   * Create fallback todo when LLM fails
   */
  private createFallbackTodo(request: string): TaskTodo[] {
    return [{
      id: `todo-${Date.now()}-0`,
      description: request,
      status: 'pending',
      activeForm: this.getActiveForm(request),
      addedAt: new Date()
    }];
  }

  /**
   * Add a new todo to the context
   *
   * @param context Task context
   * @param description Todo description
   * @returns The created todo
   */
  addTodo(context: TaskContext, description: string): TaskTodo {
    const newTodo: TaskTodo = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description,
      status: 'pending',
      activeForm: this.getActiveForm(description),
      addedAt: new Date()
    };

    context.todos.push(newTodo);
    return newTodo;
  }

  /**
   * Remove a todo from the context
   *
   * @param context Task context
   * @param todoId Todo ID to remove
   * @returns True if removed, false if not found
   */
  removeTodo(context: TaskContext, todoId: string): boolean {
    const index = context.todos.findIndex(t => t.id === todoId);
    if (index !== -1) {
      context.todos.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Mark todo as in progress
   *
   * @param context Task context
   * @param todoId Todo ID
   */
  markInProgress(context: TaskContext, todoId: string): void {
    const todo = context.todos.find(t => t.id === todoId);
    if (todo) {
      todo.status = 'in_progress';
    }
  }

  /**
   * Mark todo as completed
   *
   * @param context Task context
   * @param todoId Todo ID
   * @param result Result message
   */
  markComplete(context: TaskContext, todoId: string, result: string): void {
    const todo = context.todos.find(t => t.id === todoId);
    if (todo) {
      todo.status = 'completed';
      todo.result = result;
    }
  }

  /**
   * Get next pending todo
   *
   * @param context Task context
   * @returns Next pending todo or null
   */
  getNextPendingTodo(context: TaskContext): TaskTodo | null {
    return context.todos.find(t => t.status === 'pending') || null;
  }

  /**
   * Check if all todos are complete
   *
   * @param context Task context
   * @returns True if all complete
   */
  isAllComplete(context: TaskContext): boolean {
    return context.todos.every(t => t.status === 'completed');
  }

  /**
   * Get all todos
   *
   * @param context Task context
   * @returns All todos
   */
  getAllTodos(context: TaskContext): TaskTodo[] {
    return [...context.todos];
  }

  /**
   * Format todo list for display
   *
   * @param context Task context
   * @returns Formatted todo list string
   */
  formatTodoList(context: TaskContext): string {
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
  formatCompletedSummary(context: TaskContext): string {
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

  /**
   * Convert todo description to active form
   * "Create file" → "Creating file"
   *
   * @param description Todo description
   * @returns Active form
   */
  private getActiveForm(description: string): string {
    const verbMap: Record<string, string> = {
      'Create': 'Creating',
      'Write': 'Writing',
      'Add': 'Adding',
      'Update': 'Updating',
      'Delete': 'Deleting',
      'Remove': 'Removing',
      'Run': 'Running',
      'Execute': 'Executing',
      'Test': 'Testing',
      'Fix': 'Fixing',
      'Build': 'Building',
      'Install': 'Installing',
      'Read': 'Reading',
      'Search': 'Searching',
      'Find': 'Finding',
      'Verify': 'Verifying',
      'Check': 'Checking',
      'Analyze': 'Analyzing'
    };

    for (const [verb, activeForm] of Object.entries(verbMap)) {
      if (description.startsWith(verb + ' ')) {
        return description.replace(verb, activeForm);
      }
    }

    // Default: just add "ing" if it starts with a capital letter
    const firstWord = description.split(' ')[0];
    if (firstWord && firstWord[0] === firstWord[0].toUpperCase()) {
      return description.replace(firstWord, firstWord + 'ing');
    }

    return description;
  }
}
