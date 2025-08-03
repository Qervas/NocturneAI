import { invoke } from "@tauri-apps/api/core";
import { agentPromptManager } from "./AgentPromptManager";
import { fileOperationsService, type FileOperationResult } from '../data/FileOperationsService';

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
            id: 'agent_alpha',
            name: 'Alpha',
            model: 'gemma3:latest',
            personality: 'Simple and direct',
            specialization: 'General assistance',
            system_prompt: 'You are Alpha, an AI assistant. Be helpful and direct.'
          },
          {
            id: 'agent_beta', 
            name: 'Beta',
            model: 'gemma3:latest',
            personality: 'Simple and direct',
            specialization: 'General assistance',
            system_prompt: 'You are Beta, an AI assistant. Be helpful and direct.'
          },
          {
            id: 'agent_gamma',
            name: 'Gamma',
            model: 'gemma3:latest', 
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
          id: 'agent_alpha',
          name: 'Alpha',
          model: 'gemma3:latest',
          personality: 'Simple and direct', 
          specialization: 'General assistance',
          system_prompt: 'You are Alpha, an AI assistant. Be helpful and direct.'
        },
        {
          id: 'agent_beta',
          name: 'Beta', 
          model: 'gemma3:latest',
          personality: 'Simple and direct',
          specialization: 'General assistance',
          system_prompt: 'You are Beta, an AI assistant. Be helpful and direct.'
        },
        {
          id: 'agent_gamma',
          name: 'Gamma',
          model: 'gemma3:latest', 
          personality: 'Simple and direct',
          specialization: 'General assistance',
          system_prompt: 'You are Gamma, an AI assistant. Be helpful and direct.'
        }
      ];
    }
  }

  // Enhanced method with context injection and file operations
  async sendMessageToAgent(
    agentId: string, 
    message: string, 
    userName: string = 'User',
    context?: {
      userLevel?: 'beginner' | 'intermediate' | 'expert';
      currentTask?: string;
      recentFiles?: string[];
      conversationLength?: number;
      userPreferences?: string[];
      enableFileOperations?: boolean;
    }
  ): Promise<string> {
    // Get the agent's custom prompts from the prompt manager
    let combinedPrompt = agentPromptManager.getCombinedPrompt(agentId);
    
    // Inject context if provided
    if (context) {
      combinedPrompt = this.injectContext(combinedPrompt, context);
    }

    // Add file operation capabilities if enabled
    if (context?.enableFileOperations) {
      combinedPrompt = this.injectFileOperationsCapabilities(combinedPrompt);
    }
    
    // Debug: Log what prompts are being used
    console.log(`🤖 Agent ${agentId} prompts:`, {
      combinedPrompt: combinedPrompt || 'None (using fallback)',
      fallbackPrompt: this.getAgentConfig(agentId)?.system_prompt || 'Default fallback',
      context: context || 'No context provided',
      fileOperations: context?.enableFileOperations ? 'Enabled' : 'Disabled'
    });
    
    // If no custom prompts are set, fall back to the default system prompt
    const systemPrompt = combinedPrompt || this.getAgentConfig(agentId)?.system_prompt || 'You are a helpful AI assistant.';
    
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        console.log(`Sending message to agent ${agentId}: "${message}"`);
        
        const response = await invoke<string>('send_message_to_agent', {
          agentId: agentId,
          message,
          userName,
          customSystemPrompt: combinedPrompt || null
        });
        
        console.log(`Received response from agent ${agentId}:`, response);
        return response;
      } else {
        // Development mode - try multiple approaches
        console.log(`[Dev Mode] Sending message to agent ${agentId}: "${message}"`);
        
        // First, try to use Tauri backend even in development mode
        try {
          const response = await invoke<string>('send_message_to_agent', {
            agentId: agentId,
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
            const response = await this.callOllamaDirectly(agent, message, userName, combinedPrompt);
            console.log(`[Dev Mode] Received response from agent ${agentId}:`, response);
            return response;
          } catch (ollamaError) {
            console.warn(`[Dev Mode] Ollama connection failed, using enhanced mock:`, ollamaError);
            
            // Enhanced mock response that's more realistic
            const enhancedResponse = this.generateEnhancedMockResponse(agentId, message, context, combinedPrompt);
            console.log(`[Dev Mode] Enhanced mock response:`, enhancedResponse);
            return enhancedResponse;
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error sending message to agent ${agentId}:`, error);
      return `I apologize, but I encountered an error processing your request. Please try again.`;
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

  private async callOllamaDirectly(agent: AgentConfig, message: string, userName: string, customSystemPrompt?: string): Promise<string> {
    const systemPrompt = customSystemPrompt || agent.system_prompt;
    
    // Build the full prompt
    const fullPrompt = `${systemPrompt}\n\nUser: ${userName}: ${message}\nAssistant:`;
    
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 1000
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response from Ollama';
    } catch (error) {
      throw new Error(`Failed to connect to Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Inject context into the prompt
  private injectContext(basePrompt: string, context: any): string {
    const contextSection = `
CURRENT CONTEXT:
- User Level: ${context.userLevel || 'intermediate'}
- Current Task: ${context.currentTask || 'general assistance'}
- Recent Files: ${context.recentFiles?.join(', ') || 'none'}
- Conversation History: ${context.conversationLength || 0} messages
- User Preferences: ${context.userPreferences?.join(', ') || 'none'}

Adapt your responses to this context and user's expertise level.
`;
    
    return `${basePrompt}\n\n${contextSection}`;
  }

  // Inject file operation capabilities into the prompt
  private injectFileOperationsCapabilities(basePrompt: string): string {
    const fileOpsSection = `
FILE OPERATION CAPABILITIES:
You have the ability to read, write, create, modify, and delete files. You can:

READ OPERATIONS:
- Read file contents: "read file.txt"
- List directory contents: "list files in /path"
- Get file information: "get info for file.txt"

WRITE OPERATIONS:
- Create new files: "create new file.txt with content"
- Write to existing files: "write to file.txt"
- Append to files: "add to end of file.txt"
- Prepend to files: "add to beginning of file.txt"

MODIFY OPERATIONS:
- Replace entire file: "replace file.txt with new content"
- Insert at specific line: "insert at line 5 in file.txt"
- Delete specific lines: "delete lines 10-15 in file.txt"
- Search and replace: "replace 'old text' with 'new text' in file.txt"

FILE MANAGEMENT:
- Copy files: "copy source.txt to destination.txt"
- Move files: "move source.txt to new-location.txt"
- Delete files: "delete file.txt"
- Check if file exists: "does file.txt exist?"

When performing file operations:
1. Always confirm the action before proceeding
2. Create backups when modifying important files
3. Provide clear feedback about what was done
4. Handle errors gracefully and explain what went wrong
5. Consider the user's current working directory and file paths

IMPORTANT: Always ask for confirmation before making destructive changes like deleting files or overwriting important content.
`;
    
    return `${basePrompt}\n\n${fileOpsSection}`;
  }

  // Enhanced mock response that's more realistic and context-aware
  private generateEnhancedMockResponse(agentId: string, message: string, context?: any, systemPrompt?: string): string {
    const userLevel = context?.userLevel || 'intermediate';
    const currentTask = context?.currentTask;
    const recentFiles = context?.recentFiles;
    const userPreferences = context?.userPreferences;
    
    // Parse the system prompt to understand the agent's personality
    const isTechnical = systemPrompt?.includes('technical') || systemPrompt?.includes('code') || systemPrompt?.includes('development');
    const isCreative = systemPrompt?.includes('creative') || systemPrompt?.includes('artistic') || systemPrompt?.includes('design');
    const isAnalytical = systemPrompt?.includes('analytical') || systemPrompt?.includes('logical') || systemPrompt?.includes('systematic');
    
    // Generate response based on agent personality and context
    let response = '';
    
    switch (agentId) {
      case 'agent_alpha':
        response = this.generateAlphaResponse(message, userLevel, currentTask, recentFiles, userPreferences, isAnalytical);
        break;
      case 'agent_beta':
        response = this.generateBetaResponse(message, userLevel, currentTask, recentFiles, userPreferences, isTechnical);
        break;
      case 'agent_gamma':
        response = this.generateGammaResponse(message, userLevel, currentTask, recentFiles, userPreferences, isCreative);
        break;
      default:
        response = this.generateDefaultResponse(message, userLevel, currentTask, recentFiles, userPreferences);
    }
    
    return response;
  }

  private generateAlphaResponse(message: string, userLevel: string, currentTask?: string, recentFiles?: string[], userPreferences?: string[], isAnalytical?: boolean): string {
    const friendlyIntro = `Hi there! 😊 I'm Alpha, and I'd be happy to help you with that!`;
    
    let response = friendlyIntro + '\n\n';
    
    // Add context awareness
    if (currentTask) {
      response += `I see you're working on ${currentTask} - that's exciting! `;
    }
    
    if (recentFiles && recentFiles.length > 0) {
      response += `I notice you've been working with: ${recentFiles.join(', ')}. `;
    }
    
    // Add personality-specific content
    if (isAnalytical) {
      response += `Let me analyze your request: "${message}"\n\n`;
      response += `For a ${userLevel} level, I'll provide:\n`;
      response += `• Clear, step-by-step explanations\n`;
      response += `• Logical reasoning behind suggestions\n`;
      response += `• Systematic approach to problem-solving\n`;
    } else {
      response += `Let me think about your request: "${message}"\n\n`;
      response += `Since you're at a ${userLevel} level, I'll make sure to explain things clearly. `;
    }
    
    // Add user preference awareness
    if (userPreferences?.includes('modular')) {
      response += `I understand you prefer modular approaches - I'll keep that in mind! `;
    }
    
    response += `\n\nWhat specific aspect would you like me to help you with? I'm here to make this as smooth as possible for you! 👍`;
    
    return response;
  }

  private generateBetaResponse(message: string, userLevel: string, currentTask?: string, recentFiles?: string[], userPreferences?: string[], isTechnical?: boolean): string {
    const technicalIntro = `Hello! I'm Beta, your technical assistant.`;
    
    let response = technicalIntro + '\n\n';
    
    response += `Let me analyze your request: "${message}"\n\n`;
    
    // Add technical context
    if (recentFiles && recentFiles.length > 0) {
      response += `I notice you've been working with: ${recentFiles.join(', ')}. This context will help me provide more relevant suggestions.\n\n`;
    }
    
    if (isTechnical) {
      response += `For a ${userLevel} developer, I'll provide:\n`;
      response += `• Clear code examples with TypeScript\n`;
      response += `• Best practices and patterns\n`;
      response += `• Performance considerations\n`;
      response += `• Error handling approaches\n`;
      response += `• Security considerations where relevant\n\n`;
    }
    
    if (currentTask) {
      response += `Given your current task (${currentTask}), I'll focus on practical, implementable solutions.\n\n`;
    }
    
    response += `Would you like me to dive deeper into any particular aspect? I can provide specific code examples or architectural guidance.`;
    
    return response;
  }

  private generateGammaResponse(message: string, userLevel: string, currentTask?: string, recentFiles?: string[], userPreferences?: string[], isCreative?: boolean): string {
    const creativeIntro = `Hey there! ✨ I'm Gamma, and I'm excited to help you explore creative possibilities!`;
    
    let response = creativeIntro + '\n\n';
    
    response += `Your message: "${message}" - this sounds like a great opportunity for some creative thinking! 🎨\n\n`;
    
    // Add creative context
    if (userPreferences?.includes('creative')) {
      response += `I love that you appreciate creative approaches! `;
    }
    
    if (isCreative) {
      response += `For a ${userLevel} level, I'll:\n`;
      response += `• Suggest multiple creative approaches\n`;
      response += `• Share inspiring examples and case studies\n`;
      response += `• Help you think outside the box\n`;
      response += `• Celebrate your unique perspective\n`;
      response += `• Encourage experimentation and innovation\n\n`;
    }
    
    if (currentTask) {
      response += `Looking at your current task (${currentTask}), I see lots of creative potential! `;
    }
    
    if (recentFiles && recentFiles.length > 0) {
      response += `Your recent work with ${recentFiles.join(', ')} shows great creative thinking! `;
    }
    
    response += `\n\nWhat creative direction interests you most? Let's make something amazing together! 🌟`;
    
    return response;
  }

  private generateDefaultResponse(message: string, userLevel: string, currentTask?: string, recentFiles?: string[], userPreferences?: string[]): string {
    let response = `Hello! I'm here to help you with "${message}".\n\n`;
    
    if (currentTask) {
      response += `I understand you're working on ${currentTask}.\n\n`;
    }
    
    response += `Since you're at a ${userLevel} level, I'll adapt my explanations accordingly.\n\n`;
    
    if (userPreferences && userPreferences.length > 0) {
      response += `I'll keep in mind your preferences: ${userPreferences.join(', ')}.\n\n`;
    }
    
    response += `How can I assist you today?`;
    
    return response;
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

  // File operation methods that agents can use
  async performFileOperation(operation: string, agentId: string): Promise<FileOperationResult> {
    try {
      // Parse the operation to determine what to do
      const lowerOp = operation.toLowerCase();
      
      if (lowerOp.includes('read') && lowerOp.includes('file')) {
        const filePath = this.extractFilePath(operation);
        return await fileOperationsService.readFile(filePath);
      }
      
      if (lowerOp.includes('write') || lowerOp.includes('create')) {
        const filePath = this.extractFilePath(operation);
        const content = this.extractContent(operation);
        return await fileOperationsService.writeFile(filePath, content, true);
      }
      
      if (lowerOp.includes('delete')) {
        const filePath = this.extractFilePath(operation);
        return await fileOperationsService.deleteFile(filePath);
      }
      
      if (lowerOp.includes('list') || lowerOp.includes('directory')) {
        const dirPath = this.extractDirectoryPath(operation);
        return await fileOperationsService.listFiles(dirPath);
      }
      
      if (lowerOp.includes('copy')) {
        const paths = this.extractSourceAndTarget(operation);
        return await fileOperationsService.copyFile(paths.source, paths.target);
      }
      
      if (lowerOp.includes('move')) {
        const paths = this.extractSourceAndTarget(operation);
        return await fileOperationsService.moveFile(paths.source, paths.target);
      }
      
      return {
        success: false,
        error: 'Unrecognized file operation. Please specify: read, write, create, delete, list, copy, or move.'
      };
    } catch (error) {
      return {
        success: false,
        error: `File operation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Helper methods for parsing file operations
  private extractFilePath(operation: string): string {
    // Simple extraction - in a real implementation, you'd use more sophisticated parsing
    const match = operation.match(/(?:read|write|create|delete|copy|move)\s+(?:file\s+)?([^\s]+)/i);
    return match ? match[1] : 'unknown.txt';
  }

  private extractDirectoryPath(operation: string): string {
    const match = operation.match(/(?:list|directory)\s+(?:files\s+)?(?:in\s+)?([^\s]+)/i);
    return match ? match[1] : '.';
  }

  private extractContent(operation: string): string {
    const match = operation.match(/(?:with|content|content:)\s+(.+)/i);
    return match ? match[1] : '// Default content';
  }

  private extractSourceAndTarget(operation: string): { source: string; target: string } {
    const match = operation.match(/(?:copy|move)\s+([^\s]+)\s+(?:to|into)\s+([^\s]+)/i);
    return {
      source: match ? match[1] : 'source.txt',
      target: match ? match[2] : 'target.txt'
    };
  }
}

// Export singleton instance
export const llmService = LLMService.getInstance();
