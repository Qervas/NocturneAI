/**
 * Goal Tracking - Simplified Agent Goal Management Interface
 * Visual progress tracking and goal management for dynamic agents
 */

import React, { useState, useEffect } from 'react';
import { dynamicAgentService, DynamicAgent } from '../../services/dynamicAgentService';
import { 
  Target, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  User,
  Filter,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface GoalTrackingProps {
  className?: string;
}

interface MockGoal {
  id: string;
  title: string;
  description: string;
  agentId: string;
  agentName: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  targetDate: string;
  category: string;
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate: string;
  }>;
  createdAt: string;
}

interface GoalStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
  averageProgress: number;
}

export const GoalTracking: React.FC<GoalTrackingProps> = ({ className = '' }) => {
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [goals, setGoals] = useState<MockGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState<GoalStats>({
    total: 0,
    active: 0,
    completed: 0,
    paused: 0,
    averageProgress: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const agentsData = await dynamicAgentService.getAllAgents();
      setAgents(agentsData);
      
      // Generate mock goals based on real agents
      const mockGoals: MockGoal[] = agentsData.flatMap((agent, index) => 
        agent.autonomous_goals.map((goal, goalIndex) => ({
          id: `goal-${agent.profile.agent_id}-${goalIndex}`,
          title: goal,
          description: `Agent ${agent.profile.name} is working on: ${goal}`,
          agentId: agent.profile.agent_id,
          agentName: agent.profile.name,
          status: (['active', 'completed', 'paused'] as const)[goalIndex % 3],
          priority: (['low', 'medium', 'high'] as const)[goalIndex % 3],
          progress: Math.floor(Math.random() * 100),
          targetDate: new Date(Date.now() + (goalIndex + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
          category: agent.profile.role,
          milestones: [
            {
              id: `milestone-1-${goalIndex}`,
              title: 'Initial planning',
              completed: true,
              dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: `milestone-2-${goalIndex}`,
              title: 'Implementation phase',
              completed: goalIndex % 2 === 0,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: `milestone-3-${goalIndex}`,
              title: 'Review and completion',
              completed: false,
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }))
      );

      setGoals(mockGoals);
      updateStats(mockGoals);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (goals: MockGoal[]) => {
    const stats = {
      total: goals.length,
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      paused: goals.filter(g => g.status === 'paused').length,
      averageProgress: goals.length > 0 
        ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
        : 0
    };
    setStats(stats);
  };

  const filteredGoals = goals.filter(goal => {
    const matchesAgent = filterAgent === 'all' || goal.agentId === filterAgent;
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus;
    return matchesAgent && matchesStatus;
  });

  const handleMilestoneToggle = (goalId: string, milestoneId: string) => {
    setGoals(prev => 
      prev.map(goal => 
        goal.id === goalId 
          ? {
              ...goal,
              milestones: goal.milestones.map(milestone =>
                milestone.id === milestoneId
                  ? { ...milestone, completed: !milestone.completed }
                  : milestone
              )
            }
          : goal
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
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

  const getAgentColor = (agentId: string) => {
    const agent = agents.find(a => a.profile.agent_id === agentId);
    if (!agent) return 'bg-gray-500';
    
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
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
            <h1 className="text-2xl font-bold text-gray-900">Goal Tracking</h1>
            <p className="text-gray-600">Monitor and manage agent goals and progress</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Goals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Target className="w-8 h-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paused</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.paused}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Progress</p>
              <p className="text-2xl font-bold text-purple-600">{stats.averageProgress}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-wrap items-center space-x-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Agent:</span>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent.profile.agent_id} value={agent.profile.agent_id}>
                  {agent.profile.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Goals</h2>
        
        {filteredGoals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No goals found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map(goal => (
              <div key={goal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(goal.status)}`}>
                        {goal.status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(goal.priority)}`}>
                        {goal.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{goal.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full ${getAgentColor(goal.agentId)} flex items-center justify-center text-white text-xs`}>
                          {goal.agentName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{goal.agentName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {formatTime(goal.targetDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Category: {goal.category}</span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                        <span>Progress</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(goal.progress)}`}
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                    className="px-2 py-1 text-gray-500 hover:text-gray-700 ml-4"
                  >
                    {expandedGoal === goal.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                
                {expandedGoal === goal.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Milestones</h4>
                    <div className="space-y-2">
                      {goal.milestones.map(milestone => (
                        <div key={milestone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={milestone.completed}
                              onChange={() => handleMilestoneToggle(goal.id, milestone.id)}
                              className="rounded"
                            />
                            <span className={`text-sm ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                              {milestone.title}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            Due: {formatTime(milestone.dueDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 