/**
 * Dynamic Agent Service - Frontend integration for Dynamic Agent System
 * Provides complete interface to Dynamic Agent API endpoints
 */

const API_BASE = 'http://localhost:8000/api/dynamic';

export interface DynamicAgent {
  profile: {
    agent_id: string;
    name: string;
    role: string;
    description: string;
    avatar_emoji: string;
    color_theme: string;
    primary_traits: string[];
    skill_categories: string[];
    expertise_areas: string[];
    experience_level: number;
    communication_style: string;
    decision_making_style: string;
    work_style: string;
    autonomy_level: string;
    custom_attributes: Record<string, any>;
    created_at: string;
    created_by: string;
    version: string;
  };
  current_state: {
    energy: number;
    confidence: number;
    sociability: number;
    creativity: number;
    focus: number;
    stress: number;
    last_interaction: string | null;
    interaction_count: number;
    is_active: boolean;
  };
  relationships: Record<string, number>;
  autonomous_goals: string[];
  memory_counts: {
    short_term: number;
    long_term: number;
    episodic: number;
  };
}

export interface AgentCreateRequest {
  name: string;
  role: string;
  description: string;
  avatar_emoji?: string;
  color_theme?: string;
  primary_traits?: string[];
  skill_categories?: string[];
  expertise_areas?: string[];
  experience_level?: number;
  communication_style?: string;
  decision_making_style?: string;
  work_style?: string;
  autonomy_level?: string;
  custom_attributes?: Record<string, any>;
}

export interface AgentUpdateRequest {
  name?: string;
  role?: string;
  description?: string;
  avatar_emoji?: string;
  color_theme?: string;
  primary_traits?: string[];
  skill_categories?: string[];
  expertise_areas?: string[];
  experience_level?: number;
  communication_style?: string;
  decision_making_style?: string;
  work_style?: string;
  autonomy_level?: string;
  custom_attributes?: Record<string, any>;
}

export interface AgentInteractionRequest {
  message: string;
  context?: Record<string, any>;
}

export interface AgentInteractionResponse {
  success: boolean;
  response: string;
  agent_name: string;
  agent_role: string;
  agent_state: any;
  timestamp: string;
}

export interface AgentTemplate {
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
  color_theme: string;
  primary_traits: string[];
  skill_categories: string[];
  expertise_areas: string[];
}

export interface ConfigOption {
  value: string;
  name: string;
}

export interface SystemStatus {
  total_agents: number;
  active_agents: number;
  agent_types: Record<string, number>;
  total_interactions: number;
  system_health: string;
}

export interface InteractionAnalytics {
  total_interactions: number;
  total_agents: number;
  agent_stats: Array<{
    agent_id: string;
    name: string;
    role: string;
    interaction_count: number;
    energy: number;
    confidence: number;
    relationships: number;
    memories: {
      short_term: number;
      long_term: number;
      episodic: number;
    };
  }>;
}

class DynamicAgentService {
  private baseUrl = API_BASE;

  // ===== AGENT LIFECYCLE =====

  /**
   * Get all agents
   */
  async getAllAgents(): Promise<DynamicAgent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.agents : [];
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  /**
   * Get specific agent
   */
  async getAgent(agentId: string): Promise<DynamicAgent | null> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}`);
      
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
      throw error;
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(agentData: AgentCreateRequest): Promise<{
    success: boolean;
    agent?: DynamicAgent;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        message: `Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, updates: AgentUpdateRequest): Promise<{
    success: boolean;
    agent?: DynamicAgent;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error updating agent:', error);
      return {
        success: false,
        message: `Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error deleting agent:', error);
      return {
        success: false,
        message: `Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===== AGENT INTERACTION =====

  /**
   * Interact with a specific agent
   */
  async interactWithAgent(agentId: string, request: AgentInteractionRequest): Promise<AgentInteractionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error interacting with agent:', error);
      throw error;
    }
  }

  /**
   * Get responses from multiple agents (council mode)
   */
  async multiAgentInteraction(request: AgentInteractionRequest): Promise<{
    success: boolean;
    result: {
      synthesis: string;
      individual_responses: Array<{
        agent_name: string;
        agent_role: string;
        response: string;
        confidence: number;
      }>;
      timestamp: string;
      processing_time: number;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/interact/multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error in multi-agent interaction:', error);
      throw error;
    }
  }

  /**
   * Facilitate interaction between two agents
   */
  async facilitateAgentToAgentInteraction(senderId: string, recipientId: string, message: string): Promise<{
    success: boolean;
    response?: string;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/interact/agent-to-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: senderId,
          recipient_id: recipientId,
          message: message
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error facilitating agent-to-agent interaction:', error);
      return {
        success: false,
        message: `Failed to facilitate interaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===== TEMPLATES =====

  /**
   * Get all available agent templates
   */
  async getAgentTemplates(): Promise<Record<string, AgentTemplate>> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.templates : {};
    } catch (error) {
      console.error('Error fetching templates:', error);
      return {};
    }
  }

  /**
   * Create agent from template
   */
  async createAgentFromTemplate(templateName: string, name: string, role: string): Promise<{
    success: boolean;
    agent?: DynamicAgent;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateName}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: templateName,
          name: name,
          role: role
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error creating agent from template:', error);
      return {
        success: false,
        message: `Failed to create agent from template: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===== CONFIGURATION =====

  /**
   * Get personality traits
   */
  async getPersonalityTraits(): Promise<ConfigOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/config/traits`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.traits : [];
    } catch (error) {
      console.error('Error fetching personality traits:', error);
      return [];
    }
  }

  /**
   * Get skill categories
   */
  async getSkillCategories(): Promise<ConfigOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/config/skills`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.skills : [];
    } catch (error) {
      console.error('Error fetching skill categories:', error);
      return [];
    }
  }

  /**
   * Get communication styles
   */
  async getCommunicationStyles(): Promise<ConfigOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/config/communication-styles`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.styles : [];
    } catch (error) {
      console.error('Error fetching communication styles:', error);
      return [];
    }
  }

  /**
   * Get decision making styles
   */
  async getDecisionMakingStyles(): Promise<ConfigOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/config/decision-styles`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.styles : [];
    } catch (error) {
      console.error('Error fetching decision making styles:', error);
      return [];
    }
  }

  /**
   * Get work styles
   */
  async getWorkStyles(): Promise<ConfigOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/config/work-styles`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.styles : [];
    } catch (error) {
      console.error('Error fetching work styles:', error);
      return [];
    }
  }

  /**
   * Get autonomy levels
   */
  async getAutonomyLevels(): Promise<ConfigOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/config/autonomy-levels`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.levels : [];
    } catch (error) {
      console.error('Error fetching autonomy levels:', error);
      return [];
    }
  }

  // ===== SYSTEM =====

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/system/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.status : {
        total_agents: 0,
        active_agents: 0,
        agent_types: {},
        total_interactions: 0,
        system_health: 'unknown'
      };
    } catch (error) {
      console.error('Error fetching system status:', error);
      return {
        total_agents: 0,
        active_agents: 0,
        agent_types: {},
        total_interactions: 0,
        system_health: 'error'
      };
    }
  }

  /**
   * Trigger autonomous behaviors
   */
  async triggerAutonomousBehaviors(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/system/autonomous-run`, {
        method: 'POST',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error triggering autonomous behaviors:', error);
      return {
        success: false,
        message: `Failed to trigger autonomous behaviors: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===== ANALYTICS =====

  /**
   * Get interaction analytics
   */
  async getInteractionAnalytics(): Promise<InteractionAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/interactions`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.analytics : {
        total_interactions: 0,
        total_agents: 0,
        agent_stats: []
      };
    } catch (error) {
      console.error('Error fetching interaction analytics:', error);
      return {
        total_interactions: 0,
        total_agents: 0,
        agent_stats: []
      };
    }
  }

  /**
   * Get agent memories
   */
  async getAgentMemories(agentId: string, memoryType: string = 'all'): Promise<{
    memories: any[];
    counts: {
      short_term: number;
      long_term: number;
      episodic: number;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/memories?memory_type=${memoryType}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? { memories: result.memories, counts: result.counts } : { memories: [], counts: { short_term: 0, long_term: 0, episodic: 0 } };
    } catch (error) {
      console.error('Error fetching agent memories:', error);
      return { memories: [], counts: { short_term: 0, long_term: 0, episodic: 0 } };
    }
  }

  /**
   * Get agent relationships
   */
  async getAgentRelationships(agentId: string): Promise<Array<{
    agent_id: string;
    name: string;
    role: string;
    relationship_strength: number;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/relationships`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success ? result.relationships : [];
    } catch (error) {
      console.error('Error fetching agent relationships:', error);
      return [];
    }
  }
}

// Global instance
export const dynamicAgentService = new DynamicAgentService();
export default dynamicAgentService; 