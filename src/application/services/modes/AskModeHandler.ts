/**
 * AskModeHandler
 *
 * Handles conversational mode (ASK) - pure Q&A with no tool execution.
 * Uses ONLY the router LLM for fast, simple responses.
 *
 * Key Features:
 * - No ReAct agent (eliminates toLowerCase bugs)
 * - No tool execution
 * - No confirmations
 * - Fast responses using router LLM
 * - Handles greetings, questions, and casual conversation
 *
 * This mode is ideal for:
 * - Simple questions ("how are you", "who are you")
 * - Getting help and information
 * - Casual conversation
 * - Quick responses without actions
 */

import type { IModeHandler } from '../../../core/interfaces/IModeHandler.js';
import type { CopilotClient } from '../../../infrastructure/llm/CopilotClient.js';
import type { ChatOrchestrator } from '../ChatOrchestrator.js';
import { sanitizeError } from '../../../infrastructure/utils/ErrorSanitizer.js';

/**
 * Ask Mode Handler Configuration
 */
export interface AskModeHandlerConfig {
  /**
   * Router LLM client for fast responses
   */
  routerClient: CopilotClient;

  /**
   * Chat orchestrator for adding messages
   */
  chatOrchestrator: ChatOrchestrator;

  /**
   * Enable logging
   */
  enableLogging?: boolean;
}

/**
 * Ask Mode Handler
 *
 * Provides conversational responses using router LLM only.
 * No tools, no confirmations, no complexity.
 */
export class AskModeHandler implements IModeHandler {
  readonly mode = 'ask' as const;
  readonly displayName = 'Ask Mode';
  readonly description =
    'Conversational mode for questions and casual chat. Fast responses with no tool execution.';

  private routerClient: CopilotClient;
  private chatOrchestrator: ChatOrchestrator;
  private enableLogging: boolean;

  /**
   * Create a new AskModeHandler
   *
   * @param config Handler configuration
   */
  constructor(config: AskModeHandlerConfig) {
    this.routerClient = config.routerClient;
    this.chatOrchestrator = config.chatOrchestrator;
    this.enableLogging = config.enableLogging ?? true;

    this.log('info', 'AskModeHandler initialized');
  }

  /**
   * Check if this handler can process the given input
   *
   * Ask mode can handle all natural language input.
   *
   * @param input User input string
   * @returns Always true (ask mode handles everything)
   */
  canHandleInput(input: string): boolean {
    // Ask mode can handle any natural language input
    return typeof input === 'string' && input.trim().length > 0;
  }

  /**
   * Handle natural language input
   *
   * Uses router LLM to generate conversational response.
   * NO tools, NO confirmations, NO ReAct agent.
   *
   * @param input User input string
   * @param context Additional context (optional)
   */
  async handleNaturalLanguage(
    input: string,
    _context: Record<string, unknown>
  ): Promise<void> {
    // Note: _context parameter prefixed with _ to indicate intentionally unused
    // Reserved for future enhancements (e.g., conversation history, project info)

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

    this.log('debug', `Processing input in ask mode: "${trimmedInput.substring(0, 50)}..."`);

    // Check if router client is available
    if (!this.routerClient) {
      this.log('error', 'Router client not available');
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'assistant',
          `I'm currently in conversational mode, but the router LLM is not available. Please use slash commands like /help, /agents, or /model.`
        )
      );
      return;
    }

    try {
      // System prompt for router LLM
      const systemPrompt = `You are NocturneAI's conversation assistant. You help users with questions and provide information about the system.

Your capabilities:
- Answer questions about NocturneAI (an autonomous multi-agent system)
- Respond to greetings warmly
- Explain available features and commands
- Provide helpful information
- Have casual conversations

About NocturneAI:
- Multi-agent system for autonomous task execution
- Supports agent creation, workflow management, and tool execution
- Commands: /help (show all commands), /agents (list agents), /model (list models)
- Three modes: Ask (current, conversational), Edit (human-approved actions), Agent (autonomous)

Guidelines:
- Be helpful, friendly, and concise (2-3 sentences usually)
- For technical tasks, suggest using Edit mode (/mode edit)
- For complex automation, suggest Agent mode (/mode agent)
- For command help, suggest /help
- Respond in the user's language

Examples:
- "how are you" → Warm greeting + offer help
- "who are you" → Explain NocturneAI briefly
- "what can you do" → List capabilities, mention modes
- "help me code" → Suggest Edit or Agent mode for task execution`;

      // Call router LLM
      const response = await this.routerClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: trimmedInput },
        ],
        temperature: 0.7,
        maxTokens: 200,
      });

      // Extract response content
      let responseContent = '';

      try {
        if (typeof response === 'string') {
          responseContent = response;
        } else if (response && typeof response === 'object') {
          // Try different possible response structures (ChatResponse type)
          responseContent =
            response.content ||
            response.message?.content ||
            '';
        }

        responseContent = String(responseContent).trim();

        if (!responseContent || responseContent.length === 0) {
          throw new Error('Empty response from router LLM');
        }

        this.log('debug', `Router response: "${responseContent.substring(0, 50)}..."`);

        // Add assistant message to chat
        this.chatOrchestrator.addMessage(
          this.chatOrchestrator.createMessage('assistant', responseContent)
        );
      } catch (parseError) {
        this.log('error', `Failed to parse router response: ${parseError}`);
        throw parseError;
      }
    } catch (error) {
      const errorMessage = sanitizeError(error);
      this.log('error', `Router LLM failed: ${errorMessage}`);

      // Fallback response - completely generic, no string operations on input
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'assistant',
          `I received your message but encountered an issue generating a response. ` +
            `You can try:\n` +
            `- Rephrasing your question\n` +
            `- Using /help to see available commands\n` +
            `- Switching to Edit mode with /mode edit for task execution`
        )
      );
    }
  }

  /**
   * Whether this mode supports action confirmations
   *
   * Ask mode never requires confirmations.
   *
   * @returns Always false
   */
  supportsConfirmations(): boolean {
    return false;
  }

  /**
   * Get mode capabilities
   *
   * @returns Capability flags for ask mode
   */
  getCapabilities(): {
    usesTools: boolean;
    requiresConfirmation: boolean;
    autonomous: boolean;
    usesRouter: boolean;
    usesReAct: boolean;
  } {
    return {
      usesTools: false, // No tool execution
      requiresConfirmation: false, // No confirmations needed
      autonomous: false, // Not autonomous (just conversational)
      usesRouter: true, // Uses router LLM
      usesReAct: false, // No ReAct agent (this eliminates toLowerCase bugs!)
    };
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

    // Log to file only - NO console output (prevents terminal pollution)
    // User can view logs via /logs command
    const prefix = `[AskModeHandler]`;
    // TODO: Write to log file instead of console
    // For now, just skip logging to avoid terminal output
  }
}
