/**
 * Analytics Dashboard - System Performance & Intelligence Metrics
 * Comprehensive analytics for autonomous agent performance and system health
 */

import React, { useState, useEffect } from 'react';
import { dynamicAgentService, DynamicAgent, InteractionAnalytics } from '../../services/dynamicAgentService';

interface AnalyticsDashboardProps {
  className?: string;
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

interface MetricCard {
  title: string;
  value: number | string;
  subtitle: string;
  trend?: number;
  icon: string;
  color: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<InteractionAnalytics | null>(null);
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  const timeRanges: TimeRange[] = [
    { label: 'Last 7 Days', value: '7d', days: 7 },
    { label: 'Last 30 Days', value: '30d', days: 30 },
    { label: 'Last 90 Days', value: '90d', days: 90 },
    { label: 'All Time', value: 'all', days: 0 }
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsResult, agentsResult] = await Promise.all([
        dynamicAgentService.getInteractionAnalytics(),
        dynamicAgentService.getAllAgents()
      ]);
      setAnalytics(analyticsResult);
      setAgents(agentsResult);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const getAgentColor = (agent: DynamicAgent) => {
    const colors = {
      'purple': 'bg-purple-500',
      'blue': 'bg-blue-500',
      'pink': 'bg-pink-500',
      'green': 'bg-green-500',
      'orange': 'bg-orange-500',
      'red': 'bg-red-500'
    };
    return colors[agent.profile.color_theme as keyof typeof colors] || 'bg-gray-500';
  };

  const getMetricCards = (): MetricCard[] => {
    if (!analytics) return [];

    const totalMemories = analytics.agent_stats.reduce((sum, agent) => 
      sum + agent.memories.long_term + agent.memories.episodic, 0
    );

    const avgEnergy = analytics.agent_stats.length > 0 
      ? Math.round(analytics.agent_stats.reduce((sum, agent) => sum + agent.energy, 0) / analytics.agent_stats.length)
      : 0;

    const avgConfidence = analytics.agent_stats.length > 0 
      ? Math.round(analytics.agent_stats.reduce((sum, agent) => sum + agent.confidence, 0) / analytics.agent_stats.length)
      : 0;

    return [
      {
        title: 'Total Interactions',
        value: analytics.total_interactions,
        subtitle: `${analytics.total_agents} agents`,
        trend: 12,
        icon: '💬',
        color: 'blue'
      },
      {
        title: 'Active Agents',
        value: analytics.total_agents,
        subtitle: 'Currently running',
        trend: 5,
        icon: '🤖',
        color: 'green'
      },
      {
        title: 'Average Energy',
        value: `${avgEnergy}%`,
        subtitle: 'Agent energy level',
        trend: 8,
        icon: '⚡',
        color: 'yellow'
      },
      {
        title: 'Average Confidence',
        value: `${avgConfidence}%`,
        subtitle: 'Agent confidence',
        trend: 3,
        icon: '🎯',
        color: 'purple'
      },
      {
        title: 'Total Memories',
        value: totalMemories,
        subtitle: 'Learning insights',
        trend: 15,
        icon: '🧠',
        color: 'indigo'
      },
      {
        title: 'Relationships',
        value: analytics.agent_stats.reduce((sum, agent) => sum + agent.relationships, 0),
        subtitle: 'Agent connections',
        trend: 7,
        icon: '🤝',
        color: 'pink'
      }
    ];
  };

  const getTopAgentsByInteractions = () => {
    if (!analytics) return [];
    
    return analytics.agent_stats
      .sort((a, b) => b.interaction_count - a.interaction_count)
      .slice(0, 5)
      .map(agent => ({
        name: agent.name,
        role: agent.role,
        value: agent.interaction_count,
        percentage: analytics.total_interactions > 0 
          ? Math.round((agent.interaction_count / analytics.total_interactions) * 100)
          : 0
      }));
  };

  const getAgentPerformance = () => {
    if (!analytics) return [];
    
    return analytics.agent_stats.map(agent => ({
      name: agent.name,
      role: agent.role,
      interactions: agent.interaction_count,
      energy: agent.energy,
      confidence: agent.confidence,
      memories: agent.memories.long_term + agent.memories.episodic,
      relationships: agent.relationships
    }));
  };

  const getPerformanceColor = (value: number, type: 'energy' | 'confidence') => {
    if (type === 'energy' || type === 'confidence') {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const getMetricColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
      pink: 'bg-pink-500',
      red: 'bg-red-500'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-500';
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
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive performance metrics and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Time Range:</span>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {refreshing ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getMetricCards().map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full ${getMetricColor(metric.color)} flex items-center justify-center text-white text-xl`}>
                  {metric.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{metric.title}</h3>
                  <p className="text-sm text-gray-600">{metric.subtitle}</p>
                </div>
              </div>
              {metric.trend && (
                <div className="flex items-center space-x-1">
                  <span className="text-green-600 text-sm">↑</span>
                  <span className="text-green-600 text-sm font-medium">{metric.trend}%</span>
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900">{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Agent Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Agent</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Interactions</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Energy</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Confidence</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Memories</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Relationships</th>
              </tr>
            </thead>
            <tbody>
              {getAgentPerformance().map((agent, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full ${getAgentColor(agents.find(a => a.profile.name === agent.name) || agents[0])} flex items-center justify-center text-white text-sm`}>
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-gray-900">{agent.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{agent.role}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{agent.interactions}</td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${getPerformanceColor(agent.energy, 'energy')}`}>
                      {Math.round(agent.energy)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${getPerformanceColor(agent.confidence, 'confidence')}`}>
                      {Math.round(agent.confidence)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{agent.memories}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{agent.relationships}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Agents by Interactions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Top Agents by Interactions</h2>
        <div className="space-y-4">
          {getTopAgentsByInteractions().map((agent, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-600">{agent.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{agent.value}</p>
                    <p className="text-sm text-gray-600">{agent.percentage}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${agent.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Overview */}
      {analytics && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{analytics.total_agents}</div>
              <div className="text-sm text-gray-600">Total Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{analytics.total_interactions}</div>
              <div className="text-sm text-gray-600">Total Interactions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {analytics.agent_stats.reduce((sum, agent) => sum + agent.memories.long_term + agent.memories.episodic, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Memories</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 