/**
 * AbilityGateway - MCP-inspired unified execution point for all agent abilities
 * Following Elon's 5-Step Algorithm Step 1: "Less Dumb" requirements
 * 
 * This is the central hub that:
 * 1. Registers all atomic abilities (perceive, think, act, reflect, communicate)
 * 2. Handles XP-based access control for gamification
 * 3. Provides unified execution interface (MCP-like protocol)
 * 4. Tracks usage for learning/progression
 */

import type { Agent } from '../types/Agent';
import type { AbilityResult, AtomicAbility, AbilityInput } from '../types/Ability';

export class AbilityGateway {
  private abilities = new Map<string, AtomicAbility>();
  private agents = new Map<string, Agent>();
  private usageHistory: AbilityUsage[] = [];

  /**
   * Register an atomic ability with the gateway
   */
  registerAbility(ability: AtomicAbility): void {
    this.abilities.set(ability.id, ability);
    console.log(`[AbilityGateway] Registered ability: ${ability.id} (${ability.category})`);
  }

  /**
   * Register an agent with the gateway
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    console.log(`[AbilityGateway] Registered agent: ${agent.name} with ${agent.abilities.size} abilities`);
  }

  /**
   * Unified execution point - all abilities go through here
   * MCP-inspired: standardized input/output, error handling, access control
   */
  async call(abilityId: string, input: AbilityInput, agentId: string): Promise<AbilityResult> {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      const ability = this.abilities.get(abilityId);
      const agent = this.agents.get(agentId);
      
      if (!ability) {
        throw new Error(`Ability ${abilityId} not found`);
      }
      
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Check access control (XP-based gamification)
      if (!this.checkAccess(agent, ability)) {
        return {
          success: false,
          error: `Agent ${agent.name} lacks required XP (${ability.requiredXP}) or prerequisites for ${abilityId}`,
          executionTime: 0,
          xpGained: 0
        };
      }

      // Execute the ability
      console.log(`[AbilityGateway] Executing ${abilityId} for ${agent.name}`);
      const result = await ability.execute(input, { 
        agent, 
        gateway: this, 
        timestamp: new Date() 
      });
      
      // Calculate execution metrics
      const executionTime = Date.now() - startTime;
      const xpGained = this.calculateXPGain(ability, result, executionTime);
      
      // Award XP and track usage
      this.awardXP(agent, abilityId, xpGained);
      this.recordUsage(agentId, abilityId, result, executionTime);
      
      console.log(`[AbilityGateway] ${abilityId} completed in ${executionTime}ms, +${xpGained} XP`);
      
      return {
        ...result,
        executionTime,
        xpGained
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`[AbilityGateway] Error executing ${abilityId}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        xpGained: 0
      };
    }
  }

  /**
   * Chain multiple abilities in sequence (for composite abilities)
   */
  async chain(abilityIds: string[], input: AbilityInput, agentId: string): Promise<AbilityResult> {
    let currentInput = input;
    let totalXP = 0;
    let totalTime = 0;
    const results: any[] = [];

    for (const abilityId of abilityIds) {
      const result = await this.call(abilityId, currentInput, agentId);
      
      if (!result.success) {
        return {
          success: false,
          error: `Chain failed at ${abilityId}: ${result.error}`,
          executionTime: totalTime + (result.executionTime || 0),
          xpGained: totalXP,
          chainResults: results
        };
      }
      
      // Use output as input for next ability
      currentInput = { ...currentInput, previousResult: result.output };
      results.push(result.output);
      totalXP += result.xpGained || 0;
      totalTime += result.executionTime || 0;
    }

    return {
      success: true,
      output: results,
      executionTime: totalTime,
      xpGained: totalXP,
      chainResults: results
    };
  }

  /**
   * Check if agent has access to ability (XP + prerequisites)
   */
  private checkAccess(agent: Agent, ability: AtomicAbility): boolean {
    // Check XP requirement
    if (agent.experience < ability.requiredXP) {
      return false;
    }

    // Check prerequisites (must have other abilities)
    for (const prereq of ability.prerequisites) {
      if (!agent.abilities.has(prereq)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate XP gain based on ability complexity and performance
   */
  private calculateXPGain(ability: AtomicAbility, result: AbilityResult, executionTime: number): number {
    if (!result.success) return 0;
    
    // Base XP based on ability complexity
    let baseXP = Math.floor(ability.requiredXP * 0.1);
    
    // Bonus for efficiency (faster execution)
    const efficiencyBonus = executionTime < 1000 ? 2 : 1;
    
    // Bonus for high confidence (if provided)
    const confidenceBonus = (result.confidence || 50) > 80 ? 1.5 : 1;
    
    return Math.floor(baseXP * efficiencyBonus * confidenceBonus);
  }

  /**
   * Award XP to agent and check for ability unlocks
   */
  private awardXP(agent: Agent, abilityId: string, xp: number): void {
    const oldXP = agent.experience;
    agent.experience += xp;
    
    console.log(`[AbilityGateway] ${agent.name}: ${oldXP} → ${agent.experience} XP (+${xp})`);
    
    // Check for new ability unlocks
    this.checkAbilityUnlocks(agent);
  }

  /**
   * Check if agent can unlock new abilities based on current XP
   */
  private checkAbilityUnlocks(agent: Agent): void {
    for (const [abilityId, ability] of this.abilities) {
      if (!agent.abilities.has(abilityId) && this.checkAccess(agent, ability)) {
        agent.abilities.add(abilityId);
        console.log(`🎉 [AbilityGateway] ${agent.name} unlocked new ability: ${abilityId}!`);
        
        // Could emit event here for UI notifications
        // this.eventEmitter.emit('abilityUnlocked', { agent, ability });
      }
    }
  }

  /**
   * Record ability usage for analytics and learning
   */
  private recordUsage(agentId: string, abilityId: string, result: AbilityResult, executionTime: number): void {
    this.usageHistory.push({
      agentId,
      abilityId,
      timestamp: new Date(),
      success: result.success,
      executionTime,
      confidence: result.confidence
    });

    // Keep only recent history (last 1000 uses)
    if (this.usageHistory.length > 1000) {
      this.usageHistory = this.usageHistory.slice(-1000);
    }
  }

  /**
   * Get agent's ability stats for UI display
   */
  getAgentStats(agentId: string): AgentAbilityStats | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const recentUses = this.usageHistory
      .filter(u => u.agentId === agentId)
      .slice(-50);

    return {
      totalXP: agent.experience,
      abilitiesUnlocked: agent.abilities.size,
      totalAbilities: this.abilities.size,
      recentSuccessRate: recentUses.length > 0 
        ? recentUses.filter(u => u.success).length / recentUses.length 
        : 0,
      mostUsedAbility: this.getMostUsedAbility(agentId),
      availableUnlocks: this.getAvailableUnlocks(agent)
    };
  }

  /**
   * Get abilities that agent can unlock next
   */
  private getAvailableUnlocks(agent: Agent): string[] {
    return Array.from(this.abilities.keys())
      .filter(abilityId => !agent.abilities.has(abilityId))
      .filter(abilityId => {
        const ability = this.abilities.get(abilityId)!;
        return agent.experience >= ability.requiredXP * 0.8; // Show "almost unlockable"
      });
  }

  /**
   * Get agent's most used ability
   */
  private getMostUsedAbility(agentId: string): string | null {
    const uses = this.usageHistory
      .filter(u => u.agentId === agentId)
      .reduce((acc, use) => {
        acc[use.abilityId] = (acc[use.abilityId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostUsed = Object.entries(uses)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostUsed?.[0] || null;
  }

  /**
   * Get all registered abilities (for UI display)
   */
  getAllAbilities(): AtomicAbility[] {
    return Array.from(this.abilities.values());
  }

  /**
   * Get gateway statistics
   */
  getGatewayStats(): GatewayStats {
    return {
      totalAbilities: this.abilities.size,
      totalAgents: this.agents.size,
      totalExecutions: this.usageHistory.length,
      averageExecutionTime: this.usageHistory.length > 0
        ? this.usageHistory.reduce((sum, u) => sum + u.executionTime, 0) / this.usageHistory.length
        : 0,
      successRate: this.usageHistory.length > 0
        ? this.usageHistory.filter(u => u.success).length / this.usageHistory.length
        : 0
    };
  }
}

// Types for usage tracking and statistics
interface AbilityUsage {
  agentId: string;
  abilityId: string;
  timestamp: Date;
  success: boolean;
  executionTime: number;
  confidence?: number;
}

interface AgentAbilityStats {
  totalXP: number;
  abilitiesUnlocked: number;
  totalAbilities: number;
  recentSuccessRate: number;
  mostUsedAbility: string | null;
  availableUnlocks: string[];
}

interface GatewayStats {
  totalAbilities: number;
  totalAgents: number;
  totalExecutions: number;
  averageExecutionTime: number;
  successRate: number;
}

// Singleton instance
export const abilityGateway = new AbilityGateway();
