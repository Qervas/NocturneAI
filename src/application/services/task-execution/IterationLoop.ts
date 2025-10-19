/**
 * IterationLoop
 *
 * Executes the main iteration loop for task execution.
 * Coordinates between TaskManager, TaskAnalyzer, and ToolExecutor.
 *
 * Single Responsibility: Loop execution and coordination
 */

import type { CopilotClient } from '../../../infrastructure/llm/CopilotClient.js';
import type { ToolExecutor } from '../ToolExecutor.js';
import type { TaskContext, TaskTodo, IterationResult, TaskMode } from './types.js';
import type { ProposedAction, ExecutionResult } from '../../../presentation/ui/types.js';
import { TaskManager } from './TaskManager.js';
import { TaskAnalyzer } from './TaskAnalyzer.js';

/**
 * Iteration Loop
 *
 * Responsible for executing the iterative task execution loop.
 * Handles the ReAct-style loop: Think → Plan → Act → Observe → Repeat
 */
export class IterationLoop {
  constructor(
    private taskManager: TaskManager,
    private taskAnalyzer: TaskAnalyzer,
    private toolExecutor: ToolExecutor,
    private llmClient: CopilotClient
  ) {}

  /**
   * Execute next iteration of the loop
   *
   * Returns when:
   * - Needs user confirmation (Edit mode)
   * - Task is complete
   * - Max iterations reached
   * - Error occurred
   *
   * @param context Task context (will be mutated)
   * @param mode Execution mode ('edit' or 'agent')
   * @returns Iteration result
   */
  async executeNextIteration(
    context: TaskContext,
    mode: TaskMode
  ): Promise<IterationResult> {
    // Safety check: max iterations
    if (context.iterations >= context.maxIterations) {
      return {
        type: 'max_iterations',
        message: `Reached maximum iteration limit (${context.maxIterations} steps)`,
        context
      };
    }

    context.iterations++;

    // Step 1: Analyze what we've done so far
    const analysis = await this.taskAnalyzer.analyzeProgress(context);

    // Step 2: Update todos based on analysis
    this.updateTodosFromAnalysis(context, analysis);

    // Step 3: Check if all todos are complete
    if (this.taskManager.isAllComplete(context)) {
      // Double-check with LLM that task is truly complete
      const isComplete = await this.taskAnalyzer.isTaskComplete(context);

      if (isComplete) {
        return {
          type: 'task_complete',
          message: 'All todos completed successfully',
          context
        };
      }
    }

    // Step 4: Get next pending todo
    const nextTodo = this.taskManager.getNextPendingTodo(context);

    if (!nextTodo) {
      // No pending todos but task not complete (shouldn't happen)
      return {
        type: 'error',
        message: 'No pending todos but task not complete',
        context
      };
    }

    // Step 5: Mark todo as in progress
    this.taskManager.markInProgress(context, nextTodo.id);

    // Step 6: Plan actions for this todo
    const actions = await this.planActionsForTodo(nextTodo, context);

    if (actions.length === 0) {
      // Can't figure out how to do this todo - mark as complete and try next
      this.taskManager.markComplete(context, nextTodo.id, 'Skipped - no actions needed');

      // Try next iteration
      return await this.executeNextIteration(context, mode);
    }

    // Step 7: Return for confirmation (Edit mode) or execute (Agent mode)
    return {
      type: 'needs_confirmation',
      todo: nextTodo,
      actions,
      context
    };
  }

  /**
   * Plan actions for a specific todo
   *
   * @param todo Todo to plan for
   * @param context Task context for additional context
   * @returns Proposed actions
   */
  async planActionsForTodo(
    todo: TaskTodo,
    context: TaskContext
  ): Promise<ProposedAction[]> {
    // Build context from execution history
    const executionContext = context.executionHistory.length > 0
      ? this.buildExecutionContext(context)
      : '';

    const tools = this.toolExecutor.getAvailableTools();
    const toolDescriptions = tools.map(t => `- ${t}: ${this.getToolDescription(t)}`).join('\n');

    const systemPrompt = `You are a terminal command generator for a coding assistant.

Available tools:
${toolDescriptions}

For most operations, generate terminal commands using command_execute:
- List files: {"tool": "command_execute", "parameters": {"command": "ls", "args": ["-la"]}}
- Find files: {"tool": "command_execute", "parameters": {"command": "find", "args": [".", "-name", "*.tsx"]}}
- Read file: {"tool": "command_execute", "parameters": {"command": "cat", "args": ["filename"]}}
- Write file: {"tool": "command_execute", "parameters": {"command": "sh", "args": ["-c", "cat > file.py << 'EOF'\\ncode\\nEOF"]}}
- Run Python: {"tool": "command_execute", "parameters": {"command": "python", "args": ["script.py", "arg1"]}}
- Run script with input: {"tool": "command_execute", "parameters": {"command": "sh", "args": ["-c", "echo '10' | python script.py"]}}
- Search content: {"tool": "command_execute", "parameters": {"command": "grep", "args": ["-r", "pattern", "."]}}
- Count lines: {"tool": "command_execute", "parameters": {"command": "wc", "args": ["-l", "filename"]}}

IMPORTANT: For pipes, redirects, or shell syntax (|, >, <, &&, ||), wrap in sh -c:
- Pipe example: {"tool": "command_execute", "parameters": {"command": "sh", "args": ["-c", "ls -1 | wc -l"]}}
- Multiple commands: {"tool": "command_execute", "parameters": {"command": "sh", "args": ["-c", "echo hello && echo world"]}}

File operations:
- Create new file: ALWAYS use command_execute with heredoc (cat > file.py << 'EOF'\\ncode\\nEOF)
- Add to existing file: Use command_execute with heredoc and >> (cat >> file.py << 'EOF'\\ncode\\nEOF)
- Edit existing file: ONLY use file_edit when you need to replace specific text
  Example: {"tool": "file_edit", "parameters": {"path": "config.ts", "old_string": "timeout: 30", "new_string": "timeout: 60"}}
  CRITICAL: old_string MUST be exact text from the file (not empty!)
- For adding test code to files: Use command_execute with heredoc append (>>)

File creation rules:
- If user doesn't specify filename, generate meaningful one (e.g., "is_prime.py" for prime checker)
- Use heredoc for multi-line content: cat > file.py << 'EOF'\\ncontent\\nEOF
- To add main/test block to Python file: cat >> file.py << 'EOF'\\nif __name__ == "__main__":\\n    print(...)\\nEOF

Respond with ONLY a JSON array (no markdown, no explanation):
[{
  "description": "What this action does",
  "tool": "tool-name",
  "parameters": {"param": "value"}
}]

If no tools needed, return empty array: []`;

    const userPrompt = `Original task: "${context.originalRequest}"

Current step to execute: "${todo.description}"

${executionContext}

What actions should I take to complete this step?`;

    try {
      const response = await this.llmClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: 1000
      });

      const content = response.content || response.message?.content || '';

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const actions = JSON.parse(jsonMatch[0]);

      return actions.map((a: any) => ({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: a.description,
        command: a.tool,
        category: 'system' as const,
        parameters: a.parameters || {}
      }));

    } catch (error) {
      console.error('[IterationLoop] Failed to plan actions:', error);
      return [];
    }
  }

  /**
   * Execute actions and update context
   *
   * @param actions Actions to execute
   * @param todo Todo being executed
   * @param context Task context (will be mutated)
   * @returns Execution results
   */
  async executeAndUpdateContext(
    actions: ProposedAction[],
    todo: TaskTodo,
    context: TaskContext
  ): Promise<ExecutionResult[]> {
    // Execute actions using ToolExecutor
    const results = await this.toolExecutor.executeActions(actions);

    // Add to execution history
    context.executionHistory.push({
      todo: todo.description,
      actions,
      results,
      timestamp: new Date()
    });

    // Mark todo as complete
    const successCount = results.filter(r => r.success).length;
    const result = successCount === actions.length
      ? 'Completed successfully'
      : `Partial: ${successCount}/${actions.length} succeeded`;

    this.taskManager.markComplete(context, todo.id, result);

    return results;
  }

  /**
   * Update todos based on analysis
   *
   * @param context Task context (will be mutated)
   * @param analysis Analysis result
   */
  private updateTodosFromAnalysis(context: TaskContext, analysis: any): void {
    // Add new todos
    for (const todoDesc of analysis.newTodosNeeded || []) {
      this.taskManager.addTodo(context, todoDesc);
    }

    // Remove unnecessary todos (only if pending)
    for (const todoToRemove of analysis.todosToRemove || []) {
      const todo = context.todos.find(
        t => t.description.toLowerCase().includes(todoToRemove.toLowerCase()) &&
             t.status === 'pending'
      );

      if (todo) {
        this.taskManager.removeTodo(context, todo.id);
      }
    }
  }

  /**
   * Build execution context string from history
   *
   * @param context Task context
   * @returns Formatted context string
   */
  private buildExecutionContext(context: TaskContext): string {
    const recentHistory = context.executionHistory.slice(-3);

    if (recentHistory.length === 0) {
      return '';
    }

    let contextStr = 'What we\'ve done so far:\n';

    recentHistory.forEach(h => {
      contextStr += `- ${h.todo}\n`;
      h.results.forEach(r => {
        const status = r.success ? '✓' : '✗';
        contextStr += `  ${status} ${r.message || r.error}\n`;
      });
    });

    return contextStr;
  }

  /**
   * Get tool description
   *
   * @param toolName Tool name
   * @returns Description
   */
  private getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      'command_execute': 'Generate and execute terminal commands (ls, cat, find, grep, wc, head, tail, mkdir, cp, mv, etc.)',
      'file_edit': 'Edit existing file with search-replace pattern (old_string → new_string)',
      'git_status': 'Show git status',
      'git_diff': 'Show git diff',
      'git_log': 'Show git log',
      'git_commit': 'Create git commit',
      'code_search': 'Search code contents with regex',
      'file_search': 'Search for files by pattern',
      'symbol_search': 'Search for code symbols (functions, classes)'
    };
    return descriptions[toolName] || 'Tool';
  }
}
