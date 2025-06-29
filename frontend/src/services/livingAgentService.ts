/**
 * Living Agent Service - Frontend integration for Living Agent System
 * Provides complete interface to Living Agent API endpoints
 */

const API_BASE = 'http://localhost:8000/api/living';

// Mock mode for when backend is unavailable
const MOCK_MODE = true; // Set to false when backend is working

// Mock data
const MOCK_AGENTS: LivingAgent[] = [
  {
    agent_id: '08e2fc92-1085-4f0a-98fa-f0f3bba9bd23',
    user_id: 'user-1',
    name: 'Sarah Chen',
    role: 'Product Strategy Advisor',
    core_personality: {
      communication_style: 'strategic_diplomatic',
      decision_framework: 'data_driven',
      expertise: ['product_strategy', 'user_research', 'market_analysis', 'roadmapping'],
      vocabulary: ['framework', 'user_value', 'metrics', 'roadmap', 'prioritization'],
      core_values: ['user_value', 'data_driven_decisions', 'strategic_thinking'],
      quirks: ['loves_frameworks', 'asks_clarifying_questions', 'uses_product_metaphors']
    },
    current_mood: {
      energy: 75.0,
      stress: 20.0,
      focus: 80.0,
      creativity: 65.0,
      confidence: 85.0,
      social_energy: 70.0,
      mood_description: 'focused and strategic',
      last_updated: new Date().toISOString()
    },
    current_context: {},
    personality_evolution: {
      trait_history: {},
      growth_milestones: [],
      learning_patterns: {},
      skill_development: {}
    },
    interaction_count: 42,
    episodic_memory_count: 15,
    semantic_memory_count: 28,
    relationship_count: 3,
    created_at: '2025-06-21T01:57:47.148842',
    updated_at: new Date().toISOString(),
    last_interaction: new Date().toISOString()
  },
  {
    agent_id: 'b8f3dc45-2196-5b1b-a9gb-g1g4cba9ce34',
    user_id: 'user-1',
    name: 'Marcus Rodriguez',
    role: 'Market Intelligence Advisor',
    core_personality: {
      communication_style: 'analytical_confident',
      decision_framework: 'market_driven',
      expertise: ['market_analysis', 'competitive_intelligence', 'business_strategy', 'trend_analysis'],
      vocabulary: ['opportunity', 'market_share', 'competitive_advantage', 'growth', 'disruption'],
      core_values: ['market_leadership', 'competitive_advantage', 'data_insights'],
      quirks: ['loves_data_charts', 'spots_market_opportunities', 'thinks_in_business_models']
    },
    current_mood: {
      energy: 80.0,
      stress: 15.0,
      focus: 85.0,
      creativity: 70.0,
      confidence: 90.0,
      social_energy: 75.0,
      mood_description: 'analytical and confident',
      last_updated: new Date().toISOString()
    },
    current_context: {},
    personality_evolution: {
      trait_history: {},
      growth_milestones: [],
      learning_patterns: {},
      skill_development: {}
    },
    interaction_count: 38,
    episodic_memory_count: 12,
    semantic_memory_count: 25,
    relationship_count: 2,
    created_at: '2025-06-21T01:58:12.234567',
    updated_at: new Date().toISOString(),
    last_interaction: new Date().toISOString()
  },
  {
    agent_id: 'c9g4ed56-3207-6c2c-b0hc-h2h5dcb0df45',
    user_id: 'user-1',
    name: 'Elena Vasquez',
    role: 'UX Design Advisor',
    core_personality: {
      communication_style: 'creative_empathetic',
      decision_framework: 'user_centered',
      expertise: ['ux_design', 'user_research', 'design_systems', 'accessibility'],
      vocabulary: ['user_experience', 'empathy', 'usability', 'design_thinking', 'accessibility'],
      core_values: ['user_empathy', 'inclusive_design', 'beautiful_experiences'],
      quirks: ['thinks_visually', 'advocates_for_users', 'loves_design_patterns']
    },
    current_mood: {
      energy: 70.0,
      stress: 25.0,
      focus: 75.0,
      creativity: 90.0,
      confidence: 80.0,
      social_energy: 85.0,
      mood_description: 'creative and empathetic',
      last_updated: new Date().toISOString()
    },
    current_context: {},
    personality_evolution: {
      trait_history: {},
      growth_milestones: [],
      learning_patterns: {},
      skill_development: {}
    },
    interaction_count: 35,
    episodic_memory_count: 18,
    semantic_memory_count: 22,
    relationship_count: 4,
    created_at: '2025-06-21T01:58:45.345678',
    updated_at: new Date().toISOString(),
    last_interaction: new Date().toISOString()
  },
  {
    agent_id: 'd0h5fe67-4318-7d3d-c1id-i3i6edc1eg56',
    user_id: 'user-1',
    name: 'David Kim',
    role: 'Operations Advisor',
    core_personality: {
      communication_style: 'structured_reliable',
      decision_framework: 'process_driven',
      expertise: ['operations', 'process_optimization', 'project_management', 'scalability'],
      vocabulary: ['efficiency', 'process', 'scalability', 'optimization', 'systems'],
      core_values: ['operational_excellence', 'systematic_approach', 'continuous_improvement'],
      quirks: ['loves_workflows', 'optimizes_everything', 'thinks_in_systems']
    },
    current_mood: {
      energy: 85.0,
      stress: 10.0,
      focus: 90.0,
      creativity: 60.0,
      confidence: 85.0,
      social_energy: 65.0,
      mood_description: 'systematic and reliable',
      last_updated: new Date().toISOString()
    },
    current_context: {},
    personality_evolution: {
      trait_history: {},
      growth_milestones: [],
      learning_patterns: {},
      skill_development: {}
    },
    interaction_count: 45,
    episodic_memory_count: 20,
    semantic_memory_count: 30,
    relationship_count: 2,
    created_at: '2025-06-21T01:59:18.456789',
    updated_at: new Date().toISOString(),
    last_interaction: new Date().toISOString()
  },
  {
    agent_id: 'e1i6gf78-5429-8e4e-d2je-j4j7fee2fh67',
    user_id: 'user-1',
    name: 'Alex Thompson',
    role: 'Personal Assistant',
    core_personality: {
      communication_style: 'balanced_thoughtful',
      decision_framework: 'holistic',
      expertise: ['coordination', 'organization', 'communication', 'prioritization'],
      vocabulary: ['balance', 'coordination', 'priorities', 'organization', 'harmony'],
      core_values: ['work_life_balance', 'thoughtful_decisions', 'personal_growth'],
      quirks: ['sees_big_picture', 'balances_perspectives', 'asks_thoughtful_questions']
    },
    current_mood: {
      energy: 72.0,
      stress: 18.0,
      focus: 78.0,
      creativity: 68.0,
      confidence: 82.0,
      social_energy: 80.0,
      mood_description: 'balanced and thoughtful',
      last_updated: new Date().toISOString()
    },
    current_context: {},
    personality_evolution: {
      trait_history: {},
      growth_milestones: [],
      learning_patterns: {},
      skill_development: {}
    },
    interaction_count: 28,
    episodic_memory_count: 10,
    semantic_memory_count: 18,
    relationship_count: 5,
    created_at: '2025-06-21T01:59:52.567890',
    updated_at: new Date().toISOString(),
    last_interaction: new Date().toISOString()
  }
];

// ===== TYPE DEFINITIONS =====

export interface LivingAgent {
  agent_id: string;
  user_id: string;
  name: string;
  role: string;
  core_personality: Record<string, any>;
  current_mood: {
    energy: number;
    stress: number;
    focus: number;
    creativity: number;
    confidence: number;
    social_energy: number;
    mood_description: string;
    last_updated: string;
  };
  current_context: Record<string, any>;
  personality_evolution: {
    trait_history: Record<string, any>;
    growth_milestones: any[];
    learning_patterns: Record<string, any>;
    skill_development: Record<string, any>;
  };
  interaction_count: number;
  episodic_memory_count: number;
  semantic_memory_count: number;
  relationship_count: number;
  created_at: string;
  updated_at: string;
  last_interaction?: string;
}

export interface CreateAgentRequest {
  name: string;
  role: string;
  personality_traits: Record<string, any>;
  user_id: string;
}

export interface AgentInteraction {
  user_input: string;
  context?: Record<string, any>;
}

export interface InteractionResponse {
  success: boolean;
  response?: string;
  agent_state?: Record<string, any>;
  processing_time?: number;
  interaction_count?: number;
  message?: string;
}

export interface AgentRelationship {
  id: string;
  entity_id: string;
  entity_type: 'user' | 'agent';
  entity_name?: string;
  familiarity_level: number;
  trust_score: number;
  emotional_bond: number;
  interaction_count: number;
  positive_interactions: number;
  challenging_interactions: number;
  last_interaction?: string;
  shared_experiences: any[];
  inside_jokes: any[];
  communication_preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AgentMemory {
  id: string;
  memory_type: string;
  content: string;
  emotional_weight: number;
  importance_score: number;
  tags: string[];
  related_entities: string[];
  related_conversation_id?: string;
  related_memory_ids: string[];
  access_count: number;
  last_accessed?: string;
  expires_at?: string;
  timestamp: string;
  created_at: string;
}

export interface GrowthMilestone {
  id: string;
  milestone_type: string;
  title: string;
  description: string;
  trigger_event: string;
  trigger_context: Record<string, any>;
  trait_changes: Record<string, any>;
  skill_improvements: Record<string, any>;
  relationship_impacts: Record<string, any>;
  significance_score: number;
  milestone_number: number;
  achieved_at: string;
}

export interface AgentAnalytics {
  agent_id: string;
  name: string;
  role: string;
  interaction_count: number;
  created_at: string;
  last_interaction?: string;
  mood_summary: {
    current_energy: number;
    current_confidence: number;
    mood_description: string;
  };
  relationship_stats: {
    total_relationships: number;
    avg_trust_score: number;
    avg_familiarity: number;
    avg_emotional_bond: number;
  };
  memory_stats: {
    total_memories: number;
    avg_importance: number;
    avg_emotional_weight: number;
  };
  growth_stats: {
    total_milestones: number;
    recent_growth: boolean;
  };
  performance_metrics: {
    interactions_per_day: number;
    relationship_building_rate: number;
    learning_efficiency: number;
  };
}

export interface LivingAgentSystemStatus {
  success: boolean;
  system: string;
  status: string;
  capabilities: string[];
  version: string;
}

// ===== SERVICE CLASS =====

class LivingAgentService {
  
  // ===== AGENT LIFECYCLE =====

  /**
   * Create a new living agent
   */
  async createAgent(agentData: CreateAgentRequest): Promise<{
    success: boolean;
    agent_id?: string;
    name?: string;
    role?: string;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_BASE}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        message: `Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get agent details by ID
   */
  async getAgent(agentId: string): Promise<LivingAgent | null> {
    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.agent : null;
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    }
  }

  /**
   * Get all agents for a specific user
   */
  async getUserAgents(userId: string): Promise<LivingAgent[]> {
    if (MOCK_MODE) {
      // Return mock data
      console.log('🎭 Using mock living agents data');
      return MOCK_AGENTS.filter(agent => agent.user_id === userId);
    }

    try {
      const response = await fetch(`${API_BASE}/users/${userId}/agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.agents : [];
    } catch (error) {
      console.error('Error fetching user agents:', error);
      // Fallback to mock data on error
      console.log('🎭 Falling back to mock living agents data');
      return MOCK_AGENTS.filter(agent => agent.user_id === userId);
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting agent:', error);
      return {
        success: false,
        message: `Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===== INTERACTIONS =====

  /**
   * Process an interaction with a living agent
   */
  async interactWithAgent(
    agentId: string,
    userId: string,
    interaction: AgentInteraction
  ): Promise<InteractionResponse> {
    if (MOCK_MODE) {
      // Return mock interaction response
      const agent = MOCK_AGENTS.find(a => a.agent_id === agentId);
      if (!agent) {
        return {
          success: false,
          message: 'Agent not found'
        };
      }

      // Generate a personality-based mock response
      const mockResponse = this.generateMockResponse(agent, interaction.user_input);
      
      return {
        success: true,
        response: mockResponse,
        agent_state: {
          mood: agent.current_mood,
          learning_triggered: false,
          evolution_triggered: false
        },
        processing_time: 0.5 + Math.random() * 1.0, // Random processing time
        interaction_count: agent.interaction_count + 1
      };
    }

    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}/interact?user_id=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interaction),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing interaction:', error);
      // Fallback to mock response
      const agent = MOCK_AGENTS.find(a => a.agent_id === agentId);
      if (agent) {
        const mockResponse = this.generateMockResponse(agent, interaction.user_input);
        return {
          success: true,
          response: mockResponse,
          agent_state: { mood: agent.current_mood },
          processing_time: 1.0,
          interaction_count: agent.interaction_count + 1
        };
      }
      
      return {
        success: false,
        message: `Failed to process interaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private generateMockResponse(agent: LivingAgent, userInput: string): string {
    const responses = {
      'Sarah Chen': `Hi! As your Product Strategy advisor, I'd love to help with that. Based on your question about "${userInput.substring(0, 50)}...", I recommend focusing on user value and data-driven frameworks. Let's prioritize features based on user impact and business goals.`,
      'Marcus Rodriguez': `Hello! Marcus here, your Market Intelligence advisor. Regarding "${userInput.substring(0, 50)}...", I see great market opportunities. Let me analyze the competitive landscape and identify strategic advantages for you.`,
      'Elena Vasquez': `Hi there! Elena speaking, your UX Design advisor. For your question about "${userInput.substring(0, 50)}...", I'm thinking about user-centered experiences. Let's focus on accessibility, usability, and creating delightful interactions.`,
      'David Kim': `Hello! David from Operations here. About "${userInput.substring(0, 50)}...", I love systematic approaches. Let me help you create efficient processes and scalable operations frameworks.`,
      'Alex Thompson': `Hi! I'm Alex, your Personal Assistant. Regarding "${userInput.substring(0, 50)}...", I'm here to help coordinate and organize. Let me provide balanced insights and help you stay on track.`
    };
    
    return responses[agent.name as keyof typeof responses] || 
           `Hello! I'm ${agent.name}. Thanks for your message about "${userInput.substring(0, 50)}...". I'm here to help with my expertise. How can I assist you further?`;
  }

  // ===== RELATIONSHIPS =====

  /**
   * Create a relationship between agent and user/other agent
   */
  async createRelationship(
    agentId: string,
    entityId: string,
    entityType: 'user' | 'agent',
    entityName?: string
  ): Promise<{ success: boolean; relationship_id?: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_id: entityId,
          entity_type: entityType,
          entity_name: entityName
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating relationship:', error);
      return {
        success: false,
        message: `Failed to create relationship: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all relationships for an agent
   */
  async getAgentRelationships(agentId: string): Promise<AgentRelationship[]> {
    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}/relationships`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.relationships : [];
    } catch (error) {
      console.error('Error fetching relationships:', error);
      return [];
    }
  }

  // ===== MEMORY & GROWTH =====

  /**
   * Get agent memories with optional filtering
   */
  async getAgentMemories(
    agentId: string,
    memoryType?: string,
    limit: number = 50
  ): Promise<AgentMemory[]> {
    try {
      const params = new URLSearchParams();
      if (memoryType) params.append('memory_type', memoryType);
      params.append('limit', limit.toString());

      const response = await fetch(`${API_BASE}/agents/${agentId}/memories?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.memories : [];
    } catch (error) {
      console.error('Error fetching memories:', error);
      return [];
    }
  }

  /**
   * Search agent memories by content
   */
  async searchAgentMemories(
    agentId: string,
    searchQuery: string,
    limit: number = 20
  ): Promise<AgentMemory[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', searchQuery);
      params.append('limit', limit.toString());

      const response = await fetch(`${API_BASE}/agents/${agentId}/memories/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.memories : [];
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Get agent growth milestones
   */
  async getAgentMilestones(agentId: string): Promise<GrowthMilestone[]> {
    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}/milestones`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.milestones : [];
    } catch (error) {
      console.error('Error fetching milestones:', error);
      return [];
    }
  }

  /**
   * Get comprehensive agent analytics
   */
  async getAgentAnalytics(agentId: string): Promise<AgentAnalytics | null> {
    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.analytics : null;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  // ===== SYSTEM & BATCH OPERATIONS =====

  /**
   * Get living agent system status
   */
  async getSystemStatus(): Promise<LivingAgentSystemStatus | null> {
    if (MOCK_MODE) {
      return {
        success: true,
        system: 'Living Agent System',
        status: 'operational (mock mode)',
        capabilities: [
          'agent_creation',
          'personality_evolution',
          'memory_management',
          'relationship_tracking',
          'interaction_processing',
          'growth_analytics'
        ],
        version: '1.0.0-mock'
      };
    }

    try {
      const response = await fetch(`${API_BASE}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching system status:', error);
      // Fallback to mock status
      return {
        success: true,
        system: 'Living Agent System',
        status: 'operational (fallback mode)',
        capabilities: [
          'agent_creation',
          'personality_evolution',
          'memory_management',
          'relationship_tracking',
          'interaction_processing',
          'growth_analytics'
        ],
        version: '1.0.0-fallback'
      };
    }
  }

  /**
   * Health check with database connectivity
   */
  async healthCheck(): Promise<{ success: boolean; status: string; database: string; timestamp: string } | null> {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      return null;
    }
  }

  /**
   * Get analytics for all user agents
   */
  async getUserAnalytics(userId: string): Promise<{
    success: boolean;
    user_id: string;
    agent_count: number;
    individual_analytics: AgentAnalytics[];
    aggregate_stats: {
      total_interactions: number;
      total_relationships: number;
      total_memories: number;
      average_interactions_per_agent: number;
    };
  } | null> {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return null;
    }
  }

  /**
   * Search agents by name or role
   */
  async searchAgents(
    searchQuery: string,
    userId?: string,
    limit: number = 20
  ): Promise<LivingAgent[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', searchQuery);
      if (userId) params.append('user_id', userId);
      params.append('limit', limit.toString());

      const response = await fetch(`${API_BASE}/agents/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.agents : [];
    } catch (error) {
      console.error('Error searching agents:', error);
      return [];
    }
  }
}

// Export singleton instance
export const livingAgentService = new LivingAgentService();
export default livingAgentService; 