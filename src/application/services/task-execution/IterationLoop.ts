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
      // All todos complete - task is done!
      // (We trust our todo list completion over LLM second-guessing)
      return {
        type: 'task_complete',
        message: 'All todos completed successfully',
        context
      };
    }

    // Step 4: Get next pending todo
    const nextTodo = this.taskManager.getNextPendingTodo(context);

    if (!nextTodo) {
      // No pending todos but some aren't marked complete - shouldn't happen
      // This means we have todos in 'in_progress' state but no pending ones
      // Treat as complete anyway to avoid getting stuck
      return {
        type: 'task_complete',
        message: 'No more pending todos - task complete',
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

    // Auto-complete simple queries after first successful execution
    // This prevents infinite loops where LLM keeps adding more todos
    if (context.isSimpleQuery && results.some(r => r.success)) {
      // Simple query succeeded - mark all remaining todos as complete
      context.todos.forEach(t => {
        if (t.status !== 'completed') {
          this.taskManager.markComplete(context, t.id, 'Query answered');
        }
      });
    }

    return results;
  }

  /**
   * Update todos based on analysis
   *
   * @param context Task context (will be mutated)
   * @param analysis Analysis result
   */
  private updateTodosFromAnalysis(context: TaskContext, analysis: any): void {
    // NEVER add new todos for simple queries (prevents infinite loops)
    if (!context.isSimpleQuery) {
      // Add new todos
      for (const todoDesc of analysis.newTodosNeeded || []) {
        this.taskManager.addTodo(context, todoDesc);
      }
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
   * Interpret execution results to generate natural language answer
   *
   * This makes our output more like Claude Code - providing helpful explanations
   * instead of just raw command output.
   *
   * @param originalRequest User's original question/request
   * @param results Execution results
   * @returns Natural language interpretation
   */
  async interpretResults(
    originalRequest: string,
    results: ExecutionResult[]
  ): Promise<string> {
    // Collect all successful outputs
    const outputs = results
      .filter(r => r.success && r.output)
      .map(r => r.output)
      .join('\n');

    if (!outputs.trim()) {
      return 'Done!';
    }

    const systemPrompt = `You are a helpful AI assistant. The user asked a question, and we executed commands to answer it.
Your job is to interpret the command output and provide a natural, helpful answer.

Guidelines:
- Provide a clear, natural language answer to the user's question
- Interpret raw command output (e.g., "24" → "There are 24 files...")
- Add helpful context when relevant (e.g., breakdown by directory, notable patterns)
- Keep it concise (1-3 sentences typically)
- If the output is an error, explain what went wrong
- Don't just repeat the raw output - interpret and explain it
- For file creation tasks: Just confirm what was created, DON'T show the code that was written
- For code generation: Describe WHAT was created (not the code itself - they can see that in the file)

Examples:
User: "How many tsx files are there?"
Output: "24"
Answer: "There are 24 .tsx files in the NocturneAI folder and its subdirectories. All of them are located in the src/presentation/ui/ directory."

User: "What's in the README?"
Output: "# NocturneAI\\nAn AI agent system..."
Answer: "The README describes NocturneAI as an AI agent system with multi-agent coordination capabilities."

User: "Write python code to draw a triangle"
Output: "(file created with turtle code)"
Answer: "Created draw_triangle.py that uses the turtle graphics library to draw an equilateral triangle. Run it with 'python draw_triangle.py' to see the triangle."

User: "Create a function to check if a number is prime"
Output: "(file created with prime checking code)"
Answer: "Created is_prime.py with a function that checks if a number is prime using trial division."`;

    const userPrompt = `User asked: "${originalRequest}"

Command output:
${outputs.length > 500 ? outputs.substring(0, 500) + '... (truncated)' : outputs}

Provide a natural, helpful answer (describe WHAT was done, don't repeat code):`;

    try {
      // Add timeout to prevent hanging (5 seconds max)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Interpretation timeout')), 5000)
      );

      const chatPromise = this.llmClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: 200
      });

      const response = await Promise.race([chatPromise, timeoutPromise]);
      return response.content || response.message?.content || 'Done!';
    } catch (error) {
      // Log to file only - NO console output (prevents terminal pollution)
      // Fall back to simple completion message on timeout or error
      return 'Done!';
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
