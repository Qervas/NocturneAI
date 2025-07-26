/**
 * Integration bridge between the new Ability System and existing NocturneAI
 * This allows the ability system to be incrementally integrated without breaking existing functionality
 */

import { abilityGateway } from './services/AbilityGateway';
import { PerceiveAbility } from './abilities/PerceiveAbility';
import { ThinkAbility } from './abilities/ThinkAbility';
import { ActAbility } from './abilities/ActAbility';
import { ReflectAbility } from './abilities/ReflectAbility';
import { CommunicateAbility } from './abilities/CommunicateAbility';
import type { Agent } from './types/Agent';
import type { Character } from './types/Character';

export class AbilitySystemBridge {
  private initialized = false;

  /**
   * Initialize the ability system - call this once at app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔌 [AbilitySystemBridge] Initializing ability system...');

    // Register all atomic abilities
    abilityGateway.registerAbility(new PerceiveAbility());
    abilityGateway.registerAbility(new ThinkAbility());
    abilityGateway.registerAbility(new ActAbility());
    abilityGateway.registerAbility(new ReflectAbility());
    abilityGateway.registerAbility(new CommunicateAbility());

    this.initialized = true;
    console.log('✅ [AbilitySystemBridge] Ability system ready');
  }

  /**
   * Convert existing Character to new Agent model
   */
  characterToAgent(character: Character): Agent {
    return {
      id: character.id,
      name: character.name,
      type: character.type === 'user' ? 'human' : 'ai',
      abilities: new Set(['perceive']), // Start with basic ability
      experience: character.experience || 0,
      traits: {
        analyticalLevel: 50, // Default values since Character doesn't have personality
        creativityLevel: 50,
        technicalLevel: 50,
        socialLevel: 50,
        primarySpecialization: 'generalist',
        communicationStyle: 'precise'
      },
      memory: {
        currentContext: [],
        experiences: [],
        skillKnowledge: []
      },
      status: character.status === 'online' ? 'online' : 'offline',
      createdAt: new Date(),
      lastActive: character.lastSeen
    };
  }

  /**
   * Register existing characters as agents in the ability system
   */
  async registerCharacterAsAgent(character: Character): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const agent = this.characterToAgent(character);
    abilityGateway.registerAgent(agent);
    
    console.log(`🤖 [AbilitySystemBridge] Registered ${character.name} as agent`);
  }

  /**
   * Enhanced communication that uses the new ability system
   */
  async enhancedCommunicate(fromCharacterId: string, toCharacterId: string, message: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Use the new communication ability
      const result = await abilityGateway.call('communicate', {
        type: 'send_message',
        data: {
          recipient: toCharacterId,
          content: message,
          intent: 'conversation',
          priority: 'normal'
        }
      }, fromCharacterId);

      if (result.success) {
        console.log(`💬 [AbilitySystemBridge] Enhanced message sent: ${fromCharacterId} → ${toCharacterId}`);
        return {
          success: true,
          messageId: result.output?.messageId,
          enhancedFeatures: {
            deliveryTracking: true,
            readReceipts: result.output?.acknowledgment?.readReceipt,
            routing: result.output?.metadata?.routing
          }
        };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('[AbilitySystemBridge] Enhanced communication failed:', error);
      return { success: false, error: 'Communication ability not available' };
    }
  }

  /**
   * Enable agents to perform research tasks
   */
  async performResearch(agentId: string, query: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Chain perceive → think for research workflow
      const chainResult = await abilityGateway.chain([
        'perceive',
        'think'
      ], {
        type: 'web_search',
        data: { query, maxResults: 5 }
      }, agentId);

      return {
        success: chainResult.success,
        research: chainResult.output?.[0], // Perceive results
        analysis: chainResult.output?.[1], // Think results
        xpGained: chainResult.xpGained
      };
    } catch (error) {
      console.error('[AbilitySystemBridge] Research failed:', error);
      return { success: false, error: 'Research abilities not available' };
    }
  }

  /**
   * Get agent statistics for UI display
   */
  getAgentStats(agentId: string): any {
    if (!this.initialized) return null;
    return abilityGateway.getAgentStats(agentId);
  }

  /**
   * Get overall system statistics
   */
  getSystemStats(): any {
    if (!this.initialized) return null;
    return abilityGateway.getGatewayStats();
  }

  private determineSpecialization(character: Character): Agent['traits']['primarySpecialization'] {
    // Since Character doesn't have personality details, use skills or default to generalist
    if (character.skills?.includes('analysis')) return 'analyst';
    if (character.skills?.includes('creative')) return 'creator';
    if (character.skills?.includes('technical')) return 'technician';
    if (character.skills?.includes('communication')) return 'communicator';
    return 'generalist';
  }
}

// Singleton instance for use throughout the app
export const abilityBridge = new AbilitySystemBridge();
