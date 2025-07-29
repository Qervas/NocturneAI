import { abilityManager } from '../../services/AbilityManager';

// Chat message interface
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  messageType: 'text' | 'file' | 'image' | 'system';
  metadata?: {
    fileSize?: number;
    fileName?: string;
    fileType?: string;
    url?: string;
  };
}

// Chat session interface
export interface ChatSession {
  id: string;
  participants: string[];
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  sessionType: 'direct' | 'group' | 'broadcast';
  maxParticipants?: number;
}

// Multi-agent chat configuration
export interface MultiAgentChatConfig {
  maxParticipants: number;
  maxMessageLength: number;
  allowFileSharing: boolean;
  allowImageSharing: boolean;
  messageHistoryLimit: number;
  autoArchiveAfter: number; // minutes
  enableModeration: boolean;
  enableTranslation: boolean;
  defaultLanguage: string;
  allowAnonymous: boolean;
}

// Communication modes
export const COMMUNICATION_MODES = {
  direct: {
    id: 'direct',
    name: 'Direct Message',
    description: 'One-on-one conversation between two agents',
    maxParticipants: 2,
    supportsFiles: true,
    supportsImages: true
  },
  group: {
    id: 'group',
    name: 'Group Chat',
    description: 'Multi-agent group conversation',
    maxParticipants: 10,
    supportsFiles: true,
    supportsImages: true
  },
  broadcast: {
    id: 'broadcast',
    name: 'Broadcast',
    description: 'One-to-many announcement system',
    maxParticipants: 50,
    supportsFiles: false,
    supportsImages: false
  },
  forum: {
    id: 'forum',
    name: 'Forum Discussion',
    description: 'Structured discussion with topics',
    maxParticipants: 100,
    supportsFiles: true,
    supportsImages: true
  }
};

// Default configuration
export const DEFAULT_MULTI_AGENT_CHAT_CONFIG: MultiAgentChatConfig = {
  maxParticipants: 10,
  maxMessageLength: 1000,
  allowFileSharing: true,
  allowImageSharing: true,
  messageHistoryLimit: 100,
  autoArchiveAfter: 60, // 1 hour
  enableModeration: true,
  enableTranslation: false,
  defaultLanguage: 'en',
  allowAnonymous: false
};

export class MultiAgentChatAbility {
  id = 'multi_agent_chat';
  name = 'Multi-Agent Chat';
  description = 'Enable communication between multiple agents with various modes and features';
  category = 'communication';
  config: MultiAgentChatConfig;
  private sessions: Map<string, ChatSession> = new Map();

  constructor(config: Partial<MultiAgentChatConfig> = {}) {
    this.config = { ...DEFAULT_MULTI_AGENT_CHAT_CONFIG, ...config };
  }

  canExecute(params: any): boolean {
    if (!params.action) {
			return false;
		}
		
    const { action, sessionId, participants, message } = params;
    
    switch (action) {
      case 'create_session':
        return this.canCreateSession(participants);
      case 'send_message':
        return this.canSendMessage(sessionId, message);
      case 'join_session':
        return this.canJoinSession(sessionId);
      case 'leave_session':
        return this.canLeaveSession(sessionId);
      default:
        return false;
    }
  }

  async execute(params: any): Promise<any> {
    try {
      const { action, sessionId, participants, message, senderId, sessionType } = params;
      
      switch (action) {
        case 'create_session':
          return await this.createSession(participants, sessionType, senderId);
        case 'send_message':
          return await this.sendMessage(sessionId, senderId, message);
        case 'join_session':
          return await this.joinSession(sessionId, senderId);
        case 'leave_session':
          return await this.leaveSession(sessionId, senderId);
        case 'get_session_info':
          return await this.getSessionInfo(sessionId);
        case 'get_message_history':
          return await this.getMessageHistory(sessionId);
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Multi-agent chat operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private canCreateSession(participants: string[]): boolean {
    if (!participants || participants.length < 2) {
			return false;
		}
		
    return participants.length <= this.config.maxParticipants;
  }

  private canSendMessage(sessionId: string, message: any): boolean {
    if (!sessionId || !message) {
			return false;
		}
		
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
			return false;
		}
		
    const content = typeof message === 'string' ? message : message.content;
    return content && content.length <= this.config.maxMessageLength;
  }

  private canJoinSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.isActive : false;
  }

  private canLeaveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.isActive : false;
  }

  private async createSession(participants: string[], sessionType: string = 'group', creatorId: string): Promise<any> {
    const mode = COMMUNICATION_MODES[sessionType as keyof typeof COMMUNICATION_MODES];
    if (!mode) {
      return {
        success: false,
        error: `Invalid session type: ${sessionType}`
      };
    }

    if (participants.length > mode.maxParticipants) {
      return {
        success: false,
        error: `Too many participants for ${sessionType} mode (max: ${mode.maxParticipants})`
      };
    }

    const sessionId = this.generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      participants: [...participants],
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      sessionType: sessionType as any,
      maxParticipants: mode.maxParticipants
    };

    this.sessions.set(sessionId, session);

    return {
      success: true,
      sessionId,
      session: {
        id: sessionId,
        participants: session.participants,
        sessionType: session.sessionType,
        createdAt: session.createdAt,
        maxParticipants: session.maxParticipants
      }
    };
  }

  private async sendMessage(sessionId: string, senderId: string, message: any): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    if (!session.participants.includes(senderId)) {
      return {
        success: false,
        error: 'Sender is not a participant in this session'
      };
    }

    const content = typeof message === 'string' ? message : message.content;
    const messageType = message.type || 'text';
    const metadata = message.metadata;
			
			// Validate message
    if (!content || content.length > this.config.maxMessageLength) {
      return {
        success: false,
        error: `Message too long (max: ${this.config.maxMessageLength} characters)`
      };
    }

    // Check file sharing permissions
    if (messageType === 'file' && !this.config.allowFileSharing) {
      return {
        success: false,
        error: 'File sharing is not allowed'
      };
			}
			
    if (messageType === 'image' && !this.config.allowImageSharing) {
      return {
        success: false,
        error: 'Image sharing is not allowed'
      };
			}
			
    // Create message
    const chatMessage: ChatMessage = {
      id: this.generateMessageId(),
      senderId,
      senderName: this.getAgentName(senderId),
      content,
      timestamp: new Date(),
      messageType: messageType as any,
      metadata
    };
			
    // Add to session
    session.messages.push(chatMessage);
    session.lastActivity = new Date();

    // Limit message history
    if (session.messages.length > this.config.messageHistoryLimit) {
      session.messages = session.messages.slice(-this.config.messageHistoryLimit);
    }
			
			return {
				success: true,
      messageId: chatMessage.id,
      message: {
        id: chatMessage.id,
        senderId: chatMessage.senderId,
        senderName: chatMessage.senderName,
        content: chatMessage.content,
        timestamp: chatMessage.timestamp,
        messageType: chatMessage.messageType
      }
    };
  }

  private async joinSession(sessionId: string, agentId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    if (session.participants.includes(agentId)) {
      return {
        success: false,
        error: 'Agent is already a participant'
      };
    }

    if (session.participants.length >= (session.maxParticipants || this.config.maxParticipants)) {
			return {
				success: false,
        error: 'Session is full'
      };
    }

    session.participants.push(agentId);
    session.lastActivity = new Date();

    return {
      success: true,
      sessionId,
      participants: session.participants
    };
  }

  private async leaveSession(sessionId: string, agentId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    const index = session.participants.indexOf(agentId);
    if (index === -1) {
      return {
        success: false,
        error: 'Agent is not a participant in this session'
      };
    }

    session.participants.splice(index, 1);
    session.lastActivity = new Date();
	
    // Archive session if no participants left
    if (session.participants.length === 0) {
      session.isActive = false;
    }

    return {
      success: true,
      sessionId,
      participants: session.participants
    };
  }

  private async getSessionInfo(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    return {
      success: true,
      session: {
        id: session.id,
        participants: session.participants,
        sessionType: session.sessionType,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isActive: session.isActive,
        messageCount: session.messages.length,
        maxParticipants: session.maxParticipants
      }
    };
  }

  private async getMessageHistory(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
	}
	
	return {
      success: true,
      messages: session.messages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        timestamp: msg.timestamp,
        messageType: msg.messageType
      }))
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAgentName(agentId: string): string {
    // This would be implemented to get actual agent names
    // For now, return a formatted agent ID
    return `Agent_${agentId}`;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<MultiAgentChatConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  archiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      return true;
    }
    return false;
  }

  getSupportedModes(): typeof COMMUNICATION_MODES {
    return COMMUNICATION_MODES;
  }
}

// Create and register the ability
const multiAgentChatAbility = new MultiAgentChatAbility();
abilityManager.registerAbility(multiAgentChatAbility);

export { multiAgentChatAbility }; 