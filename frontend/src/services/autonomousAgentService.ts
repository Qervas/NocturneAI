/**
 * Autonomous Agent Service - Step 3 Implementation
 * Frontend service for autonomous decision-making, learning, and goal management
 */

const API_BASE = 'http://localhost:8000/api/agents/autonomous';

export interface AutonomousDecision {
  id: string;
  agent_name: string;
  decision_type: string;
  description?: string;
  reasoning: string;
  confidence: number;
  impact_level: 'low' | 'medium' | 'high';
  requires_approval: boolean;
  auto_execute: boolean;
  estimated_duration?: number;
  success_criteria?: string[];
  resource_requirements?: string;
  context_summary?: string;
  status: string;
  executed: boolean;
  executed_at?: string;
  created_at: string;
}

export interface LearningInsight {
  id: string;
  agent_name?: string;
  learning_type: string;
  pattern_identified: string;
  insight: string;
  confidence: number;
  application_suggestion?: string;
  applied: boolean;
  created_at: string;
}

export interface AgentGoal {
  id: string;
  agent_name?: string;
  title: string;
  description: string;
  goal_type: string;
  priority: 'high' | 'medium' | 'low';
  status: 'planned' | 'active' | 'completed' | 'suspended' | 'failed';
  deadline?: string;
  progress: number;
  milestones: Array<{
    title: string;
    completed: boolean;
    description?: string;
    deadline?: string;
  }>;
  success_metrics?: Record<string, any>;
  created_at: string;
  last_updated?: string;
}

export interface AutonomousCapability {
  name: string;
  description: string;
  enabled: boolean;
  trust_required: number;
  risk_level: string;
  auto_execute: boolean;
  resource_cost?: number;
  success_rate?: number;
  usage_count?: number;
  last_used?: string;
}

export interface AgentStatus {
  agent_name: string;
  autonomy_level: string;
  active_goals: number;
  recent_decisions: number;
  learning_insights: number;
  enabled_capabilities: number;
  total_capabilities: number;
  goal_details: Array<{
    title: string;
    progress: number;
    status: string;
    priority: number | string;
  }>;
  capability_details: AutonomousCapability[];
  timestamp: string;
}

export interface SystemStatus {
  system_status: string;
  total_autonomous_decisions: number;
  active_decisions: number;
  learning_insights_generated: number;
  total_agent_goals: number;
  active_operations: number;
  agents_with_autonomy: number;
  system_learning_enabled: boolean;
  autonomous_collaboration_enabled: boolean;
  decision_making_enabled: boolean;
  timestamp: string;
}

export interface AnalyticsData {
  decision_metrics: {
    total_decisions: number;
    executed_decisions: number;
    pending_decisions: number;
    approval_rate: number;
    average_confidence: number;
    decision_types: Record<string, number>;
  };
  goal_metrics: {
    total_goals: number;
    completed_goals: number;
    active_goals: number;
    completion_rate: number;
    average_progress: number;
  };
  learning_metrics: {
    total_insights: number;
    applied_insights: number;
    confidence_improvement: number;
    pattern_recognition_accuracy: number;
  };
  agent_performance: Record<string, {
    decisions: number;
    goals: number;
    insights: number;
    efficiency: number;
  }>;
}

class AutonomousAgentService {
  
  /**
   * Get overall autonomous system status
   */
  async getSystemStatus(): Promise<{ status: SystemStatus; message: string }> {
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

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }

  /**
   * Get status for a specific agent
   */
  async getAgentStatus(agentName: string): Promise<{ status: AgentStatus; message: string }> {
    try {
      // Properly encode agent name for URL
      const encodedAgentName = encodeURIComponent(agentName);
      const response = await fetch(`${API_BASE}/agent/${encodedAgentName}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching agent status:', error);
      throw error;
    }
  }

  /**
   * Trigger autonomous decision-making for an agent
   */
  async triggerAutonomousDecision(
    agentName: string, 
    context: any, 
    triggerEvent?: any
  ): Promise<{ decision?: AutonomousDecision; decisionMade: boolean; message: string }> {
    try {
      const encodedAgentName = encodeURIComponent(agentName);
      const response = await fetch(`${API_BASE}/agent/${encodedAgentName}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          trigger_event: triggerEvent || 'user_interaction',
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error triggering autonomous decision:', error);
      return { decisionMade: false, message: 'Failed to trigger autonomous decision' };
    }
  }

  /**
   * Execute a specific autonomous decision
   */
  async executeDecision(decisionId: string): Promise<{ success: boolean; result: any; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/decisions/${decisionId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error executing decision:', error);
      return { success: false, result: null, message: 'Failed to execute decision' };
    }
  }

  /**
   * Record learning interaction for an agent
   */
  async recordLearning(
    agentName: string, 
    context: any, 
    outcome: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const encodedAgentName = encodeURIComponent(agentName);
      const response = await fetch(`${API_BASE}/agent/${encodedAgentName}/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_name: agentName,
          interaction_context: context,
          outcome_data: outcome,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error recording learning:', error);
      return { success: false, message: 'Failed to record learning interaction' };
    }
  }

  /**
   * Get autonomous decisions with filtering
   */
  async getDecisions(params?: { 
    agent_name?: string; 
    status?: string; 
    impact_level?: string;
    decision_type?: string;
    limit?: number 
  }): Promise<{ decisions: AutonomousDecision[]; totalFound: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.agent_name) queryParams.append('agent_name', params.agent_name);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.impact_level) queryParams.append('impact_level', params.impact_level);
      if (params?.decision_type) queryParams.append('decision_type', params.decision_type);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/decisions?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        decisions: result.decisions || [],
        totalFound: result.totalFound || result.decisions?.length || 0
      };
    } catch (error) {
      console.error('Error fetching decisions:', error);
      return { decisions: [], totalFound: 0 };
    }
  }

  /**
   * Get goals with filtering
   */
  async getGoals(params?: { 
    agent_name?: string; 
    status?: string; 
    priority?: string;
    goal_type?: string;
    limit?: number 
  }): Promise<{ goals: AgentGoal[]; totalGoals: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.agent_name) queryParams.append('agent_name', params.agent_name);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.goal_type) queryParams.append('goal_type', params.goal_type);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/goals?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        goals: result.goals || [],
        totalGoals: result.totalGoals || result.goals?.length || 0
      };
    } catch (error) {
      console.error('Error fetching goals:', error);
      return { goals: [], totalGoals: 0 };
    }
  }

  /**
   * Get learning insights with filtering
   */
  async getLearningInsights(params?: { 
    agent_name?: string; 
    learning_type?: string; 
    limit?: number 
  }): Promise<{ insights: LearningInsight[]; totalInsights: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.agent_name) queryParams.append('agent_name', params.agent_name);
      if (params?.learning_type) queryParams.append('learning_type', params.learning_type);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/learning?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        insights: result.insights || [],
        totalInsights: result.totalInsights || result.insights?.length || 0
      };
    } catch (error) {
      console.error('Error fetching learning insights:', error);
      return { insights: [], totalInsights: 0 };
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(params?: { timeRange?: string }): Promise<{
    analytics: AnalyticsData;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.timeRange) queryParams.append('time_range', params.timeRange);

      const response = await fetch(`${API_BASE}/analytics?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        analytics: {
          decision_metrics: {
            total_decisions: 0,
            executed_decisions: 0,
            pending_decisions: 0,
            approval_rate: 0,
            average_confidence: 0,
            decision_types: {}
          },
          goal_metrics: {
            total_goals: 0,
            completed_goals: 0,
            active_goals: 0,
            completion_rate: 0,
            average_progress: 0
          },
          learning_metrics: {
            total_insights: 0,
            applied_insights: 0,
            confidence_improvement: 0,
            pattern_recognition_accuracy: 0
          },
          agent_performance: {}
        }
      };
    }
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(goalId: string, milestoneIndex: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/goals/${goalId}/milestones/${milestoneIndex}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error completing milestone:', error);
      return { success: false, message: 'Failed to complete milestone' };
    }
  }

  /**
   * Update goal progress automatically
   */
  async updateGoalProgress(goalId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/goals/${goalId}/update-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return { success: false, message: 'Failed to update goal progress' };
    }
  }

  /**
   * Process conversation for autonomous learning and decision-making
   */
  async processConversationForAutonomy(
    agentName: string,
    userMessage: string,
    conversationContext: any,
    recordLearning: boolean = true
  ): Promise<{
    decision?: AutonomousDecision;
    decisionMade: boolean;
    executionResult?: any;
    learningProcessed: boolean;
    message: string;
  }> {
    try {
      // Trigger autonomous decision-making
      const decisionResult = await this.triggerAutonomousDecision(
        agentName, 
        { userMessage, conversationContext }
      );

      let executionResult = null;
      if (decisionResult.decision?.auto_execute) {
        executionResult = await this.executeDecision(decisionResult.decision.id);
      }

      let learningProcessed = false;
      if (recordLearning) {
        const learningResult = await this.recordLearning(
          agentName,
          { userMessage, conversationContext },
          { decisionMade: decisionResult.decisionMade, execution: executionResult }
        );
        learningProcessed = learningResult.success;
      }

      return {
        decision: decisionResult.decision,
        decisionMade: decisionResult.decisionMade,
        executionResult,
        learningProcessed,
        message: 'Conversation processed for autonomy'
      };
    } catch (error) {
      console.error('Error processing conversation for autonomy:', error);
      return {
        decisionMade: false,
        learningProcessed: false,
        message: 'Failed to process conversation for autonomy'
      };
    }
  }
}

export const autonomousAgentService = new AutonomousAgentService(); 