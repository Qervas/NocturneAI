import { writable } from 'svelte/store';

// Database Schema Interfaces
export interface User {
  id: string;
  profile: {
    name: string;
    avatar?: string;
    preferences: Record<string, any>;
  };
  created_at: Date;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  capabilities: AgentCapability[];
  model_config: {
    model: string;
    temperature: number;
    max_tokens: number;
  };
  created_at: Date;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  parameters?: Record<string, any>;
  owned: boolean;
}

export interface Interaction {
  id: string;
  user_id: string;
  agent_id: string;
  session_id: string;
  type: 'message' | 'file' | 'perk_execution' | 'system';
  content: {
    text?: string;
    file_path?: string;
    perk_name?: string;
    perk_params?: Record<string, any>;
    result?: any;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  user_id: string;
  active_agents: string[];
  context: {
    current_directory?: string;
    uploaded_files: string[];
    conversation_summary?: string;
  };
  created_at: Date;
  updated_at: Date;
}

// Core Perks Definition
export const CORE_PERKS: AgentCapability[] = [
  {
    id: 'file-reader',
    name: 'File Reader',
    description: 'Ability to read files from the system',
    icon: '📖',
    enabled: true,
    owned: true,
    parameters: {
      supported_formats: ['txt', 'json', 'js', 'ts', 'svelte', 'md', 'py', 'html', 'css']
    }
  },
  {
    id: 'file-writer',
    name: 'File Writer',
    description: 'Ability to create and modify files',
    icon: '✏️',
    enabled: true,
    owned: true,
    parameters: {
      max_file_size: '10MB',
      backup_enabled: true
    }
  },
  {
    id: 'directory-master',
    name: 'Directory Master',
    description: 'Advanced directory and folder operations',
    icon: '📁',
    enabled: true,
    owned: true,
    parameters: {
      recursive_operations: true,
      safe_mode: true
    }
  },
  {
    id: 'system-commander',
    name: 'System Commander',
    description: 'Execute system commands and scripts',
    icon: '⚡',
    enabled: true,
    owned: true,
    parameters: {
      restricted_commands: ['rm -rf', 'format', 'del /f'],
      timeout: 30000
    }
  }
];

// In-memory storage for now (will be replaced with real database)
class DatabaseManager {
  private users = new Map<string, User>();
  private agents = new Map<string, Agent>();
  private interactions = new Map<string, Interaction>();
  private sessions = new Map<string, Session>();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default user
    const defaultUser: User = {
      id: 'user-1',
      profile: {
        name: 'Developer',
        preferences: {
          theme: 'dark',
          auto_save: true
        }
      },
      created_at: new Date()
    };
    this.users.set(defaultUser.id, defaultUser);

    // Create default agent with core perks
    const defaultAgent: Agent = {
      id: 'agent_alpha',
      name: 'Alpha',
      type: 'General Assistant',
      capabilities: [
        {
          id: 'file-reader',
          name: 'File Reader',
          description: 'Ability to read files from the system',
          icon: '📖',
          enabled: true,
          owned: true,
          parameters: {
            supported_formats: ['txt', 'json', 'js', 'ts', 'svelte', 'md', 'py', 'html', 'css']
          }
        },
        {
          id: 'file-writer',
          name: 'File Writer',
          description: 'Ability to create and modify files',
          icon: '✏️',
          enabled: true,
          owned: true,
          parameters: {
            max_file_size: '10MB',
            backup_enabled: true
          }
        },
        {
          id: 'directory-master',
          name: 'Directory Master',
          description: 'Advanced directory and folder operations',
          icon: '📁',
          enabled: true,
          owned: true,
          parameters: {
            recursive_operations: true,
            max_depth: 10
          }
        },
        {
          id: 'system-commander',
          name: 'System Commander',
          description: 'Execute system commands safely',
          icon: '⚡',
          enabled: true,
          owned: true,
          parameters: {
            allowed_commands: ['ls', 'cat', 'grep', 'find', 'wc'],
            timeout_seconds: 30
          }
        }
      ],
      model_config: {
        model: 'gemma3:latest',
        temperature: 0.7,
        max_tokens: 500
      },
      created_at: new Date()
    };
    this.agents.set(defaultAgent.id, defaultAgent);

    // Create default session
    const defaultSession: Session = {
      id: 'session-1',
      user_id: defaultUser.id,
      active_agents: [defaultAgent.id],
      context: {
        current_directory: '/workspace',
        uploaded_files: [],
        conversation_summary: ''
      },
      created_at: new Date(),
      updated_at: new Date()
    };
    this.sessions.set(defaultSession.id, defaultSession);
  }

  // User operations
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  // Agent operations
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  updateAgentCapability(agentId: string, capabilityId: string, enabled: boolean): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const capability = agent.capabilities.find(cap => cap.id === capabilityId);
    if (!capability) return false;

    capability.enabled = enabled;
    this.agents.set(agentId, agent);
    
    // Trigger store update
    agentCapabilitiesStore.set(agent.capabilities);
    return true;
  }

  // Interaction operations
  addInteraction(interaction: Omit<Interaction, 'id' | 'timestamp'>): string {
    const id = `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newInteraction: Interaction = {
      ...interaction,
      id,
      timestamp: new Date()
    };
    
    this.interactions.set(id, newInteraction);
    
    // Update interactions store
    const sessionInteractions = Array.from(this.interactions.values())
      .filter(i => i.session_id === interaction.session_id)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    interactionsStore.set(sessionInteractions);
    return id;
  }

  getSessionInteractions(sessionId: string): Interaction[] {
    return Array.from(this.interactions.values())
      .filter(i => i.session_id === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Session operations
  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  updateSessionContext(sessionId: string, context: Partial<Session['context']>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.context = { ...session.context, ...context };
    session.updated_at = new Date();
    this.sessions.set(sessionId, session);
    
    // Update store
    currentSessionStore.set(session);
    return true;
  }
}

// Svelte stores for reactive UI
export const currentUserStore = writable<User | null>(null);
export const currentAgentStore = writable<Agent | null>(null);
export const currentSessionStore = writable<Session | null>(null);
export const interactionsStore = writable<Interaction[]>([]);
export const agentCapabilitiesStore = writable<AgentCapability[]>([]);

// Global database instance
export const databaseManager = new DatabaseManager();

// Initialize stores with default data
currentUserStore.set(databaseManager.getUser('user-1') || null);
currentAgentStore.set(databaseManager.getAgent('agent_alpha') || null);
currentSessionStore.set(databaseManager.getSession('session-1') || null);
interactionsStore.set(databaseManager.getSessionInteractions('session-1'));
agentCapabilitiesStore.set(databaseManager.getAgent('agent_alpha')?.capabilities || []);