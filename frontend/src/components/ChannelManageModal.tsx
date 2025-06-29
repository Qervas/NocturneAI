import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Hash, Lock, Users, Bot, Shield, Check } from 'lucide-react';
import { Channel, ChannelCreateRequest, ChannelUpdateRequest, CHANNEL_ICONS, CHANNEL_COLORS } from '../types/channels';
import { channelService } from '../services/channelService';
import { livingAgentService, LivingAgent } from '../services/livingAgentService';

interface ChannelManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingChannel?: Channel | null;
  onChannelCreated: (channel: Channel) => void;
  onChannelUpdated: (channel: Channel) => void;
  onChannelDeleted: (channelId: string) => void;
}

const ChannelManageModal: React.FC<ChannelManageModalProps> = ({
  isOpen,
  onClose,
  editingChannel,
  onChannelCreated,
  onChannelUpdated,
  onChannelDeleted
}) => {
  const [formData, setFormData] = useState<ChannelCreateRequest>({
    name: '',
    description: '',
    icon: '💬',
    color: 'text-purple-400',
    is_private: false,
    auto_assign_agents: true,
    allowed_agents: []
  });

  const [availableAgents, setAvailableAgents] = useState<LivingAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableAgents();
      if (editingChannel) {
        setFormData({
          name: editingChannel.name,
          description: editingChannel.description,
          icon: editingChannel.icon,
          color: editingChannel.color,
          is_private: editingChannel.is_private,
          auto_assign_agents: editingChannel.auto_assign_agents,
          allowed_agents: editingChannel.allowed_agents
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingChannel]);

  const loadAvailableAgents = async () => {
    try {
      const agents = await livingAgentService.getUserAgents('user-1');
      setAvailableAgents(agents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '💬',
      color: 'text-purple-400',
      is_private: false,
      auto_assign_agents: true,
      allowed_agents: []
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (editingChannel) {
        // Update existing channel
        const updatedChannel = channelService.updateChannel(editingChannel.id, formData);
        if (updatedChannel) {
          onChannelUpdated(updatedChannel);
          onClose();
        } else {
          setError('Failed to update channel');
        }
      } else {
        // Create new channel
        const newChannel = channelService.createChannel(formData);
        onChannelCreated(newChannel);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save channel:', error);
      setError('Failed to save channel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingChannel) return;

    if (window.confirm(`Are you sure you want to delete the channel "${editingChannel.displayName}"? This action cannot be undone.`)) {
      setIsLoading(true);
      try {
        const success = channelService.deleteChannel(editingChannel.id);
        if (success) {
          onChannelDeleted(editingChannel.id);
          onClose();
        } else {
          setError('Failed to delete channel');
        }
      } catch (error) {
        console.error('Failed to delete channel:', error);
        setError('Failed to delete channel');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAgentToggle = (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_agents: prev.allowed_agents.includes(agentId)
        ? prev.allowed_agents.filter(id => id !== agentId)
        : [...prev.allowed_agents, agentId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {editingChannel ? (
                <>
                  <Edit className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Edit Channel</h2>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-green-400" />
                  <h2 className="text-xl font-semibold text-white">Create New Channel</h2>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Channel Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                Channel Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
                placeholder="e.g., product-strategy"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Will be displayed as "# {formData.name || 'channel-name'}"
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
                placeholder="Describe what this channel is for..."
                rows={3}
                required
              />
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Channel Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {CHANNEL_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                      className={`p-2 rounded-lg border transition-colors ${
                        formData.icon === icon
                          ? 'border-purple-400 bg-purple-400/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-lg">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Channel Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CHANNEL_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`p-2 rounded-lg border transition-colors ${
                        formData.color === color
                          ? 'border-purple-400 bg-purple-400/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${color.replace('text-', 'bg-')}`}></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Channel Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300">Channel Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-300">Private Channel</p>
                    <p className="text-xs text-slate-500">Only you can see this channel</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_private}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-300">Auto-assign Agents</p>
                    <p className="text-xs text-slate-500">Automatically include relevant agents in conversations</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_assign_agents}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_assign_agents: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            </div>

            {/* Agent Access Control */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Agent Access Control
              </label>
              
              {formData.auto_assign_agents ? (
                <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Bot className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">All Agents Allowed</p>
                      <p className="text-xs text-slate-400">
                        Any agent can join this channel automatically based on conversation context
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-slate-700/30 rounded-lg p-3 mb-3 border border-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-amber-400" />
                        <span className="text-sm text-slate-300">Restricted Access</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formData.allowed_agents.length} / {availableAgents.length} agents selected
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {availableAgents.map(agent => (
                      <div
                        key={agent.agent_id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          formData.allowed_agents.includes(agent.agent_id)
                            ? 'border-purple-400 bg-purple-400/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                        onClick={() => handleAgentToggle(agent.agent_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{agent.name}</p>
                              <p className="text-xs text-slate-400">{agent.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {formData.allowed_agents.includes(agent.agent_id) && (
                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                            <div className="w-2 h-2 bg-green-400 rounded-full" title="Agent Online" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {formData.allowed_agents.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-400">No agents selected</p>
                      <p className="text-xs text-slate-500">Channel will be empty until agents are added</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-700">
              <div>
                {editingChannel && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 inline mr-2" />
                    Delete Channel
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingChannel ? 'Update Channel' : 'Create Channel'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChannelManageModal; 