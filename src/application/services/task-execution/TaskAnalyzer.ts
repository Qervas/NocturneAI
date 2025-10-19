/**
 * TaskAnalyzer
 *
 * Analyzes task progress and execution results.
 * Determines if task is complete and suggests next steps.
 *
 * Single Responsibility: Progress analysis and decision-making
 */

import type { CopilotClient } from '../../../infrastructure/llm/CopilotClient.js';
import type { TaskContext, AnalysisResult } from './types.js';

/**
 * Task Analyzer
 *
 * Responsible for analyzing execution progress and making decisions
 * about task completion and next steps.
 */
export class TaskAnalyzer {
  constructor(private llmClient: CopilotClient) {}

  /**
   * Analyze progress and determine what to do next
   *
   * @param context Task context
   * @returns Analysis result with insights and recommendations
   */
  async analyzeProgress(context: TaskContext): Promise<AnalysisResult> {
    // Skip analysis on first iteration (nothing executed yet)
    if (context.executionHistory.length === 0) {
      return {
        insights: [],
        newTodosNeeded: [],
        todosToRemove: [],
        isComplete: false,
        reasoning: 'First iteration, starting execution'
      };
    }

    const recentHistory = context.executionHistory.slice(-3);

    const prompt = `Analyze task progress and determine if we need to adjust our todo list.

Original request: "${context.originalRequest}"

Current todos:
${context.todos.map((t, i) =>
  `${i + 1}. [${t.status}] ${t.description}${t.result ? ` (${t.result})` : ''}`
).join('\n')}

Recent execution history:
${recentHistory.map(h =>
  `- ${h.todo}\n  Results: ${h.results.map(r =>
    r.success ? `✓ ${r.message}` : `✗ ${r.error}`
  ).join(', ')}`
).join('\n')}

Questions:
1. What did we learn from recent executions?
2. Do we need to add new todos based on what we discovered?
3. Can we remove any todos that are no longer needed?

Respond with JSON:
{
  "insights": ["what we learned 1", "what we learned 2"],
  "newTodosNeeded": ["new todo 1", "new todo 2"],
  "todosToRemove": ["todo description to remove"],
  "isComplete": false,
  "reasoning": "why we need these changes"
}`;

    try {
      const response = await this.llmClient.chat({
        messages: [
          { role: 'system', content: 'You are analyzing task progress to update todo list.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        maxTokens: 600
      });

      const content = response.content || response.message?.content || '{}';

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.getDefaultAnalysis();
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        insights: analysis.insights || [],
        newTodosNeeded: analysis.newTodosNeeded || [],
        todosToRemove: analysis.todosToRemove || [],
        isComplete: analysis.isComplete || false,
        reasoning: analysis.reasoning || 'Analysis complete'
      };

    } catch (error) {
      console.error('[TaskAnalyzer] Failed to analyze progress:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Check if task is complete
   *
   * @param context Task context
   * @returns True if task is complete
   */
  async isTaskComplete(context: TaskContext): Promise<boolean> {
    // All todos must be complete
    const allTodosComplete = context.todos.every(t => t.status === 'completed');

    if (!allTodosComplete) {
      return false;
    }

    // Ask LLM to confirm completion
    const prompt = `Verify if this task is truly complete.

Original request: "${context.originalRequest}"

Completed todos:
${context.todos.map((t, i) =>
  `${i + 1}. ${t.description} (${t.result})`
).join('\n')}

Execution history:
${context.executionHistory.slice(-5).map(h =>
  `- ${h.todo}: ${h.results.map(r => r.success ? '✓' : '✗').join(', ')}`
).join('\n')}

Question: Is the original request fully satisfied?

Respond with JSON:
{
  "isComplete": true/false,
  "reasoning": "why it's complete or what's missing"
}`;

    try {
      const response = await this.llmClient.chat({
        messages: [
          { role: 'system', content: 'You verify if tasks are complete.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        maxTokens: 300
      });

      const content = response.content || response.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.isComplete || false;
      }

      return allTodosComplete;

    } catch (error) {
      console.error('[TaskAnalyzer] Failed to check completion:', error);
      // Fallback: if all todos are done, consider it complete
      return allTodosComplete;
    }
  }

  /**
   * Suggest next steps if task is not complete
   *
   * @param context Task context
   * @returns Array of suggested next steps
   */
  async suggestNextSteps(context: TaskContext): Promise<string[]> {
    const incompleteTodos = context.todos.filter(t => t.status !== 'completed');

    if (incompleteTodos.length === 0) {
      return [];
    }

    const prompt = `Suggest next steps for completing this task.

Original request: "${context.originalRequest}"

Pending todos:
${incompleteTodos.map((t, i) =>
  `${i + 1}. ${t.description}`
).join('\n')}

What we've done so far:
${context.executionHistory.slice(-3).map(h =>
  `- ${h.todo}`
).join('\n')}

Question: What should we do next to make progress?

Respond with JSON array of next steps:
["next step 1", "next step 2"]`;

    try {
      const response = await this.llmClient.chat({
        messages: [
          { role: 'system', content: 'You suggest next steps for task completion.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        maxTokens: 300
      });

      const content = response.content || response.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: suggest working on first incomplete todo
      return [incompleteTodos[0].description];

    } catch (error) {
      console.error('[TaskAnalyzer] Failed to suggest next steps:', error);
      return incompleteTodos.length > 0 ? [incompleteTodos[0].description] : [];
    }
  }

  /**
   * Get default analysis when LLM fails
   */
  private getDefaultAnalysis(): AnalysisResult {
    return {
      insights: [],
      newTodosNeeded: [],
      todosToRemove: [],
      isComplete: false,
      reasoning: 'Continue with pending todos'
    };
  }
}
