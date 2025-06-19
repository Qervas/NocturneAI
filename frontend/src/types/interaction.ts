export interface AgentAbility {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'cognitive' | 'output' | 'style';
}

export interface InteractionProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  abilities: string[];
  isAutoMode?: boolean;
  computationalLevel?: 'passive' | 'active' | 'autonomous';
}

// Core agent abilities that can be dynamically combined
export const AGENT_ABILITIES: Record<string, AgentAbility> = {
  'synthesis': {
    id: 'synthesis',
    name: 'Synthesis',
    description: 'Combine multiple perspectives and insights',
    icon: '🔗',
    category: 'cognitive'
  },
  'actions': {
    id: 'actions',
    name: 'Action Items',
    description: 'Generate concrete next steps and recommendations',
    icon: '✅',
    category: 'output'
  },
  'deep_thinking': {
    id: 'deep_thinking',
    name: 'Deep Analysis',
    description: 'Thorough analytical reasoning and problem-solving',
    icon: '🧠',
    category: 'cognitive'
  },
  'creative_ideation': {
    id: 'creative_ideation',
    name: 'Creative Ideation',
    description: 'Brainstorming and innovative thinking',
    icon: '💡',
    category: 'cognitive'
  },
  'strategic_analysis': {
    id: 'strategic_analysis',
    name: 'Strategic Planning',
    description: 'Long-term strategic thinking and market analysis',
    icon: '🎯',
    category: 'cognitive'
  },
  'quick_response': {
    id: 'quick_response',
    name: 'Quick Response',
    description: 'Fast, focused answers without deep analysis',
    icon: '⚡',
    category: 'style'
  },
  'structured_output': {
    id: 'structured_output',
    name: 'Structured Format',
    description: 'Organized, formatted responses with clear sections',
    icon: '📋',
    category: 'output'
  },
  'conversational': {
    id: 'conversational',
    name: 'Conversational',
    description: 'Natural, engaging dialogue with personality',
    icon: '💬',
    category: 'style'
  },
  'data_driven': {
    id: 'data_driven',
    name: 'Data-Driven',
    description: 'Evidence-based responses with metrics and research',
    icon: '📊',
    category: 'cognitive'
  },
  'collaborative': {
    id: 'collaborative',
    name: 'Collaborative',
    description: 'Interactive discussion and follow-up questions',
    icon: '🤝',
    category: 'style'
  }
};

// Agent computational modes - focus on intensity rather than personality
export const INTERACTION_PROFILES: Record<string, InteractionProfile> = {
  'auto_mode': {
    id: 'auto_mode',
    name: 'Auto Mode',
    description: 'Let agents intelligently choose their computational approach',
    icon: '🤖',
    abilities: [], // Empty - agents decide dynamically
    isAutoMode: true,
    computationalLevel: 'active'
  },
  'passive_mode': {
    id: 'passive_mode',
    name: 'Passive Mode',
    description: 'Low computational power - quick responses, basic processing',
    icon: '💤',
    abilities: ['conversational', 'quick_response'],
    computationalLevel: 'passive'
  },
  'active_mode': {
    id: 'active_mode',
    name: 'Active Mode',
    description: 'Medium computational power - balanced analysis and synthesis',
    icon: '⚡',
    abilities: ['conversational', 'synthesis', 'actions', 'collaborative'],
    computationalLevel: 'active'
  },
  'autonomous_mode': {
    id: 'autonomous_mode',
    name: 'Autonomous Mode',
    description: 'High computational power - full autonomy with deep analysis',
    icon: '🚀',
    abilities: ['deep_thinking', 'strategic_analysis', 'data_driven', 'synthesis', 'actions', 'structured_output'],
    computationalLevel: 'autonomous'
  }
};

export interface ChatContext {
  interactionProfile: string;
  enabledAbilities: string[];
  channelId: string;
  channelType: 'channel' | 'dm';
  previousMessages: number;
  lastActivity: string;
  computationalLevel?: 'passive' | 'active' | 'autonomous';
  userPreferences?: {
    preferredResponseStyle?: 'concise' | 'detailed' | 'balanced';
    expertiseLevel?: 'beginner' | 'intermediate' | 'expert';
  };
}

export type ResponsePattern = 'adaptive' | 'structured' | 'conversational' | 'synthesis_focused' | 'action_oriented'; 