<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { characterManager, characters, npcs, users, activeCharacter } from "../services/CharacterManager";
  import { llmService } from "../services/LLMService";
  import type { Character, NPCAgent, UserPlayer } from "../types/Character";

  export let isVisible = false;

  let chatInput = "";
  let chatHistory: Array<{
    id: string;
    type: 'global' | 'direct';
    sender: string;
    message: string;
    timestamp: Date;
    target?: string;
  }> = [];
  let inputElement: HTMLInputElement;
  let chatContainer: HTMLDivElement;
  let activeTab: 'global' | 'direct' = 'global';
  let selectedAgent = "";
  let availableAgents: string[] = [];
  let isInitialized = false;

  // Load chat history from localStorage
  function loadChatHistory() {
    try {
      const saved = localStorage.getItem('chatHistory');
      if (saved) {
        const parsed = JSON.parse(saved);
        chatHistory = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
    }
  }

  // Save chat history to localStorage
  function saveChatHistory() {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  }

  // Generate unique message ID
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  onMount(async () => {
    loadChatHistory();
    
    // Initialize character manager and LLM service
    characterManager.initializeSampleData();
    await llmService.initialize();
    
    // Set up available agents
    availableAgents = ['Alpha', 'Beta', 'Gamma'];
    isInitialized = true;
    
    // Add welcome message if chat history is empty
    if (chatHistory.length === 0) {
      chatHistory = [
        {
          id: generateMessageId(),
          type: 'global',
          sender: 'System',
          message: 'Welcome to Multi-Agent System! Switch to Direct tab to chat with AI agents.',
          timestamp: new Date()
        }
      ];
      saveChatHistory();
    }

    if (isVisible) {
      setTimeout(() => inputElement?.focus(), 100);
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    } else if (event.key === 'Escape') {
      isVisible = false;
    }
  }

  async function sendMessage() {
    if (!chatInput.trim()) return;

    const messageType = activeTab;
    let target = '';
    
    // For direct messages, use selected agent
    if (activeTab === 'direct' && selectedAgent) {
      target = selectedAgent;
    }

    const message = {
      id: generateMessageId(),
      type: messageType,
      sender: 'You',
      message: chatInput.trim(),
      timestamp: new Date(),
      target: target || undefined
    };

    chatHistory = [...chatHistory, message];
    const currentMessage = chatInput.trim();
    chatInput = "";
    saveChatHistory();
    
    // Auto-scroll to bottom
    await tick();
    scrollToBottom();

    // Send to AI agent for direct messages
    if (messageType === 'direct' && target) {
      setTimeout(() => sendToAIAgent(target, currentMessage), 500 + Math.random() * 1000);
    }
  }

  async function sendToAIAgent(agentName: string, originalMessage: string) {
    try {
      // Show typing indicator
      const typingMessage = {
        id: generateMessageId(),
        type: 'direct' as const,
        sender: agentName,
        message: '💭 Thinking...',
        timestamp: new Date(),
        target: 'You'
      };

      chatHistory = [...chatHistory, typingMessage];
      saveChatHistory();
      scrollToBottom();

      // Get response from LLM service
      const agentId = agentName.toLowerCase();
      const llmResponse = await llmService.sendMessageToAgent(agentId, originalMessage, 'You');

      // Remove typing indicator and add real response
      chatHistory = chatHistory.filter(msg => msg.id !== typingMessage.id);
      
      const response = {
        id: generateMessageId(),
        type: 'direct' as const,
        sender: agentName,
        message: llmResponse,
        timestamp: new Date(),
        target: 'You'
      };

      chatHistory = [...chatHistory, response];
      saveChatHistory();
      scrollToBottom();

    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Remove typing indicator
      chatHistory = chatHistory.filter(msg => !msg.message.includes('💭 Thinking...'));
      
      // Add error message
      const errorResponse = {
        id: generateMessageId(),
        type: 'direct' as const,
        sender: agentName,
        message: `Sorry, I'm having trouble right now. Please make sure your local LLM server is running!`,
        timestamp: new Date(),
        target: 'You'
      };

      chatHistory = [...chatHistory, errorResponse];
      saveChatHistory();
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function toggleChat() {
    isVisible = !isVisible;
    if (isVisible) {
      setTimeout(() => inputElement?.focus(), 100);
    }
  }

  function getCharacterColor(sender: string): string {
    if (sender === 'System') return '#ffaa00';
    if (sender === 'You') return '#00ffff';
    if (sender === 'Alpha') return '#ff6b6b';
    if (sender === 'Beta') return '#4ecdc4';
    if (sender === 'Gamma') return '#45b7d1';
    return '#00ff88';
  }

  function isOwnMessage(sender: string): boolean {
    return sender === 'You';
  }

  function changeTab(tab: 'global' | 'direct') {
    activeTab = tab;
    if (tab === 'direct' && !selectedAgent) {
      selectedAgent = availableAgents[0] || 'Alpha';
    }
  }

  function clearChat() {
    chatHistory = [];
    saveChatHistory();
  }

  // Filter messages based on active tab
  $: filteredMessages = chatHistory.filter(msg => {
    if (activeTab === 'global') return msg.type === 'global';
    if (activeTab === 'direct') {
      return msg.type === 'direct' && (
        msg.target === 'You' || msg.sender === 'You'
      );
    }
    return true;
  });

  // Get message counts for tabs
  $: globalCount = chatHistory.filter(msg => msg.type === 'global').length;
  $: directCount = chatHistory.filter(msg => 
    msg.type === 'direct' && (msg.target === 'You' || msg.sender === 'You')
  ).length;
</script>

<!-- Chat Component for Header Layout -->
<div class="chat-widget">
  <!-- Chat Toggle Button -->
  <button 
    class="ui-btn ui-btn-primary ui-btn-round" 
    on:click={toggleChat}
    class:ui-glow-primary={isVisible}
    title="Toggle Chat"
  >
    💬
    {#if !isInitialized}
      <span class="loading-dot ui-animate-pulse"></span>
    {/if}
  </button>

  <!-- Chat Interface -->
  {#if isVisible}
    <div class="ui-panel chat-panel ui-animate-fade-in">
      <div class="ui-panel-header">
        <div class="ui-tabs">
          <button 
            class="ui-tab {activeTab === 'global' ? 'ui-tab-active' : ''}"
            on:click={() => changeTab('global')}
          >
            Global {#if globalCount > 0}<span class="tab-count">({globalCount})</span>{/if}
          </button>
          <button 
            class="ui-tab {activeTab === 'direct' ? 'ui-tab-active' : ''}"
            on:click={() => changeTab('direct')}
          >
            AI Chat {#if directCount > 0}<span class="tab-count">({directCount})</span>{/if}
          </button>
        </div>
        <div class="ui-flex">
          <button class="ui-btn ui-btn-sm" on:click={clearChat} title="Clear chat">
            🗑️
          </button>
          <button class="ui-btn ui-btn-sm" on:click={() => isVisible = false}>
            ✕
          </button>
        </div>
      </div>

      {#if activeTab === 'direct'}
        <div class="agent-selector">
          <label for="agent-select" class="ui-text-sm">Chat with:</label>
          <select id="agent-select" bind:value={selectedAgent} class="ui-select">
            {#each availableAgents as agent}
              <option value={agent}>{agent}</option>
            {/each}
          </select>
        </div>
      {/if}

      <div class="chat-messages" bind:this={chatContainer}>
        {#if filteredMessages.length === 0}
          <div class="no-messages">
            {#if activeTab === 'global'}
              No global messages yet. Start a conversation!
            {:else}
              No direct messages yet. Select an AI agent and start chatting!
            {/if}
          </div>
        {:else}
          {#each filteredMessages as message (message.id)}
            {@const isOwn = isOwnMessage(message.sender)}
            {@const charColor = getCharacterColor(message.sender)}
            <div class="ui-message {isOwn ? 'ui-message-user' : 'ui-message-ai'} ui-animate-slide-in" style="--char-color: {charColor}">
              <div class="message-header ui-flex-between">
                <span class="sender ui-text-sm" style="color: {charColor}">
                  {message.sender}
                  {#if message.type === 'direct' && message.target && !isOwn}
                    → <span style="color: {getCharacterColor(message.target)}">{message.target}</span>
                  {/if}
                </span>
                <span class="time ui-text-sm">{formatTime(message.timestamp)}</span>
              </div>
              <div class="message-content {message.message.includes('💭 Thinking...') ? 'thinking-indicator ui-animate-pulse' : ''}">
                {message.message}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="chat-input-container ui-flex">
        <input
          bind:this={inputElement}
          bind:value={chatInput}
          on:keydown={handleKeydown}
          placeholder={activeTab === 'direct' ? `Message ${selectedAgent}...` : "Type your message..."}
          class="ui-input"
          maxlength="500"
          disabled={!isInitialized}
        />
        <button class="ui-btn ui-btn-primary" on:click={sendMessage} disabled={!chatInput.trim() || !isInitialized}>
          ➤
        </button>
      </div>
    </div>
  {/if}
</div>

<style lang="css">
  .chat-widget {
    position: relative;
    display: flex;
    align-items: center;
  }

  .chat-panel {
    position: absolute;
    top: 60px;
    right: 0;
    width: 380px;
    max-height: 500px;
    z-index: 1000;
  }

  .agent-selector {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    background: var(--color-surface-subtle);
    border-bottom: 1px solid var(--color-border);
  }

  .agent-selector label {
    font-size: var(--font-size-sm);
    color: var(--color-accent);
    white-space: nowrap;
    font-weight: 500;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-sm);
    max-height: 320px;
    scrollbar-width: thin;
    scrollbar-color: var(--color-accent) transparent;
  }

  .chat-messages::-webkit-scrollbar {
    width: 6px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: var(--color-accent);
    border-radius: var(--radius-full);
  }

  .message-header {
    margin-bottom: var(--space-xs);
  }

  .sender {
    font-weight: 600;
  }

  .time {
    opacity: 0.7;
  }

  .message-content {
    line-height: 1.4;
  }

  .thinking-indicator {
    font-style: italic;
    opacity: 0.8;
  }

  .loading-dot {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 6px;
    height: 6px;
    background: var(--color-warning);
    border-radius: var(--radius-full);
  }

  .tab-count {
    opacity: 0.8;
    font-size: 0.8em;
  }

  .chat-input-container {
    margin-top: var(--space-sm);
    gap: var(--space-sm);
  }

  .no-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--color-text-secondary);
    text-align: center;
    font-style: italic;
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .chat-panel {
      width: 300px;
      max-height: 400px;
    }
    
    .chat-messages {
      max-height: 250px;
    }
  }
</style>
