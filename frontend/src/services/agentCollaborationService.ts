/**
 * Agent Collaboration Service - Step 2 Implementation
 * Handles agent-to-agent communication and collaborative workflows
 */

export interface AgentMessage {
  id: string;
  sender_agent: string;
  sender_role: string;
  target_agent?: string;
  content: string;
  message_type: string;
  timestamp: string;
  references: string[];
  metadata?: Record<string, any>;
}

export interface CollaborationSession {
  id: string;
  type: string;
  topic: string;
  participating_agents: string[];
  initiator_agent: string;
  status: string;
  created_at: string;
  last_activity?: string;
  message_count?: number;
  duration_minutes?: number;
}

export interface CollaborationRequest {
  initiator_agent: string;
  collaboration_type: 'discussion' | 'workflow' | 'brainstorm' | 'consensus' | 'peer_review';
  topic: string;
  target_agents?: string[];
  user_context?: Record<string, any>;
}

export interface AgentResponseRequest {
  collaboration_id: string;
  responding_agent: string;
  response_content: string;
  message_type?: string;
  references?: string[];
}

export interface CollaborationStats {
  active_collaborations: number;
  completed_collaborations: number;
  average_duration_minutes: number;
  collaboration_type_distribution: Record<string, number>;
  total_agents: number;
}

class AgentCollaborationService {
  private baseUrl = 'http://localhost:8000/api/agents/collaboration';

  /**
   * Initiate a new collaboration session between agents
   */
  async initiateCollaboration(request: CollaborationRequest): Promise<{
    collaboration: CollaborationSession;
    initial_messages: AgentMessage[];
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        collaboration: data.collaboration,
        initial_messages: data.initial_messages
      };
    } catch (error) {
      console.error('Failed to initiate collaboration:', error);
      return null;
    }
  }

  /**
   * Send an agent response in a collaboration
   */
  async sendAgentResponse(request: AgentResponseRequest): Promise<{
    message: AgentMessage;
    collaboration_status: CollaborationSession;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        message: data.message,
        collaboration_status: data.collaboration_status
      };
    } catch (error) {
      console.error('Failed to send agent response:', error);
      return null;
    }
  }

  /**
   * Get details of a specific collaboration
   */
  async getCollaboration(collaborationId: string): Promise<{
    collaboration: CollaborationSession;
    messages: AgentMessage[];
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/collaborations/${collaborationId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        collaboration: data.collaboration,
        messages: data.messages
      };
    } catch (error) {
      console.error('Failed to get collaboration:', error);
      return null;
    }
  }

  /**
   * Get all active collaborations
   */
  async getAllCollaborations(): Promise<CollaborationSession[]> {
    try {
      const response = await fetch(`${this.baseUrl}/collaborations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.active_collaborations || [];
    } catch (error) {
      console.error('Failed to get collaborations:', error);
      return [];
    }
  }

  /**
   * Complete a collaboration session
   */
  async completeCollaboration(collaborationId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/collaborations/${collaborationId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Failed to complete collaboration:', error);
      return null;
    }
  }

  /**
   * Get agent relationships and collaboration strengths
   */
  async getAgentRelationships(agentName: string): Promise<{
    relationships: Record<string, number>;
    strongest_collaborators: [string, number][];
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(agentName)}/relationships`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        relationships: data.relationships,
        strongest_collaborators: data.strongest_collaborators
      };
    } catch (error) {
      console.error('Failed to get agent relationships:', error);
      return null;
    }
  }

  /**
   * Get collaboration system statistics
   */
  async getCollaborationStats(): Promise<CollaborationStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Failed to get collaboration stats:', error);
      return null;
    }
  }

  /**
   * Simulate a collaboration for testing/demo purposes
   */
  async simulateCollaboration(
    topic: string = "product strategy discussion",
    collaborationType: string = "discussion",
    agents: string[] = ['Sarah Chen', 'Marcus Rodriguez']
  ): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/test/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          collaboration_type: collaborationType,
          agents
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.simulation;
    } catch (error) {
      console.error('Failed to simulate collaboration:', error);
      return null;
    }
  }

  /**
   * Start a quick discussion between agents on a topic
   */
  async startQuickDiscussion(
    topic: string,
    initiatorAgent: string = 'Sarah Chen',
    targetAgents?: string[]
  ): Promise<string | null> {
    const collaboration = await this.initiateCollaboration({
      initiator_agent: initiatorAgent,
      collaboration_type: 'discussion',
      topic,
      target_agents: targetAgents
    });

    return collaboration?.collaboration.id || null;
  }

  /**
   * Start a brainstorming session
   */
  async startBrainstorming(
    topic: string,
    initiatorAgent: string = 'Sarah Chen'
  ): Promise<string | null> {
    const collaboration = await this.initiateCollaboration({
      initiator_agent: initiatorAgent,
      collaboration_type: 'brainstorm',
      topic
    });

    return collaboration?.collaboration.id || null;
  }

  /**
   * Start a workflow collaboration
   */
  async startWorkflow(
    topic: string,
    initiatorAgent: string = 'David Kim',
    targetAgents?: string[]
  ): Promise<string | null> {
    const collaboration = await this.initiateCollaboration({
      initiator_agent: initiatorAgent,
      collaboration_type: 'workflow',
      topic,
      target_agents: targetAgents
    });

    return collaboration?.collaboration.id || null;
  }

  /**
   * Get collaboration type display information
   */
  getCollaborationTypeInfo(type: string): {
    name: string;
    description: string;
    icon: string;
    color: string;
  } {
    const typeInfo = {
      discussion: {
        name: 'Discussion',
        description: 'Open discussion between agents',
        icon: '💬',
        color: 'bg-blue-600'
      },
      workflow: {
        name: 'Workflow',
        description: 'Sequential collaborative workflow',
        icon: '🔄',
        color: 'bg-green-600'
      },
      brainstorm: {
        name: 'Brainstorm',
        description: 'Creative ideation session',
        icon: '💡',
        color: 'bg-yellow-600'
      },
      consensus: {
        name: 'Consensus',
        description: 'Building agreement on decisions',
        icon: '🤝',
        color: 'bg-purple-600'
      },
      peer_review: {
        name: 'Peer Review',
        description: 'Reviewing and validating work',
        icon: '🔍',
        color: 'bg-red-600'
      }
    };

    return typeInfo[type as keyof typeof typeInfo] || {
      name: 'Unknown',
      description: 'Unknown collaboration type',
      icon: '❓',
      color: 'bg-gray-600'
    };
  }
}

export const agentCollaborationService = new AgentCollaborationService(); 