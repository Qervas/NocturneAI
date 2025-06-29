/**
 * Autonomous Dashboard - Central Hub for Agent Autonomy
 * Real-time monitoring and control of all autonomous agent activities
 */

import React, { useState, useEffect } from 'react';
import { autonomousAgentService, SystemStatus, AgentStatus } from '../../services/autonomousAgentService';

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
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
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

  const agents = ['Sarah Chen', 'Marcus Rodriguez', 'Elena Vasquez', 'David Kim'];

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
      const systemResult = await autonomousAgentService.getSystemStatus();
      setSystemStatus(systemResult.status);

      // Load agent statuses
      const agentPromises = agents.map(async (agent) => {
        const result = await autonomousAgentService.getAgentStatus(agent);
        return [agent, result.status] as [string, AgentStatus];
      });
      
      const agentResults = await Promise.all(agentPromises);
      const agentStatusMap = Object.fromEntries(agentResults);
      setAgentStatuses(agentStatusMap);

      // Generate enhanced activities
      generateEnhancedActivities(agentStatusMap);

      // Update system metrics
      updateSystemMetrics(agentStatusMap);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEnhancedActivities = (statuses: Record<string, AgentStatus>) => {
    const activities: AgentActivity[] = [];
    const now = Date.now();
    
    Object.entries(statuses).forEach(([agent, status]) => {
      // Add goal activities with priorities
      status.goal_details.forEach((goal, index) => {
        activities.push({
          agent,
          activity: `${goal.status === 'active' ? 'Working on' : 'Completed'}: ${goal.title}`,
          type: 'goal',
          timestamp: new Date(now - Math.random() * 3600000).toISOString(),
          status: goal.status as any,
          priority: typeof goal.priority === 'string' ? goal.priority as any : 'medium',
          impact: index % 3 === 0 ? 'high' : index % 2 === 0 ? 'medium' : 'low'
        });
      });

      // Add decision activities with enhanced metadata
      if (status.recent_decisions > 0) {
        for (let i = 0; i < Math.min(status.recent_decisions, 3); i++) {
          activities.push({
            agent,
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
      if (status.learning_insights > 0) {
        activities.push({
          agent,
          activity: `Generated ${Math.min(status.learning_insights, 5)} learning insights`,
          type: 'learning',
          timestamp: new Date(now - Math.random() * 2700000).toISOString(),
          status: 'completed',
          priority: 'medium',
          impact: 'medium'
        });
      }

      // Add collaboration activities
      if (Math.random() > 0.6) {
        activities.push({
          agent,
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

  const updateSystemMetrics = (statuses: Record<string, AgentStatus>) => {
    const totalCapabilities = Object.values(statuses).reduce((sum, status) => sum + status.total_capabilities, 0);
    const enabledCapabilities = Object.values(statuses).reduce((sum, status) => sum + status.enabled_capabilities, 0);
    
    const autonomyLevel = Math.round((enabledCapabilities / totalCapabilities) * 100);
    const efficiency = Math.round(75 + Math.random() * 20); // Simulated efficiency
    const trustScore = Math.round(80 + Math.random() * 15); // Simulated trust
    const activeTasks = Object.values(statuses).reduce((sum, status) => sum + status.active_goals, 0);

    setSystemMetrics({
      autonomyLevel,
      efficiency,
      trustScore,
      activeTasks
    });
  };

  const getRandomDecisionType = () => {
    const types = [
      'Market research analysis',
      'Process optimization',
      'Risk mitigation strategy',
      'Opportunity identification',
      'Resource allocation',
      'Performance enhancement'
    ];
    return types[Math.floor(Math.random() * types.length)];
  };

  const getActivityIcon = (type: AgentActivity['type']) => {
    switch (type) {
      case 'decision': return '🎯';
      case 'learning': return '🧠';
      case 'goal': return '🚀';
      case 'collaboration': return '🤝';
      default: return '⚡';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'pending': return 'text-orange-600 bg-orange-100 border-orange-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return time.toLocaleDateString();
  };

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Autonomous Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of your AI council's autonomous activities</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Alert Badge */}
          {alertCount > 0 && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-800 text-sm font-medium">{alertCount} alerts</span>
            </div>
          )}
          
          {/* Timeframe Selector */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Live Status */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live updates</span>
          </div>
          
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Enhanced System Metrics */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900">System Autonomy</h3>
              <div className="text-2xl">🤖</div>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">{systemMetrics.autonomyLevel}%</div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics.autonomyLevel}%` }}
              ></div>
            </div>
            <p className="text-sm text-blue-700 mt-2">Capability utilization</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-900">Efficiency Score</h3>
              <div className="text-2xl">⚡</div>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getMetricColor(systemMetrics.efficiency, { good: 85, warning: 70 })}`}>
              {systemMetrics.efficiency}%
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics.efficiency}%` }}
              ></div>
            </div>
            <p className="text-sm text-green-700 mt-2">Task completion rate</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-900">Trust Score</h3>
              <div className="text-2xl">🛡️</div>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getMetricColor(systemMetrics.trustScore, { good: 80, warning: 60 })}`}>
              {systemMetrics.trustScore}%
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics.trustScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-purple-700 mt-2">Reliability index</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-lg p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-orange-900">Active Tasks</h3>
              <div className="text-2xl">📋</div>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-2">{systemMetrics.activeTasks}</div>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-orange-700">Currently processing</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Section */}
      {quickActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-gray-600 text-sm mt-1">Frequently used actions and system controls</p>
            </div>
            {quickActions.some(a => a.urgent) && (
              <div className="flex items-center space-x-2 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-800 text-sm font-medium">
                  {quickActions.filter(a => a.urgent).length} urgent actions
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={action.action}
                className={`p-4 rounded-lg text-left transition-all duration-200 border-2 hover:shadow-lg ${
                  action.urgent
                    ? 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{action.icon}</span>
                  <span className={`font-medium ${action.urgent ? 'text-red-900' : 'text-gray-900'}`}>
                    {action.label}
                  </span>
                  {action.urgent && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <p className={`text-sm ${action.urgent ? 'text-red-700' : 'text-gray-600'}`}>
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Agent Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {agents.map(agent => {
          const status = agentStatuses[agent];
          if (!status) return null;

          const capabilityPercentage = (status.enabled_capabilities / status.total_capabilities) * 100;
          
          return (
            <div key={agent} className="bg-white rounded-lg shadow-lg overflow-hidden border hover:shadow-xl transition-shadow">
              <div className={`h-2 ${getAgentColor(agent)}`}></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full ${getAgentColor(agent)} flex items-center justify-center text-white text-lg font-bold`}>
                      {agent.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agent.split(' ')[0]}</h3>
                      <p className="text-sm text-gray-600">{agent.split(' ')[1]}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full border ${
                    status.autonomy_level === 'advanced' ? 'bg-green-100 text-green-800 border-green-200' :
                    status.autonomy_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {status.autonomy_level}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Active Goals</span>
                    <span className="font-medium text-blue-600">{status.active_goals}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Recent Decisions</span>
                    <span className="font-medium text-green-600">{status.recent_decisions}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Learning Insights</span>
                    <span className="font-medium text-purple-600">{status.learning_insights}</span>
                  </div>
                </div>

                {/* Enhanced Capability Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>Capabilities Enabled</span>
                    <span>{status.enabled_capabilities}/{status.total_capabilities} ({Math.round(capabilityPercentage)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${getAgentColor(agent)}`}
                      style={{ width: `${capabilityPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Recent Goals Preview */}
                {status.goal_details.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Current Focus</h4>
                    <div className="space-y-2">
                      {status.goal_details.slice(0, 2).map((goal, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                          <div className="text-xs font-medium text-gray-900 truncate">{goal.title}</div>
                          <div className="flex items-center mt-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${goal.progress * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 ml-2">{Math.round(goal.progress * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Recent Activities */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recent Autonomous Activities</h2>
              <p className="text-gray-600 text-sm mt-1">Real-time feed of agent activities and decisions</p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-lg">All</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg">High Priority</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg">Decisions</button>
            </div>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {recentActivities.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-4xl mb-2">🤖</div>
              <p>No recent autonomous activities</p>
              <p className="text-sm">Agents will appear here as they make decisions and complete tasks</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActivities.map((activity, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm ${getAgentColor(activity.agent)}`}>
                      {activity.agent.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{activity.agent}</span>
                        <span className="text-lg">{getActivityIcon(activity.type)}</span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(activity.priority)}`}>
                          {activity.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{activity.activity}</p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span>{formatTime(activity.timestamp)}</span>
                        <span>•</span>
                        <span className="capitalize">{activity.type}</span>
                        <span>•</span>
                        <span className="capitalize">{activity.impact} impact</span>
                      </div>
                    </div>
                    
                    {activity.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          ✓
                        </button>
                        <button className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                          ✗
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutonomousDashboard; 