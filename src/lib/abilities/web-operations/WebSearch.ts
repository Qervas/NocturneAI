import { abilityManager } from '../../services/AbilityManager';

// Search result interface
export interface SearchResult {
  success: boolean;
  results?: SearchItem[];
  totalResults?: number;
  searchTime?: number;
  error?: string;
}

export interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
  publishedDate?: Date;
}

// Web search configuration
export interface WebSearchConfig {
  searchEngines: string[];
  maxResults: number;
  timeout: number;
  includeImages: boolean;
  includeNews: boolean;
  includeAcademic: boolean;
  filterAdult: boolean;
  language: string;
  region: string;
  safeSearch: boolean;
}

// Search engine configurations
export const SEARCH_ENGINES = {
  google: {
    id: 'google',
    name: 'Google',
    baseUrl: 'https://www.google.com/search',
    supported: true,
    description: 'General web search'
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    baseUrl: 'https://www.bing.com/search',
    supported: true,
    description: 'Microsoft search engine'
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    baseUrl: 'https://duckduckgo.com',
    supported: true,
    description: 'Privacy-focused search'
  },
  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    baseUrl: 'https://en.wikipedia.org/w/api.php',
    supported: true,
    description: 'Encyclopedia search'
  },
  scholar: {
    id: 'scholar',
    name: 'Google Scholar',
    baseUrl: 'https://scholar.google.com/scholar',
    supported: false,
    description: 'Academic research papers'
  }
};

// Default configuration
export const DEFAULT_WEB_SEARCH_CONFIG: WebSearchConfig = {
  searchEngines: ['google', 'bing'],
  maxResults: 10,
  timeout: 10000, // 10 seconds
  includeImages: false,
  includeNews: false,
  includeAcademic: false,
  filterAdult: true,
  language: 'en',
  region: 'US',
  safeSearch: true
};

export class WebSearchAbility {
  id = 'web_search';
  name = 'Web Search';
  description = 'Search the web using multiple search engines with configurable options';
  category = 'web_operations';
  config: WebSearchConfig;

  constructor(config: Partial<WebSearchConfig> = {}) {
    this.config = { ...DEFAULT_WEB_SEARCH_CONFIG, ...config };
  }

  canExecute(params: any): boolean {
    if (!params.query || typeof params.query !== 'string') {
      return false;
    }
    
    // Check if query is not empty and has minimum length
    const query = params.query.trim();
    return query.length >= 2 && query.length <= 500;
  }

  async execute(params: any): Promise<SearchResult> {
    try {
      const { query, searchEngine, maxResults, includeImages, includeNews } = params;
      
      if (!query) {
        return {
          success: false,
          error: 'No search query provided'
        };
      }

      // Validate query
      const validation = this.validateQuery(query);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Determine search engine
      const engine = searchEngine || this.config.searchEngines[0];
      if (!this.config.searchEngines.includes(engine)) {
        return {
          success: false,
          error: `Search engine '${engine}' is not allowed`
        };
      }

      // Perform search
      const startTime = Date.now();
      const results = await this.performSearch(query, engine, {
        maxResults: maxResults || this.config.maxResults,
        includeImages: includeImages || this.config.includeImages,
        includeNews: includeNews || this.config.includeNews,
        language: this.config.language,
        region: this.config.region,
        safeSearch: this.config.safeSearch
      });

      const searchTime = Date.now() - startTime;

      return {
        success: true,
        results,
        totalResults: results.length,
        searchTime
      };

    } catch (error) {
      return {
        success: false,
        error: `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private validateQuery(query: string): { valid: boolean; error?: string } {
    const trimmed = query.trim();
    
    if (trimmed.length < 2) {
      return { valid: false, error: 'Search query must be at least 2 characters long' };
    }
    
    if (trimmed.length > 500) {
      return { valid: false, error: 'Search query is too long (maximum 500 characters)' };
    }
    
    // Check for potentially harmful queries
    const harmfulPatterns = [
      /script\s*:/i,
      /javascript\s*:/i,
      /data\s*:/i,
      /vbscript\s*:/i
    ];
    
    for (const pattern of harmfulPatterns) {
      if (pattern.test(trimmed)) {
        return { valid: false, error: 'Search query contains potentially harmful content' };
      }
    }
    
    return { valid: true };
  }

  private async performSearch(
    query: string, 
    engine: string, 
    options: {
      maxResults: number;
      includeImages: boolean;
      includeNews: boolean;
      language: string;
      region: string;
      safeSearch: boolean;
    }
  ): Promise<SearchItem[]> {
    // This would be implemented with actual API calls
    // For now, simulate search results
    
    const engineConfig = SEARCH_ENGINES[engine as keyof typeof SEARCH_ENGINES];
    if (!engineConfig || !engineConfig.supported) {
      throw new Error(`Search engine '${engine}' is not supported`);
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Generate simulated results
    const results: SearchItem[] = [];
    const sources = ['example.com', 'demo.org', 'test.net', 'sample.info'];
    
    for (let i = 0; i < options.maxResults; i++) {
      const source = sources[i % sources.length];
      const relevance = Math.max(0.1, 1 - (i * 0.1));
      
      results.push({
        title: `Search result ${i + 1} for "${query}"`,
        url: `https://${source}/result-${i + 1}`,
        snippet: `This is a simulated search result for "${query}". It contains relevant information that matches your search query.`,
        source,
        relevance,
        publishedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      });
    }

    return results;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<WebSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getSearchEngines(): string[] {
    return this.config.searchEngines;
  }

  setSearchEngines(engines: string[]): void {
    this.config.searchEngines = engines;
  }

  getMaxResults(): number {
    return this.config.maxResults;
  }

  setMaxResults(max: number): void {
    this.config.maxResults = Math.max(1, Math.min(50, max));
  }

  getTimeout(): number {
    return this.config.timeout;
  }

  setTimeout(timeout: number): void {
    this.config.timeout = Math.max(1000, Math.min(30000, timeout));
  }

  getSupportedEngines(): typeof SEARCH_ENGINES {
    return SEARCH_ENGINES;
  }

  isEngineSupported(engine: string): boolean {
    const engineConfig = SEARCH_ENGINES[engine as keyof typeof SEARCH_ENGINES];
    return engineConfig?.supported || false;
  }
}

// Create and register the ability
const webSearchAbility = new WebSearchAbility();
abilityManager.registerAbility(webSearchAbility);

export { webSearchAbility }; 