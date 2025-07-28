import { abilityManager } from '../../services/AbilityManager';

// File writing result interface
export interface FileWriteResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

// File writer configuration
export interface FileWriterConfig {
  allowedFileTypes: string[];
  maxFileSize: number;
  encoding: 'utf-8' | 'ascii' | 'binary';
  createBackup: boolean;
  overwriteExisting: boolean;
  preserveFormatting: boolean;
  includeTimestamp: boolean;
  defaultDirectory: string;
}

// Default configuration
export const DEFAULT_FILE_WRITER_CONFIG: FileWriterConfig = {
  allowedFileTypes: ['text', 'code', 'document'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  encoding: 'utf-8',
  createBackup: true,
  overwriteExisting: false,
  preserveFormatting: true,
  includeTimestamp: false,
  defaultDirectory: './output'
};

export class FileWriterAbility {
  id = 'file_writer';
  name = 'File Writer';
  description = 'Write content to various file types with configurable options';
  category = 'file_operations';
  config: FileWriterConfig;

  constructor(config: Partial<FileWriterConfig> = {}) {
    this.config = { ...DEFAULT_FILE_WRITER_CONFIG, ...config };
  }

  canExecute(params: any): boolean {
    if (!params.content || (!params.filePath && !params.fileName)) {
      return false;
    }
    
    const fileName = params.fileName || params.filePath?.split('/').pop();
    if (!fileName) {
      return false;
    }
    
    const fileType = this.getFileType(fileName);
    return this.config.allowedFileTypes.includes(fileType);
  }

  async execute(params: any): Promise<FileWriteResult> {
    try {
      const { content, filePath, fileName, fileType } = params;
      
      if (!content) {
        return {
          success: false,
          error: 'No content provided for writing'
        };
      }

      // Determine file path and name
      const finalFileName = fileName || this.generateFileName(fileType);
      const finalFilePath = filePath || `${this.config.defaultDirectory}/${finalFileName}`;

      // Validate file type
      const detectedType = this.getFileType(finalFileName);
      if (!this.config.allowedFileTypes.includes(detectedType)) {
        return {
          success: false,
          error: `File type '${detectedType}' is not allowed for writing`
        };
      }

      // Check file size
      const contentSize = new Blob([content]).size;
      if (contentSize > this.config.maxFileSize) {
        return {
          success: false,
          error: `Content size (${contentSize} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`
        };
      }

      // Create backup if needed
      if (this.config.createBackup) {
        await this.createBackup(finalFilePath);
      }

      // Write file based on type
      let processedContent = content;
      
      switch (detectedType) {
        case 'text':
        case 'code':
          processedContent = await this.processTextContent(content, detectedType);
          break;
        case 'document':
          processedContent = await this.processDocumentContent(content, detectedType);
          break;
        case 'data':
          processedContent = await this.processDataContent(content, detectedType);
          break;
        default:
          return {
            success: false,
            error: `Unsupported file type for writing: ${detectedType}`
          };
      }

      // Add timestamp if configured
      if (this.config.includeTimestamp) {
        processedContent = this.addTimestamp(processedContent);
      }

      // Write the file
      const result = await this.writeFile(finalFilePath, processedContent);
      
      return {
        success: true,
        filePath: finalFilePath,
        fileSize: new Blob([processedContent]).size
      };

    } catch (error) {
      return {
        success: false,
        error: `File writing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private getFileType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    // Text files
    if (['txt', 'md', 'log', 'csv'].includes(extension)) {
      return 'text';
    }
    
    // Code files
    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'php', 'rb', 'go', 'rs'].includes(extension)) {
      return 'code';
    }
    
    // Document files
    if (['pdf', 'doc', 'docx', 'rtf'].includes(extension)) {
      return 'document';
    }
    
    // Data files
    if (['json', 'xml', 'yaml', 'yml', 'csv'].includes(extension)) {
      return 'data';
    }
    
    return 'text'; // Default to text
  }

  private generateFileName(fileType?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getExtensionForType(fileType || 'text');
    return `generated_${timestamp}${extension}`;
  }

  private getExtensionForType(fileType: string): string {
    const extensions = {
      text: '.txt',
      code: '.js',
      document: '.txt',
      data: '.json'
    };
    return extensions[fileType as keyof typeof extensions] || '.txt';
  }

  private async processTextContent(content: string, fileType: string): Promise<string> {
    if (this.config.preserveFormatting) {
      return content;
    }
    
    // Basic formatting cleanup
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  private async processDocumentContent(content: string, fileType: string): Promise<string> {
    // For now, treat documents as text
    // In a real implementation, this would format for specific document types
    return content;
  }

  private async processDataContent(content: string, fileType: string): Promise<string> {
    // Try to parse and format JSON
    if (fileType === 'data') {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If not valid JSON, return as-is
        return content;
      }
    }
    
    return content;
  }

  private addTimestamp(content: string): string {
    const timestamp = new Date().toISOString();
    return `// Generated on: ${timestamp}\n\n${content}`;
  }

  private async createBackup(filePath: string): Promise<void> {
    // This would be implemented with actual file system access
    // For now, just log the backup creation
    console.log(`Creating backup for: ${filePath}`);
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    // This would be implemented with actual file system access
    // For now, simulate file writing
    console.log(`Writing file: ${filePath}`);
    console.log(`Content length: ${content.length} characters`);
    
    // In a real implementation, this would use:
    // import { writeFile } from 'fs/promises';
    // await writeFile(filePath, content, this.config.encoding);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<FileWriterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getAllowedFileTypes(): string[] {
    return this.config.allowedFileTypes;
  }

  setAllowedFileTypes(types: string[]): void {
    this.config.allowedFileTypes = types;
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  setMaxFileSize(size: number): void {
    this.config.maxFileSize = size;
  }

  setDefaultDirectory(directory: string): void {
    this.config.defaultDirectory = directory;
  }

  getDefaultDirectory(): string {
    return this.config.defaultDirectory;
  }
}

// Create and register the ability
const fileWriterAbility = new FileWriterAbility();
abilityManager.registerAbility(fileWriterAbility);

export { fileWriterAbility }; 