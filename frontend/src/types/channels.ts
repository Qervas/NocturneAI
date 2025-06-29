export interface Channel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  primaryAgents: string[]; // Which living agents are most active in this channel
  type: 'channel' | 'dm' | 'group';
}

export interface DirectMessage {
  id: string;
  agentName: string;
  agentId: string;
  isOnline: boolean;
  lastMessage?: string;
  lastActivity?: string;
  unreadCount: number;
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

// Channel definitions for living agent system
export const CHANNELS: Record<string, Channel> = {
  'general': {
    id: 'general',
    name: 'general',
    displayName: '# general',
    description: 'General discussions with living agents',
    icon: '🏛️',
    color: 'text-purple-400',
    primaryAgents: [], // Auto-assign based on context and agent availability
    type: 'channel'
  },
  'living-agents': {
    id: 'living-agents',
    name: 'living-agents',
    displayName: '# living-agents',
    description: 'Collaborate with all your living agents',
    icon: '🧠',
    color: 'text-gold-400',
    primaryAgents: [], // All available living agents
    type: 'channel'
  },
  'strategy': {
    id: 'strategy',
    name: 'strategy',
    displayName: '# strategy',
    description: 'High-level strategic planning with expert agents',
    icon: '🎯',
    color: 'text-blue-400',
    primaryAgents: [], // Strategy-focused agents
    type: 'channel'
  },
  'product': {
    id: 'product',
    name: 'product',
    displayName: '# product',
    description: 'Product strategy, roadmaps, and user insights',
    icon: '📱',
    color: 'text-green-400',
    primaryAgents: [], // Product and UX agents
    type: 'channel'
  },
  'market-intel': {
    id: 'market-intel',
    name: 'market-intel',
    displayName: '# market-intel',
    description: 'Market analysis and competitive intelligence',
    icon: '📊',
    color: 'text-orange-400',
    primaryAgents: [], // Market intelligence agents
    type: 'channel'
  },
  'design': {
    id: 'design',
    name: 'design',
    displayName: '# design',
    description: 'UX design, user experience, interface decisions',
    icon: '🎨',
    color: 'text-pink-400',
    primaryAgents: [], // Design-focused agents
    type: 'channel'
  },
  'operations': {
    id: 'operations',
    name: 'operations',
    displayName: '# operations', 
    description: 'Implementation, processes, technical planning',
    icon: '⚙️',
    color: 'text-cyan-400',
    primaryAgents: [], // Operations agents
    type: 'channel'
  }
};

// Direct message setup - will be populated dynamically with living agents
export const DIRECT_MESSAGES: Record<string, DirectMessage> = {};

export type ActiveView = {
  type: 'channel' | 'dm';
  id: string;
  name: string;
}; 