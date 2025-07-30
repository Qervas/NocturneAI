<script lang="ts">
  import { selectedAgents, focusedAgent } from '../services/AgentSelectionManager';
  import { perkContextManager } from '../services/PerkContextManager';

  // Agent-specific perks data
  $: currentAgent = $focusedAgent || ($selectedAgents.length > 0 ? $selectedAgents[0] : null);
  
  // Core perks that are agent-specific
  const agentPerks = [
    {
      id: 'file-reader',
      name: 'File Reader',
      icon: '📖',
      description: 'Ability to read files from the system',
      category: 'file',
      categoryIcon: '📁',
      requires: ['filesystem_access', 'read_permissions'],
      isEnabled: true,
      isOwned: true
    },
    {
      id: 'file-writer', 
      name: 'File Writer',
      icon: '✏️',
      description: 'Ability to create and modify files',
      category: 'file',
      categoryIcon: '📁',
      requires: ['filesystem_access', 'write_permissions'],
      isEnabled: true,
      isOwned: true
    },
    {
      id: 'directory-master',
      name: 'Directory Master', 
      icon: '📁',
      description: 'Advanced directory and folder operations',
      category: 'file',
      categoryIcon: '📁',
      requires: ['filesystem_access', 'directory_permissions'],
      isEnabled: true,
      isOwned: true
    },
    {
      id: 'system-commander',
      name: 'System Commander',
      icon: '⚡',
      description: 'Execute system commands and scripts',
      category: 'system',
      categoryIcon: '⚡',
      requires: ['system_access', 'command_permissions'],
      isEnabled: true,
      isOwned: true
    }
  ];

  // Mock context flags - in real implementation this would come from PerkContextManager
  const contextFlags: Record<string, boolean> = {
    'filesystem_access': true,
    'read_permissions': true,
    'write_permissions': true,
    'directory_permissions': true,
    'system_access': true,
    'command_permissions': true
  };

  function togglePerk(perkId: string) {
    const perk = agentPerks.find(p => p.id === perkId);
    if (perk && perk.isOwned) {
      perk.isEnabled = !perk.isEnabled;
      // In real implementation: perkContextManager.toggleAgentPerk(currentAgent.id, perkId);
    }
  }

  function getPerkStatus(perk: any): { icon: string, text: string, class: string } {
    if (!perk.isOwned) return { icon: '🔒', text: 'Not Owned', class: 'status-locked' };
    if (!perk.isEnabled) return { icon: '❌', text: 'Disabled', class: 'status-disabled' };
    
    // Check if all requirements are met
    const allRequirementsMet = perk.requires.every((req: string) => contextFlags[req]);
    if (!allRequirementsMet) return { icon: '⚠️', text: 'Requirements Not Met', class: 'status-warning' };
    
    return { icon: '✅', text: 'Ready', class: 'status-ready' };
  }

  function formatRequirement(req: string): string {
    return req.replace('_', ' ');
  }
</script>

<div class="modern-perk-panel">
  <!-- Agent Header -->
  <div class="agent-header">
    {#if currentAgent}
      <div class="agent-info">
        <span class="agent-avatar">{currentAgent.avatar}</span>
        <div class="agent-details">
          <div class="agent-name">{currentAgent.name}</div>
          <div class="agent-type">{currentAgent.type}</div>
        </div>
      </div>
      <div class="agent-status">
        <span class="status-indicator active">●</span>
        <span class="status-text">Active</span>
      </div>
    {:else}
      <div class="no-agent">
        <span class="no-agent-icon">👤</span>
        <span class="no-agent-text">No agent selected</span>
      </div>
    {/if}
  </div>

  <!-- Perks List -->
  <div class="perks-container">
    {#if currentAgent}
      {#each agentPerks as perk (perk.id)}
        {@const status = getPerkStatus(perk)}
        <div class="perk-card {status.class}">
          <!-- Perk Header -->
          <div class="perk-header">
            <div class="perk-icon-section">
              <span class="perk-icon">{perk.icon}</span>
            </div>
            <div class="perk-info">
              <div class="perk-name">{perk.name}</div>
              <div class="perk-id">{perk.id}</div>
            </div>
            <div class="perk-status">
              <span class="status-icon">{status.icon}</span>
              <span class="status-text">{status.text}</span>
            </div>
          </div>

          <!-- Perk Description -->
          <div class="perk-description">
            {perk.description}
          </div>

          <!-- Requirements -->
          <div class="perk-requirements">
            <span class="requirements-label">Requires:</span>
            <div class="requirements-list">
              {#each perk.requires as requirement}
                <span class="requirement-item" class:met={contextFlags[requirement]}>
                  {formatRequirement(requirement)}
                </span>
              {/each}
            </div>
          </div>

          <!-- Category and Actions -->
          <div class="perk-footer">
            <div class="perk-category">
              <span class="category-icon">{perk.categoryIcon}</span>
              <span class="category-name">{perk.category}</span>
            </div>
            
            <div class="perk-actions">
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
                <button class="purchase-btn" disabled>
                  🔒 Purchase
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {:else}
      <div class="no-agent-message">
        <div class="message-icon">⚡</div>
        <div class="message-text">Select an agent to view and manage their perks</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .modern-perk-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: rgba(0, 0, 0, 0.05);
  }

  .agent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 2px solid rgba(0, 255, 136, 0.2);
  }

  .agent-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .agent-avatar {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 255, 136, 0.1);
    border-radius: 50%;
    border: 2px solid rgba(0, 255, 136, 0.3);
  }

  .agent-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .agent-name {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }

  .agent-type {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  .agent-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-indicator {
    font-size: 12px;
  }

  .status-indicator.active {
    color: #00ff88;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .status-text {
    font-size: 12px;
    color: #00ff88;
    font-weight: 500;
  }

  .no-agent {
    display: flex;
    align-items: center;
    gap: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .no-agent-icon {
    font-size: 24px;
    opacity: 0.5;
  }

  .no-agent-text {
    font-size: 14px;
    font-style: italic;
  }

  .perks-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .perk-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .perk-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--status-color);
    transition: all 0.3s ease;
  }

  .perk-card.status-ready {
    --status-color: #00ff88;
    border-color: rgba(0, 255, 136, 0.2);
  }

  .perk-card.status-disabled {
    --status-color: #666;
    opacity: 0.7;
  }

  .perk-card.status-locked {
    --status-color: #ff6b6b;
    opacity: 0.6;
  }

  .perk-card.status-warning {
    --status-color: #ffa500;
  }

  .perk-card:hover {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(0, 255, 136, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .perk-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .perk-icon-section {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 255, 136, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(0, 255, 136, 0.2);
  }

  .perk-icon {
    font-size: 24px;
  }

  .perk-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .perk-name {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }

  .perk-id {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Courier New', monospace;
  }

  .perk-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .perk-status .status-icon {
    font-size: 14px;
  }

  .perk-status .status-text {
    font-size: 11px;
    font-weight: 500;
  }

  .status-ready .perk-status {
    background: rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.3);
    color: #00ff88;
  }

  .status-disabled .perk-status {
    background: rgba(102, 102, 102, 0.1);
    border-color: rgba(102, 102, 102, 0.3);
    color: #666;
  }

  .status-locked .perk-status {
    background: rgba(255, 107, 107, 0.1);
    border-color: rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
  }

  .status-warning .perk-status {
    background: rgba(255, 165, 0, 0.1);
    border-color: rgba(255, 165, 0, 0.3);
    color: #ffa500;
  }

  .perk-description {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 12px;
  }

  .perk-requirements {
    margin-bottom: 16px;
  }

  .requirements-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    display: block;
    margin-bottom: 6px;
  }

  .requirements-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .requirement-item {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;
  }

  .requirement-item.met {
    background: rgba(0, 255, 136, 0.2);
    border-color: rgba(0, 255, 136, 0.4);
    color: #00ff88;
  }

  .perk-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .perk-category {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .category-icon {
    font-size: 14px;
  }

  .category-name {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    text-transform: capitalize;
  }

  .perk-actions {
    display: flex;
    gap: 8px;
  }

  .toggle-btn {
    background: transparent;
    border: 1px solid;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .toggle-btn.enabled {
    border-color: #ff6b6b;
    color: #ff6b6b;
  }

  .toggle-btn.enabled:hover {
    background: rgba(255, 107, 107, 0.1);
    transform: translateY(-1px);
  }

  .toggle-btn.disabled {
    border-color: #00ff88;
    color: #00ff88;
  }

  .toggle-btn.disabled:hover {
    background: rgba(0, 255, 136, 0.1);
    transform: translateY(-1px);
  }

  .purchase-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 6px 12px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    font-weight: 600;
    cursor: not-allowed;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .no-agent-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
  }

  .message-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .message-text {
    font-size: 14px;
    font-style: italic;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .agent-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .perk-header {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .perk-footer {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .requirements-list {
      justify-content: center;
    }
  }
</style>