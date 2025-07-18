<script lang="ts">
  import { onMount } from "svelte";
  import { characterManager, characters, npcs, users, activeCharacter } from "../services/CharacterManager";
  import type { Character, NPCAgent, UserPlayer } from "../types/Character";

  let isVisible = false;
  let selectedTab: 'npcs' | 'users' = 'npcs';
  let selectedCharacter: Character | null = null;

  function togglePanel() {
    isVisible = !isVisible;
  }

  function selectCharacter(character: Character) {
    selectedCharacter = character;
    characterManager.setActiveCharacter(character.id);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': return '#00ff88';
      case 'offline': return '#666666';
      case 'busy': return '#ff8800';
      case 'idle': return '#ffff00';
      default: return '#ffffff';
    }
  }

  function getCharacterIcon(character: Character): string {
    if (character.type === 'npc') {
      const npc = character as NPCAgent;
      return npc.name === 'Alpha' ? '🧠' : 
             npc.name === 'Beta' ? '🎨' : 
             npc.name === 'Gamma' ? '⚙️' : '🤖';
    }
    return '👤';
  }

  function formatLastSeen(lastSeen: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  onMount(() => {
    characterManager.initializeSampleData();
  });
</script>

<!-- Character Management Widget -->
<div class="character-widget">
  <!-- Character Panel Toggle Button -->
  <button 
    class="ui-btn ui-btn-accent ui-btn-round" 
    on:click={togglePanel}
    class:ui-glow-accent={isVisible}
  >
    👥
  </button>

  <!-- Character Panel -->
  {#if isVisible}
    <div class="ui-panel character-panel ui-animate-fade-in">
      <div class="ui-panel-header">
        <h3>Character Management</h3>
        <button class="ui-btn ui-btn-sm" on:click={() => isVisible = false}>✕</button>
      </div>

      <!-- Tab Navigation -->
      <div class="ui-tabs">
        <button 
          class="ui-tab {selectedTab === 'npcs' ? 'ui-tab-active' : ''}"
          on:click={() => selectedTab = 'npcs'}
        >
          🤖 NPCs ({$npcs.length})
        </button>
        <button 
          class="ui-tab {selectedTab === 'users' ? 'ui-tab-active' : ''}"
          on:click={() => selectedTab = 'users'}
        >
          👤 Users ({$users.length})
        </button>
      </div>

      <!-- Character List -->
      <div class="character-list">
        {#if selectedTab === 'npcs'}
          {#each $npcs as npc}
            <div 
              class="character-item {selectedCharacter?.id === npc.id ? 'selected' : ''}"
              on:click={() => selectCharacter(npc)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && selectCharacter(npc)}
            >
              <div class="character-icon" style="color: {npc.color}">
                {getCharacterIcon(npc)}
              </div>
              <div class="character-info">
                <div class="character-name">{npc.name}</div>
                <div class="character-details">
                  <span class="specialization">{npc.specialization}</span>
                  <span class="status" style="color: {getStatusColor(npc.status)}">
                    {npc.status}
                  </span>
                </div>
              </div>
              <div class="character-stats">
                <div class="level">Lv.{npc.level}</div>
                <div class="performance">
                  {npc.performance.tasksCompleted} tasks
                </div>
              </div>
            </div>
          {/each}
        {:else}
          {#each $users as user}
            <div 
              class="character-item {selectedCharacter?.id === user.id ? 'selected' : ''}"
              on:click={() => selectCharacter(user)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && selectCharacter(user)}
            >
              <div class="character-icon" style="color: {user.color}">
                {getCharacterIcon(user)}
              </div>
              <div class="character-info">
                <div class="character-name">{user.name}</div>
                <div class="character-details">
                  <span class="role">{user.role}</span>
                  <span class="status" style="color: {getStatusColor(user.status)}">
                    {user.status}
                  </span>
                </div>
              </div>
              <div class="character-stats">
                <div class="level">Lv.{user.level}</div>
                <div class="last-seen">
                  {formatLastSeen(user.lastSeen)}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Character Details -->
      {#if selectedCharacter}
        <div class="character-details-panel">
          <h4>{selectedCharacter.name}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Type:</label>
              <span>{selectedCharacter.type.toUpperCase()}</span>
            </div>
            <div class="detail-item">
              <label>Role:</label>
              <span>{selectedCharacter.role}</span>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <span style="color: {getStatusColor(selectedCharacter.status)}">
                {selectedCharacter.status}
              </span>
            </div>
            <div class="detail-item">
              <label>Level:</label>
              <span>{selectedCharacter.level}</span>
            </div>
            {#if selectedCharacter.type === 'npc'}
              {@const npc = selectedCharacter as NPCAgent}
              <div class="detail-item">
                <label>AI Model:</label>
                <span>{npc.aiModel}</span>
              </div>
              <div class="detail-item">
                <label>Personality:</label>
                <span>{npc.personality}</span>
              </div>
              <div class="detail-item">
                <label>Tasks Completed:</label>
                <span>{npc.performance.tasksCompleted}</span>
              </div>
              <div class="detail-item">
                <label>Success Rate:</label>
                <span>{(npc.performance.successRate * 100).toFixed(1)}%</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="css">
  .character-widget {
    position: relative;
    display: flex;
    align-items: center;
  }

  .character-panel {
    position: absolute;
    top: 60px;
    right: 0;
    width: 420px;
    max-height: 500px;
    z-index: 1000;
  }

  .character-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-sm);
    max-height: 300px;
  }

  .character-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    margin-bottom: var(--space-xs);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-base);
    border: 1px solid transparent;
    background: rgba(0, 0, 0, 0.3);
  }

  .character-item:hover {
    background: rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.3);
  }

  .character-item.selected {
    background: rgba(0, 255, 136, 0.2);
    border-color: var(--color-accent);
  }

  .character-icon {
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.5);
  }

  .character-info {
    flex: 1;
    min-width: 0;
  }

  .character-name {
    font-weight: bold;
    color: var(--color-accent);
    margin-bottom: var(--space-xs);
    font-size: 0.9rem;
  }

  .character-details {
    display: flex;
    gap: var(--space-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .character-stats {
    text-align: right;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .character-details-panel {
    padding: var(--space-md);
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
  }

  .character-details-panel h4 {
    color: var(--color-accent);
    margin: 0 0 var(--space-sm) 0;
    font-size: 1rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
    padding: var(--space-xs) 0;
  }

  .detail-item label {
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .detail-item span {
    color: var(--color-text);
    font-weight: 600;
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .character-panel {
      width: 350px;
      max-height: 450px;
    }
    
    .character-list {
      max-height: 250px;
    }
    
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
</style> 