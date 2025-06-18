export interface Channel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  primaryMembers: string[]; // Which council members are most active in this channel
  type: 'channel' | 'dm' | 'group';
}

export interface DirectMessage {
  id: string;
  memberName: string;
  memberKey: string;
  isOnline: boolean;
  lastMessage?: string;
  lastActivity?: string;
  unreadCount: number;
}

export interface ChannelMessage extends ChatMessage {
  channelId: string;
  mentions?: string[];
  isChannelSpecific?: boolean;
}

// Import ChatMessage from existing types
import { ChatMessage } from './council';

// Channel definitions
export const CHANNELS: Record<string, Channel> = {
  'general': {
    id: 'general',
    name: 'general',
    displayName: '# general',
    description: 'General discussions with auto-assigned experts',
    icon: '🏛️',
    color: 'text-purple-400',
    primaryMembers: [], // Auto-assign based on keywords
    type: 'channel'
  },
  'council': {
    id: 'council',
    name: 'council',
    displayName: '# council',
    description: 'Full council assembly with Master Intelligence synthesis',
    icon: '🧠',
    color: 'text-gold-400',
    primaryMembers: ['sarah', 'marcus', 'elena', 'david'],
    type: 'channel'
  },
  'strategy': {
    id: 'strategy',
    name: 'strategy',
    displayName: '# strategy',
    description: 'High-level strategic planning and frameworks',
    icon: '🎯',
    color: 'text-blue-400',
    primaryMembers: ['sarah', 'marcus'],
    type: 'channel'
  },
  'product': {
    id: 'product',
    name: 'product',
    displayName: '# product',
    description: 'Product strategy, roadmaps, and user insights',
    icon: '📱',
    color: 'text-green-400',
    primaryMembers: ['sarah', 'elena'],
    type: 'channel'
  },
  'market-intel': {
    id: 'market-intel',
    name: 'market-intel',
    displayName: '# market-intel',
    description: 'Market analysis, competitive intelligence, opportunities',
    icon: '📊',
    color: 'text-orange-400',
    primaryMembers: ['marcus'],
    type: 'channel'
  },
  'design': {
    id: 'design',
    name: 'design',
    displayName: '# design',
    description: 'UX design, user experience, interface decisions',
    icon: '🎨',
    color: 'text-pink-400',
    primaryMembers: ['elena'],
    type: 'channel'
  },
  'operations': {
    id: 'operations',
    name: 'operations',
    displayName: '# operations', 
    description: 'Implementation, processes, technical planning',
    icon: '⚙️',
    color: 'text-cyan-400',
    primaryMembers: ['david'],
    type: 'channel'
  }
};

// Direct message setup
export const DIRECT_MESSAGES: Record<string, DirectMessage> = {
  'sarah': {
    id: 'dm-sarah',
    memberName: 'Sarah Chen',
    memberKey: 'sarah',
    isOnline: true,
    unreadCount: 0
  },
  'marcus': {
    id: 'dm-marcus', 
    memberName: 'Marcus Rodriguez',
    memberKey: 'marcus',
    isOnline: true,
    unreadCount: 0
  },
  'elena': {
    id: 'dm-elena',
    memberName: 'Elena Vasquez', 
    memberKey: 'elena',
    isOnline: true,
    unreadCount: 0
  },
  'david': {
    id: 'dm-david',
    memberName: 'David Kim',
    memberKey: 'david', 
    isOnline: true,
    unreadCount: 0
  }
};

export type ActiveView = {
  type: 'channel' | 'dm';
  id: string;
  name: string;
}; 