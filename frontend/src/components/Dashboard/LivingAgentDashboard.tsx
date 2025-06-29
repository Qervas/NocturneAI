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
  Activity
} from 'lucide-react';
import { 
  livingAgentService, 
  LivingAgent, 
  CreateAgentRequest, 
  AgentAnalytics, 
  LivingAgentSystemStatus 
} from '../../services/livingAgentService';

interface LivingAgentDashboardProps {
  userId: string;
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

const LivingAgentDashboard: React.FC<LivingAgentDashboardProps> = ({ userId }) => {
  const [agents, setAgents] = useState<LivingAgent[]>([]);
  const [systemStatus, setSystemStatus] = useState<LivingAgentSystemStatus | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<LivingAgent | null>(null);
  const [agentAnalytics, setAgentAnalytics] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [createForm, setCreateForm] = useState<CreateAgentRequest>({
    name: '',
    role: '',
    personality_traits: {},
    user_id: userId
  });

  useEffect(() => {
    loadDashboardData();
    // Update agent statuses every 30 seconds for real-time feel
    const interval = setInterval(updateAgentStatuses, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [agentsData, statusData] = await Promise.all([
        livingAgentService.getUserAgents(userId),
        livingAgentService.getSystemStatus()
      ]);
      
      setAgents(agentsData);
      setSystemStatus(statusData);
      
      if (agentsData.length > 0 && !selectedAgent) {
        setSelectedAgent(agentsData[0]);
        loadAgentAnalytics(agentsData[0].agent_id);
      }

      // Initialize agent statuses
      updateAgentStatuses(agentsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAgentStatuses = (agentList?: LivingAgent[]) => {
    const currentAgents = agentList || agents;
    const newStatuses: Record<string, AgentStatus> = {};

    currentAgents.forEach(agent => {
      // Generate realistic status for each agent
      newStatuses[agent.agent_id] = generateAgentStatus(agent);
    });

    setAgentStatuses(newStatuses);
  };

  const generateAgentStatus = (agent: LivingAgent): AgentStatus => {
    const tasks = {
      'Sarah Chen': {
        current: ['Analyzing market trends', 'Reviewing product roadmap', 'Preparing strategy presentation'],
        completed: ['Market research report', 'Competitor analysis', 'User feedback synthesis'],
        upcoming: ['Quarterly planning', 'Feature prioritization', 'Stakeholder meeting']
      },
      'Marcus Rodriguez': {
        current: ['Processing market data', 'Generating insights report', 'Analyzing competitor moves'],
        completed: ['Weekly market scan', 'Trend identification', 'Risk assessment'],
        upcoming: ['Market forecast', 'Investment analysis', 'Industry report']
      },
      'Elena Vasquez': {
        current: ['Designing user interface', 'Creating wireframes', 'User experience research'],
        completed: ['Usability testing', 'Design system update', 'Prototype review'],
        upcoming: ['Design sprint', 'User interviews', 'Accessibility audit']
      },
      'David Kim': {
        current: ['Optimizing workflows', 'System monitoring', 'Process documentation'],
        completed: ['Performance review', 'System upgrade', 'Automation setup'],
        upcoming: ['Efficiency analysis', 'Team training', 'Infrastructure planning']
      },
      'Alex Thompson': {
        current: ['Coordinating tasks', 'Managing schedules', 'Organizing meetings'],
        completed: ['Daily standup', 'Progress tracking', 'Communication sync'],
        upcoming: ['Weekly planning', 'Goal alignment', 'Resource allocation']
      }
    };

    const agentTasks = tasks[agent.name as keyof typeof tasks] || tasks['Alex Thompson'];
    const currentTaskIndex = Math.floor(Math.random() * agentTasks.current.length);
    
    return {
      currentTask: agentTasks.current[currentTaskIndex],
      taskProgress: Math.floor(Math.random() * 100),
      recentlyCompleted: agentTasks.completed.slice(0, 2),
      upcomingTasks: agentTasks.upcoming.slice(0, 2),
      mood: ['happy', 'focused', 'excited', 'contemplative'][Math.floor(Math.random() * 4)] as any,
      energy: 70 + Math.floor(Math.random() * 30),
      motivation: 75 + Math.floor(Math.random() * 25),
      social: 60 + Math.floor(Math.random() * 40),
      learning: 80 + Math.floor(Math.random() * 20)
    };
  };

  const loadAgentAnalytics = async (agentId: string) => {
    try {
      const analytics = await livingAgentService.getAgentAnalytics(agentId);
      setAgentAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load agent analytics:', error);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await livingAgentService.createAgent(createForm);
      if (result.success) {
        setShowCreateForm(false);
        setCreateForm({
          name: '',
          role: '',
          personality_traits: {},
          user_id: userId
        });
        loadDashboardData();
      } else {
        alert(`Failed to create agent: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent');
    }
  };

  const handleAgentSelect = (agent: LivingAgent) => {
    setSelectedAgent(agent);
    loadAgentAnalytics(agent.agent_id);
  };

  const handleInteraction = async () => {
    if (!selectedAgent) return;
    
    const userInput = prompt('Enter your message to the agent:');
    if (!userInput) return;

    try {
      const result = await livingAgentService.interactWithAgent(
        selectedAgent.agent_id,
        userId,
        { user_input: userInput }
      );
      
      if (result.success) {
        alert(`Agent Response: ${result.response}`);
        loadAgentAnalytics(selectedAgent.agent_id);
      } else {
        alert(`Interaction failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Interaction failed:', error);
      alert('Failed to interact with agent');
    }
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return '😊';
      case 'focused': return '🎯';
      case 'tired': return '😴';
      case 'excited': return '🚀';
      case 'contemplative': return '🤔';
      default: return '🤖';
    }
  };

  const getStatusColor = (value: number) => {
    if (value >= 80) return 'from-green-500 to-emerald-500';
    if (value >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 backdrop-blur-xl rounded-2xl p-6 text-white border border-purple-500/20 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-gradient-secondary">🤖 Living Agent System</h1>
        <p className="text-purple-100">Manage your personal AI agents with evolving personalities and capabilities</p>
        
        {systemStatus && (
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                systemStatus.status === 'operational' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className="text-sm">System {systemStatus.status}</span>
            </div>
            <div className="text-sm">
              Version {systemStatus.version}
            </div>
            <div className="text-sm">
              {systemStatus.capabilities.length} Capabilities
            </div>
          </div>
        )}
      </div>

      {/* Agent Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">🎭 Your Agents</h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                ✨ Create Agent
              </button>
            </div>
            
            <div className="space-y-4">
              {agents.map((agent) => {
                const status = agentStatuses[agent.agent_id];
                return (
                  <div
                    key={agent.agent_id}
                    onClick={() => handleAgentSelect(agent)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-105 ${
                      selectedAgent?.agent_id === agent.agent_id
                        ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 shadow-lg'
                        : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50 hover:bg-slate-600/30'
                    }`}
                  >
                    {/* Agent Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium text-white">{agent.name}</div>
                          <div className="text-sm text-slate-300">{agent.role}</div>
                        </div>
                      </div>
                      <div className="text-2xl">
                        {status ? getMoodIcon(status.mood) : '🤖'}
                      </div>
                    </div>

                    {/* Sims-like Status Bars */}
                    {status && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-3 w-3 text-yellow-400" />
                          <div className="flex-1 bg-slate-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full bg-gradient-to-r ${getStatusColor(status.energy)} transition-all duration-500`}
                              style={{ width: `${status.energy}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400 w-8">{status.energy}%</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Heart className="h-3 w-3 text-pink-400" />
                          <div className="flex-1 bg-slate-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full bg-gradient-to-r ${getStatusColor(status.motivation)} transition-all duration-500`}
                              style={{ width: `${status.motivation}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400 w-8">{status.motivation}%</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Brain className="h-3 w-3 text-blue-400" />
                          <div className="flex-1 bg-slate-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full bg-gradient-to-r ${getStatusColor(status.learning)} transition-all duration-500`}
                              style={{ width: `${status.learning}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400 w-8">{status.learning}%</span>
                        </div>
                      </div>
                    )}

                    {/* Current Activity */}
                    {status && (
                      <div className="mt-3 p-2 bg-slate-600/30 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Activity className="h-3 w-3 text-green-400" />
                          <span className="text-xs font-medium text-green-400">Currently</span>
                        </div>
                        <p className="text-xs text-slate-300">{status.currentTask}</p>
                        <div className="mt-2 bg-slate-700 rounded-full h-1">
                          <div 
                            className="h-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${status.taskProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Interaction Stats */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>💬 {agent.interaction_count} interactions</span>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                );
              })}
              
              {agents.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">🤖</div>
                  <p className="text-white">No agents created yet</p>
                  <p className="text-sm">Create your first living agent to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent Details */}
        <div className="lg:col-span-2">
          {selectedAgent ? (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedAgent.name}</h2>
                  <p className="text-slate-300">{selectedAgent.role}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-sm text-slate-400">
                      {agentStatuses[selectedAgent.agent_id] ? getMoodIcon(agentStatuses[selectedAgent.agent_id].mood) : '🤖'} 
                      {selectedAgent.current_mood.mood_description}
                    </span>
                                         <span className="text-sm text-slate-400">
                       🧠 {selectedAgent.episodic_memory_count + selectedAgent.semantic_memory_count} memories
                     </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleInteraction}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Interact</span>
                  </button>
                  <button className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>

              {/* Detailed Status Dashboard */}
              {agentStatuses[selectedAgent.agent_id] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Current Task */}
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Play className="h-5 w-5 text-green-400" />
                      <h3 className="font-medium text-white">Current Task</h3>
                    </div>
                    <p className="text-slate-300 mb-2">{agentStatuses[selectedAgent.agent_id].currentTask}</p>
                    <div className="bg-slate-600 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${agentStatuses[selectedAgent.agent_id].taskProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">{agentStatuses[selectedAgent.agent_id].taskProgress}% complete</span>
                  </div>

                  {/* Recent Achievements */}
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                      <h3 className="font-medium text-white">Recently Completed</h3>
                    </div>
                    <div className="space-y-2">
                      {agentStatuses[selectedAgent.agent_id].recentlyCompleted.map((task, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-sm text-slate-300">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming Tasks */}
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Clock className="h-5 w-5 text-purple-400" />
                      <h3 className="font-medium text-white">Upcoming Tasks</h3>
                    </div>
                    <div className="space-y-2">
                      {agentStatuses[selectedAgent.agent_id].upcomingTasks.map((task, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-sm text-slate-300">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vital Signs */}
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-cyan-400" />
                      <h3 className="font-medium text-white">Vital Signs</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">Energy</span>
                          <span className="text-slate-400">{agentStatuses[selectedAgent.agent_id].energy}%</span>
                        </div>
                        <div className="bg-slate-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${getStatusColor(agentStatuses[selectedAgent.agent_id].energy)}`}
                            style={{ width: `${agentStatuses[selectedAgent.agent_id].energy}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">Motivation</span>
                          <span className="text-slate-400">{agentStatuses[selectedAgent.agent_id].motivation}%</span>
                        </div>
                        <div className="bg-slate-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${getStatusColor(agentStatuses[selectedAgent.agent_id].motivation)}`}
                            style={{ width: `${agentStatuses[selectedAgent.agent_id].motivation}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">Learning</span>
                          <span className="text-slate-400">{agentStatuses[selectedAgent.agent_id].learning}%</span>
                        </div>
                        <div className="bg-slate-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${getStatusColor(agentStatuses[selectedAgent.agent_id].learning)}`}
                            style={{ width: `${agentStatuses[selectedAgent.agent_id].learning}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Analytics */}
              {agentAnalytics && (
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h3 className="font-medium text-white mb-3">Performance Analytics</h3>
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="text-center">
                       <div className="text-2xl font-bold text-cyan-400">{agentAnalytics.interaction_count}</div>
                       <div className="text-xs text-slate-400">Total Interactions</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-green-400">{agentAnalytics.growth_stats.total_milestones}</div>
                       <div className="text-xs text-slate-400">Milestones</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-purple-400">{agentAnalytics.memory_stats.total_memories}</div>
                       <div className="text-xs text-slate-400">Memories</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-orange-400">{Math.round(agentAnalytics.performance_metrics.learning_efficiency * 100)}%</div>
                       <div className="text-xs text-slate-400">Learning Efficiency</div>
                     </div>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 flex items-center justify-center h-96">
              <div className="text-center text-slate-400">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg">Select an agent to view details</p>
                <p className="text-sm">Choose an agent from the list to see their status and manage their activities</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">✨ Create New Agent</h3>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Agent Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Enter agent name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                <input
                  type="text"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="e.g., Data Analyst, Creative Director"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Create Agent
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivingAgentDashboard; 