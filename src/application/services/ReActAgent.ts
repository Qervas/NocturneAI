/**
 * ReActAgent Service
 *
 * Implements the ReAct (Reasoning + Acting) pattern for intelligent command
 * interpretation and execution. The agent thinks about user input, proposes
 * actions, and always asks for confirmation before execution.
 */

import type { ILLMClient } from '../../core/interfaces/ILLMClient.js';
import type { ChatMessage, ProposedAction, ExecutionResult } from '../../presentation/ui/types.js';
import { CommandRegistry } from './CommandRegistry.js';
import { Logger } from '../../infrastructure/logging/Logger.js';

/**
 * ReAct thought process
 */
interface ReActThought {
  understanding: string;
  reasoning: string;
  proposedActions: ProposedAction[];
  alternatives?: string[];
  confidence: number;
}

/**
 * ReAct Agent Options
 */
interface ReActAgentOptions {
  llmClient: ILLMClient;
  commandRegistry: CommandRegistry;
  logger?: Logger;
  maxRetries?: number;
}

/**
 * ReAct Agent Service
 */
export class ReActAgent {
  private llmClient: ILLMClient;
  private commandRegistry: CommandRegistry;
  private logger?: Logger;
  private maxRetries: number;
  private conversationHistory: ChatMessage[] = [];

  constructor(options: ReActAgentOptions) {
    this.llmClient = options.llmClient;
    this.commandRegistry = options.commandRegistry;
    this.logger = options.logger;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Process user input using ReAct pattern
   */
  async processInput(input: string, context?: Record<string, unknown>): Promise<ReActThought> {
    // Step 1: THINK - Understand the user's intent
    const thought = await this.think(input, context);

    // Step 2: REASON - Determine the best course of action
    const actions = await this.planActions(thought, input);

    // Step 3: PREPARE - Structure the response for confirmation
    return {
      understanding: thought.understanding,
      reasoning: thought.reasoning,
      proposedActions: actions,
      alternatives: await this.suggestAlternatives(thought),
      confidence: thought.confidence
    };
  }

  /**
   * THINK: Understand user intent using LLM
   */
  private async think(
    input: string,
    context?: Record<string, unknown>
  ): Promise<{
    understanding: string;
    reasoning: string;
    intent: string;
    entities: Record<string, unknown>;
    confidence: number;
  }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, context);

    try {
      const response = await this.llmClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: 500
      });

      // Parse LLM response
      const result = this.parseThinkResponse(response.content || response.message.content);

      this.log('info', `Thought process: ${result.understanding}`);

      return result;
    } catch (error) {
      this.log('error', `Failed to think: ${error}`);
      throw new Error(`Failed to understand input: ${error}`);
    }
  }

  /**
   * PLAN: Convert thoughts into concrete actions
   */
  private async planActions(
    thought: any,
    originalInput: string
  ): Promise<ProposedAction[]> {
    const actions: ProposedAction[] = [];

    // Map intent to specific commands
    const commands = this.commandRegistry.findCommandsByIntent(thought.intent);

    if (commands.length === 0) {
      // No direct command match, try to infer from available commands
      const inferredCommands = await this.inferCommands(thought, originalInput);
      commands.push(...inferredCommands);
    }

    // Convert commands to proposed actions
    for (const command of commands) {
      const action: ProposedAction = {
        id: this.generateActionId(),
        description: command.description,
        command: command.id,
        category: command.category,
        parameters: this.extractParameters(command, thought.entities)
      };

      actions.push(action);
    }

    return actions;
  }

  /**
   * Suggest alternative actions
   */
  async suggestAlternatives(thought: any): Promise<string[]> {
    const alternatives: string[] = [];

    // Based on confidence level, suggest alternatives
    if (thought.confidence < 0.7) {
      alternatives.push("Can you provide more specific details?");
      alternatives.push("Would you like to see available commands first?");
    }

    // Based on intent, suggest related actions
    const relatedCommands = this.commandRegistry.getRelatedCommands(thought.intent);
    for (const cmd of relatedCommands.slice(0, 2)) {
      alternatives.push(`Or did you mean: ${cmd.description}?`);
    }

    return alternatives;
  }

  /**
   * Execute approved actions
   */
  async executeActions(actions: ProposedAction[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const action of actions) {
      try {
        const command = this.commandRegistry.getCommand(action.command!);
        if (!command) {
          throw new Error(`Command not found: ${action.command}`);
        }

        // Validate and prepare parameters
        const params = action.parameters || {};

        // Check if command requires parameters that weren't provided
        if (command.parameters) {
          for (const requiredParam of command.parameters.filter(p => p.required)) {
            if (!(requiredParam.name in params)) {
              throw new Error(`Missing required parameter: ${requiredParam.name}. ${requiredParam.description}`);
            }
          }
        }

        this.log('info', `Executing ${action.command} with params:`, JSON.stringify(params));

        const result = await command.execute(params);

        results.push({
          actionId: action.id,
          success: true,
          message: `Successfully executed: ${action.description}`,
          data: result
        });

        this.log('info', `Executed action: ${action.description}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        results.push({
          actionId: action.id,
          success: false,
          message: `Failed to execute: ${action.description}`,
          error: errorMessage
        });

        this.log('error', `Failed to execute action ${action.command}: ${errorMessage}`);
      }
    }

    return results;
  }

  /**
   * Build system prompt for LLM
   */
  private buildSystemPrompt(): string {
    const availableCommands = this.commandRegistry.getAllCommands();

    return `You are an AI assistant for NocturneAI, helping users manage agents, workflows, and tasks.

Your role is to understand user requests and map them to available system commands.

Available commands:
${availableCommands.map(cmd => `- ${cmd.id}: ${cmd.description}`).join('\n')}

For each user request, provide:
1. UNDERSTANDING: What the user wants to achieve
2. REASONING: Why you chose specific commands
3. INTENT: The primary intent (e.g., "create_agent", "run_task", "view_status")
4. ENTITIES: Extracted parameters and values
5. CONFIDENCE: Your confidence level (0-1)

Always be helpful and suggest alternatives when uncertain.
Format your response as JSON.`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(input: string, context?: Record<string, unknown>): string {
    let prompt = `User request: "${input}"`;

    if (context) {
      prompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    // Add recent conversation history
    const recentHistory = this.conversationHistory.slice(-3);
    if (recentHistory.length > 0) {
      prompt += `\n\nRecent conversation:\n`;
      for (const msg of recentHistory) {
        prompt += `${msg.type}: ${msg.content}\n`;
      }
    }

    prompt += `\n\nAnalyze this request and respond with JSON containing: understanding, reasoning, intent, entities, and confidence.`;

    return prompt;
  }

  /**
   * Parse LLM think response
   */
  private parseThinkResponse(response: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: parse structured text
      return {
        understanding: this.extractField(response, 'UNDERSTANDING') || 'Processing request',
        reasoning: this.extractField(response, 'REASONING') || 'Analyzing available options',
        intent: this.extractField(response, 'INTENT') || 'unknown',
        entities: this.extractEntities(response),
        confidence: parseFloat(this.extractField(response, 'CONFIDENCE') || '0.5')
      };
    } catch (error) {
      this.log('warn', `Failed to parse LLM response: ${error}`);

      // Return default structure
      return {
        understanding: 'I understand you want to perform an action',
        reasoning: 'Analyzing your request',
        intent: 'unknown',
        entities: {},
        confidence: 0.5
      };
    }
  }

  /**
   * Extract field from text response
   */
  private extractField(text: string, field: string): string | null {
    const regex = new RegExp(`${field}:?\\s*(.+?)(?:\\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract entities from response
   */
  private extractEntities(text: string): Record<string, unknown> {
    const entities: Record<string, unknown> = {};

    // Extract quoted values
    const quotedValues = text.match(/"([^"]+)"/g);
    if (quotedValues) {
      entities.values = quotedValues.map(v => v.replace(/"/g, ''));
    }

    // Extract numbers
    const numbers = text.match(/\b\d+\b/g);
    if (numbers) {
      entities.numbers = numbers.map(n => parseInt(n, 10));
    }

    // Extract file/folder mentions
    const mentions = text.match(/@(file|folder|agent|workflow):([^\s]+)/g);
    if (mentions) {
      entities.mentions = mentions.map(m => {
        const [type, path] = m.slice(1).split(':');
        return { type, path };
      });
    }

    return entities;
  }

  /**
   * Infer commands when no direct match
   */
  private async inferCommands(thought: any, input: string): Promise<any[]> {
    // Safety checks - prevent errors from undefined/invalid input
    if (!input || typeof input !== 'string') {
      this.log('warn', 'Invalid input passed to inferCommands');
      return [];
    }

    // Use fuzzy matching or semantic similarity
    const allCommands = this.commandRegistry.getAllCommands();
    const scores: Array<{ command: any; score: number }> = [];

    try {
      for (const cmd of allCommands) {
        // Safety check for command object
        if (!cmd || typeof cmd !== 'object') {
          continue;
        }

        // Simple keyword matching (can be enhanced with better NLP)
        const keywords = cmd.keywords || [];
        const description = cmd.description || '';
        const descWords = description.toLowerCase().split(' ');
        const inputWords = input.toLowerCase().split(' ');

        let score = 0;
        for (const word of inputWords) {
          if (keywords.includes(word) || descWords.includes(word)) {
            score += 1;
          }
        }

        if (score > 0) {
          scores.push({ command: cmd, score });
        }
      }

      // Sort by score and return top matches
      scores.sort((a, b) => b.score - a.score);
      return scores.slice(0, 3).map(s => s.command);
    } catch (error) {
      this.log('error', `Error in inferCommands: ${error}`);
      return [];
    }
  }

  /**
   * Extract parameters for a command
   */
  private extractParameters(command: any, entities: Record<string, unknown>): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // Safety check for command and entities
    if (!command || !entities) {
      return params;
    }

    // Map entities to command parameters
    if (command.parameters && Array.isArray(command.parameters)) {
      for (const param of command.parameters) {
        // Safety check for param object
        if (!param || !param.name) {
          continue;
        }

        // Try to find matching entity
        if (entities[param.name]) {
          params[param.name] = entities[param.name];
        } else if (entities.values && Array.isArray(entities.values) && entities.values[0]) {
          // Use first value as fallback
          params[param.name] = entities.values[0];
        }
      }
    }

    return params;
  }

  /**
   * Add message to conversation history
   */
  addToHistory(message: ChatMessage): void {
    this.conversationHistory.push(message);

    // Keep only recent history
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (this.logger) {
      this.logger.log(level, message, { service: 'ReActAgent' });
    }
  }
}