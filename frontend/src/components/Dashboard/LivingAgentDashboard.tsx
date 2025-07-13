/**
 * Living Agent Management - CRUD Interface
 * Create, manage, and configure your autonomous agents
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Settings,
  Save,
  X,
  RefreshCw
} from 'lucide-react';
import { dynamicAgentService, DynamicAgent, AgentCreateRequest } from '../../services/dynamicAgentService';

interface LivingAgentDashboardProps {
  className?: string;
}

interface AgentFormData {
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
  color_theme: string;
  expertise_areas: string[];
  communication_style: string;
  autonomy_level: string;
}

const LivingAgentDashboard: React.FC<LivingAgentDashboardProps> = ({ className = '' }) => {
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<DynamicAgent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    role: '',
    description: '',
    avatar_emoji: '🤖',
    color_theme: 'blue',
    expertise_areas: [],
    communication_style: 'professional',
    autonomy_level: 'moderate'
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentList = await dynamicAgentService.getAllAgents();
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const createRequest: AgentCreateRequest = {
        name: formData.name,
        role: formData.role,
        description: formData.description,
        avatar_emoji: formData.avatar_emoji,
        color_theme: formData.color_theme,
        expertise_areas: formData.expertise_areas,
        communication_style: formData.communication_style,
        autonomy_level: formData.autonomy_level
      };

      const result = await dynamicAgentService.createAgent(createRequest);
      if (result.success) {
        await loadAgents();
        resetForm();
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      await dynamicAgentService.deleteAgent(agentId);
      await loadAgents();
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      description: '',
      avatar_emoji: '🤖',
      color_theme: 'blue',
      expertise_areas: [],
      communication_style: 'professional',
      autonomy_level: 'moderate'
    });
    setEditingAgent(null);
  };

  const startEdit = (agent: DynamicAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.profile.name,
      role: agent.profile.role,
      description: agent.profile.description,
      avatar_emoji: agent.profile.avatar_emoji,
      color_theme: agent.profile.color_theme,
      expertise_areas: agent.profile.expertise_areas,
      communication_style: agent.profile.communication_style,
      autonomy_level: agent.profile.autonomy_level
    });
    setShowCreateForm(true);
  };

  const getStatusColor = (agent: DynamicAgent) => {
    if (agent.current_state.is_active) {
      return 'bg-green-500';
    }
    return 'bg-slate-500';
  };

  const emojiOptions = ['🤖', '👨‍💼', '👩‍💼', '🧠', '⚡', '🎯', '🚀', '🎨', '📊', '🔬'];
  const colorOptions = ['blue', 'purple', 'green', 'orange', 'red', 'pink', 'cyan', 'amber'];
  const communicationStyles = ['professional', 'casual', 'technical', 'creative', 'analytical'];
  const autonomyLevels = ['low', 'moderate', 'high', 'maximum'];

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Agent Management</h2>
          <p className="text-slate-400">Create and manage your autonomous agents</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadAgents}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Agent</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Agents</p>
              <p className="text-2xl font-bold text-white">{agents.length}</p>
            </div>
            <User className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Agents</p>
              <p className="text-2xl font-bold text-white">
                {agents.filter(a => a.current_state.is_active).length}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Avg Interactions</p>
              <p className="text-2xl font-bold text-white">
                {agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.current_state.interaction_count, 0) / agents.length) : 0}
              </p>
            </div>
            <Settings className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-400">Loading agents...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Agents Yet</h3>
            <p className="text-slate-400 mb-6">Create your first autonomous agent to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all"
            >
              Create Your First Agent
            </button>
          </div>
        ) : (
          agents.map(agent => (
            <div key={agent.profile.agent_id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{agent.profile.avatar_emoji}</div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.profile.name}</h3>
                    <p className="text-sm text-slate-400">{agent.profile.role}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(agent)}`}></div>
                  <span className="text-xs text-slate-400">
                    {agent.current_state.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-4 line-clamp-2">{agent.profile.description}</p>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                <span>Interactions: {agent.current_state.interaction_count}</span>
                <span>Energy: {agent.current_state.energy}%</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => startEdit(agent)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteAgent(agent.profile.agent_id)}
                  className="flex items-center justify-center px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingAgent ? 'Edit Agent' : 'Create New Agent'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Agent name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Agent role"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="What does this agent do?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Avatar</label>
                  <div className="grid grid-cols-5 gap-2">
                    {emojiOptions.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setFormData({...formData, avatar_emoji: emoji})}
                        className={`p-2 text-2xl rounded-lg border transition-colors ${
                          formData.avatar_emoji === emoji
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Color Theme</label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({...formData, color_theme: color})}
                        className={`p-3 rounded-lg border transition-colors ${
                          formData.color_theme === color
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-${color}-500 mx-auto`}></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Communication Style</label>
                  <select
                    value={formData.communication_style}
                    onChange={(e) => setFormData({...formData, communication_style: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {communicationStyles.map(style => (
                      <option key={style} value={style}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Autonomy Level</label>
                  <select
                    value={formData.autonomy_level}
                    onChange={(e) => setFormData({...formData, autonomy_level: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {autonomyLevels.map(level => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAgent}
                  disabled={!formData.name || !formData.role}
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingAgent ? 'Update Agent' : 'Create Agent'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivingAgentDashboard; 