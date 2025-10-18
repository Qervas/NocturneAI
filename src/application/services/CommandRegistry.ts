/**
 * CommandRegistry Service
 *
 * Central registry for all available commands in the system.
 * Provides command discovery, validation, and execution capabilities.
 */

import { EventEmitter } from 'events';
import { AgentService } from './AgentService.js';
import { ModelConfigService } from './ModelConfigService.js';
import { Logger } from '../../infrastructure/logging/Logger.js';

/**
 * Command category types
 */
export type CommandCategory = 'agent' | 'workflow' | 'navigation' | 'system' | 'file' | 'model';

/**
 * Command parameter definition
 */
export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description: string;
  default?: unknown;
}

/**
 * Command definition
 */
export interface Command {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  keywords?: string[];
  parameters?: CommandParameter[];
  examples?: string[];
  execute: (params: Record<string, unknown>) => Promise<unknown>;
  validate?: (params: Record<string, unknown>) => boolean;
}

/**
 * CommandRegistry Options
 */
interface CommandRegistryOptions {
  agentService?: AgentService;
  modelConfigService?: ModelConfigService;
  eventBus?: EventEmitter;
  logger?: Logger;
}

/**
 * Command Registry Service
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private commandsByCategory: Map<CommandCategory, Command[]> = new Map();
  private agentService?: AgentService;
  private modelConfigService?: ModelConfigService;
  private eventBus?: EventEmitter;
  private logger?: Logger;

  constructor(options: CommandRegistryOptions = {}) {
    this.agentService = options.agentService;
    this.modelConfigService = options.modelConfigService;
    this.eventBus = options.eventBus;
    this.logger = options.logger;

    this.initializeCommands();
  }

  /**
   * Initialize built-in commands
   *
   * Order: Shortcuts → Agent → Workflow → Model → System → Logs
   */
  private initializeCommands(): void {
    // ============================================================================
    // SHORTCUT COMMANDS (single-word for common actions)
    // ============================================================================

    this.registerCommand({
      id: 'help',
      name: 'Help',
      description: 'Show available commands',
      category: 'system',
      keywords: ['help'],
      execute: async () => this.executeCommand('system.help')
    });

    this.registerCommand({
      id: 'clear',
      name: 'Clear',
      description: 'Clear chat history',
      category: 'system',
      keywords: ['clear'],
      execute: async () => this.executeCommand('system.clear')
    });

    this.registerCommand({
      id: 'exit',
      name: 'Exit',
      description: 'Exit application',
      category: 'system',
      keywords: ['exit'],
      execute: async () => this.executeCommand('system.exit')
    });

    this.registerCommand({
      id: 'agents',
      name: 'List Agents',
      description: 'Show all agents',
      category: 'agent',
      keywords: ['agents'],
      execute: async () => this.executeCommand('agent.list')
    });

    this.registerCommand({
      id: 'workflows',
      name: 'List Workflows',
      description: 'Show all workflows',
      category: 'workflow',
      keywords: ['workflows'],
      execute: async () => this.executeCommand('workflow.list')
    });

    this.registerCommand({
      id: 'model',
      name: 'Show Models',
      description: 'Show selectable list of models',
      category: 'model',
      keywords: ['model'],
      execute: async () => this.executeCommand('model.list')
    });

    this.registerCommand({
      id: 'logs',
      name: 'Show Logs',
      description: 'Show recent logs',
      category: 'system',
      keywords: ['logs'],
      execute: async () => this.executeCommand('logs.recent')
    });

    // ============================================================================
    // MODE COMMANDS (Interaction Modes)
    // ============================================================================

    this.registerCommand({
      id: 'mode',
      name: 'Show Mode',
      description: 'Show current interaction mode',
      category: 'system',
      keywords: ['mode', 'current'],
      execute: async () => {
        this.log('info', 'Showing current mode');

        // This will be handled by ChatOrchestrator's ModeManager
        this.emit('command:mode:show');

        return {
          formatted: '📋 Mode information will be shown by ChatOrchestrator',
          success: true
        };
      }
    });

    this.registerCommand({
      id: 'mode.ask',
      name: 'Switch to Ask Mode',
      description: 'Switch to conversational mode (fast responses, no tools)',
      category: 'system',
      keywords: ['mode', 'ask', 'conversational', 'chat'],
      execute: async () => {
        this.log('info', 'Switching to ask mode');

        // Emit event for ChatOrchestrator to handle
        this.emit('command:mode:switch', { mode: 'ask' });

        return {
          formatted: '💬 Switching to Ask mode...',
          success: true,
          mode: 'ask'
        };
      }
    });

    this.registerCommand({
      id: 'mode.edit',
      name: 'Switch to Edit Mode',
      description: 'Switch to edit mode (human-approved actions with tools)',
      category: 'system',
      keywords: ['mode', 'edit', 'action', 'tools'],
      execute: async () => {
        this.log('info', 'Switching to edit mode');

        // Emit event for ChatOrchestrator to handle
        this.emit('command:mode:switch', { mode: 'edit' });

        return {
          formatted: '✏️ Switching to Edit mode...',
          success: true,
          mode: 'edit'
        };
      }
    });

    this.registerCommand({
      id: 'mode.agent',
      name: 'Switch to Agent Mode',
      description: 'Switch to agent mode (autonomous execution, no confirmations)',
      category: 'system',
      keywords: ['mode', 'agent', 'autonomous', 'auto'],
      execute: async () => {
        this.log('info', 'Switching to agent mode');

        // Emit event for ChatOrchestrator to handle
        this.emit('command:mode:switch', { mode: 'agent' });

        return {
          formatted: '🤖 Switching to Agent mode...',
          success: true,
          mode: 'agent'
        };
      }
    });

    // ============================================================================
    // AGENT COMMANDS
    // ============================================================================
    this.registerCommand({
      id: 'agent.create',
      name: 'Create Agent',
      description: 'Create a new agent with specified configuration',
      category: 'agent',
      keywords: ['create', 'new', 'agent', 'make', 'spawn'],
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Name of the agent'
        },
        {
          name: 'type',
          type: 'string',
          required: false,
          description: 'Type of agent (e.g., data-processor, web-scraper)',
          default: 'general'
        }
      ],
      examples: [
        '/agent create DataProcessor',
        'Create an agent named WebScraper'
      ],
      execute: async (params) => {
        this.log('info', `Creating agent: ${params.name}`);
        if (this.agentService) {
          const agent = await this.agentService.createAgent({
            name: params.name as string,
            type: params.type as string
          });
          this.emit('agent:created', agent);
          return agent;
        }
        return { success: true, message: `Agent ${params.name} created` };
      }
    });

    this.registerCommand({
      id: 'agent.list',
      name: 'List Agents',
      description: 'Show all available agents',
      category: 'agent',
      keywords: ['list', 'show', 'agents', 'all'],
      execute: async () => {
        this.log('info', 'Listing agents');
        if (this.agentService) {
          const agents = this.agentService.getAllAgents();
          const stats = this.agentService.getServiceStats();

          // Format output as table
          let output = `📊 Agent Statistics:\n`;
          output += `   Total: ${stats.totalAgents} | Active: ${stats.activeAgents} | Paused: ${stats.pausedAgents} | Stopped: ${stats.stoppedAgents}\n\n`;

          if (agents.length === 0) {
            output += `No agents found. Create one with /agent create <name>\n`;
          } else {
            output += `┌─────────────────────┬────────────┬─────────┬──────────────┐\n`;
            output += `│ Name                │ Type       │ Status  │ Tasks        │\n`;
            output += `├─────────────────────┼────────────┼─────────┼──────────────┤\n`;

            agents.forEach((agent) => {
              const agentStats = this.agentService!.getAgentStats(agent.id);
              const name = agent.id.substring(0, 19).padEnd(19);
              const type = (agent.config.type || 'general').substring(0, 10).padEnd(10);
              const status = agent.state.status.padEnd(7);
              const tasks = agentStats ? `${agentStats.tasksCompleted}/${agentStats.tasksTotal}`.padEnd(12) : '0/0         ';

              output += `│ ${name} │ ${type} │ ${status} │ ${tasks} │\n`;
            });

            output += `└─────────────────────┴────────────┴─────────┴──────────────┘\n`;
          }

          // Emit as chat message
          this.emit('chat:message', {
            id: `agent-list-${Date.now()}`,
            type: 'agent_list',
            content: output,
            timestamp: new Date(),
            metadata: { agents, stats }
          });

          return { agents, stats, formatted: output };
        }
        return { error: 'Agent service not available', agents: [], stats: null };
      }
    });

    this.registerCommand({
      id: 'agent.run',
      name: 'Run Agent Task',
      description: 'Execute a task on specified agent',
      category: 'agent',
      keywords: ['run', 'execute', 'task', 'start'],
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Agent ID or name'
        },
        {
          name: 'task',
          type: 'string',
          required: true,
          description: 'Task description'
        }
      ],
      execute: async (params) => {
        this.log('info', `Running task on agent ${params.agentId}: ${params.task}`);
        if (this.agentService) {
          const result = await this.agentService.runTask(
            params.agentId as string,
            params.task as string
          );
          this.emit('task:executed', result);
          return result;
        }
        return { success: true, message: 'Task submitted' };
      }
    });

    this.registerCommand({
      id: 'agent.status',
      name: 'Agent Status',
      description: 'Get status of specific agent',
      category: 'agent',
      keywords: ['status', 'info', 'agent', 'check'],
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Agent ID or name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Getting status for agent: ${params.agentId}`);
        if (this.agentService) {
          return await this.agentService.getAgentStatus(params.agentId as string);
        }
        return { status: 'unknown' };
      }
    });

    // Workflow commands
    this.registerCommand({
      id: 'workflow.start',
      name: 'Start Workflow',
      description: 'Start a workflow execution',
      category: 'workflow',
      keywords: ['workflow', 'start', 'begin', 'run'],
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Workflow name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Starting workflow: ${params.name}`);
        this.emit('workflow:started', { name: params.name });
        return { success: true, message: `Workflow ${params.name} started` };
      }
    });

    this.registerCommand({
      id: 'workflow.list',
      name: 'List Workflows',
      description: 'Show all available workflows',
      category: 'workflow',
      keywords: ['workflow', 'list', 'show', 'all'],
      execute: async () => {
        this.log('info', 'Listing workflows');
        return [];
      }
    });

    // Navigation commands removed - pure chat interface doesn't need view switching

    // System commands
    this.registerCommand({
      id: 'system.clear',
      name: 'Clear',
      description: 'Clear chat history or logs',
      category: 'system',
      keywords: ['clear', 'clean', 'reset'],
      execute: async () => {
        this.log('info', 'Clearing chat history');
        this.emit('chat:clear');
        return { success: true, message: 'Chat cleared' };
      }
    });

    this.registerCommand({
      id: 'system.help',
      name: 'Help',
      description: 'Show available commands and help',
      category: 'system',
      keywords: ['help', 'commands', 'what', 'how'],
      execute: async () => {
        this.log('info', 'Showing help');
        const commands = this.getAllCommands();

        // Group by category
        const byCategory = new Map<CommandCategory, any[]>();
        commands.forEach(cmd => {
          if (!byCategory.has(cmd.category)) byCategory.set(cmd.category, []);
          byCategory.get(cmd.category)!.push(cmd);
        });

        let output = `📚 NocturneAI Commands\n\n`;

        // Agent commands
        if (byCategory.has('agent')) {
          output += `🤖 AGENT COMMANDS\n${'─'.repeat(60)}\n`;
          byCategory.get('agent')!.forEach(cmd => {
            const cmdName = cmd.id.replace('agent.', '/agent ');
            output += `   ${cmdName.padEnd(25)} ${cmd.description}\n`;
          });
          output += `\n   Shorthand: /agents  →  List all agents\n\n`;
        }

        // Workflow commands
        if (byCategory.has('workflow')) {
          output += `⚙️  WORKFLOW COMMANDS\n${'─'.repeat(60)}\n`;
          byCategory.get('workflow')!.forEach(cmd => {
            const cmdName = cmd.id.replace('workflow.', '/workflow ');
            output += `   ${cmdName.padEnd(25)} ${cmd.description}\n`;
          });
          output += `\n   Shorthand: /workflows  →  List all workflows\n\n`;
        }

        // Model commands
        if (byCategory.has('model')) {
          output += `🧠 MODEL COMMANDS\n${'─'.repeat(60)}\n`;
          output += `   PRIMARY MODEL (for complex tasks):\n`;
          output += `      /model                 Show selectable list of models\n`;
          output += `      /model set <id>        Change primary model\n`;
          output += `\n`;
          output += `   ROUTER/SECONDARY MODEL (for simple responses, free):\n`;
          output += `      /model router          Show current router model\n`;
          output += `      /model router set <id> Change router model\n`;
          output += `\n   Free router models: gpt-4.1, gpt-4o, gpt-5-mini, grok-code-fast-1\n`;
          output += `   Example: /model set gpt-4o\n`;
          output += `   Example: /model router set gpt-5-mini\n\n`;
        }

        // Mode commands (special section)
        output += `🔀 INTERACTION MODES\n${'─'.repeat(60)}\n`;
        output += `   /mode                  Show current interaction mode\n`;
        output += `   /mode ask              Switch to Ask mode (conversational)\n`;
        output += `   /mode edit             Switch to Edit mode (human-approved)\n`;
        output += `   /mode agent            Switch to Agent mode (autonomous)\n`;
        output += `\n   MODES EXPLAINED:\n`;
        output += `   • ASK mode    → Fast responses, no tools (current default)\n`;
        output += `   • EDIT mode   → Execute actions with your approval\n`;
        output += `   • AGENT mode  → Autonomous execution without confirmation\n\n`;

        // System commands (excluding mode commands which are shown separately)
        if (byCategory.has('system')) {
          output += `⚡ SYSTEM COMMANDS\n${'─'.repeat(60)}\n`;
          byCategory.get('system')!.forEach(cmd => {
            // Skip mode commands - they're shown in their own section
            if (cmd.id.startsWith('mode')) return;

            const cmdName = cmd.id.replace('system.', '/');
            output += `   ${cmdName.padEnd(25)} ${cmd.description}\n`;
          });
          output += `\n`;
        }

        output += `💬 NATURAL LANGUAGE\n${'─'.repeat(60)}\n`;
        output += `   You can also chat naturally without using slash commands.\n`;
        output += `   In ASK mode: Just ask questions and chat\n`;
        output += `   In EDIT mode: Request actions like "create an agent"\n`;
        output += `   In AGENT mode: Give commands for autonomous execution\n\n`;

        output += `TIP: Type / to see autocomplete suggestions\n`;

        this.emit('chat:message', {
          id: `help-${Date.now()}`,
          type: 'execution',
          content: output,
          timestamp: new Date()
        });

        return { formatted: output, commands };
      }
    });

    this.registerCommand({
      id: 'system.exit',
      name: 'Exit',
      description: 'Exit the application',
      category: 'system',
      keywords: ['exit', 'quit', 'bye', 'close'],
      execute: async () => {
        this.log('info', 'Exiting application');
        this.emit('app:exit');
        process.exit(0);
      }
    });

    this.registerCommand({
      id: 'system.refresh',
      name: 'Refresh',
      description: 'Refresh the current view',
      category: 'system',
      keywords: ['refresh', 'reload', 'update'],
      execute: async () => {
        this.log('info', 'Refreshing view');
        this.emit('view:refresh');
        return { success: true, message: 'View refreshed' };
      }
    });

    // Model commands - unified /model command shows selectable list
    this.registerCommand({
      id: 'model.list',
      name: 'List Models',
      description: 'Show selectable list of models',
      category: 'model',
      keywords: ['model', 'models', 'list', 'available', 'llm'],
      execute: async () => {
        this.log('info', 'Showing model selection list');
        if (this.modelConfigService) {
          const models = this.modelConfigService.getAvailableModels();
          const current = this.modelConfigService.getCurrentModel();

          let output = `🧠 Available Models (${models.length}):\n\n`;
          output += `Current: ${current.name} (${current.id})\n\n`;

          // Group by provider
          const byProvider = new Map<string, any[]>();
          models.forEach(m => {
            if (!byProvider.has(m.provider)) byProvider.set(m.provider, []);
            byProvider.get(m.provider)!.push(m);
          });

          byProvider.forEach((providerModels, provider) => {
            output += `\n${provider.toUpperCase()}\n`;
            output += `${'─'.repeat(60)}\n`;

            providerModels.forEach((m, idx) => {
              const isCurrent = m.id === current.id;
              const marker = isCurrent ? '→' : ' ';
              const num = String(idx + 1).padStart(2);
              output += `${marker} ${num}. ${m.name.padEnd(30)} ${m.id}\n`;
              if (m.description) {
                output += `     ${m.description.substring(0, 55)}\n`;
              }
            });
          });

          output += `\n\nTo switch models: /model set <model-id>\n`;
          output += `Example: /model set gpt-4o\n`;

          this.emit('chat:message', {
            id: `model-list-${Date.now()}`,
            type: 'model_list',
            content: output,
            timestamp: new Date(),
            metadata: { models, current }
          });

          return { models, current, formatted: output };
        }
        return { error: 'Model service not available' };
      }
    });

    this.registerCommand({
      id: 'model.current',
      name: 'Current Model',
      description: 'Show the currently selected model',
      category: 'model',
      keywords: ['model', 'current', 'selected', 'active'],
      execute: async () => {
        this.log('info', 'Getting current model');
        if (this.modelConfigService) {
          const current = this.modelConfigService.getCurrentModel();

          let output = `🧠 Current Model:\n\n`;
          output += `   Name: ${current.name}\n`;
          output += `   ID: ${current.id}\n`;
          output += `   Provider: ${current.provider}\n`;
          output += `   Category: ${current.category}\n`;
          if (current.description) {
            output += `   Description: ${current.description}\n`;
          }

          this.emit('chat:message', {
            id: `model-current-${Date.now()}`,
            type: 'execution',
            content: output,
            timestamp: new Date(),
            metadata: { current }
          });

          return { current, formatted: output };
        }
        return { error: 'Model service not available' };
      }
    });

    this.registerCommand({
      id: 'model.set',
      name: 'Set Model',
      description: 'Change the current LLM model',
      category: 'model',
      keywords: ['model', 'set', 'change', 'switch', 'select'],
      parameters: [
        {
          name: 'modelId',
          type: 'string',
          required: true,
          description: 'Model ID to switch to'
        }
      ],
      examples: [
        '/model set gpt-4o',
        '/model set claude-3.5-sonnet',
        'Set model to GPT-4'
      ],
      execute: async (params) => {
        const modelId = params.modelId as string;
        this.log('info', `Setting model to: ${modelId}`);

        if (this.modelConfigService) {
          const success = this.modelConfigService.setCurrentModel(modelId);
          if (success) {
            const newModel = this.modelConfigService.getCurrentModel();
            this.emit('model:changed', newModel);

            const output = `✓ Model changed:\n\n   ${newModel.name}\n   ${newModel.id}\n   Provider: ${newModel.provider}`;

            this.emit('chat:message', {
              id: `model-set-${Date.now()}`,
              type: 'execution',
              content: output,
              timestamp: new Date(),
              metadata: { model: newModel }
            });

            return { success: true, model: newModel, formatted: output };
          } else {
            const output = `✗ Invalid model: ${modelId}\n\nUse /model to see available models.`;

            this.emit('chat:message', {
              id: `model-set-error-${Date.now()}`,
              type: 'error',
              content: output,
              timestamp: new Date()
            });

            return { success: false, error: modelId, formatted: output };
          }
        }
        return { error: 'Model service not available' };
      }
    });

    // Router model commands
    this.registerCommand({
      id: 'model.router',
      name: 'Router Model',
      description: 'Show current router model',
      category: 'model',
      keywords: ['model', 'router', 'fast', 'secondary'],
      execute: async () => {
        this.log('info', 'Getting router model');
        if (this.modelConfigService) {
          const router = this.modelConfigService.getRouterModel();

          let output = `🚀 Router Model (Fast & Free):\n\n`;
          output += `   Name: ${router.name}\n`;
          output += `   ID: ${router.id}\n`;
          output += `   Provider: ${router.provider}\n`;
          output += `   Category: ${router.category}\n\n`;
          output += `The router model handles simple questions, greetings, and intent\n`;
          output += `classification. It's fast and free, saving your main model for\n`;
          output += `complex tasks.\n\n`;
          output += `To change: /model router set <id>\n`;

          this.emit('chat:message', {
            id: `model-router-${Date.now()}`,
            type: 'execution',
            content: output,
            timestamp: new Date(),
            metadata: { router }
          });

          return { router, formatted: output };
        }
        return { error: 'Model service not available' };
      }
    });

    this.registerCommand({
      id: 'model.router.set',
      name: 'Set Router Model',
      description: 'Change router model (free models only)',
      category: 'model',
      keywords: ['model', 'router', 'set', 'change'],
      parameters: [
        {
          name: 'modelId',
          type: 'string',
          required: true,
          description: 'Router model ID (gpt-4.1, gpt-4o, gpt-5-mini, grok-code-fast-1)'
        }
      ],
      execute: async (params) => {
        const modelId = params.modelId as string;
        this.log('info', `Setting router model to: ${modelId}`);

        if (this.modelConfigService) {
          const success = this.modelConfigService.setRouterModel(modelId);
          if (success) {
            const newRouter = this.modelConfigService.getRouterModel();

            const output = `✓ Router model changed:\n\n   ${newRouter.name}\n   ${newRouter.id}\n\nYour router now uses this fast, free model for simple responses!`;

            this.emit('chat:message', {
              id: `model-router-set-${Date.now()}`,
              type: 'execution',
              content: output,
              timestamp: new Date(),
              metadata: { router: newRouter }
            });

            return { success: true, router: newRouter, formatted: output };
          } else {
            const freeModels = this.modelConfigService.getFreeRouterModels();
            const modelList = freeModels.map(m => `${m.id} (${m.name})`).join(', ');

            const output = `✗ Invalid router model: ${modelId}\n\nFree router models: ${modelList}`;

            this.emit('chat:message', {
              id: `model-router-set-error-${Date.now()}`,
              type: 'error',
              content: output,
              timestamp: new Date()
            });

            return { success: false, error: modelId, formatted: output };
          }
        }
        return { error: 'Model service not available' };
      }
    });

    // Agent info/management commands
    this.registerCommand({
      id: 'agent.info',
      name: 'Agent Info',
      description: 'Get detailed information about an agent',
      category: 'agent',
      keywords: ['agent', 'info', 'details', 'show'],
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Agent ID or name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Getting agent info: ${params.agentId}`);
        // Return mock data for now
        return {
          id: params.agentId,
          name: `Agent-${params.agentId}`,
          status: 'idle',
          type: 'general',
          created: new Date().toISOString()
        };
      }
    });

    this.registerCommand({
      id: 'agent.start',
      name: 'Start Agent',
      description: 'Start a stopped agent',
      category: 'agent',
      keywords: ['agent', 'start', 'run', 'activate'],
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Agent ID or name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Starting agent: ${params.agentId}`);
        this.emit('agent:started', { id: params.agentId });
        return { success: true, message: `Agent ${params.agentId} started` };
      }
    });

    this.registerCommand({
      id: 'agent.stop',
      name: 'Stop Agent',
      description: 'Stop a running agent',
      category: 'agent',
      keywords: ['agent', 'stop', 'halt', 'pause'],
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Agent ID or name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Stopping agent: ${params.agentId}`);
        this.emit('agent:stopped', { id: params.agentId });
        return { success: true, message: `Agent ${params.agentId} stopped` };
      }
    });

    this.registerCommand({
      id: 'agent.select',
      name: 'Select Agent',
      description: 'Select an agent for interaction',
      category: 'agent',
      keywords: ['agent', 'select', 'choose', 'switch'],
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Agent ID or name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Selecting agent: ${params.agentId}`);
        this.emit('agent:selected', { id: params.agentId });
        return { success: true, message: `Agent ${params.agentId} selected` };
      }
    });

    // Workflow management commands
    this.registerCommand({
      id: 'workflow.status',
      name: 'Workflow Status',
      description: 'Get status of a workflow',
      category: 'workflow',
      keywords: ['workflow', 'status', 'info', 'progress'],
      parameters: [
        {
          name: 'workflowId',
          type: 'string',
          required: true,
          description: 'Workflow ID or name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Getting workflow status: ${params.workflowId}`);
        return {
          id: params.workflowId,
          status: 'running',
          progress: 50,
          startTime: new Date().toISOString()
        };
      }
    });

    this.registerCommand({
      id: 'workflow.stop',
      name: 'Stop Workflow',
      description: 'Stop a running workflow',
      category: 'workflow',
      keywords: ['workflow', 'stop', 'halt', 'cancel'],
      parameters: [
        {
          name: 'workflowId',
          type: 'string',
          required: true,
          description: 'Workflow ID or name'
        }
      ],
      execute: async (params) => {
        this.log('info', `Stopping workflow: ${params.workflowId}`);
        this.emit('workflow:stopped', { id: params.workflowId });
        return { success: true, message: `Workflow ${params.workflowId} stopped` };
      }
    });

    // Logs commands
    this.registerCommand({
      id: 'logs.recent',
      name: 'Recent Logs',
      description: 'Show recent system logs',
      category: 'system',
      keywords: ['logs', 'recent', 'latest', 'show'],
      execute: async () => {
        this.log('info', 'Showing recent logs');
        this.emit('logs:show', { filter: 'recent' });
        return { success: true, message: 'Showing recent logs' };
      }
    });

    this.registerCommand({
      id: 'logs.errors',
      name: 'Error Logs',
      description: 'Show only error logs',
      category: 'system',
      keywords: ['logs', 'errors', 'failures'],
      execute: async () => {
        this.log('info', 'Showing error logs');
        this.emit('logs:show', { filter: 'errors' });
        return { success: true, message: 'Showing error logs' };
      }
    });

    this.registerCommand({
      id: 'logs.clear',
      name: 'Clear Logs',
      description: 'Clear all system logs',
      category: 'system',
      keywords: ['logs', 'clear', 'clean', 'reset'],
      execute: async () => {
        this.log('info', 'Clearing logs');
        this.emit('logs:clear');
        return { success: true, message: 'Logs cleared' };
      }
    });
  }

  /**
   * Register a new command
   */
  registerCommand(command: Command): void {
    this.commands.set(command.id, command);

    // Add to category map
    if (!this.commandsByCategory.has(command.category)) {
      this.commandsByCategory.set(command.category, []);
    }
    this.commandsByCategory.get(command.category)!.push(command);

    this.log('info', `Registered command: ${command.id}`);
  }

  /**
   * Get command by ID
   */
  getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get all command entries with their IDs
   */
  getAllCommandEntries(): Array<{ id: string; command: Command }> {
    return Array.from(this.commands.entries()).map(([id, command]) => ({
      id,
      command
    }));
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: CommandCategory): Command[] {
    return this.commandsByCategory.get(category) || [];
  }

  /**
   * Find commands by intent
   */
  findCommandsByIntent(intent: string): Command[] {
    const matches: Command[] = [];

    // Map common intents to command IDs
    const intentMap: Record<string, string[]> = {
      'create_agent': ['agent.create'],
      'list_agents': ['agent.list'],
      'run_task': ['agent.run'],
      'agent_status': ['agent.status'],
      'start_workflow': ['workflow.start'],
      'list_workflows': ['workflow.list'],
      'clear': ['system.clear'],
      'help': ['system.help'],
      'exit': ['system.exit'],
      'refresh': ['system.refresh'],
      'list_models': ['model.list'],
      'current_model': ['model.current'],
      'set_model': ['model.set'],
      'router_model': ['model.router'],
      'set_router_model': ['model.router.set']
    };

    const commandIds = intentMap[intent] || [];
    for (const id of commandIds) {
      const command = this.getCommand(id);
      if (command) {
        matches.push(command);
      }
    }

    return matches;
  }

  /**
   * Get related commands based on intent
   */
  getRelatedCommands(intent: string): Command[] {
    const related: Command[] = [];

    // Find commands with similar keywords
    const keywords = intent.toLowerCase().split('_');

    for (const command of this.commands.values()) {
      if (command.keywords) {
        const hasMatch = command.keywords.some(kw =>
          keywords.some(k => kw.includes(k) || k.includes(kw))
        );
        if (hasMatch) {
          related.push(command);
        }
      }
    }

    return related;
  }

  /**
   * Search commands by keyword
   */
  searchCommands(query: string): Command[] {
    const results: Command[] = [];
    const queryLower = query.toLowerCase();

    for (const command of this.commands.values()) {
      // Check name
      if (command.name.toLowerCase().includes(queryLower)) {
        results.push(command);
        continue;
      }

      // Check description
      if (command.description.toLowerCase().includes(queryLower)) {
        results.push(command);
        continue;
      }

      // Check keywords
      if (command.keywords) {
        const hasKeyword = command.keywords.some(kw =>
          kw.toLowerCase().includes(queryLower)
        );
        if (hasKeyword) {
          results.push(command);
        }
      }
    }

    return results;
  }

  /**
   * Validate command parameters
   */
  validateParameters(commandId: string, params: Record<string, unknown>): boolean {
    const command = this.getCommand(commandId);
    if (!command) return false;

    // Use custom validator if provided
    if (command.validate) {
      return command.validate(params);
    }

    // Default validation
    if (command.parameters) {
      for (const param of command.parameters) {
        if (param.required && !(param.name in params)) {
          return false;
        }

        if (param.name in params) {
          const value = params[param.name];
          const valueType = typeof value;

          // Type check
          if (param.type === 'object' && valueType !== 'object') {
            return false;
          } else if (param.type !== 'object' && valueType !== param.type) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Execute command
   */
  async executeCommand(commandId: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const command = this.getCommand(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    // Validate parameters
    if (!this.validateParameters(commandId, params)) {
      throw new Error(`Invalid parameters for command: ${commandId}`);
    }

    // Apply defaults
    if (command.parameters) {
      for (const param of command.parameters) {
        if (!(param.name in params) && param.default !== undefined) {
          params[param.name] = param.default;
        }
      }
    }

    // Execute command
    return await command.execute(params);
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: unknown): void {
    if (this.eventBus) {
      this.eventBus.emit(event, data);
    }
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (this.logger) {
      this.logger.log(level, message, { service: 'CommandRegistry' });
    }
  }
}