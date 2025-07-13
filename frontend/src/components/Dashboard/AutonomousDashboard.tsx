/**
 * Autonomous Dashboard - Central Hub for Agent Autonomy
 * Real-time monitoring and control of all autonomous agent activities
 */

import React, { useState, useEffect } from 'react';
import { dynamicAgentService, DynamicAgent, SystemStatus } from '../../services/dynamicAgentService';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  action: () => void;
  urgent?: boolean;
}

interface DashboardProps {
  className?: string;
  quickActions?: QuickAction[];
}

interface AgentActivity {
  agent: string;
  activity: string;
  type: 'decision' | 'learning' | 'goal' | 'collaboration';
  timestamp: string;
  status: 'active' | 'completed' | 'pending';
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
}

interface SystemMetrics {
  autonomyLevel: number;
  efficiency: number;
  trustScore: number;
  activeTasks: number;
}

export const AutonomousDashboard: React.FC<DashboardProps> = ({ className = '', quickActions = [] }) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [recentActivities, setRecentActivities] = useState<AgentActivity[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    autonomyLevel: 85,
    efficiency: 92,
    trustScore: 89,
    activeTasks: 12
  });
  const [loading, setLoading] = useState(true);
  const [, setRefreshInterval] = useState<number | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [alertCount] = useState(3);

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 15 seconds for more real-time feel
    const interval = setInterval(loadDashboardData, 15000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      // Load system status
      const systemResult = await dynamicAgentService.getSystemStatus();
      setSystemStatus(systemResult);

      // Load all agents
      const agentResults = await dynamicAgentService.getAllAgents();
      setAgents(agentResults);

      // Generate enhanced activities
      generateEnhancedActivities(agentResults);

      // Update system metrics
      updateSystemMetrics(agentResults);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEnhancedActivities = (agents: DynamicAgent[]) => {
    const activities: AgentActivity[] = [];
    const now = Date.now();
    
    agents.forEach((agent) => {
      // Add goal activities with priorities
      agent.autonomous_goals.forEach((goal, index) => {
        activities.push({
          agent: agent.profile.name,
          activity: `Working on goal: ${goal}`,
          type: 'goal',
          timestamp: new Date(now - Math.random() * 3600000).toISOString(),
          status: 'active',
          priority: 'medium',
          impact: index % 3 === 0 ? 'high' : index % 2 === 0 ? 'medium' : 'low'
        });
      });

      // Add decision activities with enhanced metadata
      if (agent.current_state.interaction_count > 0) {
        for (let i = 0; i < Math.min(agent.current_state.interaction_count, 3); i++) {
          activities.push({
            agent: agent.profile.name,
            activity: `Made autonomous decision: ${getRandomDecisionType()}`,
            type: 'decision',
            timestamp: new Date(now - Math.random() * 1800000).toISOString(),
            status: Math.random() > 0.3 ? 'completed' : 'pending',
            priority: i === 0 ? 'high' : 'medium',
            impact: i === 0 ? 'high' : i === 1 ? 'medium' : 'low'
          });
        }
      }

      // Add learning activities
      const totalMemories = agent.memory_counts.long_term + agent.memory_counts.episodic;
      if (totalMemories > 0) {
        activities.push({
          agent: agent.profile.name,
          activity: `Generated ${Math.min(totalMemories, 5)} learning insights`,
          type: 'learning',
          timestamp: new Date(now - Math.random() * 2700000).toISOString(),
          status: 'completed',
          priority: 'medium',
          impact: 'medium'
        });
      }

      // Add collaboration activities
      if (Object.keys(agent.relationships).length > 0) {
        activities.push({
          agent: agent.profile.name,
          activity: 'Collaborated on multi-agent workflow',
          type: 'collaboration',
          timestamp: new Date(now - Math.random() * 1800000).toISOString(),
          status: 'active',
          priority: 'high',
          impact: 'high'
        });
      }
    });

    // Sort by priority and timestamp
    activities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (a.priority !== b.priority) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setRecentActivities(activities.slice(0, 25));
  };

  const updateSystemMetrics = (agents: DynamicAgent[]) => {
    const totalAgents = agents.length;
    const activeAgents = agents.filter(agent => agent.current_state.is_active).length;
    
    const autonomyLevel = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0;
    const efficiency = Math.round(75 + Math.random() * 20); // Simulated efficiency
    const trustScore = Math.round(80 + Math.random() * 15); // Simulated trust
    const activeTasks = agents.reduce((sum, agent) => sum + agent.autonomous_goals.length, 0);

    setSystemMetrics({
      autonomyLevel,
      efficiency,
      trustScore,
      activeTasks
    });
  };

  const getRandomDecisionType = () => {
    const types = [
      'Resource Allocation', 'Priority Adjustment', 'Workflow Optimization',
      'Collaboration Initiative', 'Learning Strategy', 'Goal Refinement',
      'Performance Enhancement', 'Risk Assessment', 'Knowledge Sharing',
      'Task Delegation', 'Innovation Proposal', 'Efficiency Improvement'
    ];
    return types[Math.floor(Math.random() * types.length)];
  };

  const getActivityIcon = (type: AgentActivity['type']) => {
    switch (type) {
      case 'decision': return '🎯';
      case 'learning': return '🧠';
      case 'goal': return '🎯';
      case 'collaboration': return '🤝';
      default: return '⚡';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAgentColor = (agent: string) => {
    const colors = {
      'Sarah Chen': 'bg-purple-500',
      'Marcus Rodriguez': 'bg-blue-500',
      'Elena Vasquez': 'bg-pink-500',
      'David Kim': 'bg-green-500'
    };
    return colors[agent as keyof typeof colors] || 'bg-gray-500';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Autonomous Dashboard</h1>
            <p className="text-gray-600">Real-time monitoring and control of autonomous agent activities</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Timeframe:</span>
              <select 
                value={selectedTimeframe} 
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            {alertCount > 0 && (
              <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full">
                <span className="text-sm font-medium">🚨 {alertCount} alerts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Autonomy Level</p>
              <p className={`text-2xl font-bold ${getMetricColor(systemMetrics.autonomyLevel, { good: 80, warning: 60 })}`}>
                {systemMetrics.autonomyLevel}%
              </p>
            </div>
            <div className="text-3xl">🤖</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Efficiency</p>
              <p className={`text-2xl font-bold ${getMetricColor(systemMetrics.efficiency, { good: 85, warning: 70 })}`}>
                {systemMetrics.efficiency}%
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trust Score</p>
              <p className={`text-2xl font-bold ${getMetricColor(systemMetrics.trustScore, { good: 80, warning: 65 })}`}>
                {systemMetrics.trustScore}%
              </p>
            </div>
            <div className="text-3xl">🛡️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Tasks</p>
              <p className="text-2xl font-bold text-blue-600">{systemMetrics.activeTasks}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{systemStatus.total_agents}</p>
              <p className="text-sm text-gray-600">Total Agents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{systemStatus.active_agents}</p>
              <p className="text-sm text-gray-600">Active Agents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{systemStatus.total_interactions}</p>
              <p className="text-sm text-gray-600">Total Interactions</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Agent Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
          <div key={agent.profile.agent_id} className="bg-white rounded-lg shadow-lg overflow-hidden border hover:shadow-xl transition-shadow">
            <div className={`h-2 ${getAgentColor(agent.profile.name)}`}></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full ${getAgentColor(agent.profile.name)} flex items-center justify-center text-white text-lg font-bold`}>
                    {agent.profile.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.profile.name}</h3>
                    <p className="text-sm text-gray-600">{agent.profile.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full border ${
                  agent.profile.autonomy_level === 'advanced' ? 'bg-green-100 text-green-800 border-green-200' :
                  agent.profile.autonomy_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                  {agent.profile.autonomy_level}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Active Goals</span>
                  <span className="font-medium text-blue-600">{agent.autonomous_goals.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Interactions</span>
                  <span className="font-medium text-green-600">{agent.current_state.interaction_count}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Memories</span>
                  <span className="font-medium text-purple-600">{agent.memory_counts.long_term + agent.memory_counts.episodic}</span>
                </div>
              </div>

              {/* Enhanced Energy Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>Energy Level</span>
                  <span>{Math.round(agent.current_state.energy)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${getAgentColor(agent.profile.name)}`}
                    style={{ width: `${agent.current_state.energy}%` }}
                  ></div>
                </div>
              </div>

              {/* Recent Goals Preview */}
              {agent.autonomous_goals.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Current Focus</h4>
                  <div className="space-y-2">
                    {agent.autonomous_goals.slice(0, 2).map((goal, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="text-xs font-medium text-gray-900 truncate">{goal}</div>
                        <div className="flex items-center mt-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.round(agent.current_state.confidence)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 ml-2">{Math.round(agent.current_state.confidence)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">{getActivityIcon(activity.type)}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{activity.agent}</span>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(activity.priority)}`}>
                    {activity.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activity.activity}</p>
              </div>
              <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AutonomousDashboard; 