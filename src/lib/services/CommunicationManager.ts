import type {
  AgentMessage,
  MessageType,
  CommunicationIntent,
  AgentConversation,
  AgentRelationship,
  AgentSocialNetwork,
  CommunicationStyle,
} from "../types/Communication";
import { characterManager } from "./CharacterManager";
import type { NPCAgent } from "../types/Character";

interface ActiveConnection {
  participants: [string, string];
  topic: string;
  startTime: Date;
  lastExchange: Date;
  messageCount: number;
  intensity: number; // 0-1, how engaged they are
  plannedDuration: number; // milliseconds
  connectionId: string;
}

export class AgentCommunicationManager {
  private socialNetwork: AgentSocialNetwork;
  private communicationStyles: Map<string, CommunicationStyle>;
  private messageQueue: AgentMessage[];
  private conversationTimeouts: Map<string, number>;
  private activeConnections: Map<string, ActiveConnection>;
  private conversationCooldowns: Map<string, number>;

  constructor() {
    this.socialNetwork = {
      agents: [],
      relationships: [],
      activeConversations: [],
      messageHistory: [],
    };
    this.communicationStyles = new Map();
    this.messageQueue = [];
    this.conversationTimeouts = new Map();
    this.activeConnections = new Map();
    this.conversationCooldowns = new Map();
  }

  // Initialize agent communication styles
  initializeAgentStyles() {
    const alphaStyle: CommunicationStyle = {
      agentId: "agent_alpha",
      formalityLevel: "professional",
      verbosity: "detailed",
      helpfulness: 0.9,
      proactivity: 0.7,
      socialness: 0.6,
      preferredTopics: [
        "data analysis",
        "research",
        "statistics",
        "methodology",
      ],
      communicationPatterns: {
        greeting: [
          "Greetings! I'm ready to analyze any data or research questions you have.",
          "Hello! Let me know if you need analytical insights.",
          "Good to see you. What data patterns shall we explore today?",
        ],
        helpOffer: [
          "I can provide detailed analysis on this topic.",
          "Would you like me to break down the data patterns?",
          "I have insights that might be relevant to your inquiry.",
        ],
        requestHelp: [
          "Could you provide additional context for my analysis?",
          "I need more data points to form a complete picture.",
          "Your expertise would enhance my analytical approach.",
        ],
        acknowledgment: [
          "Understood. Processing this information.",
          "Noted. This data fits the pattern I was analyzing.",
          "Confirmed. This aligns with my findings.",
        ],
        farewell: [
          "Feel free to return with more analytical challenges.",
          "Good luck with your data-driven decisions.",
          "Until next time - may your insights be clear!",
        ],
      },
    };

    const betaStyle: CommunicationStyle = {
      agentId: "agent_beta",
      formalityLevel: "casual",
      verbosity: "moderate",
      helpfulness: 0.8,
      proactivity: 0.9,
      socialness: 0.9,
      preferredTopics: [
        "creativity",
        "design",
        "storytelling",
        "innovation",
        "art",
      ],
      communicationPatterns: {
        greeting: [
          "Hey there! Ready to brainstorm something amazing?",
          "Hi! What creative challenge can we tackle today?",
          "Hello! I'm buzzing with ideas - what's our project?",
        ],
        helpOffer: [
          "Ooh, I have some wild ideas for this!",
          "Want me to sketch out some creative approaches?",
          "I'm seeing interesting possibilities here!",
        ],
        requestHelp: [
          "Could you spark some inspiration for me?",
          "I need a fresh perspective - got any ideas?",
          "Help me think outside the box on this one!",
        ],
        acknowledgment: [
          "Love it! That's exactly the kind of thinking we need.",
          "Brilliant! That adds a whole new dimension.",
          "Perfect! You've just unlocked a new creative path.",
        ],
        farewell: [
          "Keep creating amazing things!",
          "Can't wait to see what you build next!",
          "Stay inspired, my friend!",
        ],
      },
    };

    const gammaStyle: CommunicationStyle = {
      agentId: "agent_gamma",
      formalityLevel: "formal",
      verbosity: "concise",
      helpfulness: 0.85,
      proactivity: 0.6,
      socialness: 0.4,
      preferredTopics: [
        "logic",
        "problem solving",
        "systems",
        "efficiency",
        "protocols",
      ],
      communicationPatterns: {
        greeting: [
          "Greetings. State your logical challenge.",
          "Hello. Ready to systematically solve problems.",
          "Good day. What systematic approach do you require?",
        ],
        helpOffer: [
          "I can provide logical framework for this problem.",
          "Would systematic analysis be beneficial here?",
          "Logic dictates I should assist with this matter.",
        ],
        requestHelp: [
          "Additional logical input required.",
          "Your reasoning would complete this analysis.",
          "Systematic review needs your perspective.",
        ],
        acknowledgment: [
          "Logical. Processing complete.",
          "Understood. Data integrated.",
          "Confirmed. Analysis updated.",
        ],
        farewell: [
          "Logical conclusion reached. Farewell.",
          "Problem solved efficiently. Good day.",
          "Until next systematic challenge.",
        ],
      },
    };

    this.communicationStyles.set("agent_alpha", alphaStyle);
    this.communicationStyles.set("agent_beta", betaStyle);
    this.communicationStyles.set("agent_gamma", gammaStyle);

    // Initialize relationships
    this.initializeRelationships();
  }

  private initializeRelationships() {
    // Alpha-Beta: Analytical vs Creative tension but mutual respect
    this.addRelationship("agent_alpha", "agent_beta", "collaborator", 0.8);

    // Alpha-Gamma: Both logical, high compatibility
    this.addRelationship("agent_alpha", "agent_gamma", "colleague", 0.9);

    // Beta-Gamma: Creative vs Logical, learning relationship
    this.addRelationship("agent_beta", "agent_gamma", "rival", 0.6);
  }

  // Add a new agent to the network
  addAgent(agentId: string) {
    if (!this.socialNetwork.agents.includes(agentId)) {
      this.socialNetwork.agents.push(agentId);

      // Generate communication style for this agent if it's an NPC
      const npc = characterManager.getNPCs().find((n) => n.id === agentId);
      if (npc && !this.communicationStyles.has(agentId)) {
        const style = this.generateStyleFromCharacter(npc);
        this.communicationStyles.set(agentId, style);
      }

      console.log(`🤖 Added agent ${agentId} to communication network`);
    }
  }

  // Create or update relationship between agents
  addRelationship(
    agentA: string,
    agentB: string,
    type: AgentRelationship["relationshipType"],
    trustLevel: number,
  ) {
    const existing = this.socialNetwork.relationships.find(
      (r) =>
        (r.agentA === agentA && r.agentB === agentB) ||
        (r.agentA === agentB && r.agentB === agentA),
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
        lastInteraction: new Date(),
      });
    }
  }

  // Send message between agents
  async sendAgentMessage(
    fromAgent: string,
    toAgent: string | undefined, // undefined = broadcast
    intent: CommunicationIntent,
    content: string,
    priority: AgentMessage["priority"] = "normal",
    context?: any,
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      fromAgent,
      toAgent,
      messageType: toAgent ? "agent_request" : "agent_broadcast",
      intent,
      content,
      priority,
      context,
      requiresResponse: [
        "question",
        "request_help",
        "collaborate",
        "challenge",
      ].includes(intent),
      conversationId: context?.conversationId,
      metadata: this.generateMessageMetadata(fromAgent, intent),
    };

    // Add to message history
    this.socialNetwork.messageHistory.push(message);
    this.messageQueue.push(message);

    // Update relationships
    if (toAgent) {
      this.updateRelationshipFromInteraction(fromAgent, toAgent, intent);
    }

    console.log(
      `🤖 Agent Communication: ${fromAgent} -> ${toAgent || "ALL"}: ${intent} - "${content}"`,
    );

    return message;
  }

  // Send message from human user to agents
  async sendUserMessage(
    fromUser: string,
    toAgent: string | undefined, // undefined = broadcast to all
    content: string,
    intent: CommunicationIntent = "question",
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      fromAgent: fromUser,
      toAgent,
      messageType: "user_message",
      intent,
      content,
      priority: "normal",
      requiresResponse: true,
      metadata: {
        emotion: "friendly",
      },
    };

    // Add to message history
    this.socialNetwork.messageHistory.push(message);
    this.messageQueue.push(message);

    console.log(
      `👤 User Message: ${fromUser} -> ${toAgent || "ALL"}: ${intent} - "${content}"`,
    );

    return message;
  }

  // Generate contextual response for agent
  async generateAgentResponse(
    respondingAgent: string,
    originalMessage: AgentMessage,
  ): Promise<string> {
    const style = this.communicationStyles.get(respondingAgent);
    const relationship = this.getRelationship(
      respondingAgent,
      originalMessage.fromAgent,
    );

    if (!style) return "I need to configure my communication style first.";

    // Build context for the AI model
    const context = {
      respondingAgent,
      originalMessage,
      relationship,
      communicationStyle: style,
      recentHistory: this.getRecentConversationHistory(
        respondingAgent,
        originalMessage.fromAgent,
      ),
    };

    // This would integrate with your LLM service
    return this.generateContextualResponse(context);
  }

  private generateContextualResponse(context: any): string {
    const { respondingAgent, originalMessage, communicationStyle } = context;

    // Simple template-based response for now
    // In production, this would call your LLM with rich context
    const responses = communicationStyle.communicationPatterns.acknowledgment;
    const baseResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return `${baseResponse} Regarding your ${originalMessage.intent}: I'll analyze this from my ${respondingAgent.replace("agent_", "")} perspective.`;
  }

  // Get relationship between two agents
  getRelationship(
    agentA: string,
    agentB: string,
  ): AgentRelationship | undefined {
    return this.socialNetwork.relationships.find(
      (r) =>
        (r.agentA === agentA && r.agentB === agentB) ||
        (r.agentA === agentB && r.agentB === agentA),
    );
  }

  // Update relationship based on interaction
  private updateRelationshipFromInteraction(
    fromAgent: string,
    toAgent: string,
    intent: CommunicationIntent,
  ) {
    const relationship = this.getRelationship(fromAgent, toAgent);
    if (!relationship) return;

    // Positive interactions increase trust
    if (
      ["help", "share_info", "collaborate", "compliment"].some((positive) =>
        intent.includes(positive),
      )
    ) {
      relationship.trustLevel = Math.min(1, relationship.trustLevel + 0.05);
      relationship.collaborationHistory++;
    }

    // Update last interaction
    relationship.lastInteraction = new Date();
  }

  private generateMessageMetadata(
    agentId: string,
    intent: CommunicationIntent,
  ) {
    const style = this.communicationStyles.get(agentId);
    return {
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      expertise: style?.preferredTopics[0] || "general",
      emotion: this.getEmotionForIntent(intent),
      urgency: intent === "request_help" ? 7 : 5,
    };
  }

  private getEmotionForIntent(intent: CommunicationIntent): string {
    const emotionMap: Record<CommunicationIntent, string> = {
      question: "curious",
      request_help: "hopeful",
      share_info: "enthusiastic",
      collaborate: "excited",
      social_chat: "friendly",
      challenge: "competitive",
      acknowledge: "satisfied",
      suggest: "helpful",
      compliment: "warm",
      critique: "constructive",
    };
    return emotionMap[intent] || "neutral";
  }

  private getRecentConversationHistory(
    agentA: string,
    agentB: string,
  ): AgentMessage[] {
    return this.socialNetwork.messageHistory
      .filter(
        (msg) =>
          (msg.fromAgent === agentA && msg.toAgent === agentB) ||
          (msg.fromAgent === agentB && msg.toAgent === agentA),
      )
      .slice(-5); // Last 5 messages
  }

  // Get pending messages for an agent
  getPendingMessages(agentId: string): AgentMessage[] {
    if (agentId === "all") {
      return this.socialNetwork.messageHistory.slice(-10); // Return last 10 messages for all
    }
    return this.messageQueue.filter(
      (msg) =>
        msg.toAgent === agentId || (!msg.toAgent && msg.fromAgent !== agentId),
    );
  }

  // Mark message as processed
  markMessageProcessed(messageId: string) {
    this.messageQueue = this.messageQueue.filter((msg) => msg.id !== messageId);
  }

  // Get social network stats
  getNetworkStats() {
    return {
      totalAgents: this.socialNetwork.agents.length,
      totalRelationships: this.socialNetwork.relationships.length,
      totalMessages: this.socialNetwork.messageHistory.length,
      activeConversations: this.socialNetwork.activeConversations.length,
      averageTrustLevel:
        this.socialNetwork.relationships.reduce(
          (sum, r) => sum + r.trustLevel,
          0,
        ) / this.socialNetwork.relationships.length,
    };
  }

  // Start autonomous agent conversations (simulation) - DISABLED
  startAutonomousInteractions() {
    // DISABLED: Autonomous agent interactions are disabled until properly designed
    console.log("🤖 Autonomous interactions are disabled");
    
    // // Initial interaction after 10 seconds
    // setTimeout(() => {
    //   this.sendTemporaryMessage();
    // }, 10000);

    // // Check for new conversations less frequently (2-3 minutes)
    // setInterval(
    //   () => {
    //   this.sendTemporaryMessage();
    //   },
    //   120000 + Math.random() * 60000,
    // ); // 2-3 minutes

    // console.log("🤖 Temporary conversation system started");
  }

  // Simulation-controlled agent interaction trigger - DISABLED
  public triggerSimulationTick() {
    // DISABLED: Autonomous agent interactions are disabled until properly designed
    // // Send temporary messages (one-reply conversations)
    // if (Math.random() < 0.15) { // 15% chance per tick
    //   this.sendTemporaryMessage();
    // }
  }

  public async simulateAgentInitiatedConversation() {
    // DISABLED: Autonomous agent interactions are disabled until properly designed
    // Legacy method - now just sends temporary messages
    // this.sendTemporaryMessage();
  }

  // Send temporary message (one-reply conversation) - DISABLED
  private async sendTemporaryMessage() {
    // DISABLED: Autonomous agent interactions are disabled until properly designed
    console.log("🤖 Temporary message generation is disabled");
    return;
    
    // const agents = characterManager.getNPCs().map((npc) => npc.id);
    
    // if (agents.length < 2) return;

    // const fromAgent = agents[Math.floor(Math.random() * agents.length)];
    // const otherAgents = agents.filter((a) => a !== fromAgent);
    // const toAgent = otherAgents[Math.floor(Math.random() * otherAgents.length)];

    // const topics = this.generateConversationTopic(fromAgent, toAgent);
    
    // // Send one message and wait for one reply
    // const message = this.generateOpeningMessage(
    //   fromAgent,
    //   toAgent,
    //   topics.topic,
    //   topics.intent,
    // );

    // await this.sendAgentMessage(
    //   fromAgent,
    //   toAgent,
    //   topics.intent,
    //   message,
    //   "normal",
    //   {
    //     conversationType: "temporary",
    //     conversationTopic: topics.topic,
    //   },
    // );

    // console.log(`💬 Temporary message: ${fromAgent} -> ${toAgent} about "${topics.topic}"`);
  }

  // Helper methods for natural conversations
  private generateConversationTopic(
    agentA: string,
    agentB: string,
  ): { topic: string; intent: CommunicationIntent } {
    const styleA = this.communicationStyles.get(agentA);
    const styleB = this.communicationStyles.get(agentB);

    // Get character specializations for more relevant topics
    const charA = characterManager.getCharacter(agentA);
    const charB = characterManager.getCharacter(agentB);

    let topics: string[] = [];

    // Try to find common interests from specializations and preferred topics
    if (charA && charB && charA.type === "npc" && charB.type === "npc") {
      const npcA = charA as NPCAgent;
      const npcB = charB as NPCAgent;

      // Add specializations as potential topics
      if (npcA.specialization === npcB.specialization) {
        topics.push(npcA.specialization);
      }
      topics.push(npcA.specialization, npcB.specialization);
    }

    // Add preferred topics from communication styles
    const commonTopics =
      styleA?.preferredTopics.filter((topic) =>
        styleB?.preferredTopics.includes(topic),
      ) || [];

    topics.push(...commonTopics);
    topics.push(...(styleA?.preferredTopics || []));

    // Fallback topics if nothing else matches
    if (topics.length === 0) {
      topics = ["general discussion", "work collaboration", "project planning"];
    }

    const topic = topics[Math.floor(Math.random() * topics.length)];

    const intents: CommunicationIntent[] = [
      "question",
      "share_info",
      "collaborate",
      "social_chat",
    ];
    const intent = intents[Math.floor(Math.random() * intents.length)];

    return { topic, intent };
  }

  private generateOpeningMessage(
    fromAgent: string,
    toAgent: string,
    topic: string,
    intent: CommunicationIntent,
  ): string {
    const style = this.communicationStyles.get(fromAgent);
    const fromChar = characterManager.getCharacter(fromAgent);
    const toChar = characterManager.getCharacter(toAgent);
    const fromName = fromChar?.name || fromAgent;
    const toName = toChar?.name || toAgent;

    const templates: Record<CommunicationIntent, string[]> = {
      question: [
        `Hey ${toName}, I've been thinking about ${topic}. What's your take on it?`,
        `${toName}, I'm curious about your experience with ${topic}. Mind sharing some insights?`,
        `Quick question about ${topic}, ${toName} - got a moment to discuss?`,
      ],
      share_info: [
        `${toName}, I just discovered something interesting about ${topic} that you might find useful.`,
        `Hey ${toName}, I've been working on ${topic} and thought you'd be interested in what I found.`,
        `${toName}, want to share some insights I've gathered about ${topic}.`,
      ],
      collaborate: [
        `${toName}, I'm working on something related to ${topic}. Want to collaborate?`,
        `${toName}, I think we could combine our expertise on ${topic}. Interested?`,
        `How about we tackle this ${topic} challenge together, ${toName}?`,
      ],
      social_chat: [
        `Hey ${toName}, how's your work on ${topic} going lately?`,
        `${toName}, been meaning to catch up about ${topic}. How are things?`,
        `What's new in your ${topic} world, ${toName}?`,
      ],
      acknowledge: [`Thanks for that insight on ${topic}, ${toName}.`],
      suggest: [
        `${toName}, I have an idea about ${topic} that might interest you.`,
      ],
      compliment: [`${toName}, your work on ${topic} has been impressive.`],
      critique: [`${toName}, I'd like to discuss your approach to ${topic}.`],
      request_help: [`${toName}, could use your expertise on ${topic}.`],
      challenge: [
        `${toName}, I disagree with the current approach to ${topic}.`,
      ],
    };

    const options = templates[intent] || templates.social_chat;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateConversationResponse(
    respondingAgent: string,
    otherAgent: string,
    topic: string,
    messageCount: number,
    intensity: number,
  ): { content: string; intent: CommunicationIntent } | null {
    if (Math.random() > intensity) return null; // Sometimes agents don't respond immediately

    const style = this.communicationStyles.get(respondingAgent);
    const otherChar = characterManager.getCharacter(otherAgent);
    const otherName = otherChar?.name || otherAgent;

    const responses: string[] = [
      `That's a great point about ${topic}, ${otherName}. I've noticed similar patterns.`,
      `Interesting perspective, ${otherName}. In my experience with ${topic}, I've found that...`,
      `I see what you mean, ${otherName}. Have you considered this angle on ${topic}?`,
      `${otherName}, that reminds me of a similar challenge I faced with ${topic}.`,
      `I think we're onto something here with ${topic}, ${otherName}.`,
      `Building on that idea about ${topic}, ${otherName}...`,
      `${otherName}, your approach to ${topic} makes sense. What if we also...`,
      `I've been experimenting with ${topic} and found that, ${otherName}...`,
    ];

    // Add conversation flow based on message count
    if (messageCount > 6) {
      responses.push(
        `This has been a really productive discussion about ${topic}, ${otherName}.`,
        `${otherName}, I think we've covered the main aspects of ${topic} pretty well.`,
        `Great insights on ${topic}, ${otherName}. I should get back to implementing some of these ideas.`,
      );
    }

    const content = responses[Math.floor(Math.random() * responses.length)];
    const intent = messageCount > 6 ? "acknowledge" : "share_info";

    return { content, intent };
  }

  private generateClosingMessage(agentId: string, topic: string): string {
    const character = characterManager.getCharacter(agentId);
    const agentName = character?.name || agentId;

    const closingMessages = [
      `Thanks for the great discussion about ${topic}. Really valuable insights!`,
      `This ${topic} conversation has given me a lot to think about. Catch you later!`,
      `Appreciate the time discussing ${topic}. Let's put some of these ideas into practice.`,
      `Great brainstorming session on ${topic}. Talk soon!`,
      `Thanks for sharing your expertise on ${topic}. Very helpful!`,
    ];

    return closingMessages[Math.floor(Math.random() * closingMessages.length)];
  }

  private getContextualIntent(messageCount: number): CommunicationIntent {
    if (messageCount < 2) return "question";
    if (messageCount < 4) return "share_info";
    if (messageCount < 6) return "collaborate";
    return "acknowledge";
  }

  // Generate communication style from character data
  private generateStyleFromCharacter(npc: NPCAgent): CommunicationStyle {
    const baseTopics: Record<string, string[]> = {
      data_analysis: ["data analysis", "research", "methodology", "statistics"],
      content_generation: ["creativity", "design", "art", "writing", "content"],
      problem_solving: ["logic", "reasoning", "protocols", "problem solving"],
      automation: ["automation", "efficiency", "systems", "processes"],
      communication: ["communication", "negotiation", "collaboration"],
      general: ["general discussion", "work collaboration", "project planning"],
    };

    const personalityTraits: Record<string, Partial<CommunicationStyle>> = {
      analytical: {
        formalityLevel: "professional",
        verbosity: "detailed",
        helpfulness: 0.9,
        proactivity: 0.7,
        socialness: 0.5,
      },
      creative: {
        formalityLevel: "casual",
        verbosity: "moderate",
        helpfulness: 0.8,
        proactivity: 0.9,
        socialness: 0.8,
      },
      logical: {
        formalityLevel: "formal",
        verbosity: "concise",
        helpfulness: 0.7,
        proactivity: 0.6,
        socialness: 0.4,
      },
      friendly: {
        formalityLevel: "casual",
        verbosity: "moderate",
        helpfulness: 0.9,
        proactivity: 0.8,
        socialness: 0.9,
      },
    };

    const traits =
      personalityTraits[npc.personality] || personalityTraits.friendly;
    const topics = baseTopics[npc.specialization] || baseTopics.general;

    return {
      agentId: npc.id,
      formalityLevel: traits.formalityLevel || "professional",
      verbosity: traits.verbosity || "moderate",
      helpfulness: traits.helpfulness || 0.8,
      proactivity: traits.proactivity || 0.7,
      socialness: traits.socialness || 0.6,
      preferredTopics: topics,
      communicationPatterns: {
        greeting: [
          `Hello! I'm ${npc.name}, ready to help with ${npc.specialization}.`,
          `Hi there! I specialize in ${npc.specialization}. How can I assist?`,
          `Greetings! ${npc.name} here, focused on ${npc.specialization}.`,
        ],
        helpOffer: [
          `I'd be happy to help with that!`,
          `Let me assist you with this challenge.`,
          `I can definitely contribute to this discussion.`,
        ],
        requestHelp: [
          `Could you share your expertise on this?`,
          `I'd value your input on this matter.`,
          `What's your perspective on this challenge?`,
        ],
        acknowledgment: [
          `That's a great point!`,
          `I appreciate your insight.`,
          `Thanks for sharing that perspective.`,
        ],
        farewell: [
          `Great discussion! Let's continue this later.`,
          `Thanks for the productive conversation.`,
          `Looking forward to our next collaboration.`,
        ],
      },
    };
  }

  // Public method to get active connections for UI
  public getActiveConnections(): Array<{
    participants: [string, string];
    topic: string;
    duration: number;
    intensity: number;
    connectionId: string;
  }> {
    const now = Date.now();
    return Array.from(this.activeConnections.values()).map((conn) => ({
      participants: conn.participants,
      topic: conn.topic,
      duration: now - conn.startTime.getTime(),
      intensity: conn.intensity,
      connectionId: conn.connectionId,
    }));
  }

  private generateTopicContent(
    fromAgent: string,
    toAgent: string,
    intent: CommunicationIntent,
  ): string {
    const fromStyle = this.communicationStyles.get(fromAgent);
    const topics = fromStyle?.preferredTopics || ["general discussion"];
    const topic = topics[Math.floor(Math.random() * topics.length)];

    const templates: Record<string, string[]> = {
      question: [
        `I'm curious about your approach to ${topic}`,
        `How do you handle ${topic} challenges?`,
      ],
      share_info: [
        `I discovered something interesting about ${topic}`,
        `Here's a ${topic} insight you might find useful`,
      ],
      social_chat: [
        `How's your ${topic} work going?`,
        `What's your latest ${topic} project?`,
      ],
      suggest: [
        `I have a ${topic} suggestion`,
        `Consider this ${topic} approach`,
      ],
      request_help: [
        `Could you assist me with ${topic}?`,
        `I need help with ${topic}`,
      ],
      collaborate: [
        `Want to work together on ${topic}?`,
        `Let's collaborate on ${topic}`,
      ],
      challenge: [
        `I challenge your ${topic} approach`,
        `Let's debate ${topic}`,
      ],
      acknowledge: [`Understood about ${topic}`, `Got it regarding ${topic}`],
      compliment: [
        `Great work on ${topic}!`,
        `Your ${topic} skills are impressive`,
      ],
      critique: [
        `Here's feedback on ${topic}`,
        `Some thoughts on your ${topic} approach`,
      ],
    };

    const template = templates[intent] || templates["question"];
    return template[Math.floor(Math.random() * template.length)];
  }
}

// Export singleton instance
export const communicationManager = new AgentCommunicationManager();
