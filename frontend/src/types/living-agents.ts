/**
 * TypeScript types for Living Agent System
 * Replaces the old council system with dynamic, living agents
 */

// Core Living Agent Types
export interface LivingAgent {
  id: string;
  name: string;
  personality: string;
  specialization: string;
  avatar: string;
  color: string;
  status: 'active' | 'idle' | 'processing' | 'offline';
  mood: {
    energy: number; // 0-100
    focus: number;  // 0-100
    confidence: number; // 0-100
    social: number; // 0-100
    stress: number; // 0-100
  };
  capabilities: string[];
  memory: AgentMemory;
  stats: AgentStats;
}

export interface AgentMemory {
  shortTerm: string[];
  longTerm: string[];
  experiences: AgentExperience[];
}

export interface AgentExperience {
  id: string;
  type: 'interaction' | 'task' | 'learning' | 'social';
  description: string;
  timestamp: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0-10
}

export interface AgentStats {
  messagesProcessed: number;
  tasksCompleted: number;
  userSatisfaction: number; // 0-100
  collaborationScore: number; // 0-100
  innovationIndex: number; // 0-100
}

// Agent Response Types - Compatible with service layer
export interface AgentResponse {
  agent: any; // From livingAgentService
  response: string;
  processing_time: number;
  agent_state: any;
  mood_change?: {
    before: any;
    after: any;
    reason: string;
  };
  confidence?: number; // 0-100
  reasoning?: string;
  suggestions?: string[];
}

export interface AgentInteraction {
  id: string;
  timestamp: string;
  type: 'message' | 'task' | 'collaboration' | 'feedback';
  participants: string[]; // agent IDs
  content: string;
  outcome: 'success' | 'failure' | 'partial';
  impact: {
    mood_changes: Record<string, Partial<LivingAgent['mood']>>;
    learning: string[];
    relationships: Record<string, number>; // agent_id -> relationship_strength
  };
}

// Message Types
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  agent_response?: AgentResponse;
  sender?: string;
  agent_id?: string;
  agent_name?: string;
  metadata?: {
    channel?: string;
    thread_id?: string;
    reactions?: MessageReaction[];
    forwarded_from?: string;
  };
}

export interface MessageReaction {
  type: 'thumbs_up' | 'thumbs_down' | 'heart' | 'star' | 'laugh' | 'surprise';
  agent_id?: string;
  user_id?: string;
  timestamp: string;
}

// Channel and Communication Types
export interface Channel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'general' | 'specialized' | 'private';
  activeAgents: string[]; // agent IDs
  primaryAgents: string[]; // most active agents in this channel
  settings: {
    auto_response: boolean;
    collaboration_mode: 'individual' | 'group' | 'consensus';
    mood_influence: boolean;
  };
}

export interface DirectMessage {
  id: string;
  name: string;
  agent_id: string;
  agent: LivingAgent;
  last_activity: string;
  unread_count: number;
}

// Agent Network Types
export interface AgentNetwork {
  agents: LivingAgent[];
  relationships: AgentRelationship[];
  active_collaborations: AgentCollaboration[];
  network_health: NetworkHealth;
}

export interface AgentRelationship {
  agent1_id: string;
  agent2_id: string;
  strength: number; // 0-100
  type: 'mentor' | 'peer' | 'competitor' | 'complementary';
  interactions: number;
  last_interaction: string;
}

export interface AgentCollaboration {
  id: string;
  agents: string[]; // agent IDs
  task: string;
  status: 'planning' | 'active' | 'completed' | 'failed';
  start_time: string;
  expected_completion: string;
  progress: number; // 0-100
}

export interface NetworkHealth {
  overall_score: number; // 0-100
  agent_satisfaction: number; // 0-100
  collaboration_efficiency: number; // 0-100
  network_resilience: number; // 0-100
  innovation_rate: number; // 0-100
}

// UI State Types
export interface AppState {
  agents: LivingAgent[];
  messages: ChatMessage[];
  activeChannel: string;
  activeAgent?: string;
  interactionMode: InteractionMode;
  networkStatus: NetworkHealth;
}

export interface InteractionMode {
  type: 'chat' | 'collaboration' | 'training' | 'simulation';
  settings: {
    auto_respond: boolean;
    mood_enabled: boolean;
    learning_enabled: boolean;
    multi_agent: boolean;
  };
}

// Utility Types
export type AgentMoodKey = keyof LivingAgent['mood'];
export type AgentStatusType = LivingAgent['status'];
export type MessageType = ChatMessage['type'];
export type ReactionType = MessageReaction['type']; 