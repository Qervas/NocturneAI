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
import { EditModeHandler } from './modes/EditModeHandler.js';
import { AgentModeHandler } from './modes/AgentModeHandler.js';
import type { InteractionMode } from '../../core/interfaces/IModeHandler.js';
import { AgentFactory } from '../factories/AgentFactory.js';
import type { AgentFactoryConfig } from '../factories/AgentFactory.js';
import { sanitizeError } from '../../infrastructure/utils/ErrorSanitizer.js';

/**
 * Chat Orchestrator Options
 */
interface ChatOrchestratorOptions {
  llmClient?: ILLMClient | null;
  routerClient?: ILLMClient | null;
  commandRegistry?: CommandRegistry;
  eventBus?: EventEmitter;
  logger?: Logger;
  agentFactory?: AgentFactory;
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
  private pendingConfirmations: Map<string, { actions: ProposedAction[]; currentTodo?: any }> = new Map();
  private modeManager: ModeManager;
  private agentFactory: AgentFactory;

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

    // Initialize Agent Factory (for proper tool execution in Edit/Agent modes)
    this.agentFactory = options.agentFactory || new AgentFactory({
      enableMemoryByDefault: false, // Disable memory for mode handlers
      validateConfigs: false, // Skip validation for dynamic configs
    });

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

    // Register Edit mode handler (human-approved actions)
    if (this.routerClient && this.reactAgent) {
      const editHandler = new EditModeHandler({
        routerClient: this.routerClient,
        reactAgent: this.reactAgent,
        chatOrchestrator: this,
        enableLogging: true
      });
      this.modeManager.registerHandler(editHandler);
      this.log('info', 'Registered EditModeHandler - human-approved actions available');
    } else {
      this.log('warn', 'Edit mode not available - missing router client or ReAct agent');
    }

    // Register Agent mode handler (autonomous execution)
    if (this.routerClient && this.reactAgent) {
      const agentHandler = new AgentModeHandler({
        routerClient: this.routerClient,
        reactAgent: this.reactAgent,
        chatOrchestrator: this,
        enableLogging: true,
        enableSafetyChecks: true // Enable safety checks by default
      });
      this.modeManager.registerHandler(agentHandler);
      this.log('info', 'Registered AgentModeHandler - autonomous execution available');
    } else {
      this.log('warn', 'Agent mode not available - missing router client or ReAct agent');
    }

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
      const errorMessage = sanitizeError(error);
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
      const errorMessage = sanitizeError(error);
      this.addMessage(this.createMessage('error', `Failed to execute command: ${errorMessage}`));
    }
  }

  /**
   * Process natural language input using current mode handler
   */
  private async processNaturalLanguage(input: string): Promise<void> {
    // Get current mode handler
    const currentHandler = this.modeManager.getCurrentHandler();

    if (!currentHandler) {
      this.log('error', 'No mode handler available');
      this.addMessage(this.createMessage(
        'error',
        `No interaction mode is available. This is a system error. Please restart or use slash commands.`
      ));
      return;
    }

    // Check if handler can process this input
    if (!currentHandler.canHandleInput(input)) {
      this.log('warn', `Current mode handler (${currentHandler.mode}) cannot handle input`);
      this.addMessage(this.createMessage(
        'error',
        `The current mode (${currentHandler.displayName}) cannot process this input. Try using slash commands or switching modes.`
      ));
      return;
    }

    // Gather context
    const context = this.gatherContext();

    try {
      // Delegate to mode handler
      this.log('info', `Processing input in ${currentHandler.mode} mode`);
      await currentHandler.handleNaturalLanguage(input, context);
    } catch (error) {
      const errorMessage = sanitizeError(error);
      this.log('error', `Mode handler failed: ${errorMessage}`);

      this.addMessage(this.createMessage(
        'error',
        `Failed to process your input in ${currentHandler.displayName}. Error: ${errorMessage}`
      ));
    }
  }

  /**
   * Handle mode switch
   */
  private handleModeSwitch(newMode: InteractionMode): void {
    const success = this.modeManager.switchMode(newMode, 'User requested mode change');

    if (success) {
      const modeInfo = this.modeManager.getModeInfo(newMode);
      if (modeInfo) {
        let modeMessage = `✅ Switched to **${modeInfo.displayName}**\n\n`;
        modeMessage += `${modeInfo.description}\n\n`;
        modeMessage += `**Capabilities:**\n`;
        modeMessage += `- Uses Tools: ${modeInfo.capabilities.usesTools ? 'Yes' : 'No'}\n`;
        modeMessage += `- Requires Confirmation: ${modeInfo.capabilities.requiresConfirmation ? 'Yes' : 'No'}\n`;
        modeMessage += `- Autonomous: ${modeInfo.capabilities.autonomous ? 'Yes' : 'No'}\n`;
        modeMessage += `- Uses Router LLM: ${modeInfo.capabilities.usesRouter ? 'Yes' : 'No'}\n`;
        modeMessage += `- Uses ReAct Agent: ${modeInfo.capabilities.usesReAct ? 'Yes' : 'No'}`;

        this.addMessage(this.createMessage('assistant', modeMessage));
      }
    } else {
      this.addMessage(this.createMessage(
        'error',
        `Failed to switch to ${newMode} mode. Mode may not be available.`
      ));
    }
  }

  /**
   * Show current mode information
   */
  private showCurrentMode(): void {
    const currentMode = this.modeManager.getCurrentMode();
    const modeInfo = this.modeManager.getModeInfo(currentMode);
    const allModes = this.modeManager.getAllModesInfo();

    let output = `📋 **Current Mode: ${modeInfo?.displayName || currentMode}**\n\n`;

    if (modeInfo) {
      output += `${modeInfo.description}\n\n`;
      output += `**Capabilities:**\n`;
      output += `- Uses Tools: ${modeInfo.capabilities.usesTools ? '✅' : '❌'}\n`;
      output += `- Requires Confirmation: ${modeInfo.capabilities.requiresConfirmation ? '✅' : '❌'}\n`;
      output += `- Autonomous: ${modeInfo.capabilities.autonomous ? '✅' : '❌'}\n`;
      output += `- Uses Router LLM: ${modeInfo.capabilities.usesRouter ? '✅' : '❌'}\n`;
      output += `- Uses ReAct Agent: ${modeInfo.capabilities.usesReAct ? '✅' : '❌'}\n\n`;
    }

    output += `**Available Modes:**\n`;
    allModes.forEach(mode => {
      const marker = mode.isCurrent ? '👉' : '  ';
      output += `${marker} **${mode.displayName}** - ${mode.description}\n`;
    });

    output += `\nUse \`/mode <ask|edit|agent>\` to switch modes.`;

    this.addMessage(this.createMessage('assistant', output));
  }

  /**
   * Handle confirmation response
   * Delegates to the current mode handler if it supports confirmations
   */
  async handleConfirmation(confirmationId: string, response: ConfirmationStatus, modifiedInput?: string): Promise<void> {
    const currentHandler = this.modeManager.getCurrentHandler();

    // Update confirmation message status
    const confirmationMessage = this.messages.find(
      m => m.confirmationId === confirmationId
    );
    if (confirmationMessage) {
      confirmationMessage.status = response;
    }

    // Delegate to mode handler if it supports confirmations
    if (currentHandler && currentHandler.handleConfirmation) {
      await currentHandler.handleConfirmation(confirmationId, response, modifiedInput);
      return;
    }

    // Fallback: old confirmation handling for backward compatibility
    const confirmation = this.pendingConfirmations.get(confirmationId);
    if (!confirmation) {
      this.log('warn', `No pending confirmation found: ${confirmationId}`);
      return;
    }

    const { actions } = confirmation;

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
            // ChatResponse type has content and message.content
            content = response.content || response.message?.content || '';
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
   * NEW: Create a chat message from structured blocks
   *
   * This is the preferred way to create messages going forward.
   * Automatically extracts structured data from blocks and generates text content.
   *
   * @param type Message type
   * @param blocks Content blocks
   * @param options Additional message options
   * @returns Chat message
   */
  public createMessageWithBlocks(
    type: ChatMessage['type'],
    blocks: import('../../presentation/ui/content-model.js').MessageContentBlock[],
    options?: {
      thought?: string;
      confirmationId?: string;
      status?: ConfirmationStatus;
      metadata?: Record<string, unknown>;
    }
  ): ChatMessage {
    // Import BlockUtils dynamically
    const { BlockUtils } = require('../../presentation/ui/content-model.js');

    // Extract structured data from blocks
    const proposedActions = BlockUtils.extractActions(blocks);
    const results = BlockUtils.extractResults(blocks);

    // Generate text content from blocks
    const textContent = BlockUtils.blocksToText(blocks);

    return {
      id: this.generateMessageId(),
      type,
      timestamp: new Date(),
      blocks,  // NEW: Structured blocks
      content: textContent,  // Auto-generated from blocks
      proposedActions: proposedActions.length > 0 ? proposedActions : undefined,
      results: results.length > 0 ? results : undefined,
      thought: options?.thought,
      confirmationId: options?.confirmationId,
      status: options?.status,
      metadata: options?.metadata
    };
  }

  /**
   * Create a chat message (LEGACY)
   *
   * This method is kept for backward compatibility.
   * Use createMessageWithBlocks() for new code.
   */
  public createMessage(
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
  public addMessage(message: ChatMessage): void {
    this.messages.push(message);

    // Keep message history limited
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }

    // Emit message event
    this.eventBus.emit('chat:message', message);
  }

  /**
   * Remove a specific message from history (for temporary/animated messages)
   */
  public removeMessage(messageId: string): void {
    const index = this.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      this.eventBus.emit('chat:message:removed', messageId);
    }
  }

  /**
   * Update an existing message (for replacing temporary messages)
   */
  public updateMessage(messageId: string, updates: Partial<ChatMessage>): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      Object.assign(message, updates);
      this.eventBus.emit('chat:message:updated', message);
    }
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
   * Add pending confirmation
   *
   * @param confirmationId Confirmation ID
   * @param actions Proposed actions
   * @param currentTodo Current todo being executed (optional)
   */
  addPendingConfirmation(confirmationId: string, actions: ProposedAction[], currentTodo?: any): void {
    this.pendingConfirmations.set(confirmationId, { actions, currentTodo });
    this.log('info', `Added pending confirmation ${confirmationId} with ${actions.length} actions`);
  }

  /**
   * Get pending confirmation
   *
   * @param confirmationId Confirmation ID
   * @returns Confirmation data or undefined
   */
  getPendingConfirmation(confirmationId: string): { actions: ProposedAction[]; currentTodo?: any } | undefined {
    return this.pendingConfirmations.get(confirmationId);
  }

  /**
   * Remove pending confirmation
   *
   * @param confirmationId Confirmation ID
   */
  removePendingConfirmation(confirmationId: string): void {
    this.pendingConfirmations.delete(confirmationId);
    this.log('info', `Removed pending confirmation ${confirmationId}`);
  }

  /**
   * Get agent factory (for mode handlers)
   *
   * @returns Agent factory instance
   */
  getAgentFactory(): AgentFactory {
    return this.agentFactory;
  }

  /**
   * Get current mode
   *
   * @returns Current mode name
   */
  getCurrentMode(): string {
    return this.modeManager.getCurrentMode();
  }

  /**
   * Cycle to next mode (ask → edit → agent → ask)
   */
  cycleMode(): void {
    const modes: Array<'ask' | 'edit' | 'agent'> = ['ask', 'edit', 'agent'];
    const currentMode = this.getCurrentMode();
    const currentIndex = modes.indexOf(currentMode as any);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];

    this.modeManager.switchMode(nextMode, 'User cycled mode with Shift+Tab');
    this.log('info', `Cycled mode from ${currentMode} to ${nextMode}`);

    // Emit mode change event for UI
    const modeInfo = this.modeManager.getModeInfo(nextMode);
    this.eventBus.emit('mode:changed', { mode: nextMode, info: modeInfo });
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