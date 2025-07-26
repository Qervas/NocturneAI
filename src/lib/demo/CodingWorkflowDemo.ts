/**
 * Coding Workflow Demo - Shows how to use the ability system for actual coding tasks
 * This demonstrates the complete pipeline from idea to implementation
 */

import { abilityBridge } from '../AbilitySystemBridge';
import { abilityGateway } from '../services/AbilityGateway';
import { CodingAbility } from '../abilities/CodingAbility';

export class CodingWorkflowDemo {
  
  /**
   * Initialize and run a complete coding workflow demonstration
   */
  async runCodingDemo(): Promise<void> {
    console.log('🚀 [CodingWorkflowDemo] Starting coding workflow demonstration...');
    
    try {
      // Initialize the ability system
      await abilityBridge.initialize();
      
      // Create a mock agent for the demo
      const mockAgent = {
        id: 'coding-demo-agent',
        name: 'Senior Developer Agent',
        type: 'ai' as const,
        abilities: new Set(['perceive', 'think', 'act', 'reflect']),
        experience: 100, // Give enough XP to access all abilities
        traits: {
          analyticalLevel: 90,
          creativityLevel: 75,
          technicalLevel: 95,
          socialLevel: 60,
          primarySpecialization: 'technician' as const,
          communicationStyle: 'precise' as const
        },
        memory: {
          currentContext: [],
          experiences: [],
          skillKnowledge: []
        },
        status: 'online' as const,
        createdAt: new Date(),
        lastActive: new Date()
      };
      
      // Register the agent
      abilityGateway.registerAgent(mockAgent);
      
      // Register the coding ability
      const codingAbility = new CodingAbility();
      
      console.log('✅ [CodingWorkflowDemo] System initialized, starting coding workflow...');
      
      // Test Case 1: Simple utility function
      await this.testCodingWorkflow(codingAbility, mockAgent, {
        type: 'coding_task',
        data: {},
        task: 'Create a utility function to format currency',
        language: 'typescript',
        requirements: ['support multiple currencies', 'handle decimal places', 'format with commas'],
        constraints: ['type-safe', 'no external dependencies', 'well-documented']
      });
      
      // Test Case 2: Data structure implementation
      await this.testCodingWorkflow(codingAbility, mockAgent, {
        type: 'coding_task',
        data: {},
        task: 'Implement a priority queue data structure',
        language: 'javascript',
        requirements: ['enqueue with priority', 'dequeue highest priority', 'peek functionality'],
        constraints: ['O(log n) insertion', 'O(log n) deletion', 'memory efficient']
      });
      
      // Show final agent stats
      this.showFinalStats(mockAgent.id);
      
    } catch (error) {
      console.error('❌ [CodingWorkflowDemo] Demo failed:', error);
    }
  }
  
  /**
   * Test a complete coding workflow
   */
  private async testCodingWorkflow(codingAbility: CodingAbility, agent: any, taskInput: any): Promise<void> {
    console.log(`\n🔧 [CodingWorkflowDemo] Starting task: ${taskInput.task}`);
    console.log(`📝 Language: ${taskInput.language}`);
    console.log(`📋 Requirements: ${taskInput.requirements?.join(', ')}`);
    
    const startTime = Date.now();
    
    try {
      const result = await codingAbility.execute(taskInput, {
        agent,
        gateway: abilityGateway,
        timestamp: new Date()
      });
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ [CodingWorkflowDemo] Task completed successfully in ${duration}ms`);
        console.log(`📊 Overall confidence: ${result.confidence}%`);
        console.log(`⭐ XP gained: ${result.xpGained}`);
        
        // Show workflow results
        const workflow = result.output?.workflow;
        if (workflow) {
          console.log('\n📋 Workflow Results:');
          console.log('🔍 Research phase:', workflow.research?.mockSearchResults?.length || 0, 'results found');
          console.log('🧠 Planning phase:', workflow.plan?.title || 'Plan generated');
          console.log('⚡ Implementation phase:', workflow.implementation?.result || 'Code executed');
          console.log('🎯 Evaluation phase:', workflow.evaluation?.overallScore || 'No score', '/ 100');
        }
        
        // Show generated code preview
        const code = result.output?.code;
        if (code) {
          console.log('\n💻 Generated Code Preview:');
          console.log(code.substring(0, 300) + (code.length > 300 ? '\n... [truncated]' : ''));
        }
        
        // Show recommendations
        const recommendations = result.output?.summary?.recommendations;
        if (recommendations?.length > 0) {
          console.log('\n💡 Recommendations:');
          recommendations.slice(0, 3).forEach((rec: string, i: number) => {
            console.log(`  ${i + 1}. ${rec}`);
          });
        }
        
      } else {
        console.log(`❌ [CodingWorkflowDemo] Task failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`💥 [CodingWorkflowDemo] Workflow error:`, error);
    }
  }
  
  /**
   * Show final statistics
   */
  private showFinalStats(agentId: string): void {
    console.log('\n📊 [CodingWorkflowDemo] Final Statistics:');
    
    const agentStats = abilityGateway.getAgentStats(agentId);
    if (agentStats) {
      console.log(`🤖 Agent Stats:`, {
        totalXP: agentStats.totalXP,
        abilitiesUnlocked: `${agentStats.abilitiesUnlocked}/${agentStats.totalAbilities}`,
        successRate: `${Math.round(agentStats.recentSuccessRate * 100)}%`,
        mostUsed: agentStats.mostUsedAbility,
        canUnlock: agentStats.availableUnlocks
      });
    }
    
    const systemStats = abilityGateway.getGatewayStats();
    console.log(`🏗️ System Stats:`, {
      totalExecutions: systemStats.totalExecutions,
      successRate: `${Math.round(systemStats.successRate * 100)}%`,
      avgExecutionTime: `${Math.round(systemStats.averageExecutionTime)}ms`
    });
    
    console.log('\n🎉 [CodingWorkflowDemo] Demonstration complete!');
  }
}

/**
 * Export function for easy usage
 */
export async function runCodingWorkflowDemo(): Promise<void> {
  const demo = new CodingWorkflowDemo();
  await demo.runCodingDemo();
}

// Console function for browser testing
if (typeof window !== 'undefined') {
  // Make it available in browser console
  (window as any).runCodingWorkflowDemo = runCodingWorkflowDemo;
  console.log('💡 Run coding workflow demo in console: runCodingWorkflowDemo()');
}
