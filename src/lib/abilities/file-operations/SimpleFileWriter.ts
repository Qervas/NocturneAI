import { abilityManager } from '../../services/AbilityManager';

export interface SimpleFileWriteResult {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
}

export interface SimpleFileWriterConfig {
  allowedExtensions: string[];
  maxFileSize: number; // in bytes
  encoding: 'utf-8' | 'ascii';
  includeTimestamp: boolean;
  defaultFileName: string;
}

// Default configuration for text files only
export const DEFAULT_SIMPLE_FILE_WRITER_CONFIG: SimpleFileWriterConfig = {
  allowedExtensions: ['.txt', '.md', '.log', '.csv', '.json', '.xml', '.yaml', '.yml', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css', '.php', '.rb', '.go', '.rs'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  encoding: 'utf-8',
  includeTimestamp: false,
  defaultFileName: 'output.txt'
};

export class SimpleFileWriterAbility {
  id = 'write_files';
  name = 'Simple File Writer';
  description = 'Write content to text files with download capability';
  category = 'file_operations';
  config: SimpleFileWriterConfig;

  constructor(config: Partial<SimpleFileWriterConfig> = {}) {
    this.config = { ...DEFAULT_SIMPLE_FILE_WRITER_CONFIG, ...config };
  }

  canExecute(agentId: string, params?: any): boolean {
    if (!params?.content) {
      return false;
    }

    const contentSize = new Blob([params.content]).size;
    if (contentSize > this.config.maxFileSize) {
      return false;
    }

    // Check file extension if provided
    if (params.fileName) {
      const extension = this.getFileExtension(params.fileName);
      return this.config.allowedExtensions.includes(extension);
    }

    return true;
  }

  async execute(agentId: string, params?: any): Promise<SimpleFileWriteResult> {
    try {
      const { content, fileName, fileType } = params;
      
      if (!content) {
        return {
          success: false,
          error: 'No content provided for writing'
        };
      }

      // Check content size
      const contentSize = new Blob([content]).size;
      if (contentSize > this.config.maxFileSize) {
        return {
          success: false,
          error: `Content size (${contentSize} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`
        };
      }

      // Generate file name
      const finalFileName = fileName || this.generateFileName(fileType);
      
      // Validate file extension
      const extension = this.getFileExtension(finalFileName);
      if (!this.config.allowedExtensions.includes(extension)) {
        return {
          success: false,
          error: `File type '${extension}' is not supported. Allowed types: ${this.config.allowedExtensions.join(', ')}`
        };
      }

      // Process content
      let processedContent = content;
      
      // Add timestamp if enabled
      if (this.config.includeTimestamp) {
        processedContent = this.addTimestamp(processedContent);
      }

      // Format content based on file type
      processedContent = this.formatContent(processedContent, extension);

      // Create download
      const downloadUrl = this.createDownload(processedContent, finalFileName);
      
      return {
        success: true,
        fileName: finalFileName,
        fileSize: new Blob([processedContent]).size,
        downloadUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return fileName.substring(lastDotIndex).toLowerCase();
  }

  private generateFileName(fileType?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const extension = fileType ? this.getExtensionForType(fileType) : '.txt';
    return `output_${timestamp}${extension}`;
  }

  private getExtensionForType(fileType: string): string {
    const extensions: Record<string, string> = {
      'text': '.txt',
      'markdown': '.md',
      'json': '.json',
      'xml': '.xml',
      'yaml': '.yml',
      'javascript': '.js',
      'typescript': '.ts',
      'python': '.py',
      'java': '.java',
      'cpp': '.cpp',
      'c': '.c',
      'html': '.html',
      'css': '.css',
      'php': '.php',
      'ruby': '.rb',
      'go': '.go',
      'rust': '.rs'
    };
    return extensions[fileType] || '.txt';
  }

  private formatContent(content: string, extension: string): string {
    // Format JSON files
    if (extension === '.json') {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If not valid JSON, return as-is
        return content;
      }
    }

    // Format XML files
    if (extension === '.xml') {
      // Basic XML formatting (in a real implementation, you'd use a proper XML formatter)
      return content.replace(/>/g, '>\n').replace(/</g, '\n<');
    }

    // Format YAML files
    if (extension === '.yml' || extension === '.yaml') {
      // Basic YAML formatting (in a real implementation, you'd use a proper YAML formatter)
      return content;
    }

    // For other text files, just return as-is
    return content;
  }

  private addTimestamp(content: string): string {
    const timestamp = new Date().toISOString();
    return `// Generated on: ${timestamp}\n\n${content}`;
  }

  private createDownload(content: string, fileName: string): string {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
    return url;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<SimpleFileWriterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getAllowedExtensions(): string[] {
    return this.config.allowedExtensions;
  }

  setAllowedExtensions(extensions: string[]): void {
    this.config.allowedExtensions = extensions;
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  setMaxFileSize(size: number): void {
    this.config.maxFileSize = size;
  }

  getEncoding(): string {
    return this.config.encoding;
  }

  setEncoding(encoding: 'utf-8' | 'ascii'): void {
    this.config.encoding = encoding;
  }

  isTimestampEnabled(): boolean {
    return this.config.includeTimestamp;
  }

  setTimestampEnabled(enabled: boolean): void {
    this.config.includeTimestamp = enabled;
  }

  getDefaultFileName(): string {
    return this.config.defaultFileName;
  }

  setDefaultFileName(fileName: string): void {
    this.config.defaultFileName = fileName;
  }
}

// Create and register the ability
const fileWriterAbility = new SimpleFileWriterAbility();
abilityManager.registerAbility(fileWriterAbility);

export { fileWriterAbility as simpleFileWriterAbility }; 