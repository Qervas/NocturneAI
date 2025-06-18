import React from 'react';
import { Hash, MessageCircle, Users, Settings, Crown } from 'lucide-react';
import { ActiveView, CHANNELS, DIRECT_MESSAGES } from '../types/channels';
import { ChatMessage, COUNCIL_MEMBERS, CouncilMemberKey } from '../types/council';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  connectionStatus: string;
  channelMessages?: Record<string, ChatMessage[]>;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, connectionStatus }) => {
  const handleChannelClick = (channelId: string, channelName: string) => {
    onViewChange({
      type: 'channel',
      id: channelId,
      name: channelName
    });
  };

  const handleDMClick = (dmId: string, memberName: string) => {
    onViewChange({
      type: 'dm', 
      id: dmId,
      name: memberName
    });
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* Server Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
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

      <div className="flex-1 overflow-y-auto sidebar-scrollbar">
        {/* Channels Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Channels
            </span>
            <Hash className="h-3 w-3 text-slate-500" />
          </div>
          
          <div className="space-y-1">
            {Object.values(CHANNELS).map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel.id, channel.displayName)}
                className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors text-left ${
                  activeView.type === 'channel' && activeView.id === channel.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span className="text-base">{channel.icon}</span>
                <span className="flex-1 truncate">{channel.name}</span>
                {channel.primaryMembers.length > 0 && (
                  <span className="text-xs text-slate-500">
                    {channel.primaryMembers.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Direct Messages
            </span>
            <MessageCircle className="h-3 w-3 text-slate-500" />
          </div>
          
          <div className="space-y-1">
            {Object.values(DIRECT_MESSAGES).map((dm) => {
              const member = COUNCIL_MEMBERS[dm.memberKey as CouncilMemberKey];
              if (!member) return null;
              
              return (
                <button
                  key={dm.id}
                  onClick={() => handleDMClick(dm.id, dm.memberName)}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors text-left ${
                    activeView.type === 'dm' && activeView.id === dm.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${member.color}`}>
                      {member.avatar}
                    </div>
                    {dm.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-slate-800 rounded-full" />
                    )}
                  </div>
                  <span className="flex-1 truncate">{dm.memberName.split(' ')[0]}</span>
                  {dm.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {dm.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Council Status */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Council Status
            </span>
            <Users className="h-3 w-3 text-slate-500" />
          </div>
          
          <div className="space-y-1.5">
            {Object.entries(COUNCIL_MEMBERS).map(([key, member]) => (
              <div key={key} className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-slate-300">{member.name.split(' ')[0]}</span>
                <span className="text-slate-500">Online</span>
              </div>
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
    </div>
  );
};

export default Sidebar; 