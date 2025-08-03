import { writable, derived } from 'svelte/store';
import { contextManager, type FileContext, type ConversationContext } from './ContextManager';

export interface ContextSuggestion {
  id: string;
  type: 'file' | 'conversation' | 'action';
  title: string;
  description: string;
  relevance: number;
  confidence: number;
  action?: () => void;
  metadata?: any;
}

export interface ContextAnalytics {
  fileUsage: {
    mostAccessed: FileContext[];
    recentlyModified: FileContext[];
    largestFiles: FileContext[];
    byLanguage: Record<string, number>;
    byFramework: Record<string, number>;
  };
  conversationPatterns: {
    mostCommonIntents: string[];
    averageResponseTime: number;
    conversationLengths: number[];
    activeHours: number[];
  };
  performanceMetrics: {
    cacheEfficiency: number;
    memoryUsage: number;
    contextSwitchRate: number;
    relevanceAccuracy: number;
  };
}

export interface ContextFilter {
  id: string;
  name: string;
  type: 'file' | 'conversation' | 'system';
  criteria: {
    field: string;
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'regex';
    value: any;
  }[];
  isActive: boolean;
}

class AdvancedContextService {
  private suggestions = writable<ContextSuggestion[]>([]);
  private analytics = writable<ContextAnalytics | null>(null);
  private filters = writable<ContextFilter[]>([]);
  private contextHistory = writable<Array<{
    timestamp: Date;
    action: string;
    agentId: string;
    metadata: any;
  }>>([]);

  // Generate intelligent context suggestions
  async generateSuggestions(agentId: string, currentContext: string): Promise<ContextSuggestion[]> {
    const suggestions: ContextSuggestion[] = [];
    const agentContext = contextManager.getAgentContext(agentId);
    
    if (!agentContext) return suggestions;

    // File-based suggestions
    const recentFiles = agentContext.availableFiles
      .sort((a, b) => (b.analysis?.lastAccessed?.getTime() || 0) - (a.analysis?.lastAccessed?.getTime() || 0))
      .slice(0, 5);

    recentFiles.forEach(file => {
      const relevance = this.calculateFileRelevance(file, currentContext);
      if (relevance > 0.3) {
        suggestions.push({
          id: `file_${file.id}`,
          type: 'file',
          title: `Review ${file.name}`,
          description: file.analysis?.summary || `File with ${file.metadata?.lines || 0} lines`,
          relevance,
          confidence: file.analysis?.relevanceScore || 0.5,
          metadata: { fileId: file.id, language: file.metadata?.language }
        });
      }
    });

    // Conversation-based suggestions
    const recentConversations = agentContext.conversationHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 3);

    recentConversations.forEach(conv => {
      if (conv.relevanceScore && conv.relevanceScore > 0.6) {
        suggestions.push({
          id: `conv_${conv.id}`,
          type: 'conversation',
          title: `Continue: ${conv.intent || 'conversation'}`,
          description: conv.userMessage.substring(0, 50) + '...',
          relevance: conv.relevanceScore,
          confidence: 0.8,
          metadata: { conversationId: conv.id, intent: conv.intent }
        });
      }
    });

    // Action-based suggestions
    suggestions.push({
      id: 'action_search',
      type: 'action',
      title: 'Search Context',
      description: 'Search through all available files and conversations',
      relevance: 0.7,
      confidence: 0.9,
      action: () => this.triggerSearch(agentId)
    });

    suggestions.push({
      id: 'action_analyze',
      type: 'action',
      title: 'Analyze Performance',
      description: 'Get detailed analytics about context usage',
      relevance: 0.5,
      confidence: 0.8,
      action: () => this.generateAnalytics(agentId)
    });

    // Sort by relevance and confidence
    suggestions.sort((a, b) => {
      const aScore = a.relevance * a.confidence;
      const bScore = b.relevance * b.confidence;
      return bScore - aScore;
    });

    this.suggestions.set(suggestions);
    return suggestions;
  }

  private calculateFileRelevance(file: FileContext, currentContext: string): number {
    let relevance = 0.5;

    // Check if current context mentions the file
    if (currentContext.toLowerCase().includes(file.name.toLowerCase())) {
      relevance += 0.3;
    }

    // Check if current context mentions the language
    if (file.metadata?.language && currentContext.toLowerCase().includes(file.metadata.language.toLowerCase())) {
      relevance += 0.2;
    }

    // Check if current context mentions the framework
    if (file.metadata?.framework && currentContext.toLowerCase().includes(file.metadata.framework.toLowerCase())) {
      relevance += 0.2;
    }

    // Check keywords
    if (file.analysis?.keywords) {
      const keywordMatches = file.analysis.keywords.filter(keyword =>
        currentContext.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      relevance += (keywordMatches / file.analysis.keywords.length) * 0.2;
    }

    return Math.min(relevance, 1.0);
  }

  // Generate comprehensive analytics
  async generateAnalytics(agentId: string): Promise<ContextAnalytics> {
    const agentContext = contextManager.getAgentContext(agentId);
    const stats = contextManager.getContextStats();
    
    if (!agentContext) {
      throw new Error('Agent context not found');
    }

    // File usage analytics
    const fileUsage = {
      mostAccessed: agentContext.availableFiles
        .filter(f => f.analysis?.accessCount)
        .sort((a, b) => (b.analysis?.accessCount || 0) - (a.analysis?.accessCount || 0))
        .slice(0, 5),
      recentlyModified: agentContext.availableFiles
        .filter(f => f.metadata?.lastModified)
        .sort((a, b) => new Date(b.metadata?.lastModified || 0).getTime() - new Date(a.metadata?.lastModified || 0).getTime())
        .slice(0, 5),
      largestFiles: agentContext.availableFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 5),
      byLanguage: this.aggregateByLanguage(agentContext.availableFiles),
      byFramework: this.aggregateByFramework(agentContext.availableFiles)
    };

    // Conversation patterns
    const conversationPatterns = {
      mostCommonIntents: this.getMostCommonIntents(agentContext.conversationHistory),
      averageResponseTime: this.calculateAverageResponseTime(agentContext.conversationHistory),
      conversationLengths: agentContext.conversationHistory.map(conv => 
        conv.userMessage.length + conv.agentResponse.length
      ),
      activeHours: this.getActiveHours(agentContext.conversationHistory)
    };

    // Performance metrics
    const performanceMetrics = {
      cacheEfficiency: stats.cacheStats.fileCache.hitRate,
      memoryUsage: stats.memoryUsage,
      contextSwitchRate: this.calculateContextSwitchRate(agentId),
      relevanceAccuracy: this.calculateRelevanceAccuracy(agentContext)
    };

    const analytics: ContextAnalytics = {
      fileUsage,
      conversationPatterns,
      performanceMetrics
    };

    this.analytics.set(analytics);
    return analytics;
  }

  private aggregateByLanguage(files: FileContext[]): Record<string, number> {
    const languageCount: Record<string, number> = {};
    files.forEach(file => {
      const language = file.metadata?.language || 'unknown';
      languageCount[language] = (languageCount[language] || 0) + 1;
    });
    return languageCount;
  }

  private aggregateByFramework(files: FileContext[]): Record<string, number> {
    const frameworkCount: Record<string, number> = {};
    files.forEach(file => {
      const framework = file.metadata?.framework || 'none';
      frameworkCount[framework] = (frameworkCount[framework] || 0) + 1;
    });
    return frameworkCount;
  }

  private getMostCommonIntents(conversations: ConversationContext[]): string[] {
    const intentCount: Record<string, number> = {};
    conversations.forEach(conv => {
      const intent = conv.intent || 'general';
      intentCount[intent] = (intentCount[intent] || 0) + 1;
    });
    
    return Object.entries(intentCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent]) => intent);
  }

  private calculateAverageResponseTime(conversations: ConversationContext[]): number {
    if (conversations.length < 2) return 0;
    
    let totalTime = 0;
    for (let i = 1; i < conversations.length; i++) {
      const timeDiff = conversations[i].timestamp.getTime() - conversations[i-1].timestamp.getTime();
      totalTime += timeDiff;
    }
    
    return totalTime / (conversations.length - 1);
  }

  private getActiveHours(conversations: ConversationContext[]): number[] {
    const hourCount = new Array(24).fill(0);
    conversations.forEach(conv => {
      const hour = conv.timestamp.getHours();
      hourCount[hour]++;
    });
    return hourCount;
  }

  private calculateContextSwitchRate(agentId: string): number {
    // Simplified context switch rate calculation
    const context = contextManager.getAgentContext(agentId);
    if (!context) return 0;
    
    const recentActivity = context.systemState.lastActivity;
    const timeSinceLastActivity = Date.now() - recentActivity.getTime();
    const hoursSinceLastActivity = timeSinceLastActivity / (1000 * 60 * 60);
    
    // Higher rate if more recent activity
    return Math.max(0, 1 - hoursSinceLastActivity / 24);
  }

  private calculateRelevanceAccuracy(agentContext: any): number {
    if (!agentContext.availableFiles.length) return 0;
    
    const filesWithRelevance = agentContext.availableFiles.filter((f: any) => f.analysis?.relevanceScore);
    if (!filesWithRelevance.length) return 0;
    
    const averageRelevance = filesWithRelevance.reduce((sum: number, file: any) => 
      sum + (file.analysis?.relevanceScore || 0), 0
    ) / filesWithRelevance.length;
    
    return averageRelevance;
  }

  // Advanced filtering system
  createFilter(name: string, type: ContextFilter['type'], criteria: ContextFilter['criteria']): ContextFilter {
    const filter: ContextFilter = {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      criteria,
      isActive: true
    };

    this.filters.update(filters => [...filters, filter]);
    return filter;
  }

  applyFilters(items: any[], filters: ContextFilter[]): any[] {
    const activeFilters = filters.filter(f => f.isActive);
    
    return items.filter(item => {
      return activeFilters.every(filter => {
        return filter.criteria.every(criterion => {
          const value = this.getNestedValue(item, criterion.field);
          
          switch (criterion.operator) {
            case 'equals':
              return value === criterion.value;
            case 'contains':
              return String(value).toLowerCase().includes(String(criterion.value).toLowerCase());
            case 'greater':
              return Number(value) > Number(criterion.value);
            case 'less':
              return Number(value) < Number(criterion.value);
            case 'regex':
              return new RegExp(criterion.value).test(String(value));
            default:
              return true;
          }
        });
      });
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Context history tracking
  logContextAction(agentId: string, action: string, metadata: any = {}) {
    this.contextHistory.update(history => [
      {
        timestamp: new Date(),
        action,
        agentId,
        metadata
      },
      ...history.slice(0, 99) // Keep only last 100 entries
    ]);
  }

  // Smart search with context awareness
  async smartSearch(query: string, agentId: string, context: string = ''): Promise<{
    files: FileContext[];
    conversations: ConversationContext[];
    suggestions: string[];
  }> {
    const agentContext = contextManager.getAgentContext(agentId);
    if (!agentContext) return { files: [], conversations: [], suggestions: [] };

    // Enhanced search with context awareness
    const searchResults = contextManager.searchContext(query, agentId);
    
    // Generate search suggestions based on context
    const suggestions = this.generateSearchSuggestions(query, context, agentContext);
    
    // Filter conversations by query
    const matchingConversations = agentContext.conversationHistory.filter(conv =>
      conv.userMessage.toLowerCase().includes(query.toLowerCase()) ||
      conv.agentResponse.toLowerCase().includes(query.toLowerCase())
    );

    return {
      files: searchResults,
      conversations: matchingConversations,
      suggestions
    };
  }

  private generateSearchSuggestions(query: string, context: string, agentContext: any): string[] {
    const suggestions: string[] = [];
    
    // Add file-based suggestions
    agentContext.availableFiles.forEach((file: any) => {
      if (file.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(`Open ${file.name}`);
      }
      if (file.metadata?.language && query.toLowerCase().includes(file.metadata.language.toLowerCase())) {
        suggestions.push(`Show all ${file.metadata.language} files`);
      }
    });

    // Add conversation-based suggestions
    const commonIntents = this.getMostCommonIntents(agentContext.conversationHistory);
    if (commonIntents.some(intent => intent.toLowerCase().includes(query.toLowerCase()))) {
      suggestions.push(`Show ${query} conversations`);
    }

    // Add general suggestions
    if (query.toLowerCase().includes('file')) {
      suggestions.push('Show all files');
    }
    if (query.toLowerCase().includes('conversation') || query.toLowerCase().includes('chat')) {
      suggestions.push('Show conversation history');
    }

    return suggestions.slice(0, 5);
  }

  // Trigger search action
  private triggerSearch(agentId: string) {
    this.logContextAction(agentId, 'search_triggered');
    // This would typically open a search interface
    console.log('Search triggered for agent:', agentId);
  }

  // Getters for reactive stores
  getSuggestions() {
    return this.suggestions;
  }

  getAnalytics() {
    return this.analytics;
  }

  getFilters() {
    return this.filters;
  }

  getContextHistory() {
    return this.contextHistory;
  }

  // Utility methods
  clearSuggestions() {
    this.suggestions.set([]);
  }

  clearAnalytics() {
    this.analytics.set(null);
  }

  clearFilters() {
    this.filters.set([]);
  }

  clearHistory() {
    this.contextHistory.set([]);
  }
}

// Export singleton instance
export const advancedContextService = new AdvancedContextService(); 