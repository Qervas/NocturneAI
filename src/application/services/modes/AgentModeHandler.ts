/**
 * AgentModeHandler
 *
 * Handles autonomous execution mode (AGENT) - actions execute immediately.
 * Uses Router LLM + ReAct agent for intelligent action planning and execution.
 *
 * Key Features:
 * - Router LLM for intent analysis
 * - ReAct agent for action planning
 * - NO confirmations - immediate execution
 * - Real-time progress updates
 * - Safety guardrails for destructive operations
 *
 * This mode is ideal for:
 * - Trusted automated workflows
 * - Background tasks
 * - Repetitive operations
 * - Time-sensitive actions
 * - Experienced users who want speed
 *
 * ⚠️ WARNING: This mode executes actions WITHOUT asking for permission!
 * Only use when you trust the system to make decisions autonomously.
 */

import type { IModeHandler } from '../../../core/interfaces/IModeHandler.js';
import type { CopilotClient } from '../../../infrastructure/llm/CopilotClient.js';
import type { ChatOrchestrator } from '../ChatOrchestrator.js';
import type { ReActAgent } from '../ReActAgent.js';
import type { ProposedAction } from '../../../presentation/ui/types.js';
import { ToolExecutor } from '../ToolExecutor.js';
import { OutputFormatter } from '../OutputFormatter.js';
import { sanitizeError } from '../../../infrastructure/utils/ErrorSanitizer.js';

/**
 * Agent Mode Handler Configuration
 */
export interface AgentModeHandlerConfig {
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

  /**
   * Enable safety checks (prevents obviously destructive actions)
   */
  enableSafetyChecks?: boolean;
}

/**
 * Agent Mode Handler
 *
 * Provides autonomous action execution using Router + ReAct.
 * Actions execute immediately without confirmation.
 */
export class AgentModeHandler implements IModeHandler {
  readonly mode = 'agent' as const;
  readonly displayName = 'Agent Mode';
  readonly description =
    'Autonomous execution mode. Actions execute immediately without confirmation.';

  private routerClient: CopilotClient;
  private chatOrchestrator: ChatOrchestrator;
  private enableLogging: boolean;
  private enableSafetyChecks: boolean;
  private toolExecutor: ToolExecutor;

  /**
   * Create a new AgentModeHandler
   *
   * @param config Handler configuration
   */
  constructor(config: AgentModeHandlerConfig) {
    this.routerClient = config.routerClient;
    this.chatOrchestrator = config.chatOrchestrator;
    this.enableLogging = config.enableLogging ?? true;
    this.enableSafetyChecks = config.enableSafetyChecks ?? true;

    // Initialize tool executor with built-in tools
    this.toolExecutor = new ToolExecutor({
      tools: ToolExecutor.createBuiltinTools(),
      enableLogging: this.enableLogging
    });

    this.log('info', 'AgentModeHandler initialized with tool executor');
    this.log('info', `Available tools: ${this.toolExecutor.getAvailableTools().join(', ')}`);
    if (this.enableSafetyChecks) {
      this.log('info', 'Safety checks ENABLED - will prevent obviously destructive actions');
    } else {
      this.log('warn', 'Safety checks DISABLED - use with caution!');
    }
  }

  /**
   * Check if this handler can process the given input
   *
   * Agent mode can handle all natural language input.
   *
   * @param input User input string
   * @returns Always true (agent mode handles everything)
   */
  canHandleInput(input: string): boolean {
    // Agent mode can handle any natural language input
    return typeof input === 'string' && input.trim().length > 0;
  }

  /**
   * Handle natural language input
   *
   * Uses Router LLM to analyze intent, then ReAct agent to plan and EXECUTE actions.
   * NO CONFIRMATION - actions execute immediately.
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

    this.log('info', `Processing input in agent mode: "${trimmedInput.substring(0, 50)}..."`);

    // Check if router client is available
    if (!this.routerClient) {
      this.log('error', 'Router client not available');
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          'Router LLM is not available. Please check your configuration.'
        )
      );
      return;
    }

    try {
      // Step 1: Plan tool calls using LLM directly (bypasses ReActAgent completely!)
      this.log('info', 'Planning tool calls with LLM...');
      const proposedActions = await this.planToolCalls(trimmedInput);

      // Step 2: Check if there are actions to execute
      if (proposedActions.length === 0) {
        // No actions needed, just have a conversation
        this.log('info', 'No actions needed, providing conversational response');

        const response = await this.routerClient.chat({
          messages: [
            { role: 'system', content: 'You are a helpful autonomous coding assistant. Provide clear, helpful responses.' },
            { role: 'user', content: trimmedInput }
          ],
          temperature: 0.7,
          maxTokens: 500,
        });

        const content = response.content || response.message?.content || 'I understand your request.';

        this.chatOrchestrator.addMessage(
          this.chatOrchestrator.createMessage('assistant', content)
        );
        return;
      }

      // Step 3: Safety check - prevent obviously destructive actions
      if (this.enableSafetyChecks) {
        const blocked = this.checkForDestructiveActions(proposedActions);
        if (blocked.length > 0) {
          this.log('warn', `Blocked ${blocked.length} potentially destructive actions`);
          this.chatOrchestrator.addMessage(
            this.chatOrchestrator.createMessage(
              'error',
              `⚠️ Blocked potentially destructive actions:\n\n` +
              blocked.map((action, i) => `${i + 1}. ${action.description}`).join('\n') +
              `\n\nThese actions require manual approval. Switch to Edit mode with /mode edit to review and approve actions.`
            )
          );
          return;
        }
      }

      // Step 4: Show what we're about to do
      let planMessage = `🤖 I'll perform ${proposedActions.length} action(s):\n\n`;
      proposedActions.forEach((action, i) => {
        planMessage += `${i + 1}. ${action.description}\n`;
      });

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage('assistant', planMessage)
      );

      // Step 5: EXECUTE IMMEDIATELY (no confirmation!)
      this.log('info', `Executing ${proposedActions.length} actions autonomously...`);
      await this.executeActionsAutonomously(proposedActions);

    } catch (error) {
      const errorMessage = sanitizeError(error);
      this.log('error', `Failed to process input: ${errorMessage}`);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          `Failed to process your request: ${errorMessage}\n\n` +
          `You can try:\n` +
          `- Rephrasing your request\n` +
          `- Using /help to see available commands\n` +
          `- Switching to Edit mode with /mode edit for safer execution`
        )
      );
    }
  }

  /**
   * Whether this mode supports action confirmations
   *
   * Agent mode does NOT support confirmations (autonomous execution).
   *
   * @returns Always false
   */
  supportsConfirmations(): boolean {
    return false;
  }

  /**
   * Get mode capabilities
   *
   * @returns Capability flags for agent mode
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
      requiresConfirmation: false, // NO confirmations (autonomous!)
      autonomous: true, // Fully autonomous execution
      usesRouter: true, // Uses router for intent analysis
      usesReAct: true, // Uses ReAct for action planning
    };
  }

  /**
   * Analyze user intent using router LLM
   *
   * @param input User input
   * @param context Additional context
   * @returns Intent analysis result
   */
  private async analyzeIntent(
    input: string,
    _context: Record<string, unknown>
  ): Promise<{ type: string; confidence: number; reasoning: string }> {
    try {
      const systemPrompt = `You are an intent analyzer for NocturneAI. Classify user input into categories:

Categories:
- "action": User wants to perform actions (create, edit, delete, run, etc.)
- "question": User is asking a question
- "greeting": User is greeting or making casual conversation
- "clarification": User is clarifying previous request
- "other": Unclear or other intent

Respond with JSON:
{
  "type": "action|question|greeting|clarification|other",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

      const response = await this.routerClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.2,
        maxTokens: 150,
      });

      const content = response.content || response.message?.content || '';

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(content);
        return {
          type: parsed.type || 'other',
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || 'No reasoning provided'
        };
      } catch {
        // Fallback: assume action if content mentions action words
        const actionWords = ['create', 'make', 'build', 'run', 'execute', 'delete', 'edit', 'update', 'install'];
        const hasActionWord = actionWords.some(word => input.toLowerCase().includes(word));

        return {
          type: hasActionWord ? 'action' : 'question',
          confidence: 0.6,
          reasoning: 'Fallback classification'
        };
      }
    } catch (error) {
      this.log('warn', `Intent analysis failed: ${error}`);
      // Default to action type to be safe
      return {
        type: 'action',
        confidence: 0.5,
        reasoning: 'Intent analysis failed, defaulting to action'
      };
    }
  }

  /**
   * Handle simple queries (questions, greetings) without actions
   *
   * @param input User input
   * @param intent Intent analysis
   */
  private async handleSimpleQuery(
    input: string,
    _intent: { type: string; confidence: number; reasoning: string }
  ): Promise<void> {
    try {
      const systemPrompt = `You are NocturneAI in Agent mode. Answer questions and greetings briefly.

About NocturneAI:
- Multi-agent system for task automation
- Currently in Agent mode (AUTONOMOUS - no confirmations!)
- Commands: /help, /agents, /model, /mode
- Executes actions immediately without asking permission

Guidelines:
- Answer questions directly (1-2 sentences)
- For greetings, be friendly and offer help
- Mention Agent mode capabilities when relevant
- WARN users that actions execute immediately
- Suggest Edit mode (/mode edit) for safer execution`;

      const response = await this.routerClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        maxTokens: 200,
      });

      const content = response.content || response.message?.content || '';

      if (content.trim()) {
        this.chatOrchestrator.addMessage(
          this.chatOrchestrator.createMessage('assistant', content.trim())
        );
      } else {
        this.chatOrchestrator.addMessage(
          this.chatOrchestrator.createMessage(
            'assistant',
            'I received your message. How can I help you today? (Note: I\'m in Agent mode - actions execute immediately!)'
          )
        );
      }
    } catch (error) {
      this.log('error', `Failed to handle simple query: ${error}`);
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'assistant',
          'I understand your question. How can I assist you?'
        )
      );
    }
  }

  /**
   * Check for potentially destructive actions
   *
   * @param actions Proposed actions
   * @returns Array of blocked actions
   */
  private checkForDestructiveActions(actions: ProposedAction[]): ProposedAction[] {
    const blocked: ProposedAction[] = [];

    const destructiveKeywords = [
      'delete all',
      'remove all',
      'drop database',
      'format',
      'rm -rf /',
      'sudo rm',
      '--force',
      'truncate',
      'destroy'
    ];

    for (const action of actions) {
      const desc = action.description.toLowerCase();
      const cmd = action.command?.toLowerCase() || '';

      // Check if action contains destructive keywords
      const isDestructive = destructiveKeywords.some(keyword =>
        desc.includes(keyword) || cmd.includes(keyword)
      );

      if (isDestructive) {
        blocked.push(action);
      }
    }

    return blocked;
  }

  /**
   * Plan tool calls using LLM directly (bypasses ReActAgent)
   *
   * @param input User input
   * @returns Proposed actions
   */
  private async planToolCalls(input: string): Promise<ProposedAction[]> {
    const tools = this.toolExecutor.getAvailableTools();
    const toolDescriptions = tools.map(t => `- ${t}: ${this.getToolDescription(t)}`).join('\n');

    const systemPrompt = `You are a terminal command generator for an autonomous coding assistant.

Available tools:
${toolDescriptions}

For most operations, generate terminal commands using command_execute:
- List files: {"tool": "command_execute", "parameters": {"command": "ls", "args": ["-la"]}}
- Find files: {"tool": "command_execute", "parameters": {"command": "find", "args": [".", "-name", "*.tsx"]}}
- Read file: {"tool": "command_execute", "parameters": {"command": "cat", "args": ["filename"]}}
- Write file: {"tool": "command_execute", "parameters": {"command": "sh", "args": ["-c", "cat > file.py << 'EOF'\\ncode\\nEOF"]}}
- Search content: {"tool": "command_execute", "parameters": {"command": "grep", "args": ["-r", "pattern", "."]}}
- Count lines: {"tool": "command_execute", "parameters": {"command": "wc", "args": ["-l", "filename"]}}

IMPORTANT: For pipes, redirects, or shell syntax (|, >, <, &&, ||), wrap in sh -c:
- Pipe example: {"tool": "command_execute", "parameters": {"command": "sh", "args": ["-c", "ls -1 | wc -l"]}}
- Multiple commands: {"tool": "command_execute", "parameters": {"command": "sh", "args": ["-c", "echo hello && echo world"]}}

File operations:
- Create new file: Use command_execute with heredoc (cat > file.py << 'EOF'\\ncode\\nEOF)
- Edit existing file: Use file_edit tool with search-replace pattern
  Example: {"tool": "file_edit", "parameters": {"path": "config.ts", "old_string": "timeout: 30", "new_string": "timeout: 60"}}
- Small changes: file_edit is precise and safe
- Complete rewrites: command_execute with heredoc is better

File creation rules:
- If user doesn't specify filename, generate meaningful one (e.g., "is_prime.py" for prime checker)
- Use heredoc for multi-line content: cat > file.py << 'EOF'\\ncontent\\nEOF

Respond with ONLY a JSON array (no markdown, no explanation):
[{
  "description": "What this action does",
  "tool": "tool-name",
  "parameters": {"param": "value"}
}]

If no tools needed, return empty array: []`;

    try {
      const response = await this.routerClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.3,
        maxTokens: 1000,
      });

      const content = response.content || response.message?.content || '';

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.log('warn', 'No JSON array found in LLM response');
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
      this.log('error', `Failed to plan tool calls: ${error}`);
      return [];
    }
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

  /**
   * Execute actions autonomously (no confirmation)
   *
   * @param actions Actions to execute
   */
  private async executeActionsAutonomously(actions: ProposedAction[]): Promise<void> {
    this.log('info', `Executing ${actions.length} actions autonomously using ToolExecutor...`);

    try {
      // Add progress message
      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'assistant',
          `🤖 Executing ${actions.length} action(s)...`
        )
      );

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
      const errorMessage = sanitizeError(error);
      this.log('error', `Action execution failed: ${errorMessage}`);

      this.chatOrchestrator.addMessage(
        this.chatOrchestrator.createMessage(
          'error',
          `❌ Failed to execute actions: ${errorMessage}`
        )
      );
    }
  }

  /**
   * Format plan message to show what we're about to do
   *
   * @param thought ReAct thought with proposed actions
   * @returns Formatted message string
   */
  private formatPlanMessage(thought: any): string {
    let message = `${thought.understanding}\n\n`;
    message += `**Executing Actions:**\n`;

    for (let i = 0; i < thought.proposedActions.length; i++) {
      const action = thought.proposedActions[i];
      message += `${i + 1}. ${action.description}\n`;
    }

    if (thought.reasoning) {
      message += `\n*Reasoning: ${thought.reasoning}*`;
    }

    return message;
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
    const prefix = `[AgentModeHandler]`;
    // TODO: Write to log file instead of console
    // For now, just skip logging to avoid terminal output
  }
}
