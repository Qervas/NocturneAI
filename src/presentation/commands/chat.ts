/**
 * Chat Command
 *
 * Launches the chat-first interface with sidebar navigation.
 * Initializes all necessary services and renders the ChatLayout.
 */

import React from 'react';
import { render } from 'ink';
import { EventEmitter } from 'events';
import ChatLayout from '../ui/components/ChatLayout.js';
import { ChatOrchestrator } from '../../application/services/ChatOrchestrator.js';
import { CommandRegistry } from '../../application/services/CommandRegistry.js';
import { ModelConfigService } from '../../application/services/ModelConfigService.js';
import { AgentService } from '../../application/services/AgentService.js';
import { CopilotClient } from '../../infrastructure/llm/CopilotClient.js';
import { Logger } from '../../infrastructure/logging/Logger.js';
import chalk from 'chalk';

/**
 * Start the chat UI
 */
export async function startChatUI(): Promise<void> {
  try {
    console.log(chalk.cyan('🚀 Starting NocturneAI Chat Interface...\n'));

    // Initialize event bus
    const eventBus = new EventEmitter();

    // Initialize logger
    const logger = new Logger({
      level: process.env.DEBUG ? 'debug' : 'info',
      enableConsole: false // Disable console logging to avoid interfering with UI
    });

    // Initialize model configuration service
    const modelService = new ModelConfigService({
      logger
    });

    logger.log('info', `Loaded ${modelService.getAvailableModels().length} models`);
    logger.log('info', `Current model: ${modelService.getCurrentModel().id}`);

    // Initialize agent service
    const agentService = new AgentService({
      enableLogging: true
    });

    logger.log('info', 'Initialized AgentService');

    // Initialize router client (fast free model for intent classification)
    let routerClient = null;
    try {
      const routerModel = modelService.getRouterModel();
      routerClient = new CopilotClient({
        baseURL: 'http://localhost:4141',
        model: routerModel.id,
        timeout: 5000  // Faster timeout for router
      });
      logger.log('info', `Router initialized with ${routerModel.name} (${routerModel.id})`);
    } catch (error) {
      logger.log('warn', 'Failed to initialize router client');
    }

    // Initialize main LLM client for complex tasks
    let llmClient = null;
    try {
      llmClient = new CopilotClient({
        baseURL: 'http://localhost:4141',
        model: modelService.getCurrentModel().id,
        timeout: 30000
      });
      logger.log('info', `Main client connected: ${modelService.getCurrentModel().name}`);
    } catch (error) {
      logger.log('warn', 'Failed to initialize LLM client - natural language disabled');
    }

    // Initialize command registry with services
    const commandRegistry = new CommandRegistry({
      agentService,
      modelConfigService: modelService,
      eventBus,
      logger
    });

    logger.log('info', `Registered ${commandRegistry.getAllCommands().length} commands`);

    // Initialize chat orchestrator with both router and main LLM clients
    const chatOrchestrator = new ChatOrchestrator({
      llmClient: llmClient,
      routerClient: routerClient,  // Fast free model for simple responses
      commandRegistry,
      eventBus,
      logger
    });

    // Add welcome message
    eventBus.emit('chat:message', {
      id: 'welcome',
      type: 'assistant',
      content: llmClient
        ? 'Welcome to NocturneAI! You can chat naturally or use slash commands. Type /help to see available commands.'
        : 'Welcome to NocturneAI! Type /help to see available commands, or /model list to see available models.',
      timestamp: new Date()
    });

    // Render the chat UI
    const { waitUntilExit } = render(
      React.createElement(ChatLayout, {
        chatOrchestrator,
        modelService,
        eventBus
      })
    );

    // Wait for UI to exit
    await waitUntilExit();

  } catch (error) {
    console.error(chalk.red('Error starting chat UI:'), error);
    process.exit(1);
  }
}

/**
 * Create chat command for Commander
 */
export function createChatCommand(): any {
  const { Command } = require('commander');
  const command = new Command('chat');

  command
    .description('Launch the interactive chat interface (default)')
    .action(async () => {
      await startChatUI();
    });

  return command;
}