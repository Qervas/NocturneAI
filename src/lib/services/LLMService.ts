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
            personality: 'Simple and direct',
            specialization: 'General assistance',
            system_prompt: 'You are Alpha, an AI assistant. Be helpful and direct.'
          },
          {
            id: 'beta', 
            name: 'Beta',
            model: 'llama2',
            personality: 'Simple and direct',
            specialization: 'General assistance',
            system_prompt: 'You are Beta, an AI assistant. Be helpful and direct.'
          },
          {
            id: 'gamma',
            name: 'Gamma', 
            model: 'llama2',
            personality: 'Simple and direct',
            specialization: 'General assistance',
            system_prompt: 'You are Gamma, an AI assistant. Be helpful and direct.'
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
          personality: 'Simple and direct', 
          specialization: 'General assistance',
          system_prompt: 'You are Alpha, an AI assistant. Be helpful and direct.'
        },
        {
          id: 'beta',
          name: 'Beta', 
          model: 'llama2',
          personality: 'Simple and direct',
          specialization: 'General assistance',
          system_prompt: 'You are Beta, an AI assistant. Be helpful and direct.'
        },
        {
          id: 'gamma',
          name: 'Gamma',
          model: 'llama2', 
          personality: 'Simple and direct',
          specialization: 'General assistance',
          system_prompt: 'You are Gamma, an AI assistant. Be helpful and direct.'
        }
      ];
    }
  }

  async sendMessageToAgent(
    agentId: string, 
    message: string, 
    userName: string = 'User'
  ): Promise<string> {
    // Map frontend agent IDs to full agent IDs for prompt manager
    const agentIdMap: { [key: string]: string } = {
      'alpha': 'agent_alpha',
      'beta': 'agent_beta', 
      'gamma': 'agent_gamma'
    };
    
    const fullAgentId = agentIdMap[agentId] || agentId;
    
    // Get the agent's custom prompts from the prompt manager
    const combinedPrompt = agentPromptManager.getCombinedPrompt(fullAgentId);
    
    // Debug: Log what prompts are being used
    console.log(`🤖 Agent ${agentId} (${fullAgentId}) prompts:`, {
      combinedPrompt: combinedPrompt || 'None (using fallback)',
      fallbackPrompt: this.getAgentConfig(agentId)?.system_prompt || 'Default fallback'
    });
    
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
          userName,
          customSystemPrompt: combinedPrompt || null
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
            userName,
            customSystemPrompt: combinedPrompt || null
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
            
            // Fallback to vanilla mock responses
            const messageLower = message.toLowerCase();
            let response = "";
            
            if (agentId === 'alpha') {
              response = "I'm Alpha, an AI assistant. How can I help you?";
            } else if (agentId === 'beta') {
              response = "I'm Beta, an AI assistant. How can I help you?";
            } else if (agentId === 'gamma') {
              response = "I'm Gamma, an AI assistant. How can I help you?";
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
    // Map agent ID to full agent ID for prompt manager
    const agentIdMap: { [key: string]: string } = {
      'alpha': 'agent_alpha',
      'beta': 'agent_beta', 
      'gamma': 'agent_gamma'
    };
    
    const fullAgentId = agentIdMap[agent.id] || agent.id;
    const combinedPrompt = agentPromptManager.getCombinedPrompt(fullAgentId);
    
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
    
    // Build system prompt - prioritize custom prompt if available
    const fullSystemPrompt = combinedPrompt || `You are ${agent.name}, ${agent.personality}. 
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
    console.log(`[Dev Mode] Using system prompt: "${fullSystemPrompt}"`);

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
    try {
      const connectivity = await this.checkLLMConnectivity();
      if (connectivity.connected) {
        return `🟢 ${connectivity.service} - Ready`;
      } else {
        return `🔴 ${connectivity.service} - ${connectivity.message}`;
      }
    } catch (error) {
      return `🔴 Error checking connection: ${error}`;
    }
  }

  // Reinitialize the service to pick up new prompts
  async reinitialize(): Promise<void> {
    console.log('🔄 Reinitializing LLM Service with new prompts...');
    await this.initialize();
    console.log('✅ LLM Service reinitialized');
  }
}

// Export singleton instance
export const llmService = LLMService.getInstance();
