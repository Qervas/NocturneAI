<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { characterManager, characters, npcs, users, activeCharacter } from "../services/CharacterManager";
  import { communicationManager } from "../services/CommunicationManager";
  import { llmService } from "../services/LLMService";
  import FileUploader from "./FileUploader.svelte";
  import { renderMarkdownSafe } from "../utils/markdownRenderer";
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
  
  // File upload state
  let showFileUploader = false;
  let uploadedFiles: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
  }> = [];

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

      // Build context with uploaded files
      let contextMessage = originalMessage;
      if (uploadedFiles.length > 0 && !isGlobalResponse) {
        const fileList = uploadedFiles.map(file => 
          `📎 ${file.name} (${formatFileSize(file.size)})`
        ).join('\n');
        contextMessage = `Message: ${originalMessage}\n\nAttached Files:\n${fileList}`;
      }

      // Get response from LLM service
      const agentId = agentName.toLowerCase();
      const llmResponse = await llmService.sendMessageToAgent(agentId, contextMessage, 'You');

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
      const messagesContainer = chatContainer?.querySelector('.messages-container') as HTMLElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 50); // Reduced timeout for faster response
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
    // Clear uploaded files when switching tabs
    if (tab !== activeTab) {
      uploadedFiles = [];
    }
    handleChatActivity(); // Reset fade on tab change
  }

  function clearChat() {
    chatHistory = [];
    uploadedFiles = [];
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
  
  // File upload handlers
  function handleFileUploaded(event: CustomEvent) {
    const { file, fileInfo } = event.detail;
    uploadedFiles = [...uploadedFiles, {
      id: fileInfo.id,
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type
    }];
    
    // Add file message to chat
    const fileMessage = {
      id: generateMessageId(),
      type: 'direct' as const,
      sender: 'You',
      message: `📎 Uploaded: ${fileInfo.name} (${formatFileSize(fileInfo.size)})`,
      timestamp: new Date(),
      target: selectedAgent || undefined
    };
    chatHistory = [...chatHistory, fileMessage];
    saveChatHistory();
    scrollToBottom();
    handleChatActivity();
  }
  
  function handleFileError(event: CustomEvent) {
    const { file, fileInfo, error } = event.detail;
    const errorMessage = {
      id: generateMessageId(),
      type: 'direct' as const,
      sender: 'System',
      message: `❌ Upload failed: ${fileInfo.name} - ${error}`,
      timestamp: new Date(),
      target: selectedAgent || undefined
    };
    chatHistory = [...chatHistory, errorMessage];
    saveChatHistory();
    scrollToBottom();
    handleChatActivity();
  }
  
  function handleFileRemoved(event: CustomEvent) {
    const { fileId } = event.detail;
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    handleChatActivity();
  }
  
  function toggleFileUploader() {
    showFileUploader = !showFileUploader;
    handleChatActivity();
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  
  // Auto-scroll when messages change
  $: if (filteredMessages.length > 0) {
    setTimeout(() => scrollToBottom(), 10);
  }
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
              {@html renderMarkdownSafe(message.message)}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if activeTab !== 'agent'}
      <!-- Chat Input -->
      <div class="chat-input-container">
        <!-- Uploaded Files Indicator -->
        {#if uploadedFiles.length > 0}
          <div class="uploaded-files-indicator">
            <span class="files-label">📎 Attached Files ({uploadedFiles.length}):</span>
            <div class="files-list">
              {#each uploadedFiles as file}
                <span class="file-tag">
                  {file.name}
                  <button class="remove-file-btn" on:click={() => {
                    uploadedFiles = uploadedFiles.filter(f => f.id !== file.id);
                  }}>×</button>
                </span>
              {/each}
            </div>
          </div>
        {/if}
        
        <div class="input-row">
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
          <div class="input-actions">
            <button 
              class="action-btn file-btn" 
              on:click={toggleFileUploader}
              title="Attach files"
              disabled={!isInitialized}
            >
              📎
            </button>
            <button 
              class="send-btn" 
              on:click={sendMessage} 
              disabled={!chatInput.trim() || !isInitialized}
            >
              ➤
            </button>
          </div>
        </div>
        
        <!-- File Uploader -->
        {#if showFileUploader}
          <div class="file-uploader-container">
            <FileUploader 
              multiple={true}
              accept="*"
              maxSize={50 * 1024 * 1024}
              on:fileUploaded={handleFileUploaded}
              on:fileError={handleFileError}
              on:fileRemoved={handleFileRemoved}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style lang="css">
  .game-chat-widget {
    height: 100%;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    min-height: 0; /* Allow flex child to shrink */
  }

  .chat-panel {
    height: 100%;
    max-height: calc(100vh); /* Responsive to viewport height */
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
    max-height: calc(100vh - 250px); /* Account for header and other elements */
    scrollbar-width: thin;
    scrollbar-color: var(--primary-green) transparent;
    margin: 0;
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
  
  /* Markdown Styles */
  .message-content strong {
    font-weight: 600;
    color: var(--primary-green);
  }
  
  .message-content em {
    font-style: italic;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .message-content code {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 3px;
    padding: 2px 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: #00ff88;
  }
  
  .message-content .inline-code {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 3px;
    padding: 2px 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: #00ff88;
  }
  
  .message-content .code-block {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 6px;
    padding: 12px;
    margin: 8px 0;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    line-height: 1.3;
  }
  
  .message-content .code-block code {
    background: none;
    border: none;
    padding: 0;
    color: #00ff88;
    font-size: inherit;
  }
  
  /* Syntax Highlighting */
  .message-content .code-block .keyword {
    color: #ff6b6b;
    font-weight: bold;
  }
  
  .message-content .code-block .string {
    color: #51cf66;
  }
  
  .message-content .code-block .number {
    color: #ffd43b;
  }
  
  .message-content .code-block .comment {
    color: #868e96;
    font-style: italic;
  }
  
  .message-content .code-block .literal {
    color: #ff922b;
  }
  
  .message-content .code-block .tag {
    color: #339af0;
  }
  
  .message-content .code-block .attr {
    color: #ffd43b;
  }
  
  .message-content .code-block .property {
    color: #51cf66;
  }
  
  .message-content .code-block .punctuation {
    color: #adb5bd;
  }
  
  .message-content a {
    color: var(--primary-green);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }
  
  .message-content a:hover {
    border-bottom-color: var(--primary-green);
  }
  
  .message-content br {
    margin-bottom: 4px;
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
    flex: 1;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    font-style: italic;
    font-size: 0.9rem;
    padding: 20px;
  }

  .chat-input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(26, 26, 46, 0.8);
    border-top: 1px solid rgba(0, 255, 136, 0.1);
    border-radius: 0 0 8px 8px;
  }
  
  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .input-actions {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  
  .action-btn {
    background: transparent;
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: rgba(255, 255, 255, 0.8);
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }
  
  .action-btn:hover:not(:disabled) {
    background: rgba(0, 255, 136, 0.1);
    border-color: var(--primary-green);
    color: var(--primary-green);
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .file-btn {
    font-size: 16px;
  }
  
  .file-uploader-container {
    margin-top: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    border: 1px solid rgba(0, 255, 136, 0.2);
  }
  
  .uploaded-files-indicator {
    padding: 8px 12px;
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 6px;
    margin-bottom: 8px;
  }
  
  .files-label {
    font-size: 12px;
    color: var(--primary-green);
    font-weight: 500;
    margin-bottom: 6px;
    display: block;
  }
  
  .files-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .file-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .remove-file-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  
  .remove-file-btn:hover {
    background: rgba(255, 0, 0, 0.2);
    color: #ff4444;
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
