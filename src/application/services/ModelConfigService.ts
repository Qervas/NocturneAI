/**
 * ModelConfigService
 *
 * Service for managing LLM model configuration, including available models,
 * current selection, and persistence to configuration files.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../../infrastructure/logging/Logger.js';

/**
 * Model definition
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'x.ai' | 'github';
  category: 'fast' | 'balanced' | 'advanced' | 'reasoning' | 'code' | 'embedding';
  description: string;
}

/**
 * Model configuration structure
 */
interface ModelConfig {
  models: ModelInfo[];
  defaultModel: string;
  categories: Record<string, string>;
}

/**
 * User settings for models
 */
interface ModelSettings {
  currentModel: string;
  routerModel?: string;
  lastUsed: string[];
  favorites: string[];
}

/**
 * Model Config Service Options
 */
interface ModelConfigServiceOptions {
  configPath?: string;
  settingsPath?: string;
  logger?: Logger;
}

/**
 * Model Configuration Service
 */
export class ModelConfigService {
  private logger?: Logger;
  private configPath: string;
  private settingsPath: string;
  private modelConfig: ModelConfig;
  private modelSettings: ModelSettings;

  constructor(options: ModelConfigServiceOptions = {}) {
    this.logger = options.logger;

    // Set default paths - use process.cwd() to get the project root
    // This works whether running from source or built dist/
    const projectRoot = process.cwd();

    this.configPath = options.configPath || join(projectRoot, 'config/models.json');
    this.settingsPath = options.settingsPath || join(projectRoot, 'config/model-settings.json');

    // Load configuration
    this.modelConfig = this.loadModelConfig();
    this.modelSettings = this.loadModelSettings();
  }

  /**
   * Load model configuration from file
   */
  private loadModelConfig(): ModelConfig {
    try {
      if (!existsSync(this.configPath)) {
        throw new Error(`Model config file not found: ${this.configPath}`);
      }

      const configData = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as ModelConfig;

      this.log('info', `Loaded ${config.models.length} models from config`);
      return config;
    } catch (error) {
      this.log('error', `Failed to load model config: ${error}`);
      throw error;
    }
  }

  /**
   * Load model settings from file
   */
  private loadModelSettings(): ModelSettings {
    try {
      if (!existsSync(this.settingsPath)) {
        // Create default settings
        const defaultSettings: ModelSettings = {
          currentModel: this.modelConfig.defaultModel,
          lastUsed: [this.modelConfig.defaultModel],
          favorites: []
        };

        this.saveModelSettings(defaultSettings);
        return defaultSettings;
      }

      const settingsData = readFileSync(this.settingsPath, 'utf-8');
      const settings = JSON.parse(settingsData) as ModelSettings;

      // Validate current model exists
      if (!this.isValidModel(settings.currentModel)) {
        settings.currentModel = this.modelConfig.defaultModel;
      }

      return settings;
    } catch (error) {
      this.log('warn', `Failed to load model settings, using defaults: ${error}`);
      return {
        currentModel: this.modelConfig.defaultModel,
        lastUsed: [this.modelConfig.defaultModel],
        favorites: []
      };
    }
  }

  /**
   * Save model settings to file
   */
  private saveModelSettings(settings: ModelSettings): void {
    try {
      writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      this.log('info', 'Model settings saved');
    } catch (error) {
      this.log('error', `Failed to save model settings: ${error}`);
    }
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelInfo[] {
    return [...this.modelConfig.models];
  }

  /**
   * Get models by category
   */
  getModelsByCategory(category: string): ModelInfo[] {
    return this.modelConfig.models.filter(model => model.category === category);
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: string): ModelInfo[] {
    return this.modelConfig.models.filter(model => model.provider === provider);
  }

  /**
   * Get current selected model
   */
  getCurrentModel(): ModelInfo {
    const model = this.modelConfig.models.find(m => m.id === this.modelSettings.currentModel);
    if (!model) {
      // Fallback to default
      const defaultModel = this.modelConfig.models.find(m => m.id === this.modelConfig.defaultModel);
      if (!defaultModel) {
        throw new Error('No valid models available');
      }
      return defaultModel;
    }
    return model;
  }

  /**
   * Set current model
   */
  setCurrentModel(modelId: string): boolean {
    if (!this.isValidModel(modelId)) {
      this.log('warn', `Invalid model ID: ${modelId}`);
      return false;
    }

    const oldModel = this.modelSettings.currentModel;
    this.modelSettings.currentModel = modelId;

    // Update last used list
    this.modelSettings.lastUsed = [
      modelId,
      ...this.modelSettings.lastUsed.filter(id => id !== modelId)
    ].slice(0, 10); // Keep only last 10

    this.saveModelSettings(this.modelSettings);

    this.log('info', `Model changed from ${oldModel} to ${modelId}`);
    return true;
  }

  /**
   * Get router model (for fast intent classification)
   */
  getRouterModel(): ModelInfo {
    const routerModelId = this.modelSettings.routerModel || 'gpt-4.1';
    const model = this.modelConfig.models.find(m => m.id === routerModelId);

    if (!model) {
      // Fallback to gpt-4.1 if configured router model not found
      const fallback = this.modelConfig.models.find(m => m.id === 'gpt-4.1');
      if (!fallback) {
        throw new Error('Router model not found: gpt-4.1');
      }
      return fallback;
    }

    return model;
  }

  /**
   * Set router model (validates it's a free model)
   */
  setRouterModel(modelId: string): boolean {
    if (!this.isValidModel(modelId)) {
      this.log('warn', `Invalid model ID: ${modelId}`);
      return false;
    }

    // List of free models allowed for router
    const freeModels = ['gpt-4.1', 'gpt-4o', 'gpt-5-mini', 'grok-code-fast-1'];

    if (!freeModels.includes(modelId)) {
      this.log('warn', `Model ${modelId} is not a free router model. Use one of: ${freeModels.join(', ')}`);
      return false;
    }

    const oldRouter = this.modelSettings.routerModel || 'gpt-4.1';
    this.modelSettings.routerModel = modelId;

    this.saveModelSettings(this.modelSettings);

    this.log('info', `Router model changed from ${oldRouter} to ${modelId}`);
    return true;
  }

  /**
   * Get list of free router models
   */
  getFreeRouterModels(): ModelInfo[] {
    const freeModelIds = ['gpt-4.1', 'gpt-4o', 'gpt-5-mini', 'grok-code-fast-1'];
    return this.modelConfig.models.filter(m => freeModelIds.includes(m.id));
  }

  /**
   * Get favorite models
   */
  getFavoriteModels(): ModelInfo[] {
    return this.modelSettings.favorites
      .map(id => this.modelConfig.models.find(m => m.id === id))
      .filter(Boolean) as ModelInfo[];
  }

  /**
   * Add model to favorites
   */
  addFavorite(modelId: string): boolean {
    if (!this.isValidModel(modelId)) {
      return false;
    }

    if (!this.modelSettings.favorites.includes(modelId)) {
      this.modelSettings.favorites.push(modelId);
      this.saveModelSettings(this.modelSettings);
      this.log('info', `Added ${modelId} to favorites`);
    }

    return true;
  }

  /**
   * Remove model from favorites
   */
  removeFavorite(modelId: string): boolean {
    const index = this.modelSettings.favorites.indexOf(modelId);
    if (index > -1) {
      this.modelSettings.favorites.splice(index, 1);
      this.saveModelSettings(this.modelSettings);
      this.log('info', `Removed ${modelId} from favorites`);
      return true;
    }
    return false;
  }

  /**
   * Get recently used models
   */
  getRecentlyUsed(): ModelInfo[] {
    return this.modelSettings.lastUsed
      .map(id => this.modelConfig.models.find(m => m.id === id))
      .filter(Boolean) as ModelInfo[];
  }

  /**
   * Search models by name or description
   */
  searchModels(query: string): ModelInfo[] {
    const queryLower = query.toLowerCase();
    return this.modelConfig.models.filter(model =>
      model.name.toLowerCase().includes(queryLower) ||
      model.description.toLowerCase().includes(queryLower) ||
      model.id.toLowerCase().includes(queryLower) ||
      model.provider.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get model info by ID
   */
  getModelInfo(modelId: string): ModelInfo | undefined {
    return this.modelConfig.models.find(m => m.id === modelId);
  }

  /**
   * Check if model ID is valid
   */
  isValidModel(modelId: string): boolean {
    return this.modelConfig.models.some(m => m.id === modelId);
  }

  /**
   * Get categories with descriptions
   */
  getCategories(): Record<string, string> {
    return { ...this.modelConfig.categories };
  }

  /**
   * Get models grouped by category
   */
  getModelsGroupedByCategory(): Record<string, ModelInfo[]> {
    const grouped: Record<string, ModelInfo[]> = {};

    for (const model of this.modelConfig.models) {
      if (!grouped[model.category]) {
        grouped[model.category] = [];
      }
      grouped[model.category].push(model);
    }

    return grouped;
  }

  /**
   * Get models grouped by provider
   */
  getModelsGroupedByProvider(): Record<string, ModelInfo[]> {
    const grouped: Record<string, ModelInfo[]> = {};

    for (const model of this.modelConfig.models) {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider].push(model);
    }

    return grouped;
  }

  /**
   * Get model statistics
   */
  getModelStats(): {
    total: number;
    byProvider: Record<string, number>;
    byCategory: Record<string, number>;
    currentModel: string;
    favoritesCount: number;
  } {
    const byProvider: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const model of this.modelConfig.models) {
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
      byCategory[model.category] = (byCategory[model.category] || 0) + 1;
    }

    return {
      total: this.modelConfig.models.length,
      byProvider,
      byCategory,
      currentModel: this.modelSettings.currentModel,
      favoritesCount: this.modelSettings.favorites.length
    };
  }

  /**
   * Reload configuration from files
   */
  reload(): void {
    try {
      this.modelConfig = this.loadModelConfig();
      this.modelSettings = this.loadModelSettings();
      this.log('info', 'Model configuration reloaded');
    } catch (error) {
      this.log('error', `Failed to reload configuration: ${error}`);
      throw error;
    }
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (this.logger) {
      this.logger.log(level, message, { service: 'ModelConfigService' });
    }
  }
}