/**
 * AbilitySystemDemo - Demonstrates the complete ability system
 * This proves the Step 1 prototype works end-to-end
 */

import { abilityGateway } from '../services/AbilityGateway';
import { PerceiveAbility } from '../abilities/PerceiveAbility';
import { ThinkAbility } from '../abilities/ThinkAbility';
import { ActAbility } from '../abilities/ActAbility';
import { ReflectAbility } from '../abilities/ReflectAbility';
import { CommunicateAbility } from '../abilities/CommunicateAbility';
import { CodingAbility } from '../abilities/CodingAbility';
import type { Agent } from '../types/Agent';

export class AbilitySystemDemo {
  private demoAgent: Agent;

  constructor() {
    // Create a demo agent for testing
    this.demoAgent = {
      id: 'demo-agent-001',
      name: 'Demo Agent',
      type: 'ai',
      abilities: new Set(['perceive']), // Start with just perceive
      experience: 0,
      traits: {
        analyticalLevel: 75,
        creativityLevel: 60,
        technicalLevel: 80,
        socialLevel: 65,
        primarySpecialization: 'analyst',
        communicationStyle: 'precise'
      },
      memory: {
        currentContext: [],
        experiences: [],
        skillKnowledge: []
      },
      status: 'online',
      createdAt: new Date(),
      lastActive: new Date()
    };
  }

  /**
   * Initialize the ability system with all atomic abilities
   */
  async initializeSystem(): Promise<void> {
    console.log('🚀 [AbilitySystemDemo] Initializing ability system...');

    // Register all atomic abilities
    abilityGateway.registerAbility(new PerceiveAbility());
    abilityGateway.registerAbility(new ThinkAbility());
    abilityGateway.registerAbility(new ActAbility());
    abilityGateway.registerAbility(new ReflectAbility());
    abilityGateway.registerAbility(new CommunicateAbility());

    // Register the demo agent
    abilityGateway.registerAgent(this.demoAgent);

    console.log('✅ [AbilitySystemDemo] System initialized successfully');
    console.log(`📊 Gateway stats:`, abilityGateway.getGatewayStats());
  }

  /**
   * Demonstrate atomic ability progression
   */
  async demonstrateAtomicProgression(): Promise<void> {
    console.log('\n🧪 [AbilitySystemDemo] Testing atomic ability progression...');

    // Test 1: Use perceive ability (should work - agent starts with it)
    console.log('\n--- Test 1: Perceive Ability ---');
    const perceiveResult = await abilityGateway.call('perceive', {
      type: 'web_search',
      data: {
        query: 'TypeScript best practices',
        maxResults: 3
      }
    }, this.demoAgent.id);
    
    console.log('Perceive result:', perceiveResult.success ? '✅ Success' : '❌ Failed');
    console.log('XP gained:', perceiveResult.xpGained);
    
    // Test 2: Try think ability (might fail due to XP requirements)
    console.log('\n--- Test 2: Think Ability ---');
    const thinkResult = await abilityGateway.call('think', {
      type: 'llm_query',
      data: {
        prompt: 'Explain the benefits of TypeScript',
        model: 'gpt-3.5-turbo'
      }
    }, this.demoAgent.id);
    
    console.log('Think result:', thinkResult.success ? '✅ Success' : '❌ Failed');
    if (!thinkResult.success) {
      console.log('Reason:', thinkResult.error);
    }

    // Test 3: Try act ability (should fail - high XP requirement)
    console.log('\n--- Test 3: Act Ability ---');
    const actResult = await abilityGateway.call('act', {
      type: 'run_code',
      data: {
        code: 'console.log("Hello from demo");',
        language: 'javascript'
      }
    }, this.demoAgent.id);
    
    console.log('Act result:', actResult.success ? '✅ Success' : '❌ Failed');
    if (!actResult.success) {
      console.log('Reason:', actResult.error);
    }

    // Show agent stats after tests
    console.log('\n📈 Agent stats after atomic tests:');
    const stats = abilityGateway.getAgentStats(this.demoAgent.id);
    console.log(stats);
  }

  /**
   * Demonstrate XP farming to unlock abilities
   */
  async demonstrateXPProgression(): Promise<void> {
    console.log('\n⚡ [AbilitySystemDemo] Farming XP to unlock abilities...');

    let attempts = 0;
    const maxAttempts = 10;

    while (this.demoAgent.experience < 50 && attempts < maxAttempts) {
      attempts++;
      console.log(`\nXP farming attempt ${attempts}:`);
      
      // Use perceive ability to gain XP
      const result = await abilityGateway.call('perceive', {
        type: 'web_search',
        data: {
          query: `demo query ${attempts}`,
          maxResults: 2
        }
      }, this.demoAgent.id);
      
      console.log(`XP: ${this.demoAgent.experience} (+${result.xpGained || 0})`);
      console.log(`Unlocked abilities: ${Array.from(this.demoAgent.abilities).join(', ')}`);
    }

    console.log(`\n🎉 Final XP: ${this.demoAgent.experience}`);
    console.log(`🔓 Unlocked abilities: ${Array.from(this.demoAgent.abilities).join(', ')}`);
  }

  /**
   * Demonstrate composite ability (coding workflow)
   */
  async demonstrateCompositeAbility(): Promise<void> {
    console.log('\n🔗 [AbilitySystemDemo] Testing composite ability workflow...');

    // Create and test the CodingAbility
    const codingAbility = new CodingAbility();
    
    // Check if agent has required abilities for coding workflow
    const hasAllRequiredAbilities = codingAbility.atomicAbilities.every(
      abilityId => this.demoAgent.abilities.has(abilityId)
    );
    
    console.log('Has all required abilities:', hasAllRequiredAbilities ? '✅ Yes' : '❌ No');
    console.log('Required:', codingAbility.atomicAbilities);
    console.log('Available:', Array.from(this.demoAgent.abilities));

    if (hasAllRequiredAbilities) {
      const codingResult = await codingAbility.execute({
        type: 'coding_task',
        data: {},
        task: 'create a simple calculator function',
        language: 'typescript',
        requirements: ['add', 'subtract', 'multiply', 'divide'],
        constraints: ['type-safe', 'error-handling']
      }, {
        agent: this.demoAgent,
        gateway: abilityGateway,
        timestamp: new Date()
      });

      console.log('\n🎯 Coding workflow result:', codingResult.success ? '✅ Success' : '❌ Failed');
      if (codingResult.success) {
        console.log('Overall confidence:', codingResult.confidence);
        console.log('Total XP gained:', codingResult.xpGained);
        console.log('Workflow steps completed:', codingResult.metadata?.workflowSteps);
        console.log('Generated code preview:', codingResult.output?.code?.substring(0, 200) + '...');
      } else {
        console.log('Error:', codingResult.error);
      }
    }
  }

  /**
   * Demonstrate communication between agents
   */
  async demonstrateCommunication(): Promise<void> {
    console.log('\n📡 [AbilitySystemDemo] Testing communication abilities...');

    // Test basic messaging
    const messageResult = await abilityGateway.call('communicate', {
      type: 'send_message',
      data: {
        recipient: 'alpha-agent',
        content: 'Hello from demo agent! Testing the communication system.',
        intent: 'greeting',
        priority: 'normal'
      }
    }, this.demoAgent.id);

    console.log('Message result:', messageResult.success ? '✅ Sent' : '❌ Failed');

    // Test broadcasting
    const broadcastResult = await abilityGateway.call('communicate', {
      type: 'broadcast',
      data: {
        content: 'Broadcasting from demo agent - ability system is operational!',
        priority: 'high'
      }
    }, this.demoAgent.id);

    console.log('Broadcast result:', broadcastResult.success ? '✅ Sent' : '❌ Failed');
    if (broadcastResult.success) {
      console.log('Recipients reached:', broadcastResult.output?.summary?.successfulDeliveries);
    }
  }

  /**
   * Run the complete demonstration
   */
  async runDemo(): Promise<void> {
    try {
      await this.initializeSystem();
      await this.demonstrateAtomicProgression();
      await this.demonstrateXPProgression();
      await this.demonstrateCompositeAbility();
      await this.demonstrateCommunication();

      console.log('\n🎊 [AbilitySystemDemo] Demo completed successfully!');
      console.log('\n📊 Final system stats:');
      console.log('Gateway:', abilityGateway.getGatewayStats());
      console.log('Demo Agent:', abilityGateway.getAgentStats(this.demoAgent.id));

    } catch (error) {
      console.error('❌ [AbilitySystemDemo] Demo failed:', error);
    }
  }
}

// Export for potential integration with main app
export async function runAbilitySystemDemo(): Promise<void> {
  const demo = new AbilitySystemDemo();
  await demo.runDemo();
}
