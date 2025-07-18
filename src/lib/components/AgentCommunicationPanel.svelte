<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { communicationManager } from "../services/CommunicationManager";
  import type { AgentMessage } from "../types/Communication";
  
  let messages: AgentMessage[] = [];
  let isVisible = false;
  let networkStats = { totalAgents: 0, totalMessages: 0, totalRelationships: 0, averageTrustLevel: 0, activeConversations: 0 };
  let updateInterval: number;

  function togglePanel() {
    isVisible = !isVisible;
  }

  function updateMessages() {
    // Get all recent messages (last 10)
    const allMessages = communicationManager.getPendingMessages('all');
    messages = [...allMessages].reverse().slice(0, 10);
    networkStats = communicationManager.getNetworkStats();
  }

  function formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }

  function getMessageIcon(intent: string): string {
    const icons: Record<string, string> = {
      question: '❓',
      request_help: '🤝',
      share_info: '💡',
      collaborate: '🤜🤛',
      social_chat: '💬',
      challenge: '⚔️',
      acknowledge: '✅',
      suggest: '💭',
      compliment: '👍',
      critique: '📝'
    };
    return icons[intent] || '💬';
  }

  function getAgentColor(agentId: string): string {
    const colors: Record<string, string> = {
      'agent_alpha': '#00ff88',
      'agent_beta': '#ff8800', 
      'agent_gamma': '#8800ff'
    };
    return colors[agentId] || '#ffffff';
  }

  function getAgentName(agentId: string): string {
    return agentId.replace('agent_', '').charAt(0).toUpperCase() + agentId.replace('agent_', '').slice(1);
  }

  onMount(() => {
    updateMessages();
    updateInterval = setInterval(updateMessages, 5000); // Update every 5 seconds
  });

  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
</script>

<div class="communication-panel">
  <button class="ui-btn toggle-btn" on:click={togglePanel}>
    🌐 Agent Network {#if messages.length > 0}<span class="message-count">{messages.length}</span>{/if}
  </button>

  {#if isVisible}
    <div class="panel-content">
      <div class="network-stats">
        <h3>Social Network Stats</h3>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value">{networkStats.totalAgents}</span>
            <span class="stat-label">Agents</span>
          </div>
          <div class="stat">
            <span class="stat-value">{networkStats.totalMessages}</span>
            <span class="stat-label">Messages</span>
          </div>
          <div class="stat">
            <span class="stat-value">{networkStats.totalRelationships}</span>
            <span class="stat-label">Relationships</span>
          </div>
          <div class="stat">
            <span class="stat-value">{(networkStats.averageTrustLevel * 100).toFixed(0)}%</span>
            <span class="stat-label">Avg Trust</span>
          </div>
        </div>
      </div>

      <div class="message-feed">
        <h3>Recent Agent Communications</h3>
        {#if messages.length === 0}
          <div class="no-messages">
            <p>🤖 Agents are getting ready to chat...</p>
            <p class="hint">Wait a moment for autonomous conversations to begin!</p>
          </div>
        {:else}
          <div class="messages">
            {#each messages as message}
              <div class="message" style="border-left: 3px solid {getAgentColor(message.fromAgent)}">
                <div class="message-header">
                  <span class="agent-name" style="color: {getAgentColor(message.fromAgent)}">
                    {getAgentName(message.fromAgent)}
                  </span>
                  <span class="message-icon">{getMessageIcon(message.intent)}</span>
                  <span class="message-time">{formatTime(message.timestamp)}</span>
                </div>
                <div class="message-content">
                  {message.content}
                </div>
                {#if message.toAgent}
                  <div class="message-target">
                    → <span style="color: {getAgentColor(message.toAgent)}">{getAgentName(message.toAgent)}</span>
                  </div>
                {:else}
                  <div class="message-target">→ All Agents</div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .communication-panel {
    position: relative;
    margin: 1rem 0;
  }

  .toggle-btn {
    position: relative;
    font-size: 0.9rem;
  }

  .message-count {
    background: var(--accent-color);
    color: var(--bg-color);
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 0.7rem;
    margin-left: 0.5rem;
    font-weight: bold;
  }

  .panel-content {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-height: 400px;
    overflow-y: auto;
  }

  .network-stats h3 {
    color: var(--accent-color);
    margin: 0 0 1rem 0;
    font-size: 1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat {
    text-align: center;
    padding: 0.5rem;
    background: rgba(0, 255, 136, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(0, 255, 136, 0.3);
  }

  .stat-value {
    display: block;
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--accent-color);
  }

  .stat-label {
    display: block;
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .message-feed h3 {
    color: var(--accent-color);
    margin: 0 0 1rem 0;
    font-size: 1rem;
  }

  .no-messages {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
  }

  .hint {
    font-size: 0.8rem;
    opacity: 0.7;
    margin-top: 0.5rem;
  }

  .messages {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .message {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.85rem;
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .agent-name {
    font-weight: bold;
    font-size: 0.8rem;
  }

  .message-icon {
    font-size: 0.9rem;
  }

  .message-time {
    color: var(--text-muted);
    font-size: 0.7rem;
    margin-left: auto;
  }

  .message-content {
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .message-target {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-style: italic;
  }
</style>
