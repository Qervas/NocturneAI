import { writable, derived } from 'svelte/store';

export interface Agent {
  id: string;
  name: string;
  type: string;
  avatar: string;
  color: string;
  position?: { x: number; y: number };
  isActive: boolean;
  capabilities: string[];
}

export interface AgentSelectionState {
  availableAgents: Agent[];
  selectedAgents: Record<string, boolean>; // Smart boolean table
  focusedAgent: string | null;
}

// Mock agent data - replace with real data from your system
const mockAgents: Agent[] = [
  {
    id: 'agent_alpha',
    name: 'Alpha',
    type: 'General Assistant',
    avatar: '🤖',
    color: '#00ff88',
    position: { x: 250, y: 150 },
    isActive: true,
    capabilities: ['file-reader', 'file-writer', 'directory-master', 'system-commander', 'code-analyzer', 'data-processor']
  },
  {
    id: 'agent_beta', 
    name: 'Beta',
    type: 'Code Specialist',
    avatar: '💻',
    color: '#00aaff',
    position: { x: 450, y: 200 },
    isActive: true,
    capabilities: ['file-reader', 'file-writer', 'system-commander', 'code-analyzer', 'data-processor', 'security-auditor']
  },
  {
    id: 'agent_gamma',
    name: 'Gamma',
    type: 'File Manager',
    avatar: '📁',
    color: '#ff8800',
    position: { x: 350, y: 350 },
    isActive: true,
    capabilities: ['file-reader', 'file-writer', 'directory-master', 'network-scanner', 'security-auditor']
  }
];

const initialState: AgentSelectionState = {
  availableAgents: mockAgents,
  selectedAgents: { 'agent_alpha': true }, // Smart boolean table - default to first agent selected
  focusedAgent: 'agent_alpha'
};

export const agentSelectionStore = writable<AgentSelectionState>(initialState);

class AgentSelectionManager {
  
  public selectAgent(agentId: string) {
    agentSelectionStore.update(state => ({
      ...state,
      selectedAgents: { [agentId]: true }, // Clear all others, select only this one
      focusedAgent: agentId
    }));
  }

  public toggleAgentSelection(agentId: string) {
    agentSelectionStore.update(state => {
      const newSelectedAgents = { ...state.selectedAgents };
      
      if (newSelectedAgents[agentId]) {
        // Remove from selection
        delete newSelectedAgents[agentId];
      } else {
        // Add to selection
        newSelectedAgents[agentId] = true;
      }
      
      // Update focused agent to first selected or null
      const selectedIds = Object.keys(newSelectedAgents).filter(id => newSelectedAgents[id]);
      
      return {
        ...state,
        selectedAgents: newSelectedAgents,
        focusedAgent: selectedIds.length > 0 ? selectedIds[0] : null
      };
    });
  }

  public removeAgentFromSelection(agentId: string) {
    agentSelectionStore.update(state => {
      const newSelectedAgents = { ...state.selectedAgents };
      delete newSelectedAgents[agentId];
      
      // Update focused agent to first remaining selected or null
      const selectedIds = Object.keys(newSelectedAgents).filter(id => newSelectedAgents[id]);
      
      return {
        ...state,
        selectedAgents: newSelectedAgents,
        focusedAgent: selectedIds.length > 0 ? selectedIds[0] : null
      };
    });
  }

  public focusAgent(agentId: string) {
    agentSelectionStore.update(state => ({
      ...state,
      focusedAgent: agentId
    }));
  }

  public clearSelection() {
    agentSelectionStore.update(state => ({
      ...state,
      selectedAgents: {}, // Clear boolean table
      focusedAgent: null
    }));
  }

  public syncWithLegacySystem(characterId: string, shortName: string) {
    // This method ensures the new system stays in sync when legacy system updates
    // Find the agent by character ID or short name mapping
    agentSelectionStore.update(state => {
      const agent = state.availableAgents.find(a => 
        a.id === characterId || 
        a.name.toLowerCase() === shortName.toLowerCase() ||
        a.id.includes(shortName.toLowerCase())
      );
      
      if (agent) {
        return {
          ...state,
          selectedAgents: { [agent.id]: true }, // Boolean table approach
          focusedAgent: agent.id
        };
      }
      
      return state;
    });
  }

  public selectAllActiveAgents() {
    agentSelectionStore.update(state => {
      const activeAgents = state.availableAgents.filter(agent => agent.isActive);
      const selectedAgents: Record<string, boolean> = {};
      
      // Build boolean table for all active agents
      activeAgents.forEach(agent => {
        selectedAgents[agent.id] = true;
      });
      
      return {
        ...state,
        selectedAgents,
        focusedAgent: activeAgents.length > 0 ? activeAgents[0].id : null
      };
    });
  }

  public getAgentCapabilities(agentId: string): string[] {
    let capabilities: string[] = [];
    agentSelectionStore.subscribe(state => {
      const agent = state.availableAgents.find(a => a.id === agentId);
      capabilities = agent?.capabilities || [];
    })();
    return capabilities;
  }

  public getSelectedAgentsCapabilities(): string[] {
    let allCapabilities: string[] = [];
    agentSelectionStore.subscribe(state => {
      const selectedAgents = state.availableAgents.filter(agent => 
        state.selectedAgents[agent.id] === true
      );
      
      // Get union of all capabilities from selected agents
      const capabilitySet = new Set<string>();
      selectedAgents.forEach(agent => {
        agent.capabilities.forEach(cap => capabilitySet.add(cap));
      });
      
      allCapabilities = Array.from(capabilitySet);
    })();
    return allCapabilities;
  }
}

export const agentSelectionManager = new AgentSelectionManager();

// Derived stores for easy access
export const selectedAgents = derived(
  agentSelectionStore,
  $store => $store.availableAgents.filter(agent => 
    $store.selectedAgents[agent.id] === true
  )
);

export const focusedAgent = derived(
  agentSelectionStore,
  $store => $store.availableAgents.find(agent => 
    agent.id === $store.focusedAgent
  ) || null
);

export const availableCapabilities = derived(
  selectedAgents,
  $selectedAgents => {
    const capabilitySet = new Set<string>();
    $selectedAgents.forEach(agent => {
      agent.capabilities.forEach(cap => capabilitySet.add(cap));
    });
    return Array.from(capabilitySet);
  }
);