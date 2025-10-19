/**
 * EditModeHandler
 *
 * Handles human-approved actions mode (EDIT) - actions require confirmation.
 * Uses Router LLM + ReAct agent for intelligent action planning with safety.
 *
 * Key Features:
 * - Router LLM for intent analysis
 * - ReAct agent for action planning
 * - Confirmation required before execution
 * - Safety checks for destructive operations
 * - Support for approve/modify/cancel responses
 *
 * This mode is ideal for:
 * - File operations (create, edit, delete)
 * - Git operations (commit, push, branch)
 * - System commands (install, build, test)
 * - Any action requiring user approval
 */

import type { IModeHandler } from '../../../core/interfaces/IModeHandler.js';
import type { CopilotClient } from '../../../infrastructure/llm/CopilotClient.js';
import type { ChatOrchestrator } from '../ChatOrchestrator.js';
import type { ReActAgent } from '../ReActAgent.js';
import type { ProposedAction, ConfirmationStatus, ExecutionResult } from '../../../presentation/ui/types.js';
import { ToolExecutor } from '../ToolExecutor.js';
import { OutputFormatter } from '../OutputFormatter.js';
import {
  TaskManager,
  TaskAnalyzer,
  TaskFormatter,
  IterationLoop,
  type TaskContext,
  type TaskTodo
} from '../task-execution/index.js';

/**
 * Edit Mode Handler Configuration
 */
export interface EditModeHandlerConfig {
  /**
   * Router LLM client for intent analysis
   */
  routerClient: CopilotClient;

  /**
   * ReAct agent for action planning and execution
   */
  reactAgent: ReActAgent;

  /**
   * Chat orchestrator for managing messages
   */
  chatOrchestrator: ChatOrchestrator;

  /**
   * Enable logging
   */
  enableLogging?: boolean;
}

/**
 * Edit Mode Handler
 *
 * Provides human-approved action execution using Router + ReAct.
 * All actions require confirmation before execution.
 */
export class EditModeHandler implements IModeHandler {
  readonly mode = 'edit' as const;
  readonly displayName = 'Edit Mode';
  readonly description =
    'Human-approved actions mode. Plan and execute tasks with your confirmation.';

  private routerClient: CopilotClient;
  private chatOrchestrator: ChatOrchestrator;
  private enableLogging: boolean;
  private toolExecutor: ToolExecutor;
  private taskManager: TaskManager;
  private taskAnalyzer: TaskAnalyzer;
  private taskFormatter: TaskFormatter;
  private iterationLoop: IterationLoop;
  private currentContext: TaskContext | null = null;

  /**
   * Create a new EditModeHandler
   *
   * @param config Handler configuration
   */
  constructor(config: EditModeHandlerConfig) {
    this.routerClient = config.routerClient;
    this.chatOrchestrator = config.chatOrchestrator;
    this.enableLogging = config.enableLogging ?? true;

    // Initialize tool executor with built-in tools
    const toolExecutor = new ToolExecutor({
      tools: ToolExecutor.createBuiltinTools(),
      enableLogging: this.enableLogging
    });

    this.toolExecutor = toolExecutor;

    // Initialize task execution components (MODULAR!)
    this.taskManager = new TaskManager(config.routerClient);
    this.taskAnalyzer = new TaskAnalyzer(config.routerClient);
    this.taskFormatter = new TaskFormatter();
    this.iterationLoop = new IterationLoop(
      this.taskManager,
      this.taskAnalyzer,
      toolExecutor,
      config.routerClient
    );

    this.log('info', 'EditModeHandler initialized with modular task execution');
    this.log('info', `Available tools: ${this.toolExecutor.getAvailableTools().join(', ')}`);
  }

  /**
   * Check if this handler can process the given input
   *
   * Edit mode can handle all natural language input that requires actions.
   *
   * @param input User input string
   * @returns Always true (edit mode handles everything)
   */
  canHandleInput(input: string): boolean {
    // Edit mode can handle any natural language input
    return typeof input === 'string' && input.trim().length > 0;
  }

  /**
   * Handle natural language input
   *
   * Creates task context with initial todos and starts iterative execution loop.
   *
   * @param input User input string
   * @param context Additional context
   */
  async handleNaturalLanguage(
    input: string,
    context: Record<string, unknown>
  ): Promise<void> {
    // Safety check
    if (!input || typeof input !== 'string') {
      this.log('warn', 'Invalid input passed to handleNaturalLanguage');
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          'Invalid input. Please try again.'
        )
      );
      return;
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      this.log('warn', 'Empty input passed to handleNaturalLanguage');
      return;
    }

    this.log('info', `Processing input in edit mode: "${trimmedInput.substring(0, 50)}..."`);

    try {
      // Create task context with initial todos using TaskManager
      this.currentContext = await this.taskManager.createInitialTask(trimmedInput);

      // Show initial plan with todo list
      const initialPlan = this.taskFormatter.formatInitialPlan(this.currentContext);
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage('assistant', initialPlan)
      );

      this.log('info', `Created task with ${this.currentContext.todos.length} todos`);

      // Start the iteration loop
      await this.executeNextIteration();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to process input: ${errorMessage}`);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          `Failed to process your request: ${errorMessage}\n\n` +
          `You can try:\n` +
          `- Rephrasing your request\n` +
          `- Using /help to see available commands\n` +
          `- Switching to Ask mode with /mode ask for questions`
        )
      );
    }
  }

  /**
   * Execute the next iteration of the task loop
   *
   * Calls IterationLoop to:
   * 1. Analyze progress
   * 2. Update todos based on what was learned
   * 3. Check if task is complete
   * 4. If not complete, plan next actions and request confirmation
   */
  private async executeNextIteration(): Promise<void> {
    if (!this.currentContext) {
      this.log('warn', 'executeNextIteration called without currentContext');
      return;
    }

    try {
      // Execute next iteration using IterationLoop
      const result = await this.iterationLoop.executeNextIteration(
        this.currentContext,
        'edit'
      );

      // Update context with latest state
      this.currentContext = result.context;

      // Handle different result types
      switch (result.type) {
        case 'needs_confirmation': {
          // Plan actions for the next todo and request user confirmation
          const { todo, actions } = result;

          if (!todo || !actions) {
            this.log('error', 'needs_confirmation result missing todo or actions');
            return;
          }

          const confirmationId = this.generateConfirmationId();

          // Format confirmation message with todo list (includes actions in formatted text)
          const confirmationMessage = this.taskFormatter.formatConfirmationWithTodos(
            todo,
            actions,
            this.currentContext
          );

          this.chatOrchestrator.addMessage(
            this.chatOrchestrator.createMessage(
              'confirmation',
              confirmationMessage,
              undefined, // results
              `Next: ${todo.activeForm || todo.description}`, // thought
              undefined, // proposedActions (already in confirmationMessage!)
              confirmationId, // confirmationId
              'pending' as ConfirmationStatus // status
            )
          );

          // Store pending confirmation with currentTodo
          this.chatOrchestrator.addPendingConfirmation(confirmationId, actions, todo);

          this.log('info', `Created confirmation ${confirmationId} for todo: ${todo.description}`);
          break;
        }

        case 'task_complete': {
          // All todos completed!
          const completionMessage = this.taskFormatter.formatTaskComplete(this.currentContext);

          this.chatOrchestrator.addMessage(
            this.chatOrchestrator.createMessage('assistant', completionMessage)
          );

          this.log('info', 'Task completed successfully');
          this.currentContext = null; // Reset context
          break;
        }

        case 'max_iterations': {
          // Safety limit reached
          const maxIterMessage = this.taskFormatter.formatMaxIterations(this.currentContext);

          this.chatOrchestrator.addMessage(
            this.chatOrchestrator.createMessage('assistant', maxIterMessage)
          );

          this.log('warn', `Max iterations (${this.currentContext.maxIterations}) reached`);
          this.currentContext = null; // Reset context
          break;
        }

        case 'error': {
          // Iteration error
          const errorMsg = result.message || 'Unknown error during iteration';

          this.chatOrchestrator.addMessage(
            this.chatOrchestrator.createMessage('error', `Error: ${errorMsg}`)
          );

          this.log('error', `Iteration error: ${errorMsg}`);
          break;
        }

        default:
          this.log('warn', `Unknown iteration result type: ${result.type}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to execute iteration: ${errorMessage}`);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          `Failed to execute next step: ${errorMessage}`
        )
      );
    }
  }

  /**
   * Handle confirmation response
   *
   * @param confirmationId Confirmation ID
   * @param response User response (approved, modified, cancelled)
   * @param modifiedInput Modified input (if response is 'modified')
   */
  async handleConfirmation(
    confirmationId: string,
    response: ConfirmationStatus,
    modifiedInput?: string
  ): Promise<void> {
    this.log('info', `Handling confirmation ${confirmationId}: ${response}`);

    const confirmation = this.chatOrchestrator.getPendingConfirmation(confirmationId);

    if (!confirmation) {
      this.log('warn', `No pending confirmation found: ${confirmationId}`);
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          'Confirmation not found or already processed.'
        )
      );
      return;
    }

    const { actions, currentTodo } = confirmation;

    // Handle different response types
    switch (response) {
      case 'approved':
        // Execute actions and continue the iteration loop
        await this.executeActionsAndContinue(actions, currentTodo);
        break;

      case 'modified':
        if (modifiedInput && modifiedInput.trim().length > 0) {
          this.log('info', 'Re-processing with modified input');
          // Reset current task and start fresh
          this.currentContext = null;
          await this.handleNaturalLanguage(modifiedInput, {});
        } else {
          this.log('warn', 'Modified confirmation selected but no new input provided');
          this.chatOrchestrator.addMessage(
            this.chatOrchestrator.createMessage(
              'assistant',
              'I see you want to modify the request. Please provide your new instructions.\n\n' +
              'For example, you can:\n' +
              '- Rephrase your request with more details\n' +
              '- Change the parameters or actions you want\n' +
              '- Try a different approach\n\n' +
              'Just type your new request in the chat.'
            )
          );
        }
        break;

      case 'cancelled':
        this.log('info', 'User cancelled the actions');
        this.chatOrchestrator.addMessage(
          this.chatOrchestrator.createMessage(
            'assistant',
            'Actions cancelled. Let me know if you need anything else!'
          )
        );
        // Reset current task
        this.currentContext = null;
        break;

      default:
        this.log('warn', `Unknown confirmation response: ${response}`);
    }

    // Remove pending confirmation
    this.chatOrchestrator.removePendingConfirmation(confirmationId);
  }

  /**
   * Execute approved actions and continue the iteration loop
   *
   * @param actions Actions to execute
   * @param currentTodo The todo being executed
   */
  private async executeActionsAndContinue(
    actions: ProposedAction[],
    currentTodo?: TaskTodo
  ): Promise<void> {
    if (!this.currentContext) {
      this.log('warn', 'executeActionsAndContinue called without currentContext');
      // Fall back to simple execution without iteration
      await this.executeActions(actions);
      return;
    }

    try {
      this.log('info', `Executing ${actions.length} actions using IterationLoop`);

      // Execute actions and update context using IterationLoop
      const results = await this.iterationLoop.executeAndUpdateContext(
        actions,
        currentTodo!,
        this.currentContext
      );

      // Format and display execution results
      const formattedOutput = OutputFormatter.formatResults(results);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage('execution', formattedOutput, results)
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      this.log('info', `Execution complete: ${successCount} succeeded, ${failureCount} failed`);

      // Show updated progress
      const progressMessage = this.taskFormatter.formatTaskProgress(this.currentContext);
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage('assistant', progressMessage)
      );

      // Continue to next iteration
      await this.executeNextIteration();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Action execution failed: ${errorMessage}`);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          `Failed to execute actions: ${errorMessage}`
        )
      );
    }
  }

  /**
   * Whether this mode supports action confirmations
   *
   * Edit mode always requires confirmations.
   *
   * @returns Always true
   */
  supportsConfirmations(): boolean {
    return true;
  }

  /**
   * Get mode capabilities
   *
   * @returns Capability flags for edit mode
   */
  getCapabilities(): {
    usesTools: boolean;
    requiresConfirmation: boolean;
    autonomous: boolean;
    usesRouter: boolean;
    usesReAct: boolean;
  } {
    return {
      usesTools: true, // Uses tools via ReAct agent
      requiresConfirmation: true, // Always requires confirmation
      autonomous: false, // Not autonomous (needs approval)
      usesRouter: true, // Uses router for intent analysis
      usesReAct: true, // Uses ReAct for action planning
    };
  }

  /**
   * Execute approved actions (fallback for non-iterative mode)
   *
   * @param actions Actions to execute
   */
  private async executeActions(actions: ProposedAction[]): Promise<void> {
    this.log('info', `Executing ${actions.length} approved actions using ToolExecutor`);

    try {
      // Execute actions using ToolExecutor (with real tools!)
      const results = await this.toolExecutor.executeActions(actions);

      // Format results beautifully (Claude Code style!)
      const formattedOutput = OutputFormatter.formatResults(results);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage('execution', formattedOutput, results)
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      this.log('info', `Execution complete: ${successCount} succeeded, ${failureCount} failed`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Action execution failed: ${errorMessage}`);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          `Failed to execute actions: ${errorMessage}`
        )
      );
    }
  }

  /**
   * Generate unique confirmation ID
   *
   * @returns Confirmation ID
   */
  private generateConfirmationId(): string {
    return `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a message
   *
   * @param level Log level
   * @param message Message to log
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.enableLogging) {
      return;
    }

    const prefix = `[EditModeHandler]`;
    console.log(`${prefix} ${level.toUpperCase()}: ${message}`);
  }
}
