<script lang="ts">
  import { selectedAgents, focusedAgent, agentSelectionManager, agentSelectionStore, type Agent } from '../services/AgentSelectionManager';
  import { selectedAgent, characterManager, getAgentShortName } from '../services/CharacterManager';
  import ModernPerkPanel from './ModernPerkPanel.svelte';
  import CharacterPanel from './CharacterPanel.svelte';
  import WorldResources from './WorldResources.svelte';

  // Reactive stores - selectedAgents is now an array from the derived store
  $: currentSelectedAgents = $selectedAgents || [];
  $: currentFocusedAgent = $focusedAgent;

  // Active tab state
  let activeMainTab = "skills"; // skills, character, resources
  let activeAgentTab: string | null = null; // Which agent tab is active

  // Update active agent tab when selection changes
  $: {
    if (currentSelectedAgents.length > 0 && !currentSelectedAgents.find(a => a.id === activeAgentTab)) {
      activeAgentTab = currentSelectedAgents[0]?.id || null;
    } else if (currentSelectedAgents.length === 0) {
      activeAgentTab = null;
    }
  }

  function selectAgentTab(agentId: string) {
    activeAgentTab = agentId;
    // Also focus this agent in the selection manager
    agentSelectionManager.focusAgent(agentId);
    // Sync to legacy system for terminal compatibility
    syncToLegacySystem(agentId);
  }

  function removeAgentFromSelection(agentId: string) {
    agentSelectionManager.removeAgentFromSelection(agentId);
    // Sync the first remaining selected agent to legacy system
    const remainingAgents = (currentSelectedAgents || []).filter(a => a.id !== agentId);
    if (remainingAgents.length > 0) {
      syncToLegacySystem(remainingAgents[0].id);
    }
  }

  function syncToLegacySystem(agentId: string) {
    // Sync selection to legacy CharacterManager for terminal compatibility
    const agent = currentSelectedAgents.find(a => a.id === agentId) || 
                  $agentSelectionStore.availableAgents.find(a => a.id === agentId);
    if (agent) {
      const shortName = getAgentShortName(agentId);
      selectedAgent.set(shortName);
      characterManager.setActiveCharacter(agentId);
    }
  }
</script>

<div class="multi-agent-properties">
  {#if !currentSelectedAgents || currentSelectedAgents.length === 0}
    <!-- No agents selected state -->
    <div class="no-selection">
      <div class="no-selection-icon">🤖</div>
      <h3>No Agents Selected</h3>
      <p>Select agents in the Interaction Panel or click on agents in the simulation to view their properties.</p>
    </div>
  {:else if currentSelectedAgents && currentSelectedAgents.length === 1}
    <!-- Single agent - show normal tabs -->
    <div class="single-agent-view">
      <div class="agent-header">
        <div class="agent-info">
          <span class="agent-avatar" style="color: {currentSelectedAgents[0]?.color || '#00ff88'}">{currentSelectedAgents[0]?.avatar || '🤖'}</span>
          <div class="agent-details">
            <h3>{currentSelectedAgents[0]?.name || 'Unknown Agent'}</h3>
            <span class="agent-type">{currentSelectedAgents[0]?.type || 'agent'}</span>
          </div>
        </div>
        <div class="agent-status">
          <span class="status-indicator" class:active={currentSelectedAgents[0]?.isActive}></span>
          <span class="status-text">{currentSelectedAgents[0]?.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      <!-- Main property tabs -->
      <div class="main-tabs">
        <button
          class="main-tab"
          class:active={activeMainTab === "skills"}
          on:click={() => activeMainTab = "skills"}
        >
          ⚡ Skills
        </button>
        <button
          class="main-tab"
          class:active={activeMainTab === "character"}
          on:click={() => activeMainTab = "character"}
        >
          👤 Character
        </button>
        <button
          class="main-tab"
          class:active={activeMainTab === "resources"}
          on:click={() => activeMainTab = "resources"}
        >
          🌎 Resources
        </button>
      </div>

      <!-- Single agent content -->
      <div class="properties-content">
        {#if activeMainTab === "skills" && currentSelectedAgents[0]}
          <ModernPerkPanel agent={currentSelectedAgents[0]} />
        {:else if activeMainTab === "character"}
          <CharacterPanel />
        {:else if activeMainTab === "resources"}
          <WorldResources />
        {/if}
      </div>
    </div>
  {:else}
    <!-- Multiple agents - Red Alert style with agent tabs -->
    <div class="multi-agent-view">
      <!-- Agent tabs (like Red Alert unit selection) -->
      <div class="agent-tabs">
        <div class="agent-tabs-header">
          <span class="selection-count">{currentSelectedAgents?.length || 0} Agents Selected</span>
          <button class="clear-selection" on:click={() => agentSelectionManager.clearSelection()}>
            Clear All
          </button>
        </div>
        
        <div class="agent-tabs-list">
          {#each (currentSelectedAgents || []) as agent (agent.id)}
            <div
              class="agent-tab"
              class:active={activeAgentTab === agent.id}
              class:focused={currentFocusedAgent?.id === agent.id}
              style="border-color: {agent.color}"
            >
              <div class="agent-tab-content" on:click={() => selectAgentTab(agent.id)}>
                <span class="agent-avatar" style="color: {agent.color}">{agent.avatar}</span>
                <div class="agent-tab-info">
                  <span class="agent-name">{agent.name}</span>
                  <span class="agent-type">{agent.type}</span>
                </div>
              </div>
              <button 
                class="remove-agent" 
                on:click|stopPropagation={() => removeAgentFromSelection(agent.id)}
                title="Remove {agent.name}"
              >
                ×
              </button>
            </div>
          {/each}
        </div>
      </div>

      <!-- Main property tabs for selected agent -->
      {#if activeAgentTab}
        {@const selectedAgent = currentSelectedAgents.find(a => a.id === activeAgentTab)}
        {#if selectedAgent}
          <div class="selected-agent-properties">
            <div class="selected-agent-header">
              <span class="agent-avatar" style="color: {selectedAgent.color}">{selectedAgent.avatar}</span>
              <div class="agent-details">
                <h3>{selectedAgent.name}</h3>
                <span class="agent-type">{selectedAgent.type}</span>
              </div>
              <div class="agent-status">
                <span class="status-indicator" class:active={selectedAgent.isActive}></span>
                <span class="status-text">{selectedAgent.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <!-- Main property tabs -->
            <div class="main-tabs">
              <button
                class="main-tab"
                class:active={activeMainTab === "skills"}
                on:click={() => activeMainTab = "skills"}
              >
                ⚡ Skills
              </button>
              <button
                class="main-tab"
                class:active={activeMainTab === "character"}
                on:click={() => activeMainTab = "character"}
              >
                👤 Character
              </button>
              <button
                class="main-tab"
                class:active={activeMainTab === "resources"}
                on:click={() => activeMainTab = "resources"}
              >
                🌎 Resources
              </button>
            </div>

            <!-- Selected agent content -->
            <div class="properties-content">
              {#if activeMainTab === "skills"}
                <ModernPerkPanel agent={selectedAgent} />
              {:else if activeMainTab === "character"}
                <CharacterPanel />
              {:else if activeMainTab === "resources"}
                <WorldResources />
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .multi-agent-properties {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
  }

  /* No selection state */
  .no-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 20px;
    color: rgba(255, 255, 255, 0.6);
  }

  .no-selection-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .no-selection h3 {
    margin: 0 0 8px 0;
    color: rgba(255, 255, 255, 0.8);
  }

  .no-selection p {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
  }

  /* Single agent view */
  .single-agent-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .agent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
  }

  .agent-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .agent-avatar {
    font-size: 24px;
  }

  .agent-details h3 {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
  }

  .agent-type {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .agent-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
  }

  .status-indicator.active {
    background: #00ff88;
    box-shadow: 0 0 6px rgba(0, 255, 136, 0.6);
  }

  .status-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  /* Multi-agent view */
  .multi-agent-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .agent-tabs {
    background: rgba(0, 0, 0, 0.4);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    flex-shrink: 0;
  }

  .agent-tabs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
  }

  .selection-count {
    font-size: 12px;
    color: #00ff88;
    font-weight: 500;
  }

  .clear-selection {
    background: transparent;
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 4px;
    color: rgba(255, 107, 107, 0.8);
    padding: 4px 8px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-selection:hover {
    border-color: #ff6b6b;
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
  }

  .agent-tabs-list {
    display: flex;
    flex-direction: column;
    max-height: 200px;
    overflow-y: auto;
  }

  .agent-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: transparent;
    border-left: 3px solid transparent;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;
  }

  .agent-tab:hover {
    background: rgba(0, 255, 136, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .agent-tab.active {
    background: rgba(0, 255, 136, 0.2);
    color: rgba(255, 255, 255, 0.9);
    border-left-color: currentColor;
  }

  .agent-tab.focused {
    background: rgba(255, 107, 107, 0.2);
    border-left-color: #ff6b6b;
  }

  .agent-tab-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    cursor: pointer;
  }

  .agent-tab .agent-avatar {
    font-size: 16px;
  }

  .agent-tab-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .agent-tab .agent-name {
    font-size: 13px;
    font-weight: 500;
  }

  .agent-tab .agent-type {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .remove-agent {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 2px;
    font-size: 16px;
    line-height: 1;
    transition: color 0.2s ease;
  }

  .remove-agent:hover {
    color: #ff6b6b;
  }

  /* Selected agent properties */
  .selected-agent-properties {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .selected-agent-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
  }

  .selected-agent-header .agent-details {
    flex: 1;
  }

  .selected-agent-header h3 {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
  }

  /* Main tabs */
  .main-tabs {
    display: flex;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    background: rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
  }

  .main-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 8px 10px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
  }

  .main-tab:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 255, 136, 0.1);
  }

  .main-tab.active {
    color: #00ff88;
    border-bottom-color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  /* Properties content */
  .properties-content {
    flex: 1;
    overflow: hidden;
  }

  /* Scrollbar styling */
  .agent-tabs-list::-webkit-scrollbar {
    width: 4px;
  }

  .agent-tabs-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  .agent-tabs-list::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 136, 0.3);
    border-radius: 2px;
  }

  .agent-tabs-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 136, 0.5);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .agent-header,
    .selected-agent-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .main-tabs {
      flex-wrap: wrap;
    }

    .main-tab {
      min-width: 80px;
    }
  }
</style>