/**
 * Agent Network Service - Active Mode Integration
 * Handles agent conversation monitoring and proactive participation
 */

export interface ProactiveResponse {
  agent_name: string;
  agent_role: string;
  response_type: 'suggestion' | 'question' | 'expertise' | 'collaboration';
  content: string;
  relevance_score: number;
  reasoning: string;
  triggered_by: string[];
  timestamp: string;
}

export interface AgentMode {
  agent_name: string;
  mode: 'passive' | 'active' | 'autonomous';
}

export interface NetworkStatus {
  monitoring_enabled: boolean;
  agent_modes: Record<string, string>;
  active_conversations: number;
  recent_participations: number;
}

class AgentNetworkService {
  private baseUrl = 'http://localhost:8000/api/agents/network';

  /**
   * Update conversation context and get proactive responses
   */
  async updateConversation(
    channelId: string,
    channelType: string,
    message: {
      sender: string;
      content: string;
      timestamp: string;
    }
  ): Promise<ProactiveResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/conversation/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: channelId,
          channel_type: channelType,
          message: message,
          sender: message.sender,
          content: message.content,
          timestamp: message.timestamp
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.proactive_responses || [];
    } catch (error) {
      console.error('Failed to update conversation:', error);
      return [];
    }
  }

  /**
   * Get pending proactive responses for a channel
   */
  async getProactiveResponses(channelId: string): Promise<ProactiveResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/conversations/${channelId}/responses`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.responses || [];
    } catch (error) {
      console.error('Failed to get proactive responses:', error);
      return [];
    }
  }

  /**
   * Set agent participation mode
   */
  async setAgentMode(agentName: string, mode: 'passive' | 'active' | 'autonomous'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(agentName)}/mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_name: agentName,
          mode: mode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to set agent mode:', error);
      return false;
    }
  }

  /**
   * Get all agent modes
   */
  async getAgentModes(): Promise<Record<string, string>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/modes`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.agent_modes || {};
    } catch (error) {
      console.error('Failed to get agent modes:', error);
      return {};
    }
  }

  /**
   * Get network monitoring status
   */
  async getNetworkStatus(): Promise<NetworkStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.network_status;
    } catch (error) {
      console.error('Failed to get network status:', error);
      return null;
    }
  }

  /**
   * Toggle conversation monitoring
   */
  async toggleMonitoring(enabled: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/monitoring/toggle?enabled=${enabled}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
      return false;
    }
  }

  /**
   * Clear participation history
   */
  async clearHistory(olderThanHours: number = 24): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/history?older_than_hours=${olderThanHours}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to clear history:', error);
      return false;
    }
  }
}

export const agentNetworkService = new AgentNetworkService(); 