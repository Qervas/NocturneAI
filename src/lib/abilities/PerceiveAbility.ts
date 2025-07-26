/**
 * PerceiveAbility - Information gathering atomic ability
 * Handles web search, file reading, directory scanning, etc.
 * Mock implementation for Step 1 prototype
 */

import type { AtomicAbility, AbilityInput, AbilityContext, AbilityResult, PerceiveInput } from '../types/Ability';

export class PerceiveAbility implements AtomicAbility {
  id = 'perceive';
  name = 'Perceive';
  category = 'perceive' as const;
  description = 'Gather information from various sources (web, files, directories)';
  requiredXP = 0; // Basic ability - available from start
  prerequisites: string[] = [];
  version = '1.0.0';
  tags = ['information', 'input', 'basic'];

  async execute(input: PerceiveInput, context: AbilityContext): Promise<AbilityResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[PerceiveAbility] ${context.agent.name} perceiving: ${input.type}`);
      
      let result: any;
      let confidence = 85; // Mock confidence

      switch (input.type) {
        case 'web_search':
          result = await this.mockWebSearch(input.data.query || '');
          break;
          
        case 'read_file':
          result = await this.mockReadFile(input.data.filePath || '');
          break;
          
        case 'browse_page':
          result = await this.mockBrowsePage(input.data.url || '');
          break;
          
        case 'scan_directory':
          result = await this.mockScanDirectory(input.data.filePath || '');
          break;
          
        case 'watch_changes':
          result = await this.mockWatchChanges(input.data.filePath || '');
          break;
          
        default:
          throw new Error(`Unknown perceive type: ${input.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result,
        confidence,
        executionTime,
        metadata: {
          source: input.type,
          agentId: context.agent.id,
          timestamp: context.timestamp
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown perception error',
        executionTime: Date.now() - startTime,
        confidence: 0
      };
    }
  }

  // Mock implementations - replace with real ones later
  private async mockWebSearch(query: string): Promise<any> {
    // Simulate network delay
    await this.delay(200 + Math.random() * 300);
    
    return {
      query,
      results: [
        {
          title: `Mock result for "${query}"`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
          snippet: `This is a mock search result for the query "${query}". In a real implementation, this would contain actual web search results.`,
          relevance: 0.8
        },
        {
          title: `Another result about ${query}`,
          url: `https://example.org/article/${query.toLowerCase().replace(/\s+/g, '-')}`,
          snippet: `Additional information about ${query} would appear here in a real search.`,
          relevance: 0.6
        }
      ],
      totalResults: 42,
      searchTime: Math.random() * 100 + 50
    };
  }

  private async mockReadFile(filePath: string): Promise<any> {
    await this.delay(50 + Math.random() * 100);
    
    return {
      filePath,
      content: `Mock file content for ${filePath}\n\nThis would contain the actual file contents in a real implementation.\nFile size: ${Math.floor(Math.random() * 10000)} bytes\nLast modified: ${new Date().toISOString()}`,
      encoding: 'utf-8',
      size: Math.floor(Math.random() * 10000),
      lastModified: new Date()
    };
  }

  private async mockBrowsePage(url: string): Promise<any> {
    await this.delay(300 + Math.random() * 500);
    
    return {
      url,
      title: `Mock Page Title for ${url}`,
      content: `This is mock page content from ${url}. In a real implementation, this would contain the scraped web page content, parsed HTML, extracted text, images, links, etc.`,
      links: [
        { text: 'Related Link 1', url: `${url}/related1` },
        { text: 'Related Link 2', url: `${url}/related2` }
      ],
      images: [
        { src: `${url}/image1.jpg`, alt: 'Mock Image 1' },
        { src: `${url}/image2.png`, alt: 'Mock Image 2' }
      ],
      loadTime: Math.random() * 200 + 100,
      status: 200
    };
  }

  private async mockScanDirectory(dirPath: string): Promise<any> {
    await this.delay(100 + Math.random() * 200);
    
    const mockFiles = [
      'file1.txt', 'file2.js', 'subdir/', 'image.png', 'document.pdf'
    ];
    
    return {
      path: dirPath,
      files: mockFiles.map(name => ({
        name,
        type: name.endsWith('/') ? 'directory' : 'file',
        size: name.endsWith('/') ? null : Math.floor(Math.random() * 50000),
        modified: new Date(Date.now() - Math.random() * 86400000 * 30) // Random date within 30 days
      })),
      totalFiles: mockFiles.filter(f => !f.endsWith('/')).length,
      totalDirectories: mockFiles.filter(f => f.endsWith('/')).length
    };
  }

  private async mockWatchChanges(path: string): Promise<any> {
    await this.delay(50);
    
    return {
      path,
      watching: true,
      changes: [
        {
          type: 'modified',
          file: `${path}/changed_file.txt`,
          timestamp: new Date(),
          details: 'File content modified'
        },
        {
          type: 'created',
          file: `${path}/new_file.js`,
          timestamp: new Date(Date.now() - 5000),
          details: 'New file created'
        }
      ],
      status: 'active'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
