// Agent Communication Protocol Types

export type MessageType = 
  | 'user_message'     // User talking to agent
  | 'agent_request'    // Agent asking another agent for help
  | 'agent_response'   // Agent responding to another agent
  | 'agent_broadcast'  // Agent sharing info with all agents
  | 'agent_thinking'   // Agent expressing internal thoughts
  | 'system_event';    // System notifications

export type CommunicationIntent = 
  | 'question'         // Asking for information
  | 'request_help'     // Requesting assistance with a task
  | 'share_info'       // Sharing knowledge or data
  | 'collaborate'      // Proposing joint work
  | 'social_chat'      // Casual conversation
  | 'challenge'        // Intellectual challenge or debate
  | 'acknowledge'      // Confirming receipt/understanding
  | 'suggest'          // Making a suggestion
  | 'compliment'       // Positive social interaction
  | 'critique';        // Constructive feedback

export interface AgentMessage {
  id: string;
  timestamp: Date;
  fromAgent: string;
  toAgent?: string;        // undefined = broadcast to all
  messageType: MessageType;
  intent: CommunicationIntent;
  content: string;
  context?: any;           // Additional context data
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requiresResponse?: boolean;
  responseDeadline?: Date;
  conversationId?: string; // For threading related messages
  metadata?: {
    confidence?: number;   // How confident the agent is
    expertise?: string;    // Relevant expertise area
    emotion?: string;      // Emotional tone
    urgency?: number;      // 1-10 scale
  };
}

export interface AgentConversation {
  id: string;
  participants: string[];
  topic: string;
  startTime: Date;
  lastActivity: Date;
  messages: AgentMessage[];
  status: 'active' | 'paused' | 'completed';
  summary?: string;
}

export interface AgentRelationship {
  agentA: string;
  agentB: string;
  relationshipType: 'colleague' | 'mentor' | 'student' | 'rival' | 'collaborator';
  trustLevel: number;      // 0-1 scale
  collaborationHistory: number; // Number of successful collaborations
  lastInteraction: Date;
  notes?: string;
}

export interface AgentSocialNetwork {
  agents: string[];
  relationships: AgentRelationship[];
  activeConversations: AgentConversation[];
  messageHistory: AgentMessage[];
}

// Communication Templates for different agent personalities
export interface CommunicationStyle {
  agentId: string;
  formalityLevel: 'casual' | 'professional' | 'formal';
  verbosity: 'concise' | 'moderate' | 'detailed';
  helpfulness: number;     // 0-1 scale
  proactivity: number;     // How likely to initiate conversations
  socialness: number;      // How much they engage in casual chat
  preferredTopics: string[];
  communicationPatterns: {
    greeting: string[];
    helpOffer: string[];
    requestHelp: string[];
    acknowledgment: string[];
    farewell: string[];
  };
}
