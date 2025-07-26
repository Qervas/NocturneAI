/**
 * ActAbility - Action execution atomic ability
 * Handles file operations, API calls, task execution, automation
 * Mock implementation for Step 1 prototype
 */

import type { AtomicAbility, AbilityInput, AbilityContext, AbilityResult, ActInput } from '../types/Ability';

export class ActAbility implements AtomicAbility {
  id = 'act';
  name = 'Act';
  category = 'act' as const;
  description = 'Execute actions, modify files, call APIs, and automate tasks';
  requiredXP = 25; // Higher XP required for potentially dangerous operations
  prerequisites = ['think']; // Need to think before acting
  version = '1.0.0';
  tags = ['execution', 'automation', 'files', 'api', 'tasks'];

  async execute(input: ActInput, context: AbilityContext): Promise<AbilityResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[ActAbility] ${context.agent.name} acting: ${input.type}`);
      
      let result: any;
      let confidence = 85; // Generally high confidence for deterministic actions
      let resourcesUsed = 0;

      switch (input.type) {
        case 'write_file':
          result = await this.mockWriteFile(input.data.filePath || '', input.data.content || '');
          resourcesUsed = (input.data.content || '').length;
          break;
          
        case 'send_request':
          result = await this.mockAPICall(input.data.url || '', input.data);
          resourcesUsed = JSON.stringify(input.data).length;
          break;
          
        case 'execute_command':
          result = await this.mockExecuteTask(input.data.command || '', input.data);
          confidence = 75; // Tasks can be unpredictable
          break;
          
        case 'run_code':
          result = await this.mockRunCode(input.data.code || '', input.data);
          confidence = 70; // Code execution can have edge cases
          break;
          
        case 'modify_file':
          result = await this.mockModifyFile(input.data.filePath || '', input.data.content || '');
          resourcesUsed = (input.data.content || '').length;
          break;
          
        default:
          throw new Error(`Unknown act type: ${input.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result,
        confidence,
        executionTime,
        resourcesUsed,
        metadata: {
          type: input.type,
          agentId: context.agent.id,
          timestamp: context.timestamp,
          safetyChecks: true
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown action error',
        executionTime: Date.now() - startTime,
        confidence: 0
      };
    }
  }

  // Mock implementations - replace with real operations later
  private async mockWriteFile(path: string, content: string): Promise<any> {
    await this.delay(200 + Math.random() * 300);
    return { success: true, path, bytesWritten: content.length };
  }

  private async mockAPICall(url: string, data: any): Promise<any> {
    await this.delay(300 + Math.random() * 700);
    return { status: 200, data: { message: 'Mock API response' } };
  }

  private async mockExecuteTask(command: string, data: any): Promise<any> {
    await this.delay(500 + Math.random() * 1500);
    return { command, output: { stdout: 'Mock execution completed', exitCode: 0 } };
  }

  private async mockRunCode(code: string, data: any): Promise<any> {
    await this.delay(400 + Math.random() * 600);
    return { result: 'Mock code execution result', output: 'Console output' };
  }

  private async mockModifyFile(filePath: string, content: string): Promise<any> {
    await this.delay(250 + Math.random() * 400);
    return { success: true, originalPath: filePath, bytesModified: content.length };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
