/**
 * Goal Tracking - Autonomous Goal Management Interface
 * Visual progress tracking, milestone completion, and goal performance analytics
 */

import React, { useState, useEffect } from 'react';
import { autonomousAgentService, AgentGoal } from '../../services/autonomousAgentService';

interface GoalTrackingProps {
  className?: string;
}

interface FilterState {
  agent: string;
  status: string;
  priority: string;
  type: string;
  timeframe: string;
}

interface GoalStats {
  total: number;
  active: number;
  completed: number;
  suspended: number;
  averageProgress: number;
}

export const GoalTracking: React.FC<GoalTrackingProps> = ({ className = '' }) => {
  const [goals, setGoals] = useState<AgentGoal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<AgentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<GoalStats>({
    total: 0,
    active: 0,
    completed: 0,
    suspended: 0,
    averageProgress: 0
  });

  const [filters, setFilters] = useState<FilterState>({
    agent: 'all',
    status: 'all',
    priority: 'all',
    type: 'all',
    timeframe: '30d'
  });

  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [updatingGoal, setUpdatingGoal] = useState<string | null>(null);

  const agents = ['Sarah Chen', 'Marcus Rodriguez', 'Elena Vasquez', 'David Kim'];

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    filterGoals();
  }, [goals, filters]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const result = await autonomousAgentService.getGoals({});
      setGoals(result.goals);
      
      // Calculate stats
      const newStats = {
        total: result.goals.length,
        active: result.goals.filter(g => g.status === 'active').length,
        completed: result.goals.filter(g => g.status === 'completed').length,
        suspended: result.goals.filter(g => g.status === 'suspended' || g.status === 'failed').length,
        averageProgress: result.goals.length > 0 
          ? Math.round(result.goals.reduce((sum, g) => sum + g.progress, 0) / result.goals.length * 100)
          : 0
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const filterGoals = () => {
    let filtered = [...goals];

    // Apply filters
    if (filters.agent !== 'all') {
      filtered = filtered.filter(g => g.agent_name === filters.agent);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(g => g.status === filters.status);
    }
    if (filters.priority !== 'all') {
      filtered = filtered.filter(g => g.priority === filters.priority);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(g => g.goal_type === filters.type);
    }

    // Apply timeframe filter
    if (filters.timeframe !== 'all') {
      const now = new Date();
      const timeLimit = new Date();
      
      switch (filters.timeframe) {
        case '7d':
          timeLimit.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeLimit.setDate(now.getDate() - 30);
          break;
        case '90d':
          timeLimit.setDate(now.getDate() - 90);
          break;
      }
      
      filtered = filtered.filter(g => new Date(g.created_at) >= timeLimit);
    }

    // Sort by priority and progress
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = typeof a.priority === 'string' ? a.priority : 'medium';
      const bPriority = typeof b.priority === 'string' ? b.priority : 'medium';
      
      if (aPriority !== bPriority) {
        return priorityOrder[bPriority as keyof typeof priorityOrder] - priorityOrder[aPriority as keyof typeof priorityOrder];
      }
      
      // Active goals first, then by progress
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      
      return b.progress - a.progress;
    });

    setFilteredGoals(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const completeMilestone = async (goalId: string, milestoneIndex: number) => {
    setUpdatingGoal(goalId);
    try {
      await autonomousAgentService.completeMilestone(goalId, milestoneIndex);
      await loadGoals();
    } catch (error) {
      console.error('Error completing milestone:', error);
    } finally {
      setUpdatingGoal(null);
    }
  };

  const updateGoalProgress = async (goalId: string) => {
    setUpdatingGoal(goalId);
    try {
      await autonomousAgentService.updateGoalProgress(goalId);
      await loadGoals();
    } catch (error) {
      console.error('Error updating goal progress:', error);
    } finally {
      setUpdatingGoal(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'planned': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'suspended': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'failed': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string | number) => {
    const priorityStr = typeof priority === 'string' ? priority : 'medium';
    switch (priorityStr) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
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
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return time.toLocaleDateString();
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goal Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor and manage autonomous agent goals and milestones</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {refreshing ? '🔄' : '↻'} Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Goals</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active Goals</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.suspended}</div>
          <div className="text-sm text-gray-600">Suspended/Failed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.averageProgress}%</div>
          <div className="text-sm text-gray-600">Avg Progress</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
            <select
              value={filters.agent}
              onChange={(e) => handleFilterChange('agent', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
              <option value="suspended">Suspended</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="research">Research</option>
              <option value="development">Development</option>
              <option value="optimization">Optimization</option>
              <option value="analysis">Analysis</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select
              value={filters.timeframe}
              onChange={(e) => handleFilterChange('timeframe', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Goals ({filteredGoals.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredGoals.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
              <p>No goals match your current filter criteria.</p>
            </div>
          ) : (
            filteredGoals.map((goal) => (
              <div key={goal.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* Agent Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${getAgentColor(goal.agent_name || '')}`}>
                    {(goal.agent_name || '').split(' ').map(n => n[0]).join('')}
                  </div>

                  {/* Goal Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{goal.agent_name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(goal.status)}`}>
                          {goal.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(goal.priority)}`}>
                          {typeof goal.priority === 'string' ? goal.priority : 'medium'} priority
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{formatTime(goal.created_at)}</span>
                        {goal.deadline && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-1">{goal.title}</h4>
                      <p className="text-gray-700 text-sm">{goal.description}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(goal.progress * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(goal.progress * 100)}`}
                          style={{ width: `${goal.progress * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Milestones */}
                    {goal.milestones && goal.milestones.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Milestones ({goal.milestones.filter(m => m.completed).length}/{goal.milestones.length})
                        </h5>
                        <div className="space-y-2">
                          {goal.milestones.slice(0, expandedGoal === goal.id ? undefined : 3).map((milestone, index) => (
                            <div key={index} className="flex items-center space-x-3 text-sm">
                              <button
                                onClick={() => !milestone.completed && completeMilestone(goal.id, index)}
                                disabled={milestone.completed || updatingGoal === goal.id}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  milestone.completed 
                                    ? 'bg-green-500 border-green-500 text-white' 
                                    : 'border-gray-300 hover:border-blue-500'
                                } disabled:opacity-50`}
                              >
                                {milestone.completed && '✓'}
                              </button>
                              <span className={`flex-1 ${milestone.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                {milestone.title || `Milestone ${index + 1}`}
                              </span>
                              {milestone.deadline && (
                                <span className="text-xs text-gray-500">
                                  {new Date(milestone.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                          {goal.milestones.length > 3 && (
                            <button
                              onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                              className="text-blue-600 text-sm hover:text-blue-800"
                            >
                              {expandedGoal === goal.id ? 'Show less' : `Show ${goal.milestones.length - 3} more milestones`}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="capitalize">{goal.goal_type}</span>
                        {goal.success_metrics && Object.keys(goal.success_metrics).length > 0 && (
                          <>
                            <span>•</span>
                            <span>{Object.keys(goal.success_metrics).length} metrics</span>
                          </>
                        )}
                      </div>

                      {goal.status === 'active' && (
                        <button
                          onClick={() => updateGoalProgress(goal.id)}
                          disabled={updatingGoal === goal.id}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {updatingGoal === goal.id ? 'Updating...' : '↻ Update Progress'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 