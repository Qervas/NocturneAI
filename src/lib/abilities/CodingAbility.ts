/**
 * CodingAbility - First composite ability demonstrating ability chaining
 * Combines perceive -> think -> act -> reflect for coding tasks
 * This proves the AbilityGateway concept works for complex workflows
 */

import type { CompositeAbility, AbilityInput, AbilityContext, AbilityResult, AbilityComposition } from '../types/Ability';
import { abilityGateway } from '../services/AbilityGateway';

export class CodingAbility implements CompositeAbility {
  id = 'coding';
  name = 'Coding Assistant';
  description = 'Complete coding workflow: analyze requirements, plan solution, implement code, and reflect on results';
  atomicAbilities = ['perceive', 'think', 'act', 'reflect'];
  requiredXP = 50; // Higher XP for composite abilities
  prerequisites = ['perceive', 'think', 'act', 'reflect'];
  version = '1.0.0';
  tags = ['coding', 'development', 'workflow', 'composite'];

  // Define the composition workflow
  composition: AbilityComposition = {
    type: 'sequence',
    steps: [
      {
        abilityId: 'perceive',
        input: { type: 'web_search', data: { query: '', maxResults: 5 } }
      },
      {
        abilityId: 'think',
        input: { type: 'plan', data: { context: {} } }
      },
      {
        abilityId: 'act',
        input: { type: 'run_code', data: { code: '', language: 'javascript' } }
      },
      {
        abilityId: 'reflect',
        input: { type: 'evaluate', data: { content: {}, criteria: [] } }
      }
    ]
  };

  /**
   * Execute the complete coding workflow through the AbilityGateway
   */
  async execute(input: CodingInput, context: AbilityContext): Promise<AbilityResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[CodingAbility] ${context.agent.name} starting coding workflow: ${input.task}`);
      
      // Phase 1: PERCEIVE - Gather relevant information
      console.log('[CodingAbility] Phase 1: Perceiving requirements and context...');
      const perceiveResult = await abilityGateway.call('perceive', {
        type: 'web_search',
        data: {
          query: `${input.language} ${input.task} best practices examples`,
          maxResults: 5
        }
      }, context.agent.id);
      
      if (!perceiveResult.success) {
        throw new Error(`Perception failed: ${perceiveResult.error}`);
      }

      // Phase 2: THINK - Plan the solution
      console.log('[CodingAbility] Phase 2: Planning solution...');
      const thinkResult = await abilityGateway.call('think', {
        type: 'plan',
        data: {
          context: {
            task: input.task,
            language: input.language,
            requirements: input.requirements,
            research: perceiveResult.output
          }
        }
      }, context.agent.id);
      
      if (!thinkResult.success) {
        throw new Error(`Planning failed: ${thinkResult.error}`);
      }

      // Phase 3: ACT - Implement the solution
      console.log('[CodingAbility] Phase 3: Implementing solution...');
      const actResult = await abilityGateway.call('act', {
        type: 'run_code',
        data: {
          code: this.generateMockCode(input.task, input.language),
          language: input.language,
          timeout: 10000
        }
      }, context.agent.id);
      
      if (!actResult.success) {
        throw new Error(`Implementation failed: ${actResult.error}`);
      }

      // Phase 4: REFLECT - Evaluate the results
      console.log('[CodingAbility] Phase 4: Reflecting on results...');
      const reflectResult = await abilityGateway.call('reflect', {
        type: 'evaluate',
        data: {
          content: {
            task: input.task,
            plan: thinkResult.output,
            implementation: actResult.output
          },
          criteria: ['correctness', 'efficiency', 'readability', 'maintainability']
        }
      }, context.agent.id);
      
      if (!reflectResult.success) {
        throw new Error(`Reflection failed: ${reflectResult.error}`);
      }

      // Compile final result
      const executionTime = Date.now() - startTime;
      const totalXP = (perceiveResult.xpGained || 0) + (thinkResult.xpGained || 0) + 
                     (actResult.xpGained || 0) + (reflectResult.xpGained || 0);

      console.log(`[CodingAbility] Workflow completed in ${executionTime}ms, total XP: ${totalXP}`);

      return {
        success: true,
        output: {
          task: input.task,
          language: input.language,
          workflow: {
            research: perceiveResult.output,
            plan: thinkResult.output,
            implementation: actResult.output,
            evaluation: reflectResult.output
          },
          summary: {
            planQuality: thinkResult.confidence || 0,
            implementationSuccess: actResult.confidence || 0,
            overallScore: reflectResult.output?.overallScore || 0,
            recommendations: reflectResult.output?.recommendations || []
          },
          code: this.generateMockCode(input.task, input.language),
          documentation: this.generateMockDocumentation(input.task, input.language)
        },
        confidence: this.calculateOverallConfidence([perceiveResult, thinkResult, actResult, reflectResult]),
        executionTime,
        xpGained: totalXP,
        metadata: {
          workflowSteps: 4,
          agentId: context.agent.id,
          timestamp: context.timestamp,
          abilities: ['perceive', 'think', 'act', 'reflect']
        },
        chainResults: [
          perceiveResult.output,
          thinkResult.output,
          actResult.output,
          reflectResult.output
        ]
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown coding workflow error',
        executionTime: Date.now() - startTime,
        confidence: 0,
        xpGained: 0
      };
    }
  }

  /**
   * Calculate overall confidence from individual ability results
   */
  private calculateOverallConfidence(results: AbilityResult[]): number {
    const confidences = results
      .filter(r => r.success && r.confidence !== undefined)
      .map(r => r.confidence!);
    
    if (confidences.length === 0) return 0;
    
    // Weight later stages more heavily (implementation and reflection are critical)
    const weights = [1, 1.2, 1.5, 1.3]; // perceive, think, act, reflect
    let weightedSum = 0;
    let totalWeight = 0;
    
    confidences.forEach((confidence, index) => {
      const weight = weights[index] || 1;
      weightedSum += confidence * weight;
      totalWeight += weight;
    });
    
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Generate mock code for demonstration (would be replaced by real LLM generation)
   */
  private generateMockCode(task: string, language: string): string {
    const templates: Record<string, string> = {
      javascript: `
// Mock JavaScript solution for: ${task}
function solveProblem(input) {
  console.log('Processing:', input);
  
  // Mock implementation logic
  const result = input.split('').reverse().join('');
  
  return {
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  };
}

// Example usage
const example = solveProblem('${task}');
console.log('Result:', example);

module.exports = { solveProblem };
      `.trim(),
      
      python: `
# Mock Python solution for: ${task}
def solve_problem(input_data):
    """
    Mock implementation for the given task.
    
    Args:
        input_data: The input to process
        
    Returns:
        dict: Result with success status and processed data
    """
    print(f"Processing: {input_data}")
    
    # Mock implementation logic
    result = input_data[::-1]  # Reverse the string
    
    return {
        'success': True,
        'data': result,
        'timestamp': '2025-07-22T12:00:00Z'
    }

# Example usage
if __name__ == "__main__":
    example = solve_problem("${task}")
    print(f"Result: {example}")
      `.trim(),
      
      typescript: `
// Mock TypeScript solution for: ${task}
interface TaskResult {
  success: boolean;
  data: string;
  timestamp: string;
}

function solveProblem(input: string): TaskResult {
  console.log('Processing:', input);
  
  // Mock implementation logic
  const result = input.split('').reverse().join('');
  
  return {
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  };
}

// Example usage
const example: TaskResult = solveProblem('${task}');
console.log('Result:', example);

export { solveProblem, TaskResult };
      `.trim()
    };
    
    return templates[language.toLowerCase()] || templates.javascript;
  }

  /**
   * Generate mock documentation for the code
   */
  private generateMockDocumentation(task: string, language: string): string {
    return `
# ${task} Solution

## Overview
This is a mock implementation for: ${task}

## Language
${language}

## Features
- Handles input validation
- Provides error handling
- Returns structured results
- Includes example usage

## Usage
See the code comments for implementation details and usage examples.

## Testing
This is a prototype implementation. In a real system, comprehensive tests would be included.

## Notes
Generated by CodingAbility composite workflow using:
1. Perceive: Research best practices
2. Think: Plan the solution
3. Act: Implement the code
4. Reflect: Evaluate the results
    `.trim();
  }
}

// Input interface for the coding ability
export interface CodingInput extends AbilityInput {
  task: string;
  language: string;
  requirements?: string[];
  constraints?: string[];
  examples?: string[];
}
