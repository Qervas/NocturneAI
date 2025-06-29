import React, { useState, useEffect } from 'react';
import { Hash, MessageCircle, Users, Settings, Crown, Plus, Edit, Search } from 'lucide-react';
import { Channel, DirectMessage, ActiveView } from '../types/channels';
import { channelService } from '../services/channelService';
import ChannelManageModal from './ChannelManageModal';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  connectionStatus: string;
  channelMessages?: Record<string, any[]>; // For unread counts
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, connectionStatus, channelMessages = {} }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  // Helper functions for channel access control
  const getChannelAccessCount = (channel: Channel): string => {
    if (channel.auto_assign_agents) {
      return 'All';
    }
    if (channel.allowed_agents.length === 0) {
      return 'All';
    }
    return channel.allowed_agents.length.toString();
  };

  const getChannelAccessText = (channel: Channel): string => {
    if (channel.auto_assign_agents) {
      return 'All agents can access this channel automatically';
    }
    if (channel.allowed_agents.length === 0) {
      return 'All agents can access this channel';
    }
    return `${channel.allowed_agents.length} specific agents can access this channel`;
  };

  useEffect(() => {
    loadChannels();
    loadDirectMessages();
  }, []);

  const loadChannels = () => {
    const channelList = channelService.getChannels();
    setChannels(channelList);
  };

  const loadDirectMessages = async () => {
    const dmList = channelService.getDirectMessages();
    setDirectMessages(dmList);
    // Refresh DMs to sync with living agents
    await channelService.refreshDirectMessages();
    const updatedDmList = channelService.getDirectMessages();
    setDirectMessages(updatedDmList);
  };

  const handleChannelClick = (channel: Channel) => {
    onViewChange({
      type: 'channel',
      id: channel.id,
      name: channel.displayName,
      channelData: channel
    });
  };

  const handleDMClick = (dm: DirectMessage) => {
    onViewChange({
      type: 'dm', 
      id: dm.id,
      name: dm.agentName,
      agentId: dm.agentId
    });
  };

  const handleCreateChannel = () => {
    setEditingChannel(null);
    setShowChannelModal(true);
  };

  const handleEditChannel = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(channel);
    setShowChannelModal(true);
  };

  const handleChannelCreated = (channel: Channel) => {
    loadChannels();
    // Switch to the new channel
    handleChannelClick(channel);
  };

  const handleChannelUpdated = (channel: Channel) => {
    loadChannels();
    // Update activeView if we're currently viewing this channel
    if (activeView.type === 'channel' && activeView.id === channel.id) {
      onViewChange({
        type: 'channel',
        id: channel.id,
        name: channel.displayName,
        channelData: channel
      });
    }
  };

  const handleChannelDeleted = (channelId: string) => {
    loadChannels();
    // If we're currently viewing the deleted channel, switch to first available channel
    if (activeView.type === 'channel' && activeView.id === channelId) {
      const remainingChannels = channelService.getChannels();
      if (remainingChannels.length > 0) {
        handleChannelClick(remainingChannels[0]);
      }
    }
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* Server Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Intelligence Empire</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-slate-400 capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Channels Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Channels
            </span>
            <button
              onClick={handleCreateChannel}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Create Channel"
            >
              <Plus className="h-3 w-3 text-slate-500 hover:text-slate-300" />
            </button>
          </div>
          
          <div className="space-y-1">
            {channels.map((channel) => (
              <div key={channel.id} className="group relative">
                <button
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors text-left ${
                    activeView.type === 'channel' && activeView.id === channel.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <span className="text-base">{channel.icon}</span>
                  <span className="flex-1 truncate">{channel.name}</span>
                  <div className="flex items-center space-x-1">
                    {channel.is_private && (
                      <span className="text-xs text-slate-500" title="Private Channel">🔒</span>
                    )}
                    {/* Agent Access Indicator */}
                    <span 
                      className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded" 
                      title={`${getChannelAccessText(channel)}`}
                    >
                      {getChannelAccessCount(channel)}👥
                    </span>
                  </div>
                </button>
                {channelService.canEditChannel(channel.id) && (
                  <button
                    onClick={(e) => handleEditChannel(channel, e)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded transition-all"
                    title="Edit Channel"
                  >
                    <Edit className="h-3 w-3 text-slate-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Living Agents
            </span>
            <MessageCircle className="h-3 w-3 text-slate-500" />
          </div>
          
          <div className="space-y-1">
            {directMessages.map((dm) => (
              <button
                key={dm.id}
                onClick={() => handleDMClick(dm)}
                className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors text-left ${
                  activeView.type === 'dm' && activeView.agentId === dm.agentId
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <div className="relative">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-xs">
                    🤖
                  </div>
                  {dm.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-slate-800 rounded-full" />
                  )}
                </div>
                <span className="flex-1 truncate">{dm.agentName}</span>
                {dm.unreadCount > 0 && (
                  <span className="bg-purple-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {dm.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>


      </div>

      {/* User Info at Bottom */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">You</div>
            <div className="text-xs text-slate-400">Strategic Leader</div>
          </div>
          <Settings className="h-4 w-4 text-slate-500 hover:text-slate-300 cursor-pointer" />
        </div>
      </div>

      {/* Channel Management Modal */}
      <ChannelManageModal
        isOpen={showChannelModal}
        onClose={() => setShowChannelModal(false)}
        editingChannel={editingChannel}
        onChannelCreated={handleChannelCreated}
        onChannelUpdated={handleChannelUpdated}
        onChannelDeleted={handleChannelDeleted}
      />
    </div>
  );
};

export default Sidebar; 