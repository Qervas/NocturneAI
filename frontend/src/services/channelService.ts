/**
 * Channel Management Service
 * Handles dynamic channel creation, editing, deletion, and management
 */

import { Channel, DirectMessage, ChannelCreateRequest, ChannelUpdateRequest, DEFAULT_CHANNELS } from '../types/channels';
import { livingAgentService } from './livingAgentService';

const STORAGE_KEY = 'intelligence_empire_channels';
const DM_STORAGE_KEY = 'intelligence_empire_dms';

class ChannelService {
  private channels: Channel[] = [];
  private directMessages: DirectMessage[] = [];

  constructor() {
    this.loadChannels();
    this.loadDirectMessages();
  }

  // Load channels from localStorage
  private loadChannels(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.channels = JSON.parse(stored);
      } else {
        // Initialize with default channels
        this.initializeDefaultChannels();
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      this.initializeDefaultChannels();
    }
  }

  // Initialize default channels for new users
  private initializeDefaultChannels(): void {
    const userId = 'user-1'; // TODO: Get from auth service
    this.channels = DEFAULT_CHANNELS.map((channel, index) => ({
      ...channel,
      id: `channel-${Date.now()}-${index}`,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member_count: 1
    }));
    this.saveChannels();
  }

  // Save channels to localStorage
  private saveChannels(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.channels));
    } catch (error) {
      console.error('Failed to save channels:', error);
    }
  }

  // Load direct messages from localStorage and sync with living agents
  private async loadDirectMessages(): Promise<void> {
    try {
      const stored = localStorage.getItem(DM_STORAGE_KEY);
      if (stored) {
        this.directMessages = JSON.parse(stored);
      }
      
      // Sync with living agents
      await this.syncDirectMessagesWithAgents();
    } catch (error) {
      console.error('Failed to load direct messages:', error);
      await this.syncDirectMessagesWithAgents();
    }
  }

  // Sync direct messages with available living agents
  private async syncDirectMessagesWithAgents(): Promise<void> {
    try {
      const agents = await livingAgentService.getUserAgents('user-1'); // TODO: Get from auth
      const existingDMIds = new Set(this.directMessages.map(dm => dm.agentId));

      // Add DMs for new agents
      for (const agent of agents) {
        if (!existingDMIds.has(agent.agent_id)) {
          this.directMessages.push({
            id: `dm-${agent.agent_id}`,
            agentName: agent.name,
            agentId: agent.agent_id,
            isOnline: true, // Living agents are always "online"
            unreadCount: 0,
            agent: agent
          });
        }
      }

      // Update existing DMs with latest agent data
      this.directMessages = this.directMessages.map(dm => {
        const agent = agents.find(a => a.agent_id === dm.agentId);
        if (agent) {
          return {
            ...dm,
            agentName: agent.name,
            agent: agent,
            isOnline: true
          };
        }
        return dm;
      });

      this.saveDirectMessages();
    } catch (error) {
      console.error('Failed to sync direct messages with agents:', error);
    }
  }

  // Save direct messages to localStorage
  private saveDirectMessages(): void {
    try {
      localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(this.directMessages));
    } catch (error) {
      console.error('Failed to save direct messages:', error);
    }
  }

  // Get all channels
  getChannels(): Channel[] {
    return [...this.channels];
  }

  // Get all direct messages
  getDirectMessages(): DirectMessage[] {
    return [...this.directMessages];
  }

  // Get channel by ID
  getChannel(channelId: string): Channel | null {
    return this.channels.find(c => c.id === channelId) || null;
  }

  // Get direct message by agent ID
  getDirectMessage(agentId: string): DirectMessage | null {
    return this.directMessages.find(dm => dm.agentId === agentId) || null;
  }

  // Create new channel
  createChannel(request: ChannelCreateRequest): Channel {
    const userId = 'user-1'; // TODO: Get from auth service
    const newChannel: Channel = {
      id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: request.name.toLowerCase().replace(/\s+/g, '-'),
      displayName: `# ${request.name}`,
      description: request.description,
      icon: request.icon,
      color: request.color,
      primaryAgents: request.allowed_agents,
      type: 'channel',
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member_count: 1,
      is_private: request.is_private,
      auto_assign_agents: request.auto_assign_agents,
      allowed_agents: request.allowed_agents
    };

    this.channels.push(newChannel);
    this.saveChannels();
    return newChannel;
  }

  // Update existing channel
  updateChannel(channelId: string, request: ChannelUpdateRequest): Channel | null {
    const channelIndex = this.channels.findIndex(c => c.id === channelId);
    if (channelIndex === -1) return null;

    const channel = this.channels[channelIndex];
    const updatedChannel: Channel = {
      ...channel,
      ...(request.name && { 
        name: request.name.toLowerCase().replace(/\s+/g, '-'),
        displayName: `# ${request.name}`
      }),
      ...(request.description && { description: request.description }),
      ...(request.icon && { icon: request.icon }),
      ...(request.color && { color: request.color }),
      ...(request.is_private !== undefined && { is_private: request.is_private }),
      ...(request.auto_assign_agents !== undefined && { auto_assign_agents: request.auto_assign_agents }),
      ...(request.allowed_agents && { 
        allowed_agents: request.allowed_agents,
        primaryAgents: request.allowed_agents
      }),
      updated_at: new Date().toISOString()
    };

    this.channels[channelIndex] = updatedChannel;
    this.saveChannels();
    return updatedChannel;
  }

  // Delete channel
  deleteChannel(channelId: string): boolean {
    const channelIndex = this.channels.findIndex(c => c.id === channelId);
    if (channelIndex === -1) return false;

    this.channels.splice(channelIndex, 1);
    this.saveChannels();
    return true;
  }

  // Update unread count for DM
  updateDMUnreadCount(agentId: string, count: number): void {
    const dm = this.directMessages.find(dm => dm.agentId === agentId);
    if (dm) {
      dm.unreadCount = count;
      dm.lastActivity = new Date().toISOString();
      this.saveDirectMessages();
    }
  }

  // Update last message for DM
  updateDMLastMessage(agentId: string, message: string): void {
    const dm = this.directMessages.find(dm => dm.agentId === agentId);
    if (dm) {
      dm.lastMessage = message;
      dm.lastActivity = new Date().toISOString();
      this.saveDirectMessages();
    }
  }

  // Refresh direct messages from living agents
  async refreshDirectMessages(): Promise<void> {
    await this.syncDirectMessagesWithAgents();
  }

  // Get agents for a specific channel
  getChannelAgents(channelId: string): string[] {
    const channel = this.getChannel(channelId);
    if (!channel) return [];

    if (channel.auto_assign_agents) {
      // Return all available agents for auto-assign channels
      return []; // Will be populated by the component
    }

    return channel.allowed_agents;
  }

  // Check if user can create channels
  canCreateChannels(): boolean {
    return true; // TODO: Implement permission system
  }

  // Check if user can edit/delete a specific channel
  canEditChannel(channelId: string): boolean {
    const channel = this.getChannel(channelId);
    if (!channel) return false;
    
    const userId = 'user-1'; // TODO: Get from auth service
    return channel.created_by === userId;
  }
}

export const channelService = new ChannelService();
export default channelService; 