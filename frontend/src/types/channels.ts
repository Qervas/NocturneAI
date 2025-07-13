export interface Channel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  primaryAgents: string[]; // Which living agents are most active in this channel
  type: 'channel' | 'dm' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  is_private: boolean;
  auto_assign_agents: boolean; // Whether to auto-assign agents based on context
  allowed_agents: string[]; // Specific agents allowed in this channel (empty = all allowed)
}

export interface DirectMessage {
  id: string;
  agentName: string;
  agentId: string;
  isOnline: boolean;
  lastMessage?: string;
  lastActivity?: string;
  unreadCount: number;
  agent?: any; // Full agent object from livingAgentService
}

export interface ChannelMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  channelId: string;
  mentions?: string[];
  isChannelSpecific?: boolean;
  agent_response?: any;
  sender?: string;
  agent_id?: string;
  agent_name?: string;
}

export interface ChannelCreateRequest {
  name: string;
  description: string;
  icon: string;
  color: string;
  is_private: boolean;
  auto_assign_agents: boolean;
  allowed_agents: string[];
}

export interface ChannelUpdateRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_private?: boolean;
  auto_assign_agents?: boolean;
  allowed_agents?: string[];
}

// Default channels that are created for new users
export const DEFAULT_CHANNELS: Omit<Channel, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'member_count'>[] = [
  {
    name: 'general',
    displayName: '# general',
    description: 'General discussions with your living agents',
    icon: '💬',
    color: 'text-purple-400',
    primaryAgents: [],
    type: 'channel',
    is_private: false,
    auto_assign_agents: true,
    allowed_agents: []
  },
  {
    name: 'living-agents',
    displayName: '# living-agents',
    description: 'Direct collaboration with all your agents',
    icon: '🧠',
    color: 'text-blue-400',
    primaryAgents: [],
    type: 'channel',
    is_private: false,
    auto_assign_agents: true,
    allowed_agents: []
  }
];

// Available channel icons and colors
export const CHANNEL_ICONS = [
  '💬', '🧠', '🎯', '📱', '📊', '🎨', '⚙️', '🚀', '💡', '🔬', 
  '📈', '🎪', '🎮', '🌟', '🔥', '⚡', '🎵', '📚', '🎭', '🎨'
];

export const CHANNEL_COLORS = [
  'text-purple-400', 'text-blue-400', 'text-green-400', 'text-yellow-400',
  'text-red-400', 'text-pink-400', 'text-indigo-400', 'text-cyan-400',
  'text-orange-400', 'text-teal-400', 'text-lime-400', 'text-rose-400'
];

// Direct message setup - will be populated dynamically with living agents
export const DIRECT_MESSAGES: Record<string, DirectMessage> = {};

export type ActiveView = {
  type: 'channel' | 'dm';
  id: string;
  name: string;
  agentId?: string; // For DMs
  channelData?: Channel; // For channels
}; 