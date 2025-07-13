export interface InteractionMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  hasActions: boolean;
  hasStrategicSynthesis: boolean;
  responseStyle: 'casual' | 'structured' | 'formal';
}

export const INTERACTION_MODES: Record<string, InteractionMode> = {
  'casual_chat': {
    id: 'casual_chat',
    name: 'Casual Chat',
    description: 'Quick, conversational responses without formal structure',
    icon: '💬',
    hasActions: false,
    hasStrategicSynthesis: false,
    responseStyle: 'casual'
  },
  'strategic_brief': {
    id: 'strategic_brief',
    name: 'Strategic Brief',
    description: 'Structured analysis with recommended actions',
    icon: '📋',
    hasActions: true,
    hasStrategicSynthesis: true,
    responseStyle: 'structured'
  },
  'quick_consult': {
    id: 'quick_consult',
    name: 'Quick Consult',
    description: 'Focused expertise with minimal actions',
    icon: '⚡',
    hasActions: true,
    hasStrategicSynthesis: false,
    responseStyle: 'formal'
  },
  'brainstorm': {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Creative ideation with multiple perspectives',
    icon: '🧠',
    hasActions: false,
    hasStrategicSynthesis: true,
    responseStyle: 'casual'
  },
  'formal_analysis': {
    id: 'formal_analysis',
    name: 'Formal Analysis',
    description: 'Comprehensive analysis with full synthesis and actions',
    icon: '📊',
    hasActions: true,
    hasStrategicSynthesis: true,
    responseStyle: 'formal'
  }
};

export interface ChatContext {
  interactionMode: string;
  channelId: string;
  channelType: 'channel' | 'dm';
  previousMessages: number;
  lastActivity: string;
}

export type ResponsePattern = 'casual' | 'structured' | 'actions_only' | 'synthesis_only' | 'full'; 