/**
 * TypeScript types for Intelligence Empire Council System
 */

export interface CouncilMember {
  name: string;
  role: string;
  status: 'active' | 'inactive';
  expertise: string[];
  personality_traits?: {
    communication_style: string;
    decision_framework: string;
    vocabulary: string[];
    response_patterns: string[];
    expertise: string[];
  };
}

export interface CouncilResponse {
  member_name: string;
  role: string;
  message: string;
  confidence_level: number;
  reasoning: string;
  suggested_actions: string[];
  timestamp: string;
}

export interface IntelligenceResponse {
  query: string;
  council_responses: CouncilResponse[];
  synthesis: string;
  recommended_actions: string[];
  confidence_score: number;
  processing_time: number;
  timestamp: string;
  response_type?: string;  // "council" or "individual"
  channel_id?: string;
  channel_type?: string;   // "channel" or "dm"
}

export interface CouncilQueryRequest {
  message: string;
  requested_members?: string[];
  context?: Record<string, any>;
}

export interface CouncilQueryResponse {
  success: boolean;
  response?: IntelligenceResponse;
  error?: string;
}

export interface CouncilStatus {
  members: Record<string, CouncilMember>;
  total_members: number;
  active_members: number;
}

export interface WebSocketMessage {
  type: 'connection' | 'processing' | 'response' | 'error' | 'ping' | 'pong';
  message?: string;
  data?: IntelligenceResponse;
  timestamp: string;
}

export interface ConversationHistory {
  query: string;
  synthesis: string;
  confidence_score: number;
  timestamp: string;
  council_members: string[];
}

// UI State Types
export interface ChatMessage {
  id: string;
  type: 'user' | 'council' | 'system' | 'forwarded' | 'agent' | 'synthesis' | 'actions';
  content: string;
  timestamp: string;
  sender?: string;
  agent_name?: string;  // For agent messages
  agent_role?: string;  // For agent messages  
  workflow_step?: 'response' | 'synthesis' | 'actions';  // For workflow tracking
  council_response?: IntelligenceResponse;
  reply_to?: {
    id: string;
    sender: string;
    content: string;
  };
  forwarded_from?: {
    channel_id: string;
    channel_name: string;
    original_sender: string;
  };
  is_deleted?: boolean;
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  reconnectAttempts: number;
}

// Council Member Avatars and Colors
export const COUNCIL_MEMBERS = {
  sarah: {
    name: 'Sarah Chen',
    role: 'Product Strategy',
    color: 'bg-blue-500',
    avatar: '📊',
    description: 'Strategic & User-Focused Product Manager'
  },
  marcus: {
    name: 'Marcus Rodriguez', 
    role: 'Market Intelligence',
    color: 'bg-green-500',
    avatar: '🔍',
    description: 'Opportunistic & Market-Savvy Business Development'
  },
  elena: {
    name: 'Elena Vasquez',
    role: 'UX Design',
    color: 'bg-purple-500',
    avatar: '🎨',
    description: 'Creative & User-Empathetic Designer'
  },
  david: {
    name: 'David Kim',
    role: 'Operations',
    color: 'bg-orange-500',
    avatar: '⚙️',
    description: 'Organized & Process-Oriented Operations Manager'
  }
} as const;

export type CouncilMemberKey = keyof typeof COUNCIL_MEMBERS; 