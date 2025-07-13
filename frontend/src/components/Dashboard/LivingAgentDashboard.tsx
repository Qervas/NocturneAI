import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  Heart, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Pause,
  Settings,
  MessageCircle,
  TrendingUp,
  Activity,
  RefreshCw,
  Plus
} from 'lucide-react';
import { dynamicAgentService, DynamicAgent } from '../../services/dynamicAgentService';

interface LivingAgentDashboardProps {
  className?: string;
}

interface AgentStatus {
  currentTask: string;
  taskProgress: number;
  recentlyCompleted: string[];
  upcomingTasks: string[];
  mood: 'happy' | 'focused' | 'tired' | 'excited' | 'contemplative';
  energy: number;
  motivation: number;
  social: number;
  learning: number;
}

const LivingAgentDashboard: React.FC<LivingAgentDashboardProps> = ({ className = '' }) => {
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<DynamicAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});

  useEffect(() => {
    loadDashboardData();
    // Update agent statuses every 30 seconds for real-time feel
    const interval = setInterval(updateAgentStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const agentsData = await dynamicAgentService.getAllAgents();
      setAgents(agentsData);
      
      if (agentsData.length > 0 && !selectedAgent) {
        setSelectedAgent(agentsData[0]);
      }

      // Initialize agent statuses
      updateAgentStatuses(agentsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAgentStatuses = (agentList?: DynamicAgent[]) => {
    const currentAgents = agentList || agents;
    const newStatuses: Record<string, AgentStatus> = {};
    
    currentAgents.forEach(agent => {
      newStatuses[agent.profile.agent_id] = generateAgentStatus(agent);
    });
    
    setAgentStatuses(newStatuses);
  };

  const generateAgentStatus = (agent: DynamicAgent): AgentStatus => {
    // Generate realistic status based on agent data
    const tasks = [
      'Analyzing user feedback patterns',
      'Optimizing workflow processes',
      'Researching market trends',
      'Developing strategic recommendations',
      'Creating content frameworks',
      'Building relationship networks'
    ];
    
    const completedTasks = [
      'User interview analysis',
      'Market research summary',
      'Process optimization report',
      'Strategic recommendation draft'
    ];

    const moods: AgentStatus['mood'][] = ['happy', 'focused', 'tired', 'excited', 'contemplative'];
    
    return {
      currentTask: agent.autonomous_goals[0] || tasks[Math.floor(Math.random() * tasks.length)],
      taskProgress: Math.floor(Math.random() * 100),
      recentlyCompleted: completedTasks.slice(0, Math.floor(Math.random() * 3) + 1),
      upcomingTasks: tasks.slice(0, Math.floor(Math.random() * 3) + 2),
      mood: moods[Math.floor(Math.random() * moods.length)],
      energy: Math.round(agent.current_state.energy),
      motivation: Math.round(agent.current_state.confidence),
      social: Math.round(100 - agent.current_state.stress),
      learning: Math.round(agent.current_state.focus)
    };
  };

  const handleAgentSelect = (agent: DynamicAgent) => {
    setSelectedAgent(agent);
  };

  const handleInteraction = async () => {
    if (!selectedAgent) return;
    
    try {
      const response = await dynamicAgentService.interactWithAgent(
        selectedAgent.profile.agent_id,
        { 
          message: 'Quick status check and motivation boost',
          context: { type: 'dashboard_interaction' }
        }
      );
      
      if (response.success) {
        // Refresh agent data after interaction
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error interacting with agent:', error);
    }
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return '😊';
      case 'focused': return '🎯';
      case 'tired': return '😴';
      case 'excited': return '🚀';
      case 'contemplative': return '🤔';
      default: return '😐';
    }
  };

  const getStatusColor = (value: number) => {
    if (value >= 80) return 'text-green-600 bg-green-100';
    if (value >= 60) return 'text-yellow-600 bg-yellow-100';
    if (value >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
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
            <h1 className="text-2xl font-bold text-gray-900">Living Agent Dashboard</h1>
            <p className="text-gray-600">Monitor and interact with your AI agents in real-time</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
            <Brain className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-green-600">
                {agents.filter(a => a.current_state.is_active).length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Interactions</p>
              <p className="text-2xl font-bold text-purple-600">
                {agents.reduce((sum, agent) => sum + agent.current_state.interaction_count, 0)}
              </p>
            </div>
            <MessageCircle className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Energy</p>
              <p className="text-2xl font-bold text-yellow-600">
                {agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.current_state.energy, 0) / agents.length) : 0}%
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Agents</h2>
            
            {agents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No agents found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map(agent => {
                  const status = agentStatuses[agent.profile.agent_id];
                  return (
                    <div
                      key={agent.profile.agent_id}
                      onClick={() => handleAgentSelect(agent)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedAgent?.profile.agent_id === agent.profile.agent_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full ${getAgentColor(agent)} flex items-center justify-center text-white font-bold`}>
                          {agent.profile.avatar_emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{agent.profile.name}</h3>
                          <p className="text-sm text-gray-600">{agent.profile.role}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg">{status ? getMoodIcon(status.mood) : '😐'}</span>
                          <div className={`px-2 py-1 rounded-full text-xs ${agent.current_state.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {agent.current_state.is_active ? 'Active' : 'Idle'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Agent Details */}
        <div className="lg:col-span-2">
          {selectedAgent ? (
            <div className="space-y-6">
              {/* Agent Profile */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-full ${getAgentColor(selectedAgent)} flex items-center justify-center text-white text-2xl`}>
                      {selectedAgent.profile.avatar_emoji}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedAgent.profile.name}</h2>
                      <p className="text-gray-600">{selectedAgent.profile.role}</p>
                      <p className="text-sm text-gray-500">{selectedAgent.profile.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleInteraction}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Interact</span>
                  </button>
                </div>

                {/* Status Bars */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Energy</span>
                      <span>{Math.round(selectedAgent.current_state.energy)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedAgent.current_state.energy}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Confidence</span>
                      <span>{Math.round(selectedAgent.current_state.confidence)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedAgent.current_state.confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Focus</span>
                      <span>{Math.round(selectedAgent.current_state.focus)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedAgent.current_state.focus}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Stress</span>
                      <span>{Math.round(selectedAgent.current_state.stress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedAgent.current_state.stress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Current Status</h3>
                
                {agentStatuses[selectedAgent.profile.agent_id] && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Current Task</h4>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <p className="text-gray-900">{agentStatuses[selectedAgent.profile.agent_id].currentTask}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${agentStatuses[selectedAgent.profile.agent_id].taskProgress}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {agentStatuses[selectedAgent.profile.agent_id].taskProgress}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Recently Completed</h4>
                        <ul className="space-y-1">
                          {agentStatuses[selectedAgent.profile.agent_id].recentlyCompleted.map((task, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Upcoming Tasks</h4>
                        <ul className="space-y-1">
                          {agentStatuses[selectedAgent.profile.agent_id].upcomingTasks.map((task, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Stats */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Agent Statistics</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedAgent.current_state.interaction_count}</div>
                    <div className="text-sm text-gray-600">Interactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedAgent.memory_counts.long_term + selectedAgent.memory_counts.episodic}
                    </div>
                    <div className="text-sm text-gray-600">Memories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(selectedAgent.relationships).length}
                    </div>
                    <div className="text-sm text-gray-600">Relationships</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{selectedAgent.autonomous_goals.length}</div>
                    <div className="text-sm text-gray-600">Goals</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select an agent to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivingAgentDashboard; 