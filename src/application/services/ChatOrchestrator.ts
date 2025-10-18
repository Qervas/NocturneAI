/**
 * ChatOrchestrator Service
 *
 * Main orchestrator for chat interactions, coordinating between
 * ReAct agent, command registry, and UI components.
 */

import { EventEmitter } from 'events';
import type {
  ChatMessage,
  ChatCommand,
  ChatConfirmation,
  ConfirmationStatus,
  ProposedAction,
  ExecutionResult
} from '../../presentation/ui/types.js';
import { ReActAgent } from './ReActAgent.js';
import { CommandRegistry } from './CommandRegistry.js';
import { Logger } from '../../infrastructure/logging/Logger.js';
import type { ILLMClient } from '../../core/interfaces/ILLMClient.js';
import { ModeManager } from './modes/ModeManager.js';
import { AskModeHandler } from './modes/AskModeHandler.js';
import type { InteractionMode } from '../../core/interfaces/IModeHandler.js';

/**
 * Chat Orchestrator Options
 */
interface ChatOrchestratorOptions {
  llmClient?: ILLMClient | null;
  routerClient?: ILLMClient | null;
  commandRegistry?: CommandRegistry;
  eventBus?: EventEmitter;
  logger?: Logger;
}

/**
 * Chat Orchestrator Service
 */
export class ChatOrchestrator {
  private reactAgent?: ReActAgent;
  private routerClient?: ILLMClient;
  private commandRegistry: CommandRegistry;
  private eventBus: EventEmitter;
  private logger?: Logger;
  private messages: ChatMessage[] = [];
  private pendingConfirmations: Map<string, ProposedAction[]> = new Map();
  private modeManager: ModeManager;

  constructor(options: ChatOrchestratorOptions) {
    this.eventBus = options.eventBus || new EventEmitter();
    this.logger = options.logger;
    this.routerClient = options.routerClient || undefined;

    // Initialize command registry
    this.commandRegistry = options.commandRegistry || new CommandRegistry({
      eventBus: this.eventBus,
      logger: this.logger
    });

    // Initialize ReAct agent only if LLM client is available
    if (options.llmClient) {
      this.reactAgent = new ReActAgent({
        llmClient: options.llmClient,
        commandRegistry: this.commandRegistry,
        logger: this.logger
      });
    }

    // Initialize Mode Manager with ASK mode as default
    this.modeManager = new ModeManager({
      defaultMode: 'ask',
      eventBus: this.eventBus,
      enableLogging: true
    });

    // Register Ask mode handler (conversational mode - no tools)
    if (this.routerClient) {
      const askHandler = new AskModeHandler({
        routerClient: this.routerClient,
        chatOrchestrator: this,
        enableLogging: true
      });
      this.modeManager.registerHandler(askHandler);
      this.log('info', 'Registered AskModeHandler - conversational mode active');
    } else {
      this.log('warn', 'Router client not available - Ask mode will have limited functionality');
    }

    // TODO: Register EditModeHandler and AgentModeHandler when implemented

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle view change events from commands
    this.eventBus.on('view:change', (view: string) => {
      this.eventBus.emit('ui:view:change', view);
    });

    // Handle chat clear
    this.eventBus.on('chat:clear', () => {
      this.clearMessages();
    });

    // Handle mode switch commands
    this.eventBus.on('command:mode:switch', (data: { mode: InteractionMode }) => {
      this.handleModeSwitch(data.mode);
    });

    // Handle mode show command
    this.eventBus.on('command:mode:show', () => {
      this.showCurrentMode();
    });

    // Listen for mode switched events
    this.modeManager.onModeSwitch((event) => {
      this.log('info', `Mode switched from ${event.fromMode} to ${event.toMode}`);
      // Emit to UI if needed
      this.eventBus.emit('ui:mode:changed', event);
    });
  }

  /**
   * Process user input
   */
  async processUserInput(input: string): Promise<void> {
    // Add user message
    const userMessage = this.createMessage('user', input);
    this.addMessage(userMessage);

    try {
      // Check for slash commands
      if (input.startsWith('/')) {
        await this.executeSlashCommand(input);
      } else {
        // Use ReAct agent for natural language
        await this.processNaturalLanguage(input);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addMessage(this.createMessage('error', `Error: ${errorMessage}`));
      this.log('error', `Failed to process input: ${errorMessage}`);
    }
  }

  /**
   * Execute slash command directly
   */
  private async executeSlashCommand(input: string): Promise<void> {
    const parts = input.slice(1).split(' ').filter(p => p.length > 0);

    // Try to find matching command by checking different combinations
    // e.g., "/model list" could be "model.list" or "model" with args ["list"]
    let registeredCommand;
    let commandId = '';
    let args: string[] = [];

    // Try two-part commands first (e.g., "model.list")
    if (parts.length >= 2) {
      commandId = `${parts[0]}.${parts[1]}`;
      registeredCommand = this.commandRegistry.getCommand(commandId);
      if (registeredCommand) {
        args = parts.slice(2);
      }
    }

    // If not found, try single-part command (e.g., "help")
    if (!registeredCommand && parts.length >= 1) {
      commandId = parts[0];
      registeredCommand = this.commandRegistry.getCommand(commandId);
      if (registeredCommand) {
        args = parts.slice(1);
      }
    }

    if (!registeredCommand) {
      this.addMessage(this.createMessage(
        'error',
        `Unknown command: /${parts.join(' ')}. Type /help for available commands.`
      ));
      return;
    }

    // Build parameters
    const params = this.buildCommandParams(registeredCommand, args);

    // Execute immediately (no confirmation for slash commands)
    try {
      const result = await this.commandRegistry.executeCommand(commandId, params);

      // Only add execution message if the command didn't emit its own chat message
      // Commands that emit chat messages should include formatted output
      if (!result || typeof result !== 'object' || !('formatted' in result)) {
        this.addMessage(this.createMessage('execution', 'Command executed', [
          {
            actionId: 'slash-cmd',
            success: true,
            message: `✓ ${registeredCommand.description}`,
            data: result
          }
        ]));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addMessage(this.createMessage('error', `Failed to execute command: ${errorMessage}`));
    }
  }

  /**
   * Process natural language input using ReAct agent
   */
  private async processNaturalLanguage(input: string): Promise<void> {
    // Check if ReAct agent is available
    if (!this.reactAgent) {
      this.addMessage(this.createMessage(
        'assistant',
        `Natural language processing is not available. Please use slash commands (e.g., /help, /model list). Type /help to see available commands.`
      ));
      return;
    }

    // Get context
    const context = this.gatherContext();

    // Process with ReAct agent
    const thought = await this.reactAgent.processInput(input, context);

    // Add to agent history
    this.reactAgent.addToHistory(this.messages[this.messages.length - 1]);

    if (thought.proposedActions.length === 0) {
      // No actions to take, just a conversational response
      // Generate a proper response based on understanding
      let response = thought.understanding;

      // If understanding is empty or just metadata, generate a basic response
      if (!response || response.startsWith('The user is')) {
        // This is metadata, not a response - we need to generate one
        response = await this.generateConversationalResponse(input, thought);
      }

      this.addMessage(this.createMessage(
        'assistant',
        response,
        undefined,
        thought.reasoning
      ));
      return;
    }

    // Create confirmation message
    const confirmationId = this.generateConfirmationId();
    this.pendingConfirmations.set(confirmationId, thought.proposedActions);

    const confirmationMessage = this.createMessage(
      'confirmation',
      `I understand you want to: ${thought.understanding}`,
      undefined,
      thought.reasoning,
      thought.proposedActions,
      confirmationId,
      'pending'
    );

    this.addMessage(confirmationMessage);

    // Emit confirmation request event
    this.eventBus.emit('chat:confirmation:requested', {
      confirmationId,
      message: confirmationMessage
    });
  }

  /**
   * Handle confirmation response
   */
  async handleConfirmation(confirmationId: string, response: ConfirmationStatus): Promise<void> {
    const actions = this.pendingConfirmations.get(confirmationId);
    if (!actions) {
      this.log('warn', `No pending confirmation found: ${confirmationId}`);
      return;
    }

    // Update confirmation message status
    const confirmationMessage = this.messages.find(
      m => m.confirmationId === confirmationId
    );
    if (confirmationMessage) {
      confirmationMessage.status = response;
    }

    switch (response) {
      case 'approved':
        await this.executeApprovedActions(actions);
        break;

      case 'modified':
        this.addMessage(this.createMessage(
          'assistant',
          'Please tell me how you\'d like to modify the actions, or provide alternative instructions.'
        ));
        break;

      case 'cancelled':
        this.addMessage(this.createMessage(
          'assistant',
          'Action cancelled. How else can I help you?'
        ));
        break;
    }

    // Clean up
    this.pendingConfirmations.delete(confirmationId);
  }

  /**
   * Execute approved actions
   */
  private async executeApprovedActions(actions: ProposedAction[]): Promise<void> {
    if (!this.reactAgent) {
      this.addMessage(this.createMessage('error', 'Cannot execute actions: AI agent not available'));
      return;
    }

    const results = await this.reactAgent.executeActions(actions);

    // Create execution message
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    let summary = `Executed ${actions.length} action(s): `;
    if (failureCount === 0) {
      summary += `All successful ✓`;
    } else if (successCount === 0) {
      summary += `All failed ✗`;
    } else {
      summary += `${successCount} successful, ${failureCount} failed`;
    }

    this.addMessage(this.createMessage('execution', summary, results));
  }

  /**
   * Parse slash command
   */
  private parseSlashCommand(commandPath: string, args: string[]): ChatCommand {
    // Convert path format (e.g., "agent/create" to "agent.create")
    const command = commandPath.replace(/\//g, '.');

    // Parse mentions from args
    const mentions: Array<{ type: 'file' | 'folder' | 'agent' | 'workflow'; path: string }> = [];
    const filteredArgs: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('@')) {
        const [type, ...pathParts] = arg.slice(1).split(':');
        if (['file', 'folder', 'agent', 'workflow'].includes(type)) {
          mentions.push({
            type: type as any,
            path: pathParts.join(':')
          });
        }
      } else {
        filteredArgs.push(arg);
      }
    }

    return {
      input: `/${commandPath} ${args.join(' ')}`,
      isSlashCommand: true,
      command,
      args: filteredArgs,
      mentions: mentions.length > 0 ? mentions : undefined
    };
  }

  /**
   * Build command parameters from arguments
   */
  private buildCommandParams(command: any, args: string[]): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (command.parameters) {
      for (let i = 0; i < command.parameters.length && i < args.length; i++) {
        const param = command.parameters[i];
        const value = args[i];

        // Convert type
        if (param.type === 'number') {
          params[param.name] = parseInt(value, 10);
        } else if (param.type === 'boolean') {
          params[param.name] = value.toLowerCase() === 'true';
        } else {
          params[param.name] = value;
        }
      }
    }

    return params;
  }

  /**
   * Use router LLM to generate conversational response
   */
  private async generateConversationalResponse(input: string, thought: any): Promise<string> {
    // Safety check - ensure input is valid
    if (!input || typeof input !== 'string') {
      this.log('warn', 'Invalid input passed to generateConversationalResponse');
      return `I didn't quite catch that. Could you please rephrase? Type /help to see available commands.`;
    }

    // If router client available, use it for intelligent response
    if (this.routerClient) {
      try {
        const systemPrompt = `You are NocturneAI's conversation router. Analyze user input and respond appropriately.

For GREETINGS (hello, hi, how are you, etc.):
→ Respond warmly and offer help

For IDENTITY QUESTIONS (who are you, what are you):
→ Explain: "I'm NocturneAI, an autonomous multi-agent system. I help create/manage AI agents, execute workflows, and perform tasks. Use natural language or slash commands (/help, /agents, /model)."

For CAPABILITY QUESTIONS (what can you do, help):
→ List: "🤖 Agent Management, ⚙️ Workflows, 🧠 Models, 📊 Dashboard. Type /help for commands."

For SIMPLE QUESTIONS:
→ Answer directly if you can

For anything else:
→ Acknowledge and suggest /help

Respond naturally in the user's language. Keep responses concise (2-3 sentences max).`;

        const response = await this.routerClient.chat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          temperature: 0.7,
          maxTokens: 150
        });

        // Robust response extraction with multiple fallback checks
        let content = '';

        try {
          if (typeof response === 'string') {
            content = response;
          } else if (response && typeof response === 'object') {
            content = response.content || response.message?.content || response.text || '';
          }

          // Clean and validate the content
          content = String(content).trim();

          if (content && content.length > 0) {
            this.log('info', `Router generated response: ${content.substring(0, 50)}...`);
            return content;
          }
        } catch (parseError) {
          this.log('warn', `Failed to parse router response: ${parseError}`);
        }

        // If we got here, response was empty or malformed
        this.log('warn', 'Router returned empty or invalid response');

      } catch (error) {
        this.log('warn', `Router LLM failed: ${error}`);
      }
    }

    // Generic fallback - NO string interpolation with potentially undefined variables
    return `I received your message. Type /help to see available commands, or try asking me to create an agent, run a workflow, or list available models.`;
  }

  /**
   * Gather context for ReAct agent
   */
  private gatherContext(): Record<string, unknown> {
    return {
      recentMessages: this.messages.slice(-5),
      timestamp: new Date().toISOString(),
      // Add more context as needed
    };
  }

  /**
   * Create a chat message
   */
  private createMessage(
    type: ChatMessage['type'],
    content: string,
    results?: ExecutionResult[],
    thought?: string,
    proposedActions?: ProposedAction[],
    confirmationId?: string,
    status?: ConfirmationStatus
  ): ChatMessage {
    return {
      id: this.generateMessageId(),
      type,
      content,
      timestamp: new Date(),
      results,
      thought,
      proposedActions,
      confirmationId,
      status
    };
  }

  /**
   * Add message to history
   */
  private addMessage(message: ChatMessage): void {
    this.messages.push(message);

    // Keep message history limited
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }

    // Emit message event
    this.eventBus.emit('chat:message', message);
  }

  /**
   * Clear messages
   */
  private clearMessages(): void {
    this.messages = [];
    if (this.reactAgent) {
      this.reactAgent.clearHistory();
    }
    this.eventBus.emit('chat:cleared');
  }

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Get command registry
   */
  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate confirmation ID
   */
  private generateConfirmationId(): string {
    return `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (this.logger) {
      this.logger.log(level, message, { service: 'ChatOrchestrator' });
    }
  }
}