import { invoke } from "@tauri-apps/api/core";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  personality: string;
  specialization: string;
  system_prompt: string;
}

export class LLMService {
  private static instance: LLMService;
  private agentConfigs: AgentConfig[] = [];

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        this.agentConfigs = await invoke<AgentConfig[]>('get_agent_configs');
        console.log('LLM Service initialized with agents:', this.agentConfigs);
      } else {
        // Fallback for development/browser environment
        this.agentConfigs = [
          {
            id: 'alpha',
            name: 'Alpha',
            model: 'llama2',
            personality: 'Analytical and methodical',
            specialization: 'Data analysis and strategic thinking',
            system_prompt: 'You are Alpha, an analytical AI agent focused on data-driven insights.'
          },
          {
            id: 'beta', 
            name: 'Beta',
            model: 'llama2',
            personality: 'Creative and innovative',
            specialization: 'Creative problem solving and design',
            system_prompt: 'You are Beta, a creative AI agent focused on innovative solutions.'
          },
          {
            id: 'gamma',
            name: 'Gamma', 
            model: 'llama2',
            personality: 'Logical and systematic',
            specialization: 'Logic and systematic analysis',
            system_prompt: 'You are Gamma, a logical AI agent focused on systematic analysis.'
          }
        ];
        console.log('LLM Service initialized in development mode with mock agents:', this.agentConfigs);
      }
    } catch (error) {
      console.error('Failed to initialize LLM service:', error);
      // Fallback configurations
      this.agentConfigs = [
        {
          id: 'alpha',
          name: 'Alpha',
          model: 'llama2',
          personality: 'Analytical and methodical', 
          specialization: 'Data analysis and strategic thinking',
          system_prompt: 'You are Alpha, an analytical AI agent focused on data-driven insights.'
        },
        {
          id: 'beta',
          name: 'Beta', 
          model: 'llama2',
          personality: 'Creative and innovative',
          specialization: 'Creative problem solving and design',
          system_prompt: 'You are Beta, a creative AI agent focused on innovative solutions.'
        },
        {
          id: 'gamma',
          name: 'Gamma',
          model: 'llama2', 
          personality: 'Logical and systematic',
          specialization: 'Logic and systematic analysis',
          system_prompt: 'You are Gamma, a logical AI agent focused on systematic analysis.'
        }
      ];
    }
  }

  async sendMessageToAgent(
    agentId: string, 
    message: string, 
    userName: string = 'User'
  ): Promise<string> {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const response = await invoke<string>('send_message_to_agent', {
          agentId,
          message,
          userName
        });
        return response;
      } else {
        // Fallback for development - simulate AI response
        const agent = this.getAgentConfig(agentId);
        if (!agent) {
          return `Agent ${agentId} not found.`;
        }
        
        // Simulate thinking delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Generate a mock response based on agent personality
        const responses = {
          'alpha': [
            "Based on my analysis, I would recommend taking a systematic approach to this problem.",
            "The data suggests that we need to examine this from multiple angles.",
            "From an analytical perspective, the key factors to consider are...",
            "Let me break this down into manageable components for better understanding."
          ],
          'beta': [
            "What an interesting creative challenge! Let me think outside the box here.",
            "I love exploring innovative solutions! Here's a fresh perspective...",
            "This sparks some creative ideas! What if we approached it differently?",
            "From a design thinking standpoint, we could reimagine this entirely."
          ],
          'gamma': [
            "Logically speaking, we should evaluate this step by step.",
            "The systematic approach would be to follow these logical steps...",
            "Based on logical reasoning, the most efficient path forward is...",
            "Let me apply systematic logic to solve this methodically."
          ]
        };
        
        const agentResponses = responses[agentId as keyof typeof responses] || responses.alpha;
        const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];
        
        return `${randomResponse} (Development mode - connect a local LLM server for real AI responses!)`;
      }
    } catch (error) {
      console.error(`Failed to send message to agent ${agentId}:`, error);
      return `Sorry, I'm currently unavailable. Please ensure your local LLM server is running. Error: ${error}`;
    }
  }

  async getAgentHistory(agentId: string): Promise<ChatMessage[]> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        return await invoke<ChatMessage[]>('get_agent_history', { agentId });
      } else {
        return []; // Return empty history in development mode
      }
    } catch (error) {
      console.error(`Failed to get history for agent ${agentId}:`, error);
      return [];
    }
  }

  async clearAgentHistory(agentId: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        await invoke('clear_agent_history', { agentId });
      }
    } catch (error) {
      console.error(`Failed to clear history for agent ${agentId}:`, error);
    }
  }

  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agentConfigs.find(config => config.id === agentId);
  }

  getAllAgentConfigs(): AgentConfig[] {
    return this.agentConfigs;
  }

  isAgentAvailable(agentId: string): boolean {
    return this.agentConfigs.some(config => config.id === agentId);
  }
}

// Export singleton instance
export const llmService = LLMService.getInstance();
