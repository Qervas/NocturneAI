/**
 * Agent Detail View - Comprehensive agent management interface
 * Shows detailed autonomous capabilities, goals, decisions, and learning for a specific agent
 */

import React, { useState, useEffect } from 'react';
import { dynamicAgentService, DynamicAgent } from '../../services/dynamicAgentService';

interface AgentDetailViewProps {
  agentId: string;
  onClose: () => void;
  className?: string;
}

interface TabType {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({ 
  agentId, 
  onClose, 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [agent, setAgent] = useState<DynamicAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAgentData();
  }, [agentId]);

  const loadAgentData = async () => {
    setLoading(true);
    try {
      const agentData = await dynamicAgentService.getAgent(agentId);
      setAgent(agentData);
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadAgentData();
    } finally {
      setRefreshing(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      purple: {
        bg: 'bg-purple-500',
        text: 'text-purple-600',
        border: 'border-purple-200',
        light: 'bg-purple-50'
      },
      blue: {
        bg: 'bg-blue-500',
        text: 'text-blue-600',
        border: 'border-blue-200',
        light: 'bg-blue-50'
      },
      pink: {
        bg: 'bg-pink-500',
        text: 'text-pink-600',
        border: 'border-pink-200',
        light: 'bg-pink-50'
      },
      green: {
        bg: 'bg-green-500',
        text: 'text-green-600',
        border: 'border-green-200',
        light: 'bg-green-50'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const renderOverviewTab = () => {
    if (!agent) return null;
    
    const colors = getColorClasses(agent.profile.color_theme);
    
    return (
      <div className="space-y-6">
        {/* Agent Profile Header */}
        <div className={`${colors.light} rounded-lg p-6 border ${colors.border}`}>
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center text-white text-2xl`}>
              {agent.profile.avatar_emoji}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{agent.profile.name}</h2>
              <p className={`text-lg font-medium ${colors.text}`}>{agent.profile.role}</p>
              <p className="text-gray-600 mt-1">{agent.profile.description}</p>
            </div>
          </div>
        </div>

        {/* Current State */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Energy</span>
              <span className="text-xl">⚡</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{Math.round(agent.current_state.energy)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${agent.current_state.energy}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Confidence</span>
              <span className="text-xl">🎯</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{Math.round(agent.current_state.confidence)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${agent.current_state.confidence}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Focus</span>
              <span className="text-xl">🎯</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{Math.round(agent.current_state.focus)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${agent.current_state.focus}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Stress</span>
              <span className="text-xl">📊</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{Math.round(agent.current_state.stress)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${agent.current_state.stress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Expertise and Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Expertise Areas</h3>
            <div className="space-y-2">
              {agent.profile.expertise_areas.map((area, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${colors.bg} rounded-full`}></div>
                  <span className="text-sm text-gray-700">{area}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {agent.profile.skill_categories.map((skill, index) => (
                <span key={index} className={`px-3 py-1 text-xs rounded-full ${colors.light} ${colors.text} border ${colors.border}`}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Goals and Memory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Current Goals</h3>
            {agent.autonomous_goals.length > 0 ? (
              <div className="space-y-3">
                {agent.autonomous_goals.map((goal, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 ${colors.bg} rounded-full`}></div>
                    <span className="text-sm text-gray-700">{goal}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active goals</p>
            )}
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Memory System</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Short-term</span>
                <span className="text-sm font-medium">{agent.memory_counts.short_term}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Long-term</span>
                <span className="text-sm font-medium">{agent.memory_counts.long_term}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Episodic</span>
                <span className="text-sm font-medium">{agent.memory_counts.episodic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Relationships */}
        {Object.keys(agent.relationships).length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Relationships</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(agent.relationships).map(([agentName, strength]) => (
                <div key={agentName} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{agentName}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${colors.bg} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${strength * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{Math.round(strength * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCapabilitiesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Agent Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Communication Style</span>
            <span className="text-sm font-medium">{agent?.profile.communication_style}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Decision Making</span>
            <span className="text-sm font-medium">{agent?.profile.decision_making_style}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Work Style</span>
            <span className="text-sm font-medium">{agent?.profile.work_style}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Autonomy Level</span>
            <span className="text-sm font-medium">{agent?.profile.autonomy_level}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-700">Experience Level</span>
              <span className="text-sm font-medium">{agent?.profile.experience_level}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${agent?.profile.experience_level}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-700">Interaction Count</span>
              <span className="text-sm font-medium">{agent?.current_state.interaction_count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => {
    if (!agent) return null;
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Current Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Energy Level</span>
                  <span className="text-sm font-medium">{Math.round(agent.current_state.energy)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${agent.current_state.energy}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Confidence</span>
                  <span className="text-sm font-medium">{Math.round(agent.current_state.confidence)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${agent.current_state.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Focus</span>
                  <span className="text-sm font-medium">{Math.round(agent.current_state.focus)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${agent.current_state.focus}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Stress Level</span>
                  <span className="text-sm font-medium">{Math.round(agent.current_state.stress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${agent.current_state.stress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Activity Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{agent.current_state.interaction_count}</div>
              <div className="text-sm text-gray-600">Total Interactions</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{agent.autonomous_goals.length}</div>
              <div className="text-sm text-gray-600">Active Goals</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(agent.relationships).length}</div>
              <div className="text-sm text-gray-600">Relationships</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Agent Not Found</h2>
            <p className="text-gray-600 mb-4">The requested agent could not be found.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: TabType[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'capabilities', label: 'Capabilities', icon: '⚡' },
    { id: 'performance', label: 'Performance', icon: '📈' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-50 rounded-lg max-w-6xl w-full mx-4 h-5/6 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${getColorClasses(agent.profile.color_theme).bg} rounded-full flex items-center justify-center text-white text-xl`}>
                {agent.profile.avatar_emoji}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{agent.profile.name}</h1>
                <p className="text-gray-600">{agent.profile.role}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {refreshing ? '🔄' : '↻'} Refresh
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-6">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'capabilities' && renderCapabilitiesTab()}
          {activeTab === 'performance' && renderPerformanceTab()}
        </div>
      </div>
    </div>
  );
}; 