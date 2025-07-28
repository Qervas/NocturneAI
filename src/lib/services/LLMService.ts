import { invoke } from "@tauri-apps/api/core";
import { agentPromptManager } from "./AgentPromptManager";

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
    // Get the agent's custom prompts from the prompt manager
    const combinedPrompt = agentPromptManager.getCombinedPrompt(agentId);
    
    // If no custom prompts are set, fall back to the default system prompt
    const systemPrompt = combinedPrompt || this.getAgentConfig(agentId)?.system_prompt || 'You are a helpful AI assistant.';
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        console.log(`Sending message to agent ${agentId}: "${message}"`);
        
        // Map frontend agent IDs to backend agent IDs
        const agentIdMap: { [key: string]: string } = {
          'alpha': 'agent_alpha',
          'beta': 'agent_beta', 
          'gamma': 'agent_gamma'
        };
        
        const backendAgentId = agentIdMap[agentId] || agentId;
        
        const response = await invoke<string>('send_message_to_agent', {
          agentId: backendAgentId,
          message,
          userName
        });
        
        console.log(`Received response from agent ${agentId}:`, response);
        return response;
      } else {
        // Development mode - use Tauri backend if available, otherwise fallback
        console.log(`[Dev Mode] Sending message to agent ${agentId}: "${message}"`);
        
        try {
          // Try to use Tauri backend even in development mode
          const agentIdMap: { [key: string]: string } = {
            'alpha': 'agent_alpha',
            'beta': 'agent_beta', 
            'gamma': 'agent_gamma'
          };
          
          const backendAgentId = agentIdMap[agentId] || agentId;
          
          const response = await invoke<string>('send_message_to_agent', {
            agentId: backendAgentId,
            message,
            userName
          });
          
          console.log(`[Dev Mode] Received response from agent ${agentId}:`, response);
          return response;
        } catch (tauriError) {
          console.warn(`[Dev Mode] Tauri backend not available, trying direct Ollama:`, tauriError);
          
          // Fallback to direct Ollama connection
          const agent = this.getAgentConfig(agentId);
          if (!agent) {
            return `Agent ${agentId} not found.`;
          }

          try {
            const response = await this.callOllamaDirectly(agent, message, userName);
            console.log(`[Dev Mode] Received response from agent ${agentId}:`, response);
            return response;
          } catch (ollamaError) {
            console.warn(`[Dev Mode] Ollama connection failed, falling back to mock:`, ollamaError);
            
            // Check if Ollama is running but model might be wrong
            let ollamaStatus = "Unknown error";
            try {
              const statusResponse = await fetch('http://localhost:11434/api/tags');
              if (statusResponse.ok) {
                const data = await statusResponse.json();
                const availableModels = data.models?.map((m: any) => m.name) || [];
                ollamaStatus = `Ollama running with models: ${availableModels.join(', ')}`;
              } else {
                ollamaStatus = "Ollama server not responding";
              }
            } catch {
              ollamaStatus = "Ollama server not accessible";
            }
            
            // Fallback to enhanced mock responses
            const messageLower = message.toLowerCase();
            let response = "";
            
            if (agentId === 'alpha') {
              if (messageLower.includes('data') || messageLower.includes('analyze')) {
                response = "From an analytical perspective, I've examined the data patterns. The key metrics suggest we should focus on systematic evaluation.";
              } else if (messageLower.includes('problem') || messageLower.includes('issue')) {
                response = "Let me break this down methodically. Based on my analysis, the core problem requires a structured approach.";
              } else {
                response = "Interesting question! From a data-driven standpoint, I recommend we examine the underlying patterns first.";
              }
            } else if (agentId === 'beta') {
              if (messageLower.includes('creative') || messageLower.includes('design')) {
                response = "What an exciting creative challenge! I'm visualizing some innovative approaches that could work beautifully here.";
              } else if (messageLower.includes('idea') || messageLower.includes('solution')) {
                response = "I love brainstorming! Here's a fresh perspective: what if we completely reimagined the approach?";
              } else {
                response = "This sparks my imagination! Let me think outside the box and explore some unconventional possibilities.";
              }
            } else if (agentId === 'gamma') {
              if (messageLower.includes('logic') || messageLower.includes('step')) {
                response = "Logically speaking, we should approach this systematically. Let me outline the key steps in order.";
              } else if (messageLower.includes('solve') || messageLower.includes('fix')) {
                response = "From a logical standpoint, the most efficient solution requires following these systematic steps.";
              } else {
                response = "Let me apply systematic reasoning to this. The logical approach would be to evaluate each component methodically.";
              }
            }
            
            return `${response}\n\n*Note: Ollama connection failed (${ollamaStatus}), using fallback response. Check model availability!*`;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to send message to agent ${agentId}:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('No local LLM server found')) {
        return `I'm currently offline! 🤖\n\nTo chat with me, please start a local LLM server:\n• **Ollama**: Download from ollama.ai and run 'ollama run gemma3:latest'\n• **LM Studio**: Download from lmstudio.ai and start the local server\n\nI'll be ready to chat once your LLM server is running! 🚀`;
      }
      
      return `Sorry, I'm having trouble connecting right now. Please ensure your local LLM server is running.\n\nError: ${errorMsg}`;
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

  async checkLLMConnectivity(): Promise<{ connected: boolean; service: string; message: string }> {
    try {
      // Try Tauri backend first (works in both Tauri and development mode)
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          const testResponse = await invoke<string>('send_message_to_agent', {
            agentId: 'agent_alpha',
            message: 'Hello! Just testing connection. Please respond briefly.',
            userName: 'System'
          });
          
          if (testResponse.includes('offline') || testResponse.includes('No local LLM server')) {
            return {
              connected: false,
              service: 'none',
              message: 'No LLM server detected. Please start Ollama or LM Studio.'
            };
          }
          
          return {
            connected: true,
            service: 'Ollama (Tauri Backend)',
            message: 'Connected to Ollama through Tauri backend'
          };
        } catch (tauriError) {
          console.warn('Tauri backend test failed:', tauriError);
        }
      }
      
      // Fallback to direct Ollama connection in development mode
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          const availableModels = data.models?.map((m: any) => m.name) || [];
          
          if (availableModels.includes('gemma3:latest')) {
            return {
              connected: true,
              service: 'Ollama (Direct)',
              message: `Connected to Ollama with models: ${availableModels.join(', ')}`
            };
          } else {
            return {
              connected: false,
              service: 'Ollama (No Gemma3)',
              message: `Ollama running but gemma3:latest not available. Available: ${availableModels.join(', ')}`
            };
          }
        }
      } catch {
        // Ollama not available
      }
      
      return {
        connected: false,
        service: 'development',
        message: 'Running in development mode - start Ollama for real AI responses'
      };
    } catch (error) {
      return {
        connected: false,
        service: 'error',
        message: `Connection failed: ${error}`
      };
    }
  }

  private async callOllamaDirectly(agent: AgentConfig, message: string, userName: string): Promise<string> {
    // Get the agent's custom prompts from the prompt manager
    const agentId = agent.id;
    const combinedPrompt = agentPromptManager.getCombinedPrompt(agentId);
    
    // Use custom prompts if available, otherwise fall back to default
    const systemPrompt = combinedPrompt || agent.system_prompt;
    // Try to get available models and use the best one
    let model = 'gemma3:latest'; // Default model
    
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        const availableModels = data.models?.map((m: any) => m.name) || [];
        
        // Prefer gemma3:latest, fallback to other models
        if (availableModels.includes('gemma3:latest')) {
          model = 'gemma3:latest';
        } else if (availableModels.includes('gemma3n:e4b')) {
          model = 'gemma3n:e4b';
        } else if (availableModels.includes('qwen3:14b')) {
          model = 'qwen3:14b';
        } else if (availableModels.length > 0) {
          model = availableModels[0]; // Use first available model
        }
      }
    } catch (error) {
      console.warn('Failed to get available models, using default:', error);
    }
    
    // Build system prompt with agent personality
    const fullSystemPrompt = `You are ${agent.name}, ${agent.personality}. 
Your specialization is: ${agent.specialization}
${systemPrompt}

Please respond in character, keeping your responses helpful but personality-driven.`;

    // Create a complete prompt with system context and user message
    const fullPrompt = `${fullSystemPrompt}

${userName}: ${message}

${agent.name}:`;

    const requestBody = {
      model: model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 500
      }
    };

    console.log(`[Dev Mode] Calling Ollama with model ${model} for agent ${agent.name}`);

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.response) {
      return data.response.trim();
    } else {
      throw new Error('Invalid response format from Ollama');
    }
  }

  async getConnectionStatus(): Promise<string> {
    const status = await this.checkLLMConnectivity();
    if (status.connected) {
      return `🟢 ${status.service} - Ready`;
    } else {
      // Try to get more specific error information
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          const availableModels = data.models?.map((m: any) => m.name) || [];
          return `🔴 ${status.service} - ${status.message}. Available models: ${availableModels.join(', ')}`;
        }
      } catch {
        // Ollama not accessible
      }
      return `🔴 ${status.service} - ${status.message}`;
    }
  }
}

// Export singleton instance
export const llmService = LLMService.getInstance();
