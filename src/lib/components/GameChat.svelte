<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { characterManager, characters, npcs, users, activeCharacter } from "../services/CharacterManager";
  import { communicationManager } from "../services/CommunicationManager";
  import { llmService } from "../services/LLMService";
  import type { Character, NPCAgent, UserPlayer } from "../types/Character";
  import type { CommunicationIntent } from "../types/Communication";

  export let isVisible = true; // Always visible in sidebar

  let chatInput = "";
  let chatHistory: Array<{
    id: string;
    type: 'global' | 'direct' | 'agent';
    sender: string;
    message: string;
    timestamp: Date;
    target?: string;
  }> = [];
  let inputElement: HTMLInputElement;
  let chatContainer: HTMLDivElement;
  let activeTab: 'global' | 'direct' | 'agent' = 'global';
  let selectedAgent = "";
  let availableAgents: string[] = [];
  let isInitialized = false;
  let llmStatus = "🔴 Checking...";
  let showConnectionHelp = false;

  // CSGO/League of Legends style chat features
  let isChatFocused = false;
  let chatOpacity = 1.0; // Full opacity in sidebar
  let fadeTimeout: number;
  let isTyping = false;
  let lastActivity = Date.now();

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

  // CSGO/League of Legends style fade management
  function updateChatOpacity() {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    
    if (isChatFocused || isTyping || timeSinceActivity < 3000) {
      // Full opacity when focused, typing, or recent activity
      chatOpacity = 1.0;
    } else if (timeSinceActivity < 8000) {
      // Gradual fade over 5 seconds
      chatOpacity = 1.0 - ((timeSinceActivity - 3000) / 5000) * 0.7;
    } else {
      // Minimum opacity when inactive
      chatOpacity = 0.3;
    }
  }

  function handleChatActivity() {
    lastActivity = Date.now();
    updateChatOpacity();
    
    // Clear existing timeout
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
    }
    
    // Set fade timeout
    fadeTimeout = setTimeout(() => {
      updateChatOpacity();
    }, 3000);
  }

  function handleChatFocus() {
    isChatFocused = true;
    chatOpacity = 1.0;
  }

  function handleChatBlur() {
    isChatFocused = false;
    updateChatOpacity();
  }

  function handleTypingStart() {
    isTyping = true;
    chatOpacity = 1.0;
  }

  function handleTypingEnd() {
    isTyping = false;
    updateChatOpacity();
  }



  onMount(() => {
    // Initialize async operations
    const initAsync = async () => {
      loadChatHistory();
      
      // Initialize character manager and LLM service
      characterManager.initializeSampleData();
      await llmService.initialize();
      
      // Check LLM connectivity status
      llmStatus = await llmService.getConnectionStatus();
      
          // Set up available agents
    availableAgents = ['Alpha', 'Beta', 'Gamma'];
    isInitialized = true;
    console.log('Chat initialized, isInitialized:', isInitialized);
      
      // Add welcome message if chat history is empty
      if (chatHistory.length === 0) {
        const welcomeMessage = llmStatus.includes('🟢') 
          ? 'Welcome to Multi-Agent System! The AI agents are ready to chat. Switch to Direct tab to start conversations.'
          : 'Welcome to Multi-Agent System! For real AI conversations, please start a local LLM server (Ollama or LM Studio). Check the connection status in the Direct tab.';
          
        chatHistory = [
          {
            id: generateMessageId(),
            type: 'global',
            sender: 'System',
            message: welcomeMessage,
            timestamp: new Date()
          }
        ];
        saveChatHistory();
      }

          // Focus input when component mounts
    setTimeout(() => {
      if (inputElement) {
        inputElement.focus();
        console.log('Chat input focused');
      }
    }, 100);
    };

    // Start async initialization
    initAsync();
    
    // Subscribe to agent communications for the agents tab
    const agentMessageInterval = setInterval(() => {
      const recentAgentMessages = communicationManager.getPendingMessages('all').slice(-10);
      recentAgentMessages.forEach(msg => {
        // Only add agent-to-agent messages
        if (msg.fromAgent.startsWith('agent_') && msg.toAgent?.startsWith('agent_') && 
            !chatHistory.find(h => h.id === msg.id)) {
          const agentMessage = {
            id: msg.id,
            type: 'agent' as const,
            sender: msg.fromAgent.replace('agent_', '').charAt(0).toUpperCase() + msg.fromAgent.replace('agent_', '').slice(1),
            message: msg.content,
            timestamp: msg.timestamp,
            target: msg.toAgent.replace('agent_', '').charAt(0).toUpperCase() + msg.toAgent.replace('agent_', '').slice(1)
          };
          chatHistory = [...chatHistory, agentMessage];
          saveChatHistory();
          handleChatActivity(); // Trigger fade reset on new messages
        }
      });
    }, 2000);

    // Start opacity update loop
    const opacityInterval = setInterval(updateChatOpacity, 100);

    return () => {
      clearInterval(opacityInterval);
      clearInterval(agentMessageInterval);
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    } else {
      handleChatActivity(); // Reset fade on any key press
      handleTypingStart();
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
    
    // Send through communication manager for visualization
    if (messageType === 'direct' && target) {
      // Direct message to specific agent
      const agentId = 'agent_' + target.toLowerCase();
      communicationManager.sendUserMessage('player_main', agentId, currentMessage, 'question');
    } else {
      // Global message - send to all agents
      const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
      agents.forEach(agentId => {
        communicationManager.sendUserMessage('player_main', agentId, currentMessage, 'social_chat');
      });
    }
    
    chatInput = "";
    saveChatHistory();
    handleChatActivity(); // Reset fade on message send
    handleTypingEnd();
    
    // Auto-scroll to bottom
    await tick();
    scrollToBottom();

    // Send to AI agent for direct messages
    if (messageType === 'direct' && target) {
      setTimeout(() => sendToAIAgent(target, currentMessage, false), 500 + Math.random() * 1000);
    } else if (messageType === 'global') {
      // For global messages, trigger responses from random agents after a delay
      const agents = ['Alpha', 'Beta', 'Gamma'];
      const respondingAgents = agents.filter(() => Math.random() > 0.3); // 70% chance each agent responds
      
      // Ensure at least one agent responds
      if (respondingAgents.length === 0) {
        respondingAgents.push(agents[Math.floor(Math.random() * agents.length)]);
      }
      
      respondingAgents.forEach((agentName, index) => {
        setTimeout(() => sendToAIAgent(agentName, currentMessage, true), 1000 + (index * 800) + Math.random() * 1200);
      });
    }
  }

  async function sendToAIAgent(agentName: string, originalMessage: string, isGlobalResponse: boolean = false) {
    try {
      // Show typing indicator
      const typingMessage = {
        id: generateMessageId(),
        type: isGlobalResponse ? 'global' as const : 'direct' as const,
        sender: agentName,
        message: '💭 Thinking...',
        timestamp: new Date(),
        target: isGlobalResponse ? undefined : 'You'
      };

      chatHistory = [...chatHistory, typingMessage];
      saveChatHistory();
      scrollToBottom();
      handleChatActivity(); // Reset fade on new message

      // Get response from LLM service
      const agentId = agentName.toLowerCase();
      const llmResponse = await llmService.sendMessageToAgent(agentId, originalMessage, 'You');

      // Remove typing indicator and add real response
      chatHistory = chatHistory.filter(msg => msg.id !== typingMessage.id);
      
      const response = {
        id: generateMessageId(),
        type: isGlobalResponse ? 'global' as const : 'direct' as const,
        sender: agentName,
        message: llmResponse,
        timestamp: new Date(),
        target: isGlobalResponse ? undefined : 'You'
      };

      chatHistory = [...chatHistory, response];
      
      // Send agent response through communication manager for visualization
      const fullAgentId = 'agent_' + agentId;
      communicationManager.sendAgentMessage(fullAgentId, 'player_main', 'acknowledge', llmResponse, 'normal');
      
      saveChatHistory();
      scrollToBottom();
      handleChatActivity(); // Reset fade on response

      // Refresh status if we got an offline message
      if (llmResponse.includes('offline') || llmResponse.includes('LLM server')) {
        await refreshLLMStatus();
      }

    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Remove typing indicator
      chatHistory = chatHistory.filter(msg => !msg.message.includes('💭 Thinking...'));
      
      // Add error message with helpful guidance
      const errorResponse = {
        id: generateMessageId(),
        type: isGlobalResponse ? 'global' as const : 'direct' as const,
        sender: agentName,
        message: `I'm having trouble connecting right now! 🔌\n\n` +
                `To chat with me, please start a local LLM server:\n` +
                `• **Ollama**: Run 'ollama run llama3.2'\n` +
                `• **LM Studio**: Start the local server\n\n` +
                `Click the ❓ button above for detailed setup instructions!`,
        timestamp: new Date(),
        target: isGlobalResponse ? undefined : 'You'
      };

      chatHistory = [...chatHistory, errorResponse];
      saveChatHistory();
      scrollToBottom();
      handleChatActivity(); // Reset fade on error message
      
      // Refresh status to show current state
      await refreshLLMStatus();
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
    // Not needed in sidebar layout - chat is always visible
    handleChatActivity(); // Reset fade on any interaction
  }

  function getCharacterColor(sender: string): string {
    if (sender === 'System') return '#ffaa00';
    if (sender === 'You') return '#ffffff';
    if (sender === 'Alpha') return '#00ff88';  // Match agent colors
    if (sender === 'Beta') return '#ff8800';   // Match agent colors
    if (sender === 'Gamma') return '#8800ff';  // Match agent colors
    return '#00ff88';
  }

  function isOwnMessage(sender: string): boolean {
    return sender === 'You';
  }

  function changeTab(tab: 'global' | 'direct' | 'agent') {
    activeTab = tab;
    if (tab === 'direct' && !selectedAgent) {
      selectedAgent = availableAgents[0] || 'Alpha';
    }
    handleChatActivity(); // Reset fade on tab change
  }

  function clearChat() {
    chatHistory = [];
    saveChatHistory();
    handleChatActivity(); // Reset fade on clear
  }

  async function refreshLLMStatus() {
    llmStatus = "🔄 Checking...";
    llmStatus = await llmService.getConnectionStatus();
  }

  function toggleConnectionHelp() {
    showConnectionHelp = !showConnectionHelp;
    handleChatActivity(); // Reset fade on help toggle
  }

  // Filter messages based on active tab
  $: filteredMessages = chatHistory.filter(msg => {
    if (activeTab === 'global') return msg.type === 'global';
    if (activeTab === 'direct') {
      return msg.type === 'direct' && (
        msg.target === 'You' || msg.sender === 'You'
      );
    }
    if (activeTab === 'agent') return msg.type === 'agent';
    return true;
  });

  // Get message counts for tabs
  $: globalCount = chatHistory.filter(msg => msg.type === 'global').length;
  $: directCount = chatHistory.filter(msg => 
    msg.type === 'direct' && (msg.target === 'You' || msg.sender === 'You')
  ).length;
  $: agentCount = chatHistory.filter(msg => msg.type === 'agent').length;
</script>

<!-- Game Chat Widget -->
<div class="game-chat-widget">
  <!-- Chat Interface -->
  <div class="chat-panel" 
       bind:this={chatContainer}
       on:focus={handleChatFocus}
       on:blur={handleChatBlur}
       on:mouseenter={handleChatActivity}
       on:click={handleChatActivity}>
    
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="chat-tabs">
        <button 
          class="chat-tab {activeTab === 'global' ? 'active' : ''}"
          on:click={() => changeTab('global')}
        >
          Global {#if globalCount > 0}<span class="tab-count">({globalCount})</span>{/if}
        </button>
        <button 
          class="chat-tab {activeTab === 'direct' ? 'active' : ''}"
          on:click={() => changeTab('direct')}
        >
          AI Chat {#if directCount > 0}<span class="tab-count">({directCount})</span>{/if}
        </button>
        <button 
          class="chat-tab {activeTab === 'agent' ? 'active' : ''}"
          on:click={() => changeTab('agent')}
        >
          Agents {#if agentCount > 0}<span class="tab-count">({agentCount})</span>{/if}
        </button>
      </div>
      <div class="chat-controls">
        <button class="control-btn" on:click={clearChat} title="Clear chat">🗑️</button>
      </div>
    </div>

    {#if activeTab === 'direct'}
      <!-- LLM Status Bar -->
      <div class="llm-status-bar">
        <div class="status-content">
          <span class="status-indicator" title="LLM Connection Status">{llmStatus}</span>
          <button class="status-btn" on:click={refreshLLMStatus} title="Refresh status">🔄</button>
          <button class="status-btn" on:click={toggleConnectionHelp} title="Connection help">❓</button>
        </div>
      </div>

      <!-- Connection Help Panel -->
      {#if showConnectionHelp}
        <div class="connection-help">
          <h4>🤖 How to Connect AI Agents</h4>
          <p><strong>Option 1: Ollama (Recommended)</strong></p>
          <ol>
            <li>Download Ollama from <code>ollama.ai</code></li>
            <li>Install and run: <code>ollama run llama3.2</code></li>
            <li>Agents will connect automatically!</li>
          </ol>
          <p><strong>Option 2: LM Studio</strong></p>
          <ol>
            <li>Download LM Studio from <code>lmstudio.ai</code></li>
            <li>Load a model and start the local server</li>
            <li>Use port 1234 (default)</li>
          </ol>
          <button class="help-close-btn" on:click={toggleConnectionHelp}>Close Help</button>
        </div>
      {/if}

      <!-- Agent Selector -->
      <div class="agent-selector">
        <label for="agent-select">Chat with:</label>
        <select id="agent-select" bind:value={selectedAgent} class="agent-select">
          {#each availableAgents as agent}
            <option value={agent}>{agent}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Messages Container -->
    <div class="messages-container">
      {#if filteredMessages.length === 0}
        <div class="no-messages">
          {#if activeTab === 'global'}
            No global messages yet. Start a conversation!
          {:else if activeTab === 'direct'}
            No direct messages yet. Select an AI agent and start chatting!
          {:else if activeTab === 'agent'}
            No agent conversations yet. Agents will start chatting autonomously!
          {/if}
        </div>
      {:else}
        {#each filteredMessages as message (message.id)}
          {@const isOwn = isOwnMessage(message.sender)}
          {@const charColor = getCharacterColor(message.sender)}
          <div class="game-message {isOwn ? 'own-message' : 'other-message'}" style="--char-color: {charColor}">
            <div class="message-header">
              <span class="sender" style="color: {charColor}">
                {#if message.type === 'agent' && message.target}
                  {message.sender} → <span style="color: {getCharacterColor(message.target)}">{message.target}</span>
                {:else}
                  {message.sender}
                  {#if message.type === 'direct' && message.target && !isOwn}
                    → <span style="color: {getCharacterColor(message.target)}">{message.target}</span>
                  {/if}
                {/if}
              </span>
              <span class="time">{formatTime(message.timestamp)}</span>
            </div>
            <div class="message-content {message.message.includes('💭 Thinking...') ? 'thinking' : ''}">
              {message.message}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if activeTab !== 'agent'}
      <!-- Chat Input -->
      <div class="chat-input-container">
        <input
          bind:this={inputElement}
          bind:value={chatInput}
          on:keydown={handleKeydown}
          on:input={handleChatActivity}
          placeholder={activeTab === 'direct' ? `Message ${selectedAgent}...` : "Type your message..."}
          class="chat-input"
          maxlength="500"
          disabled={!isInitialized}
          autocomplete="off"
        />
        <button class="send-btn" on:click={sendMessage} disabled={!chatInput.trim() || !isInitialized}>
          ➤
        </button>
      </div>
    {/if}
  </div>
</div>

<style lang="css">
  .game-chat-widget {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .chat-panel {
    height: 100%;
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
  }

  .chat-panel:hover {
    border-color: rgba(0, 255, 136, 0.6);
  }

  .chat-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.9) 100%);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 8px 8px 0 0;
  }

  .chat-tabs {
    display: flex;
    flex: 1;
    gap: 4px;
  }

  .chat-tab {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-mono);
  }

  .chat-tab:hover {
    background: rgba(0, 255, 136, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .chat-tab.active {
    background: rgba(0, 255, 136, 0.2);
    color: var(--primary-green);
    font-weight: 600;
  }

  .tab-count {
    opacity: 0.7;
    font-size: 0.75em;
  }

  .chat-controls {
    display: flex;
    gap: 4px;
  }

  .control-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .llm-status-bar {
    padding: 8px 16px;
    background: rgba(26, 26, 46, 0.8);
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
  }

  .status-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-indicator {
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  }

  .status-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.8rem;
  }

  .status-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .connection-help {
    background: rgba(26, 26, 46, 0.9);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin: 8px 16px;
    font-size: 0.8rem;
  }

  .connection-help h4 {
    margin: 0 0 8px 0;
    color: var(--primary-green);
    font-size: 0.9rem;
  }

  .connection-help p {
    margin: 6px 0;
    color: rgba(255, 255, 255, 0.8);
  }

  .connection-help ol {
    margin: 6px 0;
    padding-left: 16px;
  }

  .connection-help li {
    margin: 4px 0;
    color: rgba(255, 255, 255, 0.7);
  }

  .connection-help code {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85em;
    color: var(--primary-green);
  }

  .help-close-btn {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: var(--primary-green);
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    margin-top: 8px;
    transition: all 0.2s ease;
  }

  .help-close-btn:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  .agent-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(26, 26, 46, 0.6);
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
  }

  .agent-selector label {
    font-size: 0.8rem;
    color: var(--primary-green);
    white-space: nowrap;
    font-weight: 500;
  }

  .agent-select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: rgba(255, 255, 255, 0.9);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    min-height: 200px;
    scrollbar-width: thin;
    scrollbar-color: var(--primary-green) transparent;
  }

  .messages-container::-webkit-scrollbar {
    width: 4px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: var(--primary-green);
    border-radius: 2px;
  }

  .game-message {
    margin-bottom: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    border-left: 3px solid var(--char-color);
    animation: slideIn 0.3s ease;
  }

  .own-message {
    background: rgba(0, 255, 136, 0.1);
    border-left-color: var(--primary-green);
  }

  .other-message {
    background: rgba(255, 255, 255, 0.05);
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .sender {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .time {
    font-size: 0.75rem;
    opacity: 0.6;
    color: rgba(255, 255, 255, 0.7);
  }

  .message-content {
    line-height: 1.4;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.9);
    word-wrap: break-word;
  }

  .thinking {
    font-style: italic;
    opacity: 0.8;
    animation: pulse 1.5s infinite;
  }

  .no-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    font-style: italic;
    font-size: 0.9rem;
  }

  .chat-input-container {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(26, 26, 46, 0.8);
    border-top: 1px solid rgba(0, 255, 136, 0.1);
    border-radius: 0 0 8px 8px;
  }

  .chat-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: rgba(255, 255, 255, 0.9);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: var(--font-mono);
    transition: all 0.2s ease;
    outline: none;
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--primary-green);
    box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
  }

  .chat-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .send-btn {
    background: linear-gradient(135deg, var(--primary-green) 0%, #00cc6a 100%);
    border: none;
    color: #000;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .send-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 255, 136, 0.4);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Animations */
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .floating-chat-panel {
      width: 320px;
      max-height: 400px;
    }
    
    .messages-container {
      max-height: 250px;
    }
  }
</style>
