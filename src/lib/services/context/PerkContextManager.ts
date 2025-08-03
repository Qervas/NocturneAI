import { writable, derived } from 'svelte/store';

// Comprehensive perk definitions based on your system
export interface PerkDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'file' | 'system' | 'network' | 'analysis' | 'security' | 'web' | 'auto';
  handler: string; // Function name or reference to call
  isEnabled: boolean;
  isOwned: boolean;
  requirements?: string[];
  contextFlags?: string[]; // Environment flags that affect this perk
}

export interface PerkContextState {
  perks: Record<string, PerkDefinition>;
  contextFlags: Record<string, any>; // Environment context flags
  lastContextUpdate: number;
  isDirty: boolean; // Whether context has changed since last validation
}

// All available perks in your system
const initialPerks: Record<string, PerkDefinition> = {
  // File Operations
  'file-reader': {
    id: 'file-reader',
    name: 'File Reader',
    icon: '📖',
    description: 'Ability to read files from the system',
    category: 'file',
    handler: 'executeFileRead',
    isEnabled: true,
    isOwned: true,
    contextFlags: ['filesystem_access', 'read_permissions']
  },
  'file-writer': {
    id: 'file-writer',
    name: 'File Writer',
    icon: '✏️',
    description: 'Ability to create and modify files',
    category: 'file',
    handler: 'executeFileWrite',
    isEnabled: true,
    isOwned: true,
    contextFlags: ['filesystem_access', 'write_permissions']
  },
  'directory-master': {
    id: 'directory-master',
    name: 'Directory Master',
    icon: '📁',
    description: 'Advanced directory and folder operations',
    category: 'file',
    handler: 'executeDirectoryOps',
    isEnabled: true,
    isOwned: true,
    contextFlags: ['filesystem_access', 'directory_permissions']
  },

  // System Operations
  'system-commander': {
    id: 'system-commander',
    name: 'System Commander',
    icon: '⚡',
    description: 'Execute system commands and scripts',
    category: 'system',
    handler: 'executeSystemCommand',
    isEnabled: true,
    isOwned: true,
    contextFlags: ['system_access', 'command_permissions']
  },
  'process-monitor': {
    id: 'process-monitor',
    name: 'Process Monitor',
    icon: '📊',
    description: 'Monitor and manage system processes',
    category: 'system',
    handler: 'executeProcessMonitor',
    isEnabled: false,
    isOwned: true,
    contextFlags: ['system_access', 'process_permissions']
  },
  'environment-scanner': {
    id: 'environment-scanner',
    name: 'Environment Scanner',
    icon: '🔍',
    description: 'Scan and analyze system environment',
    category: 'system',
    handler: 'executeEnvScan',
    isEnabled: false,
    isOwned: true,
    contextFlags: ['system_access', 'env_permissions']
  },

  // Network Operations
  'network-probe': {
    id: 'network-probe',
    name: 'Network Probe',
    icon: '🌐',
    description: 'Network connectivity and port scanning',
    category: 'network',
    handler: 'executeNetworkProbe',
    isEnabled: false,
    isOwned: false,
    contextFlags: ['network_access', 'probe_permissions']
  },
  'api-caller': {
    id: 'api-caller',
    name: 'API Caller',
    icon: '🔗',
    description: 'Make HTTP requests and API calls',
    category: 'network',
    handler: 'executeApiCall',
    isEnabled: false,
    isOwned: true,
    contextFlags: ['network_access', 'api_permissions']
  },

  // Analysis Tools
  'code-analyzer': {
    id: 'code-analyzer',
    name: 'Code Analyzer',
    icon: '🔬',
    description: 'Analyze code structure and quality',
    category: 'analysis',
    handler: 'executeCodeAnalysis',
    isEnabled: false,
    isOwned: true,
    contextFlags: ['analysis_access', 'code_permissions']
  },
  'data-processor': {
    id: 'data-processor',
    name: 'Data Processor',
    icon: '📈',
    description: 'Process and analyze data files',
    category: 'analysis',
    handler: 'executeDataProcessing',
    isEnabled: false,
    isOwned: true,
    contextFlags: ['analysis_access', 'data_permissions']
  },
  'log-analyzer': {
    id: 'log-analyzer',
    name: 'Log Analyzer',
    icon: '📋',
    description: 'Parse and analyze log files',
    category: 'analysis',
    handler: 'executeLogAnalysis',
    isEnabled: false,
    isOwned: false,
    contextFlags: ['analysis_access', 'log_permissions']
  },

  // Security Tools
  'security-scanner': {
    id: 'security-scanner',
    name: 'Security Scanner',
    icon: '🛡️',
    description: 'Scan for security vulnerabilities',
    category: 'security',
    handler: 'executeSecurityScan',
    isEnabled: false,
    isOwned: false,
    contextFlags: ['security_access', 'scan_permissions']
  },
  'crypto-handler': {
    id: 'crypto-handler',
    name: 'Crypto Handler',
    icon: '🔐',
    description: 'Encryption and decryption operations',
    category: 'security',
    handler: 'executeCryptoOps',
    isEnabled: false,
    isOwned: true,
    contextFlags: ['security_access', 'crypto_permissions']
  },

  // Web Operations
  'web-scraper': {
    id: 'web-scraper',
    name: 'Web Scraper',
    icon: '🕷️',
    description: 'Extract data from web pages',
    category: 'web',
    handler: 'executeWebScraping',
    isEnabled: false,
    isOwned: false,
    contextFlags: ['network_access', 'web_permissions']
  },
  'browser-controller': {
    id: 'browser-controller',
    name: 'Browser Controller',
    icon: '🌍',
    description: 'Control browser automation',
    category: 'web',
    handler: 'executeBrowserControl',
    isEnabled: false,
    isOwned: false,
    contextFlags: ['browser_access', 'automation_permissions']
  },

  // Automation
  'task-scheduler': {
    id: 'task-scheduler',
    name: 'Task Scheduler',
    icon: '⏰',
    description: 'Schedule and manage automated tasks',
    category: 'auto',
    handler: 'executeTaskScheduling',
    isEnabled: false,
    isOwned: true,
    contextFlags: ['system_access', 'scheduler_permissions']
  },
  'workflow-engine': {
    id: 'workflow-engine',
    name: 'Workflow Engine',
    icon: '⚙️',
    description: 'Execute complex multi-step workflows',
    category: 'auto',
    handler: 'executeWorkflow',
    isEnabled: false,
    isOwned: false,
    contextFlags: ['system_access', 'workflow_permissions']
  }
};

// Initial context flags - like graphics context in Vulkan/OpenGL
const initialContextFlags = {
  // System flags
  filesystem_access: true,
  read_permissions: true,
  write_permissions: true,
  directory_permissions: true,
  system_access: true,
  command_permissions: true,
  process_permissions: false,
  env_permissions: true,

  // Network flags
  network_access: false,
  probe_permissions: false,
  api_permissions: false,
  web_permissions: false,

  // Analysis flags
  analysis_access: true,
  code_permissions: true,
  data_permissions: true,
  log_permissions: false,

  // Security flags
  security_access: false,
  scan_permissions: false,
  crypto_permissions: false,

  // Browser flags
  browser_access: false,
  automation_permissions: false,

  // Scheduler flags
  scheduler_permissions: false,
  workflow_permissions: false,

  // First-time execution flags (like your "ls" example)
  first_directory_scan: true,
  first_file_read: true,
  first_system_command: true,
  context_initialized: false
};

const initialState: PerkContextState = {
  perks: initialPerks,
  contextFlags: initialContextFlags,
  lastContextUpdate: Date.now(),
  isDirty: false
};

export const perkContextStore = writable<PerkContextState>(initialState);

class PerkContextManager {
  private validationCache = new Map<string, boolean>();

  constructor() {
    // Initialize context validation
    this.validateContext();
  }

  // Enable/disable a perk
  public togglePerk(perkId: string) {
    perkContextStore.update(state => {
      if (state.perks[perkId]) {
        state.perks[perkId].isEnabled = !state.perks[perkId].isEnabled;
        state.isDirty = true;
        state.lastContextUpdate = Date.now();
      }
      return state;
    });
    this.invalidateCache();
  }

  // Set perk enabled state
  public setPerkEnabled(perkId: string, enabled: boolean) {
    perkContextStore.update(state => {
      if (state.perks[perkId]) {
        state.perks[perkId].isEnabled = enabled;
        state.isDirty = true;
        state.lastContextUpdate = Date.now();
      }
      return state;
    });
    this.invalidateCache();
  }

  // Update context flags (like graphics context updates)
  public updateContextFlag(flagName: string, value: any) {
    perkContextStore.update(state => {
      state.contextFlags[flagName] = value;
      state.isDirty = true;
      state.lastContextUpdate = Date.now();
      return state;
    });
    this.invalidateCache();
  }

  // Validate if a perk can be executed (context validation)
  public canExecutePerk(perkId: string): boolean {
    const cacheKey = `${perkId}_${this.getContextHash()}`;
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    let canExecute = false;
    perkContextStore.subscribe(state => {
      const perk = state.perks[perkId];
      if (!perk || !perk.isEnabled || !perk.isOwned) {
        canExecute = false;
        return;
      }

      // Check context flags
      if (perk.contextFlags) {
        canExecute = perk.contextFlags.every(flag => 
          state.contextFlags[flag] === true
        );
      } else {
        canExecute = true;
      }
    })();

    this.validationCache.set(cacheKey, canExecute);
    return canExecute;
  }

  // Get perk handler function name
  public getPerkHandler(perkId: string): string | null {
    let handler: string | null = null;
    perkContextStore.subscribe(state => {
      const perk = state.perks[perkId];
      handler = perk?.handler || null;
    })();
    return handler;
  }

  // Get all enabled perks for an agent
  public getEnabledPerks(agentCapabilities: string[]): string[] {
    let enabledPerks: string[] = [];
    perkContextStore.subscribe(state => {
      enabledPerks = agentCapabilities.filter(perkId => {
        const perk = state.perks[perkId];
        return perk && perk.isEnabled && perk.isOwned;
      });
    })();
    return enabledPerks;
  }

  // Get perks by category
  public getPerksByCategory(category: string): PerkDefinition[] {
    let perks: PerkDefinition[] = [];
    perkContextStore.subscribe(state => {
      perks = Object.values(state.perks).filter(perk => perk.category === category);
    })();
    return perks;
  }

  // Validate entire context (like graphics context validation)
  public validateContext(): boolean {
    perkContextStore.update(state => {
      // Perform context validation logic here
      // Similar to how graphics APIs validate context state
      
      // Mark context as clean after validation
      state.isDirty = false;
      state.contextFlags.context_initialized = true;
      
      return state;
    });
    
    this.invalidateCache();
    return true;
  }

  // Check if context needs revalidation
  public isContextDirty(): boolean {
    let isDirty = false;
    perkContextStore.subscribe(state => {
      isDirty = state.isDirty;
    })();
    return isDirty;
  }

  // Execute first-time setup for a perk (like your "ls" example)
  public executeFirstTimeSetup(perkId: string): Promise<any> {
    return new Promise((resolve) => {
      perkContextStore.update(state => {
        // Set first-time flag to false after execution
        const flagName = `first_${perkId.replace('-', '_')}`;
        if (state.contextFlags[flagName]) {
          state.contextFlags[flagName] = false;
          state.lastContextUpdate = Date.now();
        }
        return state;
      });
      
      // Simulate first-time setup (like running "ls" for directory structure)
      setTimeout(() => {
        resolve(`First-time setup completed for ${perkId}`);
      }, 500);
    });
  }

  // Private helper methods
  private getContextHash(): string {
    let hash = '';
    perkContextStore.subscribe(state => {
      hash = `${state.lastContextUpdate}_${Object.keys(state.contextFlags).length}`;
    })();
    return hash;
  }

  private invalidateCache() {
    this.validationCache.clear();
  }

  // Get perk execution status message
  public getPerkStatusMessage(perkId: string): string {
    if (!this.canExecutePerk(perkId)) {
      let reason = '';
      perkContextStore.subscribe(state => {
        const perk = state.perks[perkId];
        if (!perk) {
          reason = 'Perk not found';
        } else if (!perk.isOwned) {
          reason = 'Perk not owned';
        } else if (!perk.isEnabled) {
          reason = 'Perk disabled in settings';
        } else if (perk.contextFlags) {
          const missingFlags = perk.contextFlags.filter(flag => 
            !state.contextFlags[flag]
          );
          if (missingFlags.length > 0) {
            reason = `Missing permissions: ${missingFlags.join(', ')}`;
          }
        }
      })();
      return `❌ ${reason}`;
    }
    return '✅ Ready to execute';
  }
}

export const perkContextManager = new PerkContextManager();

// Derived stores for easy access
export const enabledPerks = derived(
  perkContextStore,
  $store => Object.values($store.perks).filter(perk => perk.isEnabled && perk.isOwned)
);

export const perksByCategory = derived(
  perkContextStore,
  $store => {
    const categories: Record<string, PerkDefinition[]> = {};
    Object.values($store.perks).forEach(perk => {
      if (!categories[perk.category]) {
        categories[perk.category] = [];
      }
      categories[perk.category].push(perk);
    });
    return categories;
  }
);

export const contextStatus = derived(
  perkContextStore,
  $store => ({
    isDirty: $store.isDirty,
    lastUpdate: $store.lastContextUpdate,
    isInitialized: $store.contextFlags.context_initialized,
    totalPerks: Object.keys($store.perks).length,
    enabledPerks: Object.values($store.perks).filter(p => p.isEnabled).length,
    ownedPerks: Object.values($store.perks).filter(p => p.isOwned).length
  })
);