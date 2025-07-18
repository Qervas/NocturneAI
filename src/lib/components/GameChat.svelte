<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { characterManager, characters, npcs, users, activeCharacter } from "../services/CharacterManager";
  import type { Character, NPCAgent, UserPlayer } from "../types/Character";

  export let isVisible = false;

  let chatInput = "";
  let chatHistory: Array<{
    id: string;
    type: 'global' | 'team' | 'direct';
    sender: string;
    message: string;
    timestamp: Date;
    target?: string;
  }> = [];
  let inputElement: HTMLInputElement;
  let chatContainer: HTMLDivElement;
  let mentionSuggestions: Character[] = [];
  let showMentions = false;
  let mentionIndex = -1;
  let activeTab: 'global' | 'team' | 'direct' = 'global';
  let directTarget = "";
  let unsubscribe: (() => void)[] = [];

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

  onMount(() => {
    loadChatHistory();
    
    // Add some initial system messages if chat history is empty
    if (chatHistory.length === 0) {
      chatHistory = [
        {
          id: generateMessageId(),
          type: 'global',
          sender: 'System',
          message: 'Welcome to Multi-Agent System! Use @ to mention characters.',
          timestamp: new Date()
        }
      ];
      saveChatHistory();
    }

    if (isVisible) {
      setTimeout(() => inputElement?.focus(), 100);
    }

    // Subscribe to character changes to update mentions
    const unsubCharacters = characters.subscribe(() => {
      // Update mention suggestions if they're showing
      if (showMentions) {
        updateMentionSuggestions();
      }
    });

    unsubscribe.push(unsubCharacters);
  });

  onDestroy(() => {
    unsubscribe.forEach(unsub => unsub());
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    } else if (event.key === 'Escape') {
      if (showMentions) {
        hideMentionSuggestions();
      } else {
        isVisible = false;
      }
    } else if (event.key === 'ArrowDown' && showMentions) {
      event.preventDefault();
      mentionIndex = Math.min(mentionIndex + 1, mentionSuggestions.length - 1);
    } else if (event.key === 'ArrowUp' && showMentions) {
      event.preventDefault();
      mentionIndex = Math.max(mentionIndex - 1, 0);
    } else if (event.key === 'Enter' && showMentions) {
      event.preventDefault();
      selectMention();
    } else if (event.key === 'Tab' && showMentions) {
      event.preventDefault();
      selectMention();
    }
  }

  function handleInput() {
    const cursorPos = inputElement.selectionStart || 0;
    const textBeforeCursor = chatInput.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && atIndex === textBeforeCursor.length - 1) {
      // User just typed @
      showMentionSuggestions();
    } else if (atIndex !== -1) {
      // User is typing after @
      const searchTerm = textBeforeCursor.substring(atIndex + 1);
      if (searchTerm.length === 0 || /^[A-Za-z_\s]*$/.test(searchTerm)) {
        showMentionSuggestions(searchTerm);
      } else {
        hideMentionSuggestions();
      }
    } else {
      hideMentionSuggestions();
    }
  }

  function updateMentionSuggestions(searchTerm: string = "") {
    const allCharacters = [...$npcs, ...$users].filter(char => char.isActive);
    mentionSuggestions = searchTerm 
      ? allCharacters.filter(char => 
          char.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allCharacters;
  }

  function showMentionSuggestions(searchTerm: string = "") {
    updateMentionSuggestions(searchTerm);
    showMentions = mentionSuggestions.length > 0;
    mentionIndex = 0;
  }

  function hideMentionSuggestions() {
    showMentions = false;
    mentionSuggestions = [];
    mentionIndex = -1;
  }

  function selectMention() {
    if (mentionSuggestions[mentionIndex]) {
      const selected = mentionSuggestions[mentionIndex];
      const cursorPos = inputElement.selectionStart || 0;
      const textBeforeCursor = chatInput.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1) {
        const beforeAt = chatInput.substring(0, atIndex);
        const afterCursor = chatInput.substring(cursorPos);
        chatInput = `${beforeAt}@${selected.name} ${afterCursor}`;
        
        // Set cursor position after the mention
        setTimeout(() => {
          const newPos = atIndex + selected.name.length + 2;
          inputElement.setSelectionRange(newPos, newPos);
        }, 0);
      }
      
      hideMentionSuggestions();
      inputElement?.focus();
    }
  }

  async function sendMessage() {
    if (!chatInput.trim()) return;

    let messageType: 'global' | 'team' | 'direct' = activeTab;
    let target = '';
    let finalMessage = chatInput.trim();

    // Check for @ mentions
    const mentionMatch = finalMessage.match(/@([A-Za-z_]+(?:\s[A-Za-z]+)*)/);
    if (mentionMatch) {
      const mentionedName = mentionMatch[1];
      const allCharacters = [...$npcs, ...$users];
      const mentionedChar = allCharacters.find(char => char.name === mentionedName);
      
      if (mentionedChar) {
        messageType = 'direct';
        target = mentionedChar.name;
        directTarget = mentionedChar.name;
        activeTab = 'direct'; // Switch to direct tab
      }
    } else if (activeTab === 'direct' && directTarget) {
      target = directTarget;
    }

    const message = {
      id: generateMessageId(),
      type: messageType,
      sender: $activeCharacter?.name || 'You',
      message: finalMessage,
      timestamp: new Date(),
      target: target || undefined
    };

    chatHistory = [...chatHistory, message];
    chatInput = "";
    saveChatHistory();
    
    // Auto-scroll to bottom
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Simulate NPC responses for direct messages
    if (messageType === 'direct' && target) {
      setTimeout(() => simulateNPCResponse(target, finalMessage), 1000 + Math.random() * 2000);
    }
  }

  function simulateNPCResponse(npcName: string, originalMessage: string) {
    const npc = $npcs.find(n => n.name === npcName);
    if (!npc) return;

    const responses = [
      "Interesting point! Let me think about that.",
      "I understand your perspective. Here's what I think...",
      "That's a great question! My analysis suggests...",
      "Thanks for reaching out. Based on my specialization in " + npc.specialization + "...",
      "I appreciate the message. In my experience...",
      "Good to hear from you! Regarding your message..."
    ];

    const response = {
      id: generateMessageId(),
      type: 'direct' as const,
      sender: npc.name,
      message: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date(),
      target: $activeCharacter?.name || 'You'
    };

    chatHistory = [...chatHistory, response];
    saveChatHistory();
    
    // Auto-scroll to bottom
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
    if (sender === 'You' || sender === $activeCharacter?.name) return '#00ffff';
    
    const allCharacters = [...$npcs, ...$users];
    const character = allCharacters.find(char => char.name === sender);
    return character?.color || '#00ff88';
  }

  function isOwnMessage(sender: string): boolean {
    return sender === 'You' || sender === $activeCharacter?.name;
  }

  function changeTab(tab: 'global' | 'team' | 'direct') {
    activeTab = tab;
    if (tab !== 'direct') {
      directTarget = "";
    }
  }

  function clearChat() {
    chatHistory = [];
    saveChatHistory();
  }

  // Filter messages based on active tab
  $: filteredMessages = chatHistory.filter(msg => {
    if (activeTab === 'global') return msg.type === 'global';
    if (activeTab === 'team') return msg.type === 'team';
    if (activeTab === 'direct') {
      return msg.type === 'direct' && (
        msg.target === ($activeCharacter?.name || 'You') || 
        msg.sender === ($activeCharacter?.name || 'You')
      );
    }
    return true;
  });

  // Get unread message counts for tabs
  $: globalCount = chatHistory.filter(msg => msg.type === 'global').length;
  $: teamCount = chatHistory.filter(msg => msg.type === 'team').length;
  $: directCount = chatHistory.filter(msg => 
    msg.type === 'direct' && (
      msg.target === ($activeCharacter?.name || 'You') || 
      msg.sender === ($activeCharacter?.name || 'You')
    )
  ).length;
</script>

<!-- Chat Toggle Button -->
<button 
  class="chat-toggle" 
  on:click={toggleChat}
  class:active={isVisible}
>
  💬
</button>

<!-- Chat Interface -->
{#if isVisible}
  <div class="chat-overlay">
    <div class="chat-header">
      <div class="chat-tabs">
        <button 
          class="tab-btn {activeTab === 'global' ? 'active' : ''}"
          on:click={() => changeTab('global')}
        >
          Global {#if globalCount > 0}<span class="tab-count">({globalCount})</span>{/if}
        </button>
        <button 
          class="tab-btn {activeTab === 'team' ? 'active' : ''}"
          on:click={() => changeTab('team')}
        >
          Team {#if teamCount > 0}<span class="tab-count">({teamCount})</span>{/if}
        </button>
        <button 
          class="tab-btn {activeTab === 'direct' ? 'active' : ''}"
          on:click={() => changeTab('direct')}
        >
          Direct {#if directCount > 0}<span class="tab-count">({directCount})</span>{/if}
        </button>
      </div>
      <div class="chat-controls">
        <button class="control-btn" on:click={clearChat} title="Clear chat">
          🗑️
        </button>
        <button class="chat-close-btn" on:click={() => isVisible = false}>
          ✕
        </button>
      </div>
    </div>

    {#if activeTab === 'direct' && directTarget}
      <div class="direct-target-info">
        <span>Chatting with: <strong style="color: {getCharacterColor(directTarget)}">{directTarget}</strong></span>
        <button class="clear-target-btn" on:click={() => directTarget = ""}>×</button>
      </div>
    {/if}

    <div class="chat-messages" bind:this={chatContainer}>
      {#if filteredMessages.length === 0}
        <div class="no-messages">
          {#if activeTab === 'global'}
            No global messages yet. Start a conversation!
          {:else if activeTab === 'team'}
            No team messages yet. Coordinate with your team!
          {:else}
            No direct messages yet. Use @mention to start a private conversation!
          {/if}
        </div>
      {:else}
        {#each filteredMessages as message (message.id)}
          {@const isOwn = isOwnMessage(message.sender)}
          {@const charColor = getCharacterColor(message.sender)}
          <div class="message {isOwn ? 'own' : 'other'}" style="--char-color: {charColor}">
            <div class="message-header">
              <span class="sender" style="color: {charColor}">
                {message.sender}
                {#if message.type === 'direct' && message.target}
                  → <span style="color: {getCharacterColor(message.target)}">{message.target}</span>
                {/if}
              </span>
              <span class="time">{formatTime(message.timestamp)}</span>
            </div>
            <div class="message-content">
              {message.message}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="chat-input-container">
      <input
        bind:this={inputElement}
        bind:value={chatInput}
        on:keydown={handleKeydown}
        on:input={handleInput}
        placeholder={activeTab === 'direct' ? `Message ${directTarget || 'someone'}...` : "Type your message..."}
        class="chat-input"
        maxlength="200"
      />
      <button class="send-btn" on:click={sendMessage} disabled={!chatInput.trim()}>
        ➤
      </button>
    </div>

    <!-- Mention Suggestions -->
    {#if showMentions && mentionSuggestions.length > 0}
      <div class="mention-suggestions">
        {#each mentionSuggestions as char, index}
          <button
            type="button"
            class="mention-item {index === mentionIndex ? 'selected' : ''}"
            on:click={() => {
              mentionIndex = index;
              selectMention();
            }}
          >
            <span class="mention-icon" style="color: {char.color}">
              {char.type === 'npc' ? '🤖' : '👤'}
            </span>
            <span class="mention-name">{char.name}</span>
            <span class="mention-role">{char.role}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .chat-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
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

  .chat-toggle:hover {
    background: rgba(0, 255, 136, 0.3);
    transform: scale(1.1);
  }

  .chat-toggle.active {
    background: rgba(0, 255, 136, 0.4);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  }

  .chat-overlay {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 350px;
    height: 500px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #00ff88;
    border-radius: 12px;
    backdrop-filter: blur(15px);
    z-index: 999;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.3);
    background: rgba(0, 0, 0, 0.5);
  }

  .chat-tabs {
    display: flex;
    gap: 6px;
    flex: 1;
  }

  .chat-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .tab-btn {
    background: none;
    border: 1px solid #00ff88;
    color: #00ff88;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .tab-count {
    font-size: 9px;
    opacity: 0.8;
  }

  .tab-btn.active {
    background: rgba(0, 255, 136, 0.2);
  }

  .tab-btn:hover {
    background: rgba(0, 255, 136, 0.1);
  }

  .control-btn {
    background: none;
    border: 1px solid #ff8800;
    color: #ff8800;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s ease;
  }

  .control-btn:hover {
    background: rgba(255, 136, 0, 0.1);
  }

  .chat-close-btn {
    background: none;
    border: 1px solid #00ff88;
    color: #00ff88;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .direct-target-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: rgba(0, 255, 136, 0.1);
    border-bottom: 1px solid rgba(0, 255, 136, 0.3);
    font-size: 12px;
    color: #ffffff;
  }

  .clear-target-btn {
    background: none;
    border: none;
    color: #ff8800;
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
  }

  .clear-target-btn:hover {
    color: #ffaa00;
  }

  .no-messages {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    text-align: center;
    padding: 20px;
    font-style: italic;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chat-messages::-webkit-scrollbar {
    width: 6px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 136, 0.5);
    border-radius: 3px;
  }

  .message {
    padding: 8px 12px;
    border-radius: 8px;
    max-width: 80%;
    --char-color: #00ff88;
  }

  .message.own {
    align-self: flex-end;
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.4);
  }

  .message.other {
    align-self: flex-start;
    background: rgba(0, 255, 255, 0.1);
    border: 1px solid rgba(0, 255, 255, 0.3);
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 11px;
  }

  .sender {
    font-weight: bold;
  }

  .time {
    color: rgba(255, 255, 255, 0.6);
  }

  .message-content {
    color: #ffffff;
    font-size: 13px;
    line-height: 1.4;
  }

  .chat-input-container {
    display: flex;
    padding: 12px;
    gap: 8px;
    border-top: 1px solid rgba(0, 255, 136, 0.3);
    background: rgba(0, 0, 0, 0.5);
  }

  .chat-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00ff88;
    border-radius: 6px;
    padding: 8px 12px;
    color: #ffffff;
    font-size: 13px;
    outline: none;
  }

  .chat-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .chat-input:focus {
    border-color: #00ffff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }

  .send-btn {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid #00ff88;
    color: #00ff88;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .send-btn:hover:not(:disabled) {
    background: rgba(0, 255, 136, 0.3);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mention-suggestions {
    position: absolute;
    bottom: 60px;
    left: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.95);
    border: 1px solid #00ff88;
    border-radius: 6px;
    max-height: 150px;
    overflow-y: auto;
    z-index: 1001;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
  }

  .mention-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s ease;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
  }

  .mention-item:hover,
  .mention-item.selected {
    background: rgba(0, 255, 136, 0.2);
  }

  .mention-icon {
    margin-right: 8px;
    font-size: 16px;
  }

  .mention-name {
    color: #ffffff;
    font-weight: bold;
    margin-right: 8px;
  }

  .mention-role {
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
  }
</style> 