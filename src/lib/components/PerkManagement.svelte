<script lang="ts">
  import { perkContextStore, perksByCategory, contextStatus, perkContextManager, type PerkDefinition } from '../services/PerkContextManager';
  import { agentSelectionStore, selectedAgents } from '../services/AgentSelectionManager';

  $: perks = $perkContextStore.perks;
  $: categories = $perksByCategory;
  $: status = $contextStatus;
  $: currentSelectedAgents = $selectedAgents;

  // Filter perks based on current agent selection
  let showOnlyAgentPerks = false;
  let selectedCategory = 'all';

  // Get filtered perks
  $: filteredPerks = Object.values(perks).filter(perk => {
    // Category filter
    if (selectedCategory !== 'all' && perk.category !== selectedCategory) {
      return false;
    }
    
    // Agent filter
    if (showOnlyAgentPerks && currentSelectedAgents.length > 0) {
      return currentSelectedAgents.some(agent => 
        agent.capabilities.includes(perk.id)
      );
    }
    
    return true;
  });

  // Category options
  const categoryOptions = [
    { value: 'all', label: 'All Categories', icon: '📋' },
    { value: 'file', label: 'File Operations', icon: '📁' },
    { value: 'system', label: 'System Tools', icon: '⚡' },
    { value: 'network', label: 'Network Tools', icon: '🌐' },
    { value: 'analysis', label: 'Analysis Tools', icon: '🔬' },
    { value: 'security', label: 'Security Tools', icon: '🛡️' },
    { value: 'web', label: 'Web Tools', icon: '🕷️' },
    { value: 'auto', label: 'Automation', icon: '⚙️' }
  ];

  function togglePerk(perkId: string) {
    perkContextManager.togglePerk(perkId);
  }

  function getStatusIcon(perk: PerkDefinition): string {
    if (!perk.isOwned) return '🔒';
    if (!perk.isEnabled) return '❌';
    if (perkContextManager.canExecutePerk(perk.id)) return '✅';
    return '⚠️';
  }

  function getStatusText(perk: PerkDefinition): string {
    if (!perk.isOwned) return 'Not Owned';
    if (!perk.isEnabled) return 'Disabled';
    if (perkContextManager.canExecutePerk(perk.id)) return 'Ready';
    return 'Permission Issue';
  }

  function getStatusClass(perk: PerkDefinition): string {
    if (!perk.isOwned) return 'status-locked';
    if (!perk.isEnabled) return 'status-disabled';
    if (perkContextManager.canExecutePerk(perk.id)) return 'status-ready';
    return 'status-warning';
  }

  function validateContext() {
    perkContextManager.validateContext();
  }

  function getAgentUsingPerk(perkId: string): string[] {
    return currentSelectedAgents
      .filter(agent => agent.capabilities.includes(perkId))
      .map(agent => agent.name);
  }
</script>

<div class="perk-management">
  <!-- Header with Context Status -->
  <div class="management-header">
    <div class="context-status">
      <div class="status-item">
        <span class="status-label">Total Perks:</span>
        <span class="status-value">{status.totalPerks}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Enabled:</span>
        <span class="status-value enabled">{status.enabledPerks}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Owned:</span>
        <span class="status-value owned">{status.ownedPerks}</span>
      </div>
      {#if status.isDirty}
        <button class="validate-btn" on:click={validateContext}>
          🔄 Validate Context
        </button>
      {/if}
    </div>
  </div>

  <!-- Filters -->
  <div class="filters">
    <div class="filter-group">
      <label class="filter-label">Category:</label>
      <select bind:value={selectedCategory} class="category-select">
        {#each categoryOptions as option}
          <option value={option.value}>
            {option.icon} {option.label}
          </option>
        {/each}
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-checkbox">
        <input 
          type="checkbox" 
          bind:checked={showOnlyAgentPerks}
          disabled={currentSelectedAgents.length === 0}
        />
        <span class="checkbox-label">
          Show only selected agent perks
          {#if currentSelectedAgents.length > 0}
            ({currentSelectedAgents.map(a => a.name).join(', ')})
          {/if}
        </span>
      </label>
    </div>
  </div>

  <!-- Perks Table -->
  <div class="perks-table-container">
    <table class="perks-table">
      <thead>
        <tr>
          <th class="col-icon">Icon</th>
          <th class="col-name">Name</th>
          <th class="col-description">Description</th>
          <th class="col-category">Category</th>
          <th class="col-status">Status</th>
          <th class="col-agents">Used By</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredPerks as perk (perk.id)}
          <tr class="perk-row {getStatusClass(perk)}">
            <td class="col-icon">
              <span class="perk-icon">{perk.icon}</span>
            </td>
            <td class="col-name">
              <div class="perk-name">{perk.name}</div>
              <div class="perk-id">{perk.id}</div>
            </td>
            <td class="col-description">
              <div class="description-text">{perk.description}</div>
              {#if perk.contextFlags && perk.contextFlags.length > 0}
                <div class="context-flags">
                  <span class="flags-label">Requires:</span>
                  {#each perk.contextFlags as flag}
                    <span class="context-flag" class:flag-active={$perkContextStore.contextFlags[flag]}>
                      {flag.replace('_', ' ')}
                    </span>
                  {/each}
                </div>
              {/if}
            </td>
            <td class="col-category">
              <span class="category-badge category-{perk.category}">
                {categoryOptions.find(c => c.value === perk.category)?.icon || '📋'}
                {perk.category}
              </span>
            </td>
            <td class="col-status">
              <div class="status-indicator {getStatusClass(perk)}">
                <span class="status-icon">{getStatusIcon(perk)}</span>
                <span class="status-text">{getStatusText(perk)}</span>
              </div>
              {#if !perkContextManager.canExecutePerk(perk.id) && perk.isOwned}
                <div class="status-message">
                  {perkContextManager.getPerkStatusMessage(perk.id)}
                </div>
              {/if}
            </td>
            <td class="col-agents">
              {#each getAgentUsingPerk(perk.id) as agentName}
                <span class="agent-badge">{agentName}</span>
              {/each}
              {#if getAgentUsingPerk(perk.id).length === 0}
                <span class="no-agents">None</span>
              {/if}
            </td>
            <td class="col-actions">
              {#if perk.isOwned}
                <button 
                  class="toggle-btn" 
                  class:enabled={perk.isEnabled}
                  class:disabled={!perk.isEnabled}
                  on:click={() => togglePerk(perk.id)}
                >
                  {perk.isEnabled ? 'Disable' : 'Enable'}
                </button>
              {:else}
                <button class="buy-btn" disabled>
                  🔒 Purchase
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if filteredPerks.length === 0}
      <div class="no-perks">
        <div class="no-perks-icon">🔍</div>
        <div class="no-perks-text">No perks match the current filters</div>
        <button class="clear-filters" on:click={() => { selectedCategory = 'all'; showOnlyAgentPerks = false; }}>
          Clear Filters
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .perk-management {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .management-header {
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
  }

  .context-status {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }

  .status-label {
    color: rgba(255, 255, 255, 0.7);
  }

  .status-value {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  .status-value.enabled {
    color: #00ff88;
  }

  .status-value.owned {
    color: #00aaff;
  }

  .validate-btn {
    background: rgba(255, 165, 0, 0.2);
    border: 1px solid #ffa500;
    border-radius: 4px;
    padding: 4px 8px;
    color: #ffa500;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .validate-btn:hover {
    background: rgba(255, 165, 0, 0.3);
  }

  .filters {
    display: flex;
    gap: 16px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  .category-select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 4px 8px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 12px;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }

  .filter-checkbox input[type="checkbox"] {
    accent-color: #00ff88;
  }

  .perks-table-container {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }

  .perks-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .perks-table th {
    background: rgba(0, 0, 0, 0.4);
    color: rgba(255, 255, 255, 0.9);
    padding: 8px 6px;
    text-align: left;
    border-bottom: 2px solid rgba(0, 255, 136, 0.3);
    font-weight: 500;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .perks-table td {
    padding: 8px 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    vertical-align: top;
  }

  .col-icon { width: 40px; }
  .col-name { width: 120px; }
  .col-description { width: 200px; }
  .col-category { width: 80px; }
  .col-status { width: 100px; }
  .col-agents { width: 80px; }
  .col-actions { width: 80px; }

  .perk-row {
    transition: background-color 0.2s ease;
  }

  .perk-row:hover {
    background: rgba(0, 255, 136, 0.05);
  }

  .perk-row.status-ready {
    border-left: 3px solid #00ff88;
  }

  .perk-row.status-disabled {
    border-left: 3px solid #666;
    opacity: 0.7;
  }

  .perk-row.status-locked {
    border-left: 3px solid #ff6b6b;
    opacity: 0.6;
  }

  .perk-row.status-warning {
    border-left: 3px solid #ffa500;
  }

  .perk-icon {
    font-size: 16px;
    display: block;
    text-align: center;
  }

  .perk-name {
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 2px;
  }

  .perk-id {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-family: monospace;
  }

  .description-text {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.3;
    margin-bottom: 4px;
  }

  .context-flags {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    align-items: center;
  }

  .flags-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    margin-right: 4px;
  }

  .context-flag {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.7);
  }

  .context-flag.flag-active {
    background: rgba(0, 255, 136, 0.2);
    border-color: rgba(0, 255, 136, 0.4);
    color: #00ff88;
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 500;
    text-transform: capitalize;
  }

  .category-file { background: rgba(0, 150, 255, 0.2); color: #0096ff; }
  .category-system { background: rgba(255, 200, 0, 0.2); color: #ffc800; }
  .category-network { background: rgba(0, 255, 136, 0.2); color: #00ff88; }
  .category-analysis { background: rgba(150, 0, 255, 0.2); color: #9600ff; }
  .category-security { background: rgba(255, 100, 100, 0.2); color: #ff6464; }
  .category-web { background: rgba(255, 165, 0, 0.2); color: #ffa500; }
  .category-auto { background: rgba(100, 255, 100, 0.2); color: #64ff64; }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .status-icon {
    font-size: 14px;
  }

  .status-text {
    font-size: 11px;
    font-weight: 500;
  }

  .status-ready .status-text { color: #00ff88; }
  .status-disabled .status-text { color: #666; }
  .status-locked .status-text { color: #ff6b6b; }
  .status-warning .status-text { color: #ffa500; }

  .status-message {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 2px;
    font-style: italic;
  }

  .agent-badge {
    display: inline-block;
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.4);
    border-radius: 8px;
    padding: 1px 4px;
    font-size: 9px;
    color: #00ff88;
    margin: 1px;
  }

  .no-agents {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }

  .toggle-btn {
    background: transparent;
    border: 1px solid;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 10px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .toggle-btn.enabled {
    border-color: #ff6b6b;
    color: #ff6b6b;
  }

  .toggle-btn.enabled:hover {
    background: rgba(255, 107, 107, 0.1);
  }

  .toggle-btn.disabled {
    border-color: #00ff88;
    color: #00ff88;
  }

  .toggle-btn.disabled:hover {
    background: rgba(0, 255, 136, 0.1);
  }

  .buy-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 4px 8px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 10px;
    cursor: not-allowed;
  }

  .no-perks {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
  }

  .no-perks-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .no-perks-text {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 16px;
  }

  .clear-filters {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid #00ff88;
    border-radius: 6px;
    padding: 8px 16px;
    color: #00ff88;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .clear-filters:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .context-status {
      flex-direction: column;
      gap: 8px;
    }

    .perks-table {
      font-size: 11px;
    }

    .col-description {
      width: 150px;
    }
  }
</style>