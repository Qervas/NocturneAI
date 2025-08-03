import { fileOperationsService } from '../data/FileOperationsService';
import { llmService } from './LLMService';

export interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
  confidence: number;
}

export interface SemanticAnalysisResult {
  intent: 'file_read' | 'file_write' | 'file_modify' | 'system_command' | 'code_analysis' | 'data_processing' | 'conversation' | 'unknown';
  tools: ToolCall[];
  confidence: number;
  extractedData: {
    fileName?: string;
    content?: string;
    command?: string;
    target?: string;
  };
}

export class SemanticAnalysisService {
  private static instance: SemanticAnalysisService;

  static getInstance(): SemanticAnalysisService {
    if (!SemanticAnalysisService.instance) {
      SemanticAnalysisService.instance = new SemanticAnalysisService();
    }
    return SemanticAnalysisService.instance;
  }

  /**
   * Analyze user message and determine intent and required tools
   */
  async analyzeUserIntent(
    message: string, 
    conversationHistory: any[], 
    availableTools: string[]
  ): Promise<SemanticAnalysisResult> {
    
    // Create a context-aware prompt for the LLM to analyze intent
    const analysisPrompt = this.buildAnalysisPrompt(message, conversationHistory, availableTools);
    
    try {
      // Use the LLM to analyze the intent
      const analysisResponse = await llmService.sendMessageToAgent('agent_alpha', analysisPrompt, 'System');
      
      // Parse the LLM response to extract intent and tool calls
      return this.parseAnalysisResponse(analysisResponse, message, conversationHistory);
      
    } catch (error) {
      console.error('Semantic analysis failed:', error);
      // Fallback to basic pattern matching
      return this.fallbackAnalysis(message, conversationHistory);
    }
  }

  /**
   * Execute tools based on semantic analysis
   */
  async executeTools(toolCalls: ToolCall[]): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    const results = [];
    const errors = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeTool(toolCall);
        results.push({ tool: toolCall.tool, result });
      } catch (error) {
        errors.push(`${toolCall.tool}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  private async executeTool(toolCall: ToolCall): Promise<any> {
    switch (toolCall.tool) {
      case 'file_read':
        return await fileOperationsService.readFile(toolCall.parameters.filePath);
      
      case 'file_write':
        return await fileOperationsService.writeFile(
          toolCall.parameters.filePath, 
          toolCall.parameters.content, 
          toolCall.parameters.createBackup
        );
      
      case 'file_modify':
        return await fileOperationsService.modifyFile(
          toolCall.parameters.filePath, 
          toolCall.parameters.modifications
        );
      
      default:
        throw new Error(`Unknown tool: ${toolCall.tool}`);
    }
  }

  private buildAnalysisPrompt(message: string, conversationHistory: any[], availableTools: string[]): string {
    const recentContext = conversationHistory.slice(-5).map(msg => `${msg.type}: ${msg.content}`).join('\n');
    
    return `You are a semantic analysis system. Analyze the user's message and determine their intent and required tools.

AVAILABLE TOOLS: ${availableTools.join(', ')}

RECENT CONVERSATION:
${recentContext}

USER MESSAGE: "${message}"

ANALYZE THE USER'S INTENT AND RESPOND IN THIS EXACT JSON FORMAT:
{
  "intent": "file_read|file_write|file_modify|system_command|code_analysis|data_processing|conversation|unknown",
  "confidence": 0.0-1.0,
  "tools": [
    {
      "tool": "tool_name",
      "parameters": {"param1": "value1"},
      "confidence": 0.0-1.0
    }
  ],
  "extractedData": {
    "fileName": "extracted_file_name",
    "content": "extracted_content",
    "command": "extracted_command",
    "target": "extracted_target"
  }
}

EXAMPLES:
- "what's in this file" → file_read intent, extract fileName from context
- "3.141592653" → file_write intent, use as content, extract fileName from context  
- "change it with pi digits" → file_modify intent, extract fileName from context
- "run ls" → system_command intent, extract command

RESPOND WITH ONLY THE JSON:`;
  }

  private parseAnalysisResponse(response: string, originalMessage: string, conversationHistory: any[]): SemanticAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        intent: parsed.intent || 'unknown',
        tools: parsed.tools || [],
        confidence: parsed.confidence || 0.5,
        extractedData: parsed.extractedData || {}
      };
      
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return this.fallbackAnalysis(originalMessage, conversationHistory);
    }
  }

  private fallbackAnalysis(message: string, conversationHistory: any[]): SemanticAnalysisResult {
    const messageLower = message.toLowerCase();
    
    // Basic fallback patterns
    if (messageLower.includes('file') || messageLower.includes('read') || messageLower.includes('what')) {
      return {
        intent: 'file_read',
        tools: [{
          tool: 'file_read',
          parameters: { filePath: this.extractFileNameFromContext(conversationHistory) },
          confidence: 0.7
        }],
        confidence: 0.7,
        extractedData: {
          fileName: this.extractFileNameFromContext(conversationHistory)
        }
      };
    }
    
    if (messageLower.includes('write') || messageLower.includes('update') || messageLower.includes('change') || 
        /^\d+\.\d+$/.test(message.trim()) || /^\d+$/.test(message.trim())) {
      return {
        intent: 'file_write',
        tools: [{
          tool: 'file_write',
          parameters: { 
            filePath: this.extractFileNameFromContext(conversationHistory),
            content: message.trim(),
            createBackup: true
          },
          confidence: 0.8
        }],
        confidence: 0.8,
        extractedData: {
          fileName: this.extractFileNameFromContext(conversationHistory),
          content: message.trim()
        }
      };
    }
    
    return {
      intent: 'conversation',
      tools: [],
      confidence: 0.5,
      extractedData: {}
    };
  }

  private extractFileNameFromContext(conversationHistory: any[]): string {
    // Look for recent file uploads or file references
    const recentMessages = conversationHistory.slice(-5);
    
    for (const msg of recentMessages) {
      if (msg.type === 'file-upload' && msg.fileInfo) {
        return msg.fileInfo.name;
      }
      if (msg.content && msg.content.includes('.txt')) {
        const match = msg.content.match(/(\w+\.txt)/);
        if (match) return match[1];
      }
    }
    
    return 'output.txt'; // Default fallback
  }
}

export const semanticAnalysisService = SemanticAnalysisService.getInstance(); 