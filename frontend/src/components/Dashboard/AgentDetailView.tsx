/**
 * Agent Detail View - Comprehensive agent management interface
 * Shows detailed autonomous capabilities, goals, decisions, and learning for a specific agent
 */

import React, { useState, useEffect } from 'react';
import { autonomousAgentService, AgentStatus, AutonomousDecision, LearningInsight, AgentGoal } from '../../services/autonomousAgentService';

interface AgentDetailViewProps {
  agentName: string;
  onClose: () => void;
  className?: string;
}

interface TabType {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface AgentProfile {
  title: string;
  expertise: string;
  color: string;
  avatar: string;
  description: string;
  specialties: string[];
  metrics: {
    experience: number;
    efficiency: number;
    reliability: number;
    innovation: number;
  };
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({ 
  agentName, 
  onClose, 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [decisions, setDecisions] = useState<AutonomousDecision[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [goals, setGoals] = useState<AgentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const agentProfiles: Record<string, AgentProfile> = {
    'Sarah Chen': {
      title: 'Product Strategy Lead',
      expertise: 'Market Research • Product Planning • Strategic Vision',
      color: 'purple',
      avatar: '👩‍💼',
      description: 'Specializes in product strategy, market analysis, and long-term planning. Expert in identifying market opportunities and strategic product direction.',
      specialties: ['Market Analysis', 'User Research', 'Product Roadmaps', 'Competitive Intelligence', 'Strategic Planning'],
      metrics: { experience: 95, efficiency: 88, reliability: 92, innovation: 96 }
    },
    'Marcus Rodriguez': {
      title: 'Market Intelligence Analyst',
      expertise: 'Market Analysis • Competitive Intelligence • Revenue Optimization',
      color: 'blue',
      avatar: '👨‍💼',
      description: 'Expert in market intelligence, competitive analysis, and business optimization. Specializes in data-driven insights and revenue growth strategies.',
      specialties: ['Market Intelligence', 'Competitive Analysis', 'Revenue Analytics', 'Business Intelligence', 'Financial Modeling'],
      metrics: { experience: 92, efficiency: 94, reliability: 89, innovation: 87 }
    },
    'Elena Vasquez': {
      title: 'UX Design Director',
      expertise: 'User Experience • Design Systems • Usability Research',
      color: 'pink',
      avatar: '👩‍🎨',
      description: 'Leads user experience design and interface optimization initiatives. Expert in creating intuitive, user-centered design solutions.',
      specialties: ['User Experience', 'Interface Design', 'Usability Testing', 'Design Systems', 'User Research'],
      metrics: { experience: 90, efficiency: 91, reliability: 95, innovation: 98 }
    },
    'David Kim': {
      title: 'Operations Manager',
      expertise: 'Process Optimization • Performance Monitoring • Resource Management',
      color: 'green',
      avatar: '👨‍💻',
      description: 'Focuses on operational efficiency and system performance optimization. Expert in process automation and resource management.',
      specialties: ['Process Optimization', 'Performance Monitoring', 'Automation', 'Resource Management', 'System Analytics'],
      metrics: { experience: 88, efficiency: 96, reliability: 94, innovation: 85 }
    }
  };

  const profile = agentProfiles[agentName];

  useEffect(() => {
    loadAgentData();
  }, [agentName]);

  const loadAgentData = async () => {
    setLoading(true);
    try {
      // Load agent status
      const statusResult = await autonomousAgentService.getAgentStatus(agentName);
      setAgentStatus(statusResult.status);

      // Load decisions
      const decisionsResult = await autonomousAgentService.getDecisions({ agent_name: agentName });
      setDecisions(decisionsResult.decisions);

      // Load learning insights
      const insightsResult = await autonomousAgentService.getLearningInsights({ agent_name: agentName });
      setInsights(insightsResult.insights);

      // Load goals
      const goalsResult = await autonomousAgentService.getGoals({ agent_name: agentName });
      setGoals(goalsResult.goals);

    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAgentData();
    setRefreshing(false);
  };

  const tabs: TabType[] = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: undefined },
    { id: 'capabilities', label: 'Capabilities', icon: '⚡', badge: agentStatus?.enabled_capabilities },
    { id: 'decisions', label: 'Decisions', icon: '🎯', badge: decisions.length },
    { id: 'goals', label: 'Goals', icon: '🚀', badge: goals.length },
    { id: 'learning', label: 'Learning', icon: '🧠', badge: insights.length },
    { id: 'performance', label: 'Performance', icon: '📈', badge: undefined },
    { id: 'settings', label: 'Settings', icon: '⚙️', badge: undefined }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', light: 'bg-purple-50' },
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50' },
      pink: { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-200', light: 'bg-pink-50' },
      green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200', light: 'bg-green-50' }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Unused functions for future decision execution and milestone completion
  // const executeDecision = async (decisionId: string) => {
  //   try {
  //     await autonomousAgentService.executeDecision(decisionId);
  //     await loadAgentData(); // Refresh data
  //   } catch (error) {
  //     console.error('Error executing decision:', error);
  //   }
  // };

  // const completeGoalMilestone = async (goalId: string, milestoneIndex: number) => {
  //   try {
  //     await autonomousAgentService.completeMilestone(goalId, milestoneIndex);
  //     await loadAgentData(); // Refresh data
  //   } catch (error) {
  //     console.error('Error completing milestone:', error);
  //   }
  // };

  const renderOverviewTab = () => {
    const colors = getColorClasses(profile.color);
    
    return (
      <div className="space-y-6">
        {/* Agent Profile */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start space-x-6">
            <div className={`w-20 h-20 rounded-full ${colors.bg} flex items-center justify-center text-3xl`}>
              {profile.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900">{agentName}</h2>
              <p className="text-xl text-gray-600 mt-1">{profile.title}</p>
              <p className="text-sm text-gray-500 mt-1">{profile.expertise}</p>
              <p className="text-gray-700 mt-3">{profile.description}</p>
              
              {/* Specialties */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Core Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty, index) => (
                    <span key={index} className={`px-3 py-1 ${colors.light} ${colors.text} text-sm rounded-full border ${colors.border}`}>
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(profile.metrics).map(([metric, value]) => (
            <div key={metric} className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{value}%</div>
              <div className="text-sm text-gray-600 capitalize">{metric}</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${colors.bg} transition-all duration-300`}
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        {agentStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{agentStatus.active_goals}</div>
              <div className="text-sm text-gray-600">Active Goals</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{agentStatus.recent_decisions}</div>
              <div className="text-sm text-gray-600">Recent Decisions</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{agentStatus.learning_insights}</div>
              <div className="text-sm text-gray-600">Learning Insights</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((agentStatus.enabled_capabilities / agentStatus.total_capabilities) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Capability Level</div>
            </div>
          </div>
        )}

        {/* Recent Activity Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Timeline</h3>
          <div className="space-y-4">
            {decisions.slice(0, 3).map((decision, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">🎯</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{decision.decision_type}</p>
                  <p className="text-sm text-gray-600">{decision.reasoning}</p>
                  <span className="text-xs text-gray-500">{new Date(decision.created_at).toLocaleString()}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  decision.impact_level === 'high' ? 'bg-red-100 text-red-800' :
                  decision.impact_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {decision.impact_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCapabilitiesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Autonomous Capabilities</h3>
        {agentStatus?.capability_details.map((capability, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{capability.name}</h4>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  capability.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {capability.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={capability.enabled}
                    className="sr-only peer"
                    readOnly
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{capability.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">Trust Required:</span>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${capability.trust_required * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <span className="font-medium">Risk Level:</span>
                <span className={`ml-1 px-2 py-1 rounded-full ${
                  capability.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                  capability.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {capability.risk_level}
                </span>
              </div>
              <div>
                <span className="font-medium">Auto-Execute:</span>
                <span className="ml-1">{capability.auto_execute ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium">Success Rate:</span>
                <span className="ml-1">{capability.success_rate ? `${Math.round(capability.success_rate * 100)}%` : 'N/A'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPerformanceTab = () => {
    const colors = getColorClasses(profile.color);
    
    return (
      <div className="space-y-6">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Success Rate</h4>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">94%</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`${colors.bg} h-3 rounded-full`} style={{ width: '94%' }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Task completion rate</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Response Time</h4>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">1.2s</div>
              <div className="text-sm text-gray-600">Average response</div>
              <div className="mt-3">
                <div className="text-xs text-gray-500">
                  <span className="text-green-600">↓ 15%</span> vs last week
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Learning Rate</h4>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">8.3</div>
              <div className="text-sm text-gray-600">Insights per day</div>
              <div className="mt-3">
                <div className="text-xs text-gray-500">
                  <span className="text-green-600">↑ 23%</span> vs last week
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Chart Placeholder */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Activity Over Time</h4>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📈</div>
              <p>Performance charts coming soon</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const colors = getColorClasses(profile.color);

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-gray-100 rounded-lg max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center text-xl`}>
              {profile.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agentName}</h1>
              <p className="text-gray-600">{profile.title}</p>
            </div>
            {agentStatus && (
              <span className={`px-3 py-1 text-sm rounded-full ${
                agentStatus.autonomy_level === 'advanced' ? 'bg-green-100 text-green-800' :
                agentStatus.autonomy_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {agentStatus.autonomy_level} autonomy
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {refreshing ? '🔄' : '↻'} Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-${profile.color}-500 text-${profile.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`${colors.light} ${colors.text} text-xs px-2 py-1 rounded-full`}>
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'capabilities' && renderCapabilitiesTab()}
          {activeTab === 'performance' && renderPerformanceTab()}
          {activeTab === 'decisions' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Autonomous Decisions</h3>
              <p className="text-gray-600">Detailed decision management interface coming soon...</p>
            </div>
          )}
          {activeTab === 'goals' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Management</h3>
              <p className="text-gray-600">Detailed goal tracking interface coming soon...</p>
            </div>
          )}
          {activeTab === 'learning' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Insights</h3>
              <p className="text-gray-600">Detailed learning interface coming soon...</p>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Settings</h3>
              <p className="text-gray-600">Agent configuration interface coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 