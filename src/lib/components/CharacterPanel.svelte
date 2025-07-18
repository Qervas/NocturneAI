<script lang="ts">
  import { onMount } from "svelte";
  import { characterManager, characters, activeCharacter, npcs, users } from "../services/CharacterManager";
  import type { Character, NPCAgent, UserPlayer } from "../types/Character";

  let isVisible = false;
  let selectedTab: 'npcs' | 'users' = 'npcs';
  let selectedCharacter: Character | null = null;

  onMount(() => {
    // Initialize with sample data
    characterManager.initializeSampleData();
  });

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
      return '🤖';
    } else {
      switch (character.role) {
        case 'admin': return '👑';
        case 'player': return '👤';
        case 'observer': return '👁️';
        default: return '👤';
      }
    }
  }

  function formatLastSeen(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
</script>

<!-- Character Panel Toggle Button -->
<button 
  class="character-toggle" 
  on:click={togglePanel}
  class:active={isVisible}
>
  👥
</button>

<!-- Character Panel -->
{#if isVisible}
  <div class="character-panel">
    <div class="panel-header">
      <h3>Character Management</h3>
      <button class="close-btn" on:click={() => isVisible = false}>✕</button>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button 
        class="tab-btn {selectedTab === 'npcs' ? 'active' : ''}"
        on:click={() => selectedTab = 'npcs'}
      >
        🤖 NPCs ({$npcs.length})
      </button>
      <button 
        class="tab-btn {selectedTab === 'users' ? 'active' : ''}"
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

<style>
  .character-toggle {
    position: fixed;
    top: 20px;
    left: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(0, 255, 136, 0.2);
    border: 2px solid #00ff88;
    color: #00ff88;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .character-toggle:hover {
    background: rgba(0, 255, 136, 0.3);
    transform: scale(1.1);
  }

  .character-toggle.active {
    background: rgba(0, 255, 136, 0.4);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  }

  .character-panel {
    position: fixed;
    top: 80px;
    left: 20px;
    width: 400px;
    height: 600px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #00ff88;
    border-radius: 12px;
    backdrop-filter: blur(15px);
    z-index: 999;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.3);
  }

  .panel-header h3 {
    color: #00ff88;
    margin: 0;
    font-size: 16px;
  }

  .close-btn {
    background: none;
    border: 1px solid #00ff88;
    color: #00ff88;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .tab-nav {
    display: flex;
    padding: 12px 16px;
    gap: 8px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.3);
  }

  .tab-btn {
    flex: 1;
    background: none;
    border: 1px solid #00ff88;
    color: #00ff88;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .tab-btn.active {
    background: rgba(0, 255, 136, 0.2);
  }

  .character-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .character-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .character-item:hover {
    background: rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.4);
  }

  .character-item.selected {
    background: rgba(0, 255, 136, 0.2);
    border-color: #00ff88;
  }

  .character-icon {
    font-size: 24px;
    margin-right: 12px;
  }

  .character-info {
    flex: 1;
  }

  .character-name {
    color: #ffffff;
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .character-details {
    display: flex;
    gap: 8px;
    font-size: 11px;
  }

  .character-stats {
    text-align: right;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }

  .character-details-panel {
    padding: 16px;
    border-top: 1px solid rgba(0, 255, 136, 0.3);
    background: rgba(0, 0, 0, 0.5);
  }

  .character-details-panel h4 {
    color: #00ff88;
    margin: 0 0 12px 0;
    font-size: 14px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .detail-item label {
    color: rgba(255, 255, 255, 0.7);
  }

  .detail-item span {
    color: #ffffff;
    font-weight: bold;
  }
</style> 