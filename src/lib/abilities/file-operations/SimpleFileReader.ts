import { abilityManager } from '../../services/AbilityManager';

export interface SimpleFileReadResult {
  success: boolean;
  content?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export interface SimpleFileReaderConfig {
  allowedExtensions: string[];
  maxFileSize: number; // in bytes
  encoding: 'utf-8' | 'ascii';
}

// Default configuration for text files only
export const DEFAULT_SIMPLE_FILE_READER_CONFIG: SimpleFileReaderConfig = {
  allowedExtensions: ['.txt', '.md', '.log', '.csv', '.json', '.xml', '.yaml', '.yml', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css', '.php', '.rb', '.go', '.rs'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  encoding: 'utf-8'
};

export class SimpleFileReaderAbility {
  id = 'read_files';
  name = 'Simple File Reader';
  description = 'Read text files including code files, documents, and configuration files';
  category = 'file_operations';
  config: SimpleFileReaderConfig;

  constructor(config: Partial<SimpleFileReaderConfig> = {}) {
    this.config = { ...DEFAULT_SIMPLE_FILE_READER_CONFIG, ...config };
  }

  canExecute(agentId: string, params?: any): boolean {
    if (!params?.file) {
      return false;
    }

    const file = params.file;
    const extension = this.getFileExtension(file.name);
    
    return this.config.allowedExtensions.includes(extension) && 
           file.size <= this.config.maxFileSize;
  }

  async execute(agentId: string, params?: any): Promise<SimpleFileReadResult> {
    try {
      const { file } = params;
      
      if (!file) {
        return {
          success: false,
          error: 'No file provided'
        };
      }

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Read file content
      const content = await this.readFileContent(file);
      
      return {
        success: true,
        content,
        fileName: file.name,
        fileSize: file.size
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

  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check if file exists
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      return { 
        valid: false, 
        error: `File size (${file.size} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)` 
      };
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!this.config.allowedExtensions.includes(extension)) {
      return { 
        valid: false, 
        error: `File type '${extension}' is not supported. Allowed types: ${this.config.allowedExtensions.join(', ')}` 
      };
    }

    return { valid: true };
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const content = reader.result as string;
          resolve(content);
        } catch (error) {
          reject(new Error('Failed to read file content'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, this.config.encoding);
    });
  }

  // Configuration methods
  updateConfig(newConfig: Partial<SimpleFileReaderConfig>): void {
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
}

// Create and register the ability
const fileReaderAbility = new SimpleFileReaderAbility();
abilityManager.registerAbility(fileReaderAbility);

export { fileReaderAbility as simpleFileReaderAbility }; 