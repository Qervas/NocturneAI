/**
 * Analytics Dashboard - System Performance & Intelligence Metrics
 * Comprehensive analytics for autonomous agent performance and system health
 */

import React, { useState, useEffect } from 'react';
import { autonomousAgentService, AnalyticsData } from '../../services/autonomousAgentService';

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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  const timeRanges: TimeRange[] = [
    { label: 'Last 7 Days', value: '7d', days: 7 },
    { label: 'Last 30 Days', value: '30d', days: 30 },
    { label: 'Last 90 Days', value: '90d', days: 90 },
    { label: 'All Time', value: 'all', days: 0 }
  ];

  // Agent configuration data for potential future use
  // const agents = [
  //   { name: 'Sarah Chen', color: 'blue' },
  //   { name: 'Marcus Rodriguez', color: 'green' },
  //   { name: 'Elena Vasquez', color: 'purple' },
  //   { name: 'David Kim', color: 'orange' }
  // ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await autonomousAgentService.getAnalytics({ 
        timeRange: selectedTimeRange 
      });
      setAnalytics(result.analytics);
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

  const getAgentColor = (agent: string) => {
    const colors = {
      'Sarah Chen': 'bg-purple-500',
      'Marcus Rodriguez': 'bg-blue-500',
      'Elena Vasquez': 'bg-pink-500',
      'David Kim': 'bg-green-500'
    };
    return colors[agent as keyof typeof colors] || 'bg-gray-500';
  };

  const getMetricCards = (): MetricCard[] => {
    if (!analytics) return [];

    return [
      {
        title: 'Total Decisions',
        value: analytics.decision_metrics.total_decisions,
        subtitle: `${analytics.decision_metrics.executed_decisions} executed`,
        trend: 12,
        icon: '🎯',
        color: 'blue'
      },
      {
        title: 'Approval Rate',
        value: `${Math.round(analytics.decision_metrics.approval_rate * 100)}%`,
        subtitle: 'Decision approval',
        trend: 5,
        icon: '✅',
        color: 'green'
      },
      {
        title: 'Active Goals',
        value: analytics.goal_metrics.active_goals,
        subtitle: `${Math.round(analytics.goal_metrics.completion_rate * 100)}% completed`,
        trend: 8,
        icon: '🚀',
        color: 'purple'
      },
      {
        title: 'Learning Insights',
        value: analytics.learning_metrics.total_insights,
        subtitle: `${analytics.learning_metrics.applied_insights} applied`,
        trend: 15,
        icon: '🧠',
        color: 'orange'
      },
      {
        title: 'Avg Confidence',
        value: `${Math.round(analytics.decision_metrics.average_confidence * 100)}%`,
        subtitle: 'Decision confidence',
        trend: 3,
        icon: '📊',
        color: 'indigo'
      },
      {
        title: 'Goal Progress',
        value: `${Math.round(analytics.goal_metrics.average_progress * 100)}%`,
        subtitle: 'Average completion',
        trend: 7,
        icon: '📈',
        color: 'teal'
      }
    ];
  };

  const getTopDecisionTypes = () => {
    if (!analytics) return [];
    
    const types = Object.entries(analytics.decision_metrics.decision_types)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const total = Object.values(analytics.decision_metrics.decision_types).reduce((sum, count) => sum + count, 0);
    
    return types.map(([type, count]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: Math.round((count / total) * 100)
    }));
  };

  const getAgentPerformance = () => {
    if (!analytics) return [];
    
    return Object.entries(analytics.agent_performance).map(([agent, metrics]) => ({
      agent,
      ...metrics,
      totalActivity: metrics.decisions + metrics.goals + metrics.insights
    })).sort((a, b) => b.totalActivity - a.totalActivity);
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const metricCards = getMetricCards();
  const topDecisionTypes = getTopDecisionTypes();
  const agentPerformance = getAgentPerformance();

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Performance metrics and intelligence insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {refreshing ? '🔄' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">{metric.icon}</div>
              {metric.trend !== undefined && (
                <div className={`flex items-center space-x-1 text-sm ${
                  metric.trend > 0 ? 'text-green-600' : metric.trend < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <span>{metric.trend > 0 ? '↗' : metric.trend < 0 ? '↘' : '→'}</span>
                  <span>{Math.abs(metric.trend)}%</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm font-medium text-gray-700">{metric.title}</div>
              <div className="text-xs text-gray-500">{metric.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decision Types Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Decision Types</h3>
          {topDecisionTypes.length > 0 ? (
            <div className="space-y-4">
              {topDecisionTypes.map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{item.type}</span>
                      <span className="text-gray-500">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>No decision data available</p>
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
          {agentPerformance.length > 0 ? (
            <div className="space-y-4">
              {agentPerformance.map((agent, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${getAgentColor(agent.agent)}`}>
                    {agent.agent.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900">{agent.agent.split(' ')[0]}</span>
                      <span className="text-sm text-gray-500">
                        {agent.totalActivity} total activities
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{agent.decisions}</div>
                        <div className="text-gray-500">Decisions</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{agent.goals}</div>
                        <div className="text-gray-500">Goals</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-purple-600">{agent.insights}</div>
                        <div className="text-gray-500">Insights</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${agent.efficiency}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {agent.efficiency}% efficiency
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">👥</div>
              <p>No agent performance data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision Metrics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision Analytics</h3>
          {analytics && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Decisions</span>
                <span className="font-semibold">{analytics.decision_metrics.total_decisions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Executed</span>
                <span className="font-semibold text-green-600">{analytics.decision_metrics.executed_decisions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="font-semibold text-orange-600">{analytics.decision_metrics.pending_decisions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Approval Rate</span>
                <span className="font-semibold text-blue-600">
                  {Math.round(analytics.decision_metrics.approval_rate * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Confidence</span>
                <span className="font-semibold text-purple-600">
                  {Math.round(analytics.decision_metrics.average_confidence * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Goal Metrics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Analytics</h3>
          {analytics && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Goals</span>
                <span className="font-semibold">{analytics.goal_metrics.total_goals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{analytics.goal_metrics.completed_goals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active</span>
                <span className="font-semibold text-blue-600">{analytics.goal_metrics.active_goals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-semibold text-purple-600">
                  {Math.round(analytics.goal_metrics.completion_rate * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Progress</span>
                <span className="font-semibold text-orange-600">
                  {Math.round(analytics.goal_metrics.average_progress * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Learning Metrics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Analytics</h3>
          {analytics && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Insights</span>
                <span className="font-semibold">{analytics.learning_metrics.total_insights}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Applied</span>
                <span className="font-semibold text-green-600">{analytics.learning_metrics.applied_insights}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Application Rate</span>
                <span className="font-semibold text-blue-600">
                  {analytics.learning_metrics.total_insights > 0 
                    ? Math.round((analytics.learning_metrics.applied_insights / analytics.learning_metrics.total_insights) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Confidence Improvement</span>
                <span className="font-semibold text-purple-600">
                  {Math.round(analytics.learning_metrics.confidence_improvement * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pattern Accuracy</span>
                <span className="font-semibold text-orange-600">
                  {Math.round(analytics.learning_metrics.pattern_recognition_accuracy * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Health Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-2xl">🎯</div>
            <div className="text-sm font-medium text-gray-700">Decision Making</div>
            <div className="text-lg font-bold text-green-600">Excellent</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">🧠</div>
            <div className="text-sm font-medium text-gray-700">Learning System</div>
            <div className="text-lg font-bold text-blue-600">Active</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">🚀</div>
            <div className="text-sm font-medium text-gray-700">Goal Progress</div>
            <div className="text-lg font-bold text-purple-600">On Track</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">⚡</div>
            <div className="text-sm font-medium text-gray-700">Overall Status</div>
            <div className="text-lg font-bold text-green-600">Operational</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 