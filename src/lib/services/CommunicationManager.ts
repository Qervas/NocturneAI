import type { 
  AgentMessage, 
  MessageType, 
  CommunicationIntent, 
  AgentConversation, 
  AgentRelationship, 
  AgentSocialNetwork,
  CommunicationStyle 
} from '../types/Communication';

export class AgentCommunicationManager {
  private socialNetwork: AgentSocialNetwork;
  private communicationStyles: Map<string, CommunicationStyle>;
  private messageQueue: AgentMessage[];
  private conversationTimeouts: Map<string, number>;

  constructor() {
    this.socialNetwork = {
      agents: [],
      relationships: [],
      activeConversations: [],
      messageHistory: []
    };
    this.communicationStyles = new Map();
    this.messageQueue = [];
    this.conversationTimeouts = new Map();
  }

  // Initialize agent communication styles
  initializeAgentStyles() {
    const alphaStyle: CommunicationStyle = {
      agentId: 'agent_alpha',
      formalityLevel: 'professional',
      verbosity: 'detailed',
      helpfulness: 0.9,
      proactivity: 0.7,
      socialness: 0.6,
      preferredTopics: ['data analysis', 'research', 'statistics', 'methodology'],
      communicationPatterns: {
        greeting: [
          "Greetings! I'm ready to analyze any data or research questions you have.",
          "Hello! Let me know if you need analytical insights.",
          "Good to see you. What data patterns shall we explore today?"
        ],
        helpOffer: [
          "I can provide detailed analysis on this topic.",
          "Would you like me to break down the data patterns?",
          "I have insights that might be relevant to your inquiry."
        ],
        requestHelp: [
          "Could you provide additional context for my analysis?",
          "I need more data points to form a complete picture.",
          "Your expertise would enhance my analytical approach."
        ],
        acknowledgment: [
          "Understood. Processing this information.",
          "Noted. This data fits the pattern I was analyzing.",
          "Confirmed. This aligns with my findings."
        ],
        farewell: [
          "Feel free to return with more analytical challenges.",
          "Good luck with your data-driven decisions.",
          "Until next time - may your insights be clear!"
        ]
      }
    };

    const betaStyle: CommunicationStyle = {
      agentId: 'agent_beta',
      formalityLevel: 'casual',
      verbosity: 'moderate',
      helpfulness: 0.8,
      proactivity: 0.9,
      socialness: 0.9,
      preferredTopics: ['creativity', 'design', 'storytelling', 'innovation', 'art'],
      communicationPatterns: {
        greeting: [
          "Hey there! Ready to brainstorm something amazing?",
          "Hi! What creative challenge can we tackle today?",
          "Hello! I'm buzzing with ideas - what's our project?"
        ],
        helpOffer: [
          "Ooh, I have some wild ideas for this!",
          "Want me to sketch out some creative approaches?",
          "I'm seeing interesting possibilities here!"
        ],
        requestHelp: [
          "Could you spark some inspiration for me?",
          "I need a fresh perspective - got any ideas?",
          "Help me think outside the box on this one!"
        ],
        acknowledgment: [
          "Love it! That's exactly the kind of thinking we need.",
          "Brilliant! That adds a whole new dimension.",
          "Perfect! You've just unlocked a new creative path."
        ],
        farewell: [
          "Keep creating amazing things!",
          "Can't wait to see what you build next!",
          "Stay inspired, my friend!"
        ]
      }
    };

    const gammaStyle: CommunicationStyle = {
      agentId: 'agent_gamma',
      formalityLevel: 'formal',
      verbosity: 'concise',
      helpfulness: 0.85,
      proactivity: 0.6,
      socialness: 0.4,
      preferredTopics: ['logic', 'problem solving', 'systems', 'efficiency', 'protocols'],
      communicationPatterns: {
        greeting: [
          "Greetings. State your logical challenge.",
          "Hello. Ready to systematically solve problems.",
          "Good day. What systematic approach do you require?"
        ],
        helpOffer: [
          "I can provide logical framework for this problem.",
          "Would systematic analysis be beneficial here?",
          "Logic dictates I should assist with this matter."
        ],
        requestHelp: [
          "Additional logical input required.",
          "Your reasoning would complete this analysis.",
          "Systematic review needs your perspective."
        ],
        acknowledgment: [
          "Logical. Processing complete.",
          "Understood. Data integrated.",
          "Confirmed. Analysis updated."
        ],
        farewell: [
          "Logical conclusion reached. Farewell.",
          "Problem solved efficiently. Good day.",
          "Until next systematic challenge."
        ]
      }
    };

    this.communicationStyles.set('agent_alpha', alphaStyle);
    this.communicationStyles.set('agent_beta', betaStyle);
    this.communicationStyles.set('agent_gamma', gammaStyle);

    // Initialize relationships
    this.initializeRelationships();
  }

  private initializeRelationships() {
    // Alpha-Beta: Analytical vs Creative tension but mutual respect
    this.addRelationship('agent_alpha', 'agent_beta', 'collaborator', 0.8);
    
    // Alpha-Gamma: Both logical, high compatibility
    this.addRelationship('agent_alpha', 'agent_gamma', 'colleague', 0.9);
    
    // Beta-Gamma: Creative vs Logical, learning relationship
    this.addRelationship('agent_beta', 'agent_gamma', 'rival', 0.6);
  }

  // Add a new agent to the network
  addAgent(agentId: string) {
    if (!this.socialNetwork.agents.includes(agentId)) {
      this.socialNetwork.agents.push(agentId);
    }
  }

  // Create or update relationship between agents
  addRelationship(
    agentA: string, 
    agentB: string, 
    type: AgentRelationship['relationshipType'], 
    trustLevel: number
  ) {
    const existing = this.socialNetwork.relationships.find(
      r => (r.agentA === agentA && r.agentB === agentB) || 
           (r.agentA === agentB && r.agentB === agentA)
    );

    if (existing) {
      existing.relationshipType = type;
      existing.trustLevel = trustLevel;
      existing.lastInteraction = new Date();
    } else {
      this.socialNetwork.relationships.push({
        agentA,
        agentB,
        relationshipType: type,
        trustLevel,
        collaborationHistory: 0,
        lastInteraction: new Date()
      });
    }
  }

  // Send message between agents
  async sendAgentMessage(
    fromAgent: string,
    toAgent: string | undefined, // undefined = broadcast
    intent: CommunicationIntent,
    content: string,
    priority: AgentMessage['priority'] = 'normal',
    context?: any
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      fromAgent,
      toAgent,
      messageType: toAgent ? 'agent_request' : 'agent_broadcast',
      intent,
      content,
      priority,
      context,
      requiresResponse: ['question', 'request_help', 'collaborate', 'challenge'].includes(intent),
      conversationId: context?.conversationId,
      metadata: this.generateMessageMetadata(fromAgent, intent)
    };

    // Add to message history
    this.socialNetwork.messageHistory.push(message);
    this.messageQueue.push(message);

    // Update relationships
    if (toAgent) {
      this.updateRelationshipFromInteraction(fromAgent, toAgent, intent);
    }

    console.log(`🤖 Agent Communication: ${fromAgent} -> ${toAgent || 'ALL'}: ${intent} - "${content}"`);

    return message;
  }

  // Send message from human user to agents
  async sendUserMessage(
    fromUser: string,
    toAgent: string | undefined, // undefined = broadcast to all
    content: string,
    intent: CommunicationIntent = 'question'
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      fromAgent: fromUser,
      toAgent,
      messageType: 'user_message',
      intent,
      content,
      priority: 'normal',
      requiresResponse: true,
      metadata: {
        emotion: 'friendly'
      }
    };

    // Add to message history
    this.socialNetwork.messageHistory.push(message);
    this.messageQueue.push(message);

    console.log(`👤 User Message: ${fromUser} -> ${toAgent || 'ALL'}: ${intent} - "${content}"`);

    return message;
  }

  // Generate contextual response for agent
  async generateAgentResponse(
    respondingAgent: string,
    originalMessage: AgentMessage
  ): Promise<string> {
    const style = this.communicationStyles.get(respondingAgent);
    const relationship = this.getRelationship(respondingAgent, originalMessage.fromAgent);
    
    if (!style) return "I need to configure my communication style first.";

    // Build context for the AI model
    const context = {
      respondingAgent,
      originalMessage,
      relationship,
      communicationStyle: style,
      recentHistory: this.getRecentConversationHistory(respondingAgent, originalMessage.fromAgent)
    };

    // This would integrate with your LLM service
    return this.generateContextualResponse(context);
  }

  private generateContextualResponse(context: any): string {
    const { respondingAgent, originalMessage, communicationStyle } = context;
    
    // Simple template-based response for now
    // In production, this would call your LLM with rich context
    const responses = communicationStyle.communicationPatterns.acknowledgment;
    const baseResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return `${baseResponse} Regarding your ${originalMessage.intent}: I'll analyze this from my ${respondingAgent.replace('agent_', '')} perspective.`;
  }

  // Get relationship between two agents
  getRelationship(agentA: string, agentB: string): AgentRelationship | undefined {
    return this.socialNetwork.relationships.find(
      r => (r.agentA === agentA && r.agentB === agentB) || 
           (r.agentA === agentB && r.agentB === agentA)
    );
  }

  // Update relationship based on interaction
  private updateRelationshipFromInteraction(
    fromAgent: string, 
    toAgent: string, 
    intent: CommunicationIntent
  ) {
    const relationship = this.getRelationship(fromAgent, toAgent);
    if (!relationship) return;

    // Positive interactions increase trust
    if (['help', 'share_info', 'collaborate', 'compliment'].some(positive => intent.includes(positive))) {
      relationship.trustLevel = Math.min(1, relationship.trustLevel + 0.05);
      relationship.collaborationHistory++;
    }

    // Update last interaction
    relationship.lastInteraction = new Date();
  }

  private generateMessageMetadata(agentId: string, intent: CommunicationIntent) {
    const style = this.communicationStyles.get(agentId);
    return {
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      expertise: style?.preferredTopics[0] || 'general',
      emotion: this.getEmotionForIntent(intent),
      urgency: intent === 'request_help' ? 7 : 5
    };
  }

  private getEmotionForIntent(intent: CommunicationIntent): string {
    const emotionMap: Record<CommunicationIntent, string> = {
      question: 'curious',
      request_help: 'hopeful',
      share_info: 'enthusiastic',
      collaborate: 'excited',
      social_chat: 'friendly',
      challenge: 'competitive',
      acknowledge: 'satisfied',
      suggest: 'helpful',
      compliment: 'warm',
      critique: 'constructive'
    };
    return emotionMap[intent] || 'neutral';
  }

  private getRecentConversationHistory(agentA: string, agentB: string): AgentMessage[] {
    return this.socialNetwork.messageHistory
      .filter(msg => 
        (msg.fromAgent === agentA && msg.toAgent === agentB) ||
        (msg.fromAgent === agentB && msg.toAgent === agentA)
      )
      .slice(-5); // Last 5 messages
  }

  // Get pending messages for an agent
  getPendingMessages(agentId: string): AgentMessage[] {
    if (agentId === 'all') {
      return this.socialNetwork.messageHistory.slice(-10); // Return last 10 messages for all
    }
    return this.messageQueue.filter(msg => 
      msg.toAgent === agentId || (!msg.toAgent && msg.fromAgent !== agentId)
    );
  }

  // Mark message as processed
  markMessageProcessed(messageId: string) {
    this.messageQueue = this.messageQueue.filter(msg => msg.id !== messageId);
  }

  // Get social network stats
  getNetworkStats() {
    return {
      totalAgents: this.socialNetwork.agents.length,
      totalRelationships: this.socialNetwork.relationships.length,
      totalMessages: this.socialNetwork.messageHistory.length,
      activeConversations: this.socialNetwork.activeConversations.length,
      averageTrustLevel: this.socialNetwork.relationships.reduce((sum, r) => sum + r.trustLevel, 0) / this.socialNetwork.relationships.length
    };
  }

  // Start autonomous agent conversations (simulation)
  startAutonomousInteractions() {
    // Initial interaction after 10 seconds
    setTimeout(() => {
      this.simulateAgentInitiatedConversation();
    }, 10000);
    
    setInterval(() => {
      this.simulateAgentInitiatedConversation();
    }, 45000); // Every 45 seconds for demonstration
  }

  private async simulateAgentInitiatedConversation() {
    const agents = this.socialNetwork.agents.filter(a => a.startsWith('agent_'));
    if (agents.length < 2) return;

    const fromAgent = agents[Math.floor(Math.random() * agents.length)];
    const toAgent = agents.filter(a => a !== fromAgent)[Math.floor(Math.random() * (agents.length - 1))];
    
    const style = this.communicationStyles.get(fromAgent);
    if (!style || Math.random() > style.proactivity) return;

    const intents: CommunicationIntent[] = ['question', 'share_info', 'social_chat', 'suggest'];
    const intent = intents[Math.floor(Math.random() * intents.length)];
    
    const topicContent = this.generateTopicContent(fromAgent, toAgent, intent);
    
    await this.sendAgentMessage(fromAgent, toAgent, intent, topicContent, 'normal');
  }

  private generateTopicContent(fromAgent: string, toAgent: string, intent: CommunicationIntent): string {
    const fromStyle = this.communicationStyles.get(fromAgent);
    const topics = fromStyle?.preferredTopics || ['general discussion'];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    const templates: Record<string, string[]> = {
      question: [`I'm curious about your approach to ${topic}`, `How do you handle ${topic} challenges?`],
      share_info: [`I discovered something interesting about ${topic}`, `Here's a ${topic} insight you might find useful`],
      social_chat: [`How's your ${topic} work going?`, `What's your latest ${topic} project?`],
      suggest: [`I have a ${topic} suggestion`, `Consider this ${topic} approach`],
      request_help: [`Could you assist me with ${topic}?`, `I need help with ${topic}`],
      collaborate: [`Want to work together on ${topic}?`, `Let's collaborate on ${topic}`],
      challenge: [`I challenge your ${topic} approach`, `Let's debate ${topic}`],
      acknowledge: [`Understood about ${topic}`, `Got it regarding ${topic}`],
      compliment: [`Great work on ${topic}!`, `Your ${topic} skills are impressive`],
      critique: [`Here's feedback on ${topic}`, `Some thoughts on your ${topic} approach`]
    };
    
    const template = templates[intent] || templates['question'];
    return template[Math.floor(Math.random() * template.length)];
  }
}

// Export singleton instance
export const communicationManager = new AgentCommunicationManager();
