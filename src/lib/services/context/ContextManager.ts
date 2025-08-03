import { writable, derived, get } from 'svelte/store';

// Enhanced interfaces for modern IDE-like context management
export interface FileContext {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  metadata?: {
    lines?: number;
    characters?: number;
    encoding?: string;
    lastModified?: Date;
    dimensions?: { width: number; height: number };
    language?: string;
    framework?: string;
    dependencies?: string[];
  };
  analysis?: {
    summary?: string;
    keywords?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    complexity?: 'simple' | 'moderate' | 'complex';
    relevanceScore?: number; // 0-1 score for current context
    lastAccessed?: Date;
    accessCount?: number;
  };
  context?: {
    relatedFiles?: string[];
    imports?: string[];
    exports?: string[];
    functions?: string[];
    classes?: string[];
  };
}

export interface ConversationContext {
  id: string;
  timestamp: Date;
  userMessage: string;
  agentResponse: string;
  files?: FileContext[];
  systemNotes?: string[];
  relevanceScore?: number;
  tags?: string[];
  intent?: string;
}

export interface AgentContext {
  agentId: string;
  currentTask?: string;
  availableFiles: FileContext[];
  conversationHistory: ConversationContext[];
  systemState: {
    isProcessing: boolean;
    lastActivity: Date;
    errorCount: number;
    performanceMetrics?: {
      responseTime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  contextCache?: {
    recentFiles: string[];
    favoriteFiles: string[];
    searchHistory: string[];
  };
}

export interface GlobalContext {
  activeFiles: FileContext[];
  systemStatus: 'idle' | 'processing' | 'error';
  lastUpdate: Date;
  performanceMetrics: {
    totalMemoryUsage: number;
    activeAgents: number;
    cacheHitRate: number;
  };
  contextTimeline: Array<{
    timestamp: Date;
    event: string;
    agentId?: string;
    fileId?: string;
    metadata?: any;
  }>;
}

// LRU Cache for intelligent context management
class ContextCache {
  private cache = new Map<string, any>();
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): any {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      return this.cache.get(key);
    }
    return null;
  }

  set(key: string, value: any): void {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      // Move to end
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
    } else {
      if (this.cache.size >= this.maxSize) {
        // Remove least recently used
        const lruKey = this.accessOrder.shift();
        if (lruKey) {
          this.cache.delete(lruKey);
        }
      }
      this.cache.set(key, value);
      this.accessOrder.push(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  private calculateHitRate(): number {
    // Simplified hit rate calculation
    return this.cache.size / this.maxSize;
  }
}

// Enhanced Context Manager with IDE-like features
class ContextManager {
  private contexts = new Map<string, AgentContext>();
  private globalContext = writable<GlobalContext>({
    activeFiles: [],
    systemStatus: 'idle',
    lastUpdate: new Date(),
    performanceMetrics: {
      totalMemoryUsage: 0,
      activeAgents: 0,
      cacheHitRate: 0
    },
    contextTimeline: []
  });

  // Enhanced caching system
  private fileCache = new ContextCache(200);
  private conversationCache = new ContextCache(100);
  private analysisCache = new ContextCache(50);

  // Context relevance scoring
  private relevanceWeights = {
    recency: 0.3,
    frequency: 0.25,
    contentRelevance: 0.25,
    userPreference: 0.2
  };

  // File Analysis Methods with enhanced capabilities
  async analyzeFile(file: File): Promise<FileContext> {
    const cacheKey = `file_${file.name}_${file.lastModified}_${file.size}`;
    const cached = this.fileCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let content: string | undefined;
    let metadata: any = {};
    
    try {
      // Enhanced file type detection
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'java': 'java',
        'cpp': 'cpp', 'c': 'c', 'rs': 'rust', 'go': 'go', 'rb': 'ruby',
        'php': 'php', 'cs': 'csharp', 'swift': 'swift', 'kt': 'kotlin'
      };

      // Read file content based on type
      if (file.type.startsWith('text/') || this.isTextFile(file.name)) {
        content = await file.text();
        metadata = {
          lines: content.split('\n').length,
          characters: content.length,
          encoding: 'UTF-8',
          lastModified: new Date(file.lastModified),
          language: languageMap[fileExtension || ''] || 'text',
          framework: this.detectFramework(content, file.name),
          dependencies: this.extractDependencies(content, file.name)
        };
      } else if (file.type.startsWith('image/')) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = () => {
            metadata = {
              dimensions: { width: img.width, height: img.height },
              lastModified: new Date(file.lastModified)
            };
            resolve(null);
          };
        });
      } else {
        metadata = {
          lastModified: new Date(file.lastModified)
        };
      }

      // Enhanced content analysis
      const analysis = content ? await this.analyzeContent(content, file.name) : undefined;

      const fileContext: FileContext = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        content,
        metadata,
        analysis,
        context: content ? this.extractContextInfo(content, file.name) : undefined
      };

      // Cache the result
      this.fileCache.set(cacheKey, fileContext);
      return fileContext;
    } catch (error) {
      console.error('Error analyzing file:', error);
      return {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        metadata: { lastModified: new Date(file.lastModified) }
      };
    }
  }

  private detectFramework(content: string, filename: string): string | undefined {
    const frameworks = {
      'react': /import.*react|from.*react/gi,
      'vue': /import.*vue|from.*vue/gi,
      'angular': /import.*angular|from.*angular/gi,
      'svelte': /import.*svelte|from.*svelte/gi,
      'express': /require.*express|import.*express/gi,
      'fastapi': /from.*fastapi|import.*fastapi/gi,
      'django': /from.*django|import.*django/gi
    };

    for (const [framework, pattern] of Object.entries(frameworks)) {
      if (pattern.test(content)) {
        return framework;
      }
    }
    return undefined;
  }

  private extractDependencies(content: string, filename: string): string[] {
    const dependencies: string[] = [];
    
    // Extract package.json dependencies
    if (filename === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        if (pkg.dependencies) {
          dependencies.push(...Object.keys(pkg.dependencies));
        }
        if (pkg.devDependencies) {
          dependencies.push(...Object.keys(pkg.devDependencies));
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Extract import statements
    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private extractContextInfo(content: string, filename: string): FileContext['context'] {
    const context: FileContext['context'] = {
      relatedFiles: [],
      imports: [],
      exports: [],
      functions: [],
      classes: []
    };

    // Extract imports
    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      context.imports!.push(match[1]);
    }

    // Extract function definitions
    const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*[=\(]/g;
    while ((match = functionRegex.exec(content)) !== null) {
      context.functions!.push(match[1]);
    }

    // Extract class definitions
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      context.classes!.push(match[1]);
    }

    return context;
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.py', '.java', '.cpp', '.c', '.h', '.ts', '.jsx', '.tsx', '.vue', '.svelte', '.log', '.ini', '.conf', '.yml', '.yaml', '.rs', '.toml', '.lock'];
    return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private async analyzeContent(content: string, filename: string): Promise<FileContext['analysis']> {
    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(word => word.length > 0);
    
    // Enhanced analysis with relevance scoring
    const summary = this.generateSummary(content, filename);
    const keywords = this.extractKeywords(content);
    const complexity = this.assessComplexity(content);
    const relevanceScore = this.calculateRelevanceScore(content, filename);
    
    return {
      summary,
      keywords,
      complexity,
      sentiment: 'neutral',
      relevanceScore,
      lastAccessed: new Date(),
      accessCount: 1
    };
  }

  private calculateRelevanceScore(content: string, filename: string): number {
    let score = 0.5; // Base score

    // Recency factor (simplified)
    score += this.relevanceWeights.recency * 0.3;

    // Content relevance based on keywords
    const relevantKeywords = ['function', 'class', 'import', 'export', 'component', 'api', 'data'];
    const contentLower = content.toLowerCase();
    const keywordMatches = relevantKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    score += this.relevanceWeights.contentRelevance * (keywordMatches / relevantKeywords.length);

    // File type relevance
    const codeFiles = ['.js', '.ts', '.py', '.java', '.cpp', '.rs'];
    if (codeFiles.some(ext => filename.endsWith(ext))) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private generateSummary(content: string, filename: string): string {
    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(word => word.length > 0);
    
    if (filename.endsWith('.json')) {
      return `JSON file with ${lines.length} lines and ${words.length} words`;
    } else if (filename.endsWith('.md')) {
      return `Markdown file with ${lines.length} lines and ${words.length} words`;
    } else if (filename.endsWith('.py') || filename.endsWith('.js') || filename.endsWith('.ts')) {
      return `Code file (${filename.split('.').pop()}) with ${lines.length} lines`;
    } else if (filename.endsWith('.txt')) {
      return `Text file with ${lines.length} lines and ${words.length} words`;
    } else {
      return `File with ${lines.length} lines and ${words.length} words`;
    }
  }

  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private assessComplexity(content: string): 'simple' | 'moderate' | 'complex' {
    const lines = content.split('\n');
    const avgLineLength = content.length / lines.length;
    
    if (lines.length < 10 && avgLineLength < 50) return 'simple';
    if (lines.length < 50 && avgLineLength < 100) return 'moderate';
    return 'complex';
  }

  // Enhanced Context Management Methods
  async addFileToContext(file: File, agentId?: string): Promise<FileContext> {
    const fileContext = await this.analyzeFile(file);
    
    // Add to global context with timeline tracking
    this.globalContext.update(context => ({
      ...context,
      activeFiles: [...context.activeFiles, fileContext],
      lastUpdate: new Date(),
      contextTimeline: [...context.contextTimeline, {
        timestamp: new Date(),
        event: 'file_added',
        fileId: fileContext.id,
        metadata: { filename: file.name, agentId }
      }]
    }));

    // Add to specific agent context if provided
    if (agentId) {
      this.addFileToAgentContext(agentId, fileContext);
    }

    return fileContext;
  }

  addFileToAgentContext(agentId: string, fileContext: FileContext) {
    console.log('Adding file to agent context:', agentId, fileContext.name);
    
    if (!this.contexts.has(agentId)) {
      console.log('Creating new agent context for:', agentId);
      this.contexts.set(agentId, {
        agentId,
        availableFiles: [],
        conversationHistory: [],
        systemState: {
          isProcessing: false,
          lastActivity: new Date(),
          errorCount: 0
        },
        contextCache: {
          recentFiles: [],
          favoriteFiles: [],
          searchHistory: []
        }
      });
    }

    const context = this.contexts.get(agentId)!;
    context.availableFiles.push(fileContext);
    context.systemState.lastActivity = new Date();
    
    // Update cache
    if (context.contextCache) {
      context.contextCache.recentFiles = [
        fileContext.id,
        ...context.contextCache.recentFiles.filter(id => id !== fileContext.id)
      ].slice(0, 10); // Keep only 10 most recent
    }
    
    console.log('Agent context updated:', agentId, 'files:', context.availableFiles.length);
  }

  getAgentContext(agentId: string): AgentContext | undefined {
    const context = this.contexts.get(agentId);
    console.log('Getting agent context for:', agentId, 'exists:', !!context);
    return context;
  }

  // Initialize agent context if it doesn't exist
  initializeAgentContext(agentId: string) {
    if (!this.contexts.has(agentId)) {
      console.log('Initializing agent context for:', agentId);
      this.contexts.set(agentId, {
        agentId,
        availableFiles: [],
        conversationHistory: [],
        systemState: {
          isProcessing: false,
          lastActivity: new Date(),
          errorCount: 0
        },
        contextCache: {
          recentFiles: [],
          favoriteFiles: [],
          searchHistory: []
        }
      });
    }
  }

  getGlobalContext() {
    return this.globalContext;
  }

  // Enhanced Conversation Management
  addConversationContext(agentId: string, userMessage: string, agentResponse: string, files?: FileContext[]) {
    if (!this.contexts.has(agentId)) {
      this.contexts.set(agentId, {
        agentId,
        availableFiles: [],
        conversationHistory: [],
        systemState: {
          isProcessing: false,
          lastActivity: new Date(),
          errorCount: 0
        },
        contextCache: {
          recentFiles: [],
          favoriteFiles: [],
          searchHistory: []
        }
      });
    }

    const context = this.contexts.get(agentId)!;
    const conversationContext: ConversationContext = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userMessage,
      agentResponse,
      files,
      relevanceScore: this.calculateConversationRelevance(userMessage, agentResponse),
      tags: this.extractConversationTags(userMessage, agentResponse),
      intent: this.detectConversationIntent(userMessage)
    };

    context.conversationHistory.push(conversationContext);
    context.systemState.lastActivity = new Date();
  }

  private calculateConversationRelevance(userMessage: string, agentResponse: string): number {
    // Simple relevance calculation based on message length and content
    const totalLength = userMessage.length + agentResponse.length;
    const hasCode = /```|function|class|import|export/.test(userMessage + agentResponse);
    const hasFileRef = /file|document|code|script/.test(userMessage.toLowerCase());
    
    let score = 0.5;
    if (totalLength > 100) score += 0.2;
    if (hasCode) score += 0.2;
    if (hasFileRef) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private extractConversationTags(userMessage: string, agentResponse: string): string[] {
    const tags: string[] = [];
    const text = (userMessage + ' ' + agentResponse).toLowerCase();
    
    if (/file|document|read|write/.test(text)) tags.push('file-operations');
    if (/code|function|class|import/.test(text)) tags.push('code-analysis');
    if (/error|bug|fix/.test(text)) tags.push('debugging');
    if (/create|new|generate/.test(text)) tags.push('creation');
    if (/search|find|locate/.test(text)) tags.push('search');
    
    return tags;
  }

  private detectConversationIntent(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (/read|open|show/.test(message)) return 'read';
    if (/write|create|generate/.test(message)) return 'create';
    if (/modify|edit|change/.test(message)) return 'modify';
    if (/delete|remove/.test(message)) return 'delete';
    if (/search|find/.test(message)) return 'search';
    if (/analyze|examine/.test(message)) return 'analyze';
    
    return 'general';
  }

  // Enhanced Context Generation for LLM
  generateContextForAgent(agentId: string, userMessage: string): string {
    const context = this.contexts.get(agentId);
    if (!context) return userMessage;

    let contextString = userMessage + '\n\n';

    // Add file context with relevance scoring
    if (context.availableFiles.length > 0) {
      const sortedFiles = context.availableFiles
        .sort((a, b) => (b.analysis?.relevanceScore || 0) - (a.analysis?.relevanceScore || 0))
        .slice(0, 5); // Top 5 most relevant files

      contextString += 'Available files (sorted by relevance):\n';
      sortedFiles.forEach((file, index) => {
        const relevance = file.analysis?.relevanceScore || 0;
        contextString += `${index + 1}. ${file.name} (${file.type}, ${this.formatFileSize(file.size)}) [Relevance: ${(relevance * 100).toFixed(1)}%]\n`;
        if (file.analysis?.summary) {
          contextString += `   Summary: ${file.analysis.summary}\n`;
        }
        if (file.content && file.content.length < 500) {
          contextString += `   Content: ${file.content.substring(0, 200)}...\n`;
        }
        contextString += '\n';
      });
    }

    // Add recent conversation history with relevance
    if (context.conversationHistory.length > 0) {
      const relevantHistory = context.conversationHistory
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 3);
      
      contextString += 'Recent relevant conversations:\n';
      relevantHistory.forEach(conv => {
        contextString += `[${conv.intent}] User: ${conv.userMessage}\n`;
        contextString += `Agent: ${conv.agentResponse}\n\n`;
      });
    }

    return contextString;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Advanced Context Management Features
  searchContext(query: string, agentId?: string): FileContext[] {
    const results: FileContext[] = [];
    const searchTerm = query.toLowerCase();

    if (agentId) {
      const context = this.contexts.get(agentId);
      if (context) {
        results.push(...context.availableFiles.filter(file =>
          file.name.toLowerCase().includes(searchTerm) ||
          file.analysis?.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
          file.content?.toLowerCase().includes(searchTerm)
        ));
      }
    } else {
      // Search global context
      const globalCtx = get(this.globalContext);
      results.push(...globalCtx.activeFiles.filter(file =>
        file.name.toLowerCase().includes(searchTerm) ||
        file.analysis?.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
        file.content?.toLowerCase().includes(searchTerm)
      ));
    }

    return results.sort((a, b) => (b.analysis?.relevanceScore || 0) - (a.analysis?.relevanceScore || 0));
  }

  getContextStats(): {
    totalFiles: number;
    totalAgents: number;
    cacheStats: any;
    memoryUsage: number;
  } {
    const globalCtx = get(this.globalContext);
    const totalFiles = globalCtx.activeFiles.length;
    const totalAgents = this.contexts.size;
    
    return {
      totalFiles,
      totalAgents,
      cacheStats: {
        fileCache: this.fileCache.getStats(),
        conversationCache: this.conversationCache.getStats(),
        analysisCache: this.analysisCache.getStats()
      },
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let totalSize = 0;
    
    // File cache size
    this.fileCache.getStats();
    totalSize += this.fileCache.getStats().size * 1024; // Assume 1KB per file context
    
    // Contexts size
    totalSize += this.contexts.size * 2048; // Assume 2KB per agent context
    
    return totalSize;
  }

  // Cleanup Methods
  clearAgentContext(agentId: string) {
    this.contexts.delete(agentId);
  }

  clearGlobalContext() {
    this.globalContext.set({
      activeFiles: [],
      systemStatus: 'idle',
      lastUpdate: new Date(),
      performanceMetrics: {
        totalMemoryUsage: 0,
        activeAgents: 0,
        cacheHitRate: 0
      },
      contextTimeline: []
    });
  }

  clearCache() {
    this.fileCache.clear();
    this.conversationCache.clear();
    this.analysisCache.clear();
  }

  // Utility Methods
  getActiveFiles(): FileContext[] {
    let context: any;
    this.globalContext.subscribe(value => context = value)();
    return context.activeFiles;
  }

  isAgentProcessing(agentId: string): boolean {
    const context = this.contexts.get(agentId);
    return context?.systemState.isProcessing || false;
  }

  setAgentProcessing(agentId: string, isProcessing: boolean) {
    const context = this.contexts.get(agentId);
    if (context) {
      context.systemState.isProcessing = isProcessing;
      context.systemState.lastActivity = new Date();
    }
  }

  // New IDE-like features
  markFileAsFavorite(agentId: string, fileId: string) {
    const context = this.contexts.get(agentId);
    if (context?.contextCache) {
      if (!context.contextCache.favoriteFiles.includes(fileId)) {
        context.contextCache.favoriteFiles.push(fileId);
      }
    }
  }

  removeFileFromFavorites(agentId: string, fileId: string) {
    const context = this.contexts.get(agentId);
    if (context?.contextCache) {
      context.contextCache.favoriteFiles = context.contextCache.favoriteFiles.filter(id => id !== fileId);
    }
  }

  getFavoriteFiles(agentId: string): FileContext[] {
    const context = this.contexts.get(agentId);
    if (!context?.contextCache) return [];
    
    return context.availableFiles.filter(file => 
      context.contextCache!.favoriteFiles.includes(file.id)
    );
  }

  updateFileRelevance(fileId: string, newRelevance: number) {
    // Update relevance score for a file across all contexts
    this.contexts.forEach(context => {
      const file = context.availableFiles.find(f => f.id === fileId);
      if (file?.analysis) {
        file.analysis.relevanceScore = newRelevance;
        file.analysis.lastAccessed = new Date();
        file.analysis.accessCount = (file.analysis.accessCount || 0) + 1;
      }
    });
  }
}

// Export singleton instance
export const contextManager = new ContextManager(); 