<script lang="ts">
  import { contextManager, type FileContext } from '../../services/context/ContextManager';
import { agentSelectionStore } from '../../services/agents/AgentSelectionManager';
  import { onMount } from 'svelte';

  export let agentId: string;

  let agentContext: any;
  let globalContext: any;
  let contextStore: any;
  let isCollapsed = true;
  let searchQuery = '';
  let selectedTab = 'files';
  let showFavorites = false;
  let sortBy = 'relevance';
  let contextStats: any = null;

  onMount(() => {
    contextStore = contextManager.getGlobalContext();
    contextManager.initializeAgentContext(agentId);
    updateStats();
  });

  $: if (contextStore) {
    contextStore.subscribe((value: any) => globalContext = value)();
  }
  
  $: {
    agentContext = contextManager.getAgentContext(agentId);
    if (agentId) {
      contextManager.initializeAgentContext(agentId);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }

  function searchFiles() {
    if (!searchQuery.trim()) return agentContext?.availableFiles || [];
    return contextManager.searchContext(searchQuery, agentId);
  }

  function getFilteredFiles() {
    let files = agentContext?.availableFiles || [];
    
    if (showFavorites) {
      files = contextManager.getFavoriteFiles(agentId);
    }
    
    if (searchQuery.trim()) {
      files = searchFiles();
    }
    
    // Sort files
    files = [...files].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.analysis?.relevanceScore || 0) - (a.analysis?.relevanceScore || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'modified':
          return new Date(b.metadata?.lastModified || 0).getTime() - new Date(a.metadata?.lastModified || 0).getTime();
        default:
          return 0;
      }
    });
    
    return files;
  }

  function toggleFavorite(fileId: string) {
    const favorites = contextManager.getFavoriteFiles(agentId);
    const isFavorite = favorites.some(f => f.id === fileId);
    
    if (isFavorite) {
      contextManager.removeFileFromFavorites(agentId, fileId);
    } else {
      contextManager.markFileAsFavorite(agentId, fileId);
    }
  }

  function isFavorite(fileId: string): boolean {
    const favorites = contextManager.getFavoriteFiles(agentId);
    return favorites.some(f => f.id === fileId);
  }

  function updateStats() {
    contextStats = contextManager.getContextStats();
  }

  function getRelevanceColor(score: number): string {
    if (score >= 0.8) return '#00ff88';
    if (score >= 0.6) return '#ffff00';
    if (score >= 0.4) return '#ff8800';
    return '#ff4444';
  }

  function getFileIcon(file: FileContext): string {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const language = file.metadata?.language;
    
    if (file.type.startsWith('image/')) return '🖼️';
    if (ext === 'js' || ext === 'ts') return '📜';
    if (ext === 'py') return '🐍';
    if (ext === 'json') return '📋';
    if (ext === 'md') return '📝';
    if (ext === 'html') return '🌐';
    if (ext === 'css') return '🎨';
    if (ext === 'vue' || ext === 'svelte') return '⚡';
    if (language === 'javascript' || language === 'typescript') return '📜';
    if (language === 'python') return '🐍';
    if (language === 'java') return '☕';
    if (language === 'rust') return '🦀';
    
    return '📄';
  }

  function getComplexityColor(complexity: string): string {
    switch (complexity) {
      case 'simple': return '#00ff88';
      case 'moderate': return '#ffff00';
      case 'complex': return '#ff4444';
      default: return '#888888';
    }
  }

  function getLanguageColor(language: string): string {
    const colors: Record<string, string> = {
      'javascript': '#f7df1e',
      'typescript': '#3178c6',
      'python': '#3776ab',
      'java': '#007396',
      'rust': '#ce422b',
      'go': '#00add8',
      'c': '#555555',
      'cpp': '#f34b7d'
    };
    return colors[language] || '#888888';
  }
</script>

<div class="context-display" class:collapsed={isCollapsed}>
  <div class="context-header" on:click={toggleCollapse}>
    <div class="header-left">
      <h3>🧠 Context Manager</h3>
      <span class="agent-id">{agentId}</span>
    </div>
    <div class="header-right">
      {#if contextStats}
        <span class="stats">
          📁 {contextStats.totalFiles} files | 
          🤖 {contextStats.totalAgents} agents |
          💾 {Math.round(contextStats.memoryUsage / 1024)}KB
        </span>
      {/if}
      <button class="collapse-btn" title="{isCollapsed ? 'Expand' : 'Collapse'}">
        {isCollapsed ? '▼' : '▲'}
      </button>
    </div>
  </div>

  {#if !isCollapsed && agentContext}
    <div class="context-content">
      <!-- Search and Controls -->
      <div class="controls-section">
        <div class="search-box">
          <input 
            type="text" 
            bind:value={searchQuery} 
            placeholder="Search files, keywords, or content..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <div class="control-buttons">
          <button 
            class="control-btn" 
            class:active={showFavorites}
            on:click={() => showFavorites = !showFavorites}
            title="Show favorites only"
          >
            ⭐
          </button>
          <select bind:value={sortBy} class="sort-select">
            <option value="relevance">Relevance</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="modified">Modified</option>
          </select>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab-btn" 
          class:active={selectedTab === 'files'}
          on:click={() => selectedTab = 'files'}
        >
          📁 Files ({getFilteredFiles().length})
        </button>
        <button 
          class="tab-btn" 
          class:active={selectedTab === 'conversations'}
          on:click={() => selectedTab = 'conversations'}
        >
          💬 Conversations ({agentContext.conversationHistory.length})
        </button>
        <button 
          class="tab-btn" 
          class:active={selectedTab === 'stats'}
          on:click={() => selectedTab = 'stats'}
        >
          📊 Stats
        </button>
      </div>

      <!-- Files Tab -->
      {#if selectedTab === 'files'}
        <div class="files-section">
          {#if getFilteredFiles().length > 0}
            <div class="file-list">
              {#each getFilteredFiles() as file, index}
                <div class="file-item" class:has-relevance={file.analysis?.relevanceScore}>
                  <div class="file-header">
                    <div class="file-info">
                      <span class="file-icon">{getFileIcon(file)}</span>
                      <span class="file-name">{file.name}</span>
                      <span class="file-size">{formatFileSize(file.size)}</span>
                    </div>
                    <div class="file-actions">
                      {#if file.analysis?.relevanceScore !== undefined}
                        <span 
                          class="relevance-score" 
                          style="color: {getRelevanceColor(file.analysis.relevanceScore)}"
                        >
                          {(file.analysis.relevanceScore * 100).toFixed(0)}%
                        </span>
                      {/if}
                      <button 
                        class="favorite-btn" 
                        class:favorited={isFavorite(file.id)}
                        on:click={() => toggleFavorite(file.id)}
                        title="{isFavorite(file.id) ? 'Remove from favorites' : 'Add to favorites'}"
                      >
                        {isFavorite(file.id) ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                  
                  {#if file.analysis?.summary}
                    <div class="file-summary">{file.analysis.summary}</div>
                  {/if}
                  
                  <div class="file-metadata">
                    {#if file.metadata?.language}
                      <span class="metadata-tag" style="background: {getLanguageColor(file.metadata.language)}">
                        {file.metadata.language}
                      </span>
                    {/if}
                    {#if file.metadata?.framework}
                      <span class="metadata-tag framework">
                        {file.metadata.framework}
                      </span>
                    {/if}
                    {#if file.analysis?.complexity}
                      <span 
                        class="metadata-tag complexity" 
                        style="color: {getComplexityColor(file.analysis.complexity)}"
                      >
                        {file.analysis.complexity}
                      </span>
                    {/if}
                    {#if file.analysis?.accessCount}
                      <span class="metadata-tag access-count">
                        👁️ {file.analysis.accessCount}
                      </span>
                    {/if}
                  </div>

                  {#if file.context?.functions && file.context.functions.length > 0}
                    <div class="file-functions">
                      <span class="functions-label">Functions:</span>
                      {#each file.context.functions.slice(0, 3) as func}
                        <span class="function-tag">{func}</span>
                      {/each}
                      {#if file.context.functions.length > 3}
                        <span class="more-indicator">+{file.context.functions.length - 3}</span>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-files">
              {#if searchQuery.trim()}
                No files match "{searchQuery}"
              {:else if showFavorites}
                No favorite files
              {:else}
                No files available
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Conversations Tab -->
      {#if selectedTab === 'conversations'}
        <div class="conversations-section">
          {#if agentContext.conversationHistory.length > 0}
            <div class="conversation-list">
              {#each agentContext.conversationHistory.slice().reverse() as conv, index}
                <div class="conversation-item" class:has-relevance={conv.relevanceScore}>
                  <div class="conversation-header">
                    <span class="conversation-time">
                      {conv.timestamp.toLocaleTimeString()}
                    </span>
                    {#if conv.intent}
                      <span class="intent-tag">{conv.intent}</span>
                    {/if}
                    {#if conv.relevanceScore}
                      <span 
                        class="relevance-score" 
                        style="color: {getRelevanceColor(conv.relevanceScore)}"
                      >
                        {(conv.relevanceScore * 100).toFixed(0)}%
                      </span>
                    {/if}
                  </div>
                  
                  <div class="conversation-content">
                    <div class="user-message">
                      <strong>User:</strong> {conv.userMessage}
                    </div>
                    <div class="agent-response">
                      <strong>Agent:</strong> {conv.agentResponse}
                    </div>
                  </div>

                  {#if conv.tags && conv.tags.length > 0}
                    <div class="conversation-tags">
                      {#each conv.tags as tag}
                        <span class="tag">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-conversations">No conversation history</div>
          {/if}
        </div>
      {/if}

      <!-- Stats Tab -->
      {#if selectedTab === 'stats'}
        <div class="stats-section">
          {#if contextStats}
            <div class="stats-grid">
              <div class="stat-card">
                <h4>📁 Files</h4>
                <div class="stat-value">{contextStats.totalFiles}</div>
              </div>
              <div class="stat-card">
                <h4>🤖 Agents</h4>
                <div class="stat-value">{contextStats.totalAgents}</div>
              </div>
              <div class="stat-card">
                <h4>💾 Memory</h4>
                <div class="stat-value">{Math.round(contextStats.memoryUsage / 1024)}KB</div>
              </div>
              <div class="stat-card">
                <h4>⚡ Cache Hit Rate</h4>
                <div class="stat-value">
                  {Math.round(contextStats.cacheStats.fileCache.hitRate * 100)}%
                </div>
              </div>
            </div>
            
            <div class="cache-stats">
              <h4>Cache Statistics</h4>
              <div class="cache-item">
                <span>File Cache:</span>
                <span>{contextStats.cacheStats.fileCache.size}/{contextStats.cacheStats.fileCache.maxSize}</span>
              </div>
              <div class="cache-item">
                <span>Conversation Cache:</span>
                <span>{contextStats.cacheStats.conversationCache.size}/{contextStats.cacheStats.conversationCache.maxSize}</span>
              </div>
              <div class="cache-item">
                <span>Analysis Cache:</span>
                <span>{contextStats.cacheStats.analysisCache.size}/{contextStats.cacheStats.analysisCache.maxSize}</span>
              </div>
            </div>
          {:else}
            <div class="no-stats">No statistics available</div>
          {/if}
        </div>
      {/if}
    </div>
  {:else if !isCollapsed}
    <div class="no-context">
      <p>No context available</p>
    </div>
  {/if}
</div>

<style>
  .context-display {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 8px;
    margin: 4px 0;
    border: 1px solid rgba(0, 255, 136, 0.3);
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .context-display.collapsed {
    padding: 8px;
  }

  .context-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .context-header:hover {
    background: rgba(0, 255, 136, 0.1);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-left h3 {
    margin: 0;
    color: #00ff88;
    font-size: 14px;
    font-weight: 600;
  }

  .agent-id {
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    background: rgba(0, 255, 136, 0.2);
    padding: 2px 6px;
    border-radius: 10px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stats {
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
  }

  .collapse-btn {
    background: none;
    border: none;
    color: #00ff88;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 3px;
    transition: background-color 0.2s ease;
  }

  .collapse-btn:hover {
    background: rgba(0, 255, 136, 0.2);
  }

  .context-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .controls-section {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .search-box {
    position: relative;
    flex: 1;
  }

  .search-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 6px 30px 6px 8px;
    color: white;
    font-size: 11px;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .search-icon {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.5);
    font-size: 10px;
  }

  .control-buttons {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .control-btn {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: rgba(255, 255, 255, 0.7);
    padding: 4px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s ease;
  }

  .control-btn:hover {
    background: rgba(0, 255, 136, 0.2);
    color: white;
  }

  .control-btn.active {
    background: rgba(0, 255, 136, 0.3);
    color: white;
  }

  .sort-select {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: white;
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 10px;
  }

  .tabs {
    display: flex;
    gap: 2px;
    margin-bottom: 8px;
  }

  .tab-btn {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 136, 0.2);
    color: rgba(255, 255, 255, 0.7);
    padding: 6px 10px;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    background: rgba(0, 255, 136, 0.1);
    color: white;
  }

  .tab-btn.active {
    background: rgba(0, 255, 136, 0.3);
    color: white;
    border-color: rgba(0, 255, 136, 0.5);
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .file-item {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    padding: 8px;
    border-left: 3px solid #00ff88;
    transition: all 0.2s ease;
  }

  .file-item:hover {
    background: rgba(0, 0, 0, 0.6);
    transform: translateX(2px);
  }

  .file-item.has-relevance {
    border-left-color: #ffff00;
  }

  .file-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }

  .file-icon {
    font-size: 12px;
  }

  .file-name {
    flex: 1;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    font-size: 11px;
  }

  .file-size {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.6);
  }

  .file-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .relevance-score {
    font-size: 9px;
    font-weight: 600;
  }

  .favorite-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 10px;
    padding: 2px;
    border-radius: 2px;
    transition: all 0.2s ease;
  }

  .favorite-btn:hover {
    background: rgba(255, 255, 0, 0.2);
  }

  .favorite-btn.favorited {
    color: #ffff00;
  }

  .file-summary {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.3;
    margin-bottom: 4px;
  }

  .file-metadata {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .metadata-tag {
    font-size: 8px;
    padding: 2px 4px;
    border-radius: 3px;
    background: rgba(0, 255, 136, 0.2);
    color: white;
  }

  .metadata-tag.framework {
    background: rgba(255, 136, 0, 0.2);
  }

  .metadata-tag.complexity {
    background: rgba(255, 0, 0, 0.2);
  }

  .metadata-tag.access-count {
    background: rgba(0, 136, 255, 0.2);
  }

  .file-functions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .functions-label {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.6);
  }

  .function-tag {
    font-size: 8px;
    padding: 1px 3px;
    background: rgba(0, 255, 136, 0.2);
    border-radius: 2px;
    color: white;
  }

  .more-indicator {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.5);
  }

  .conversation-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .conversation-item {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    padding: 8px;
    border-left: 3px solid #0066ff;
  }

  .conversation-item.has-relevance {
    border-left-color: #ffff00;
  }

  .conversation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .conversation-time {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.6);
  }

  .intent-tag {
    font-size: 8px;
    padding: 2px 4px;
    background: rgba(0, 102, 255, 0.2);
    border-radius: 3px;
    color: white;
  }

  .conversation-content {
    margin-bottom: 4px;
  }

  .user-message, .agent-response {
    font-size: 9px;
    line-height: 1.3;
    margin-bottom: 2px;
  }

  .user-message strong {
    color: #00ff88;
  }

  .agent-response strong {
    color: #0066ff;
  }

  .conversation-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .tag {
    font-size: 8px;
    padding: 2px 4px;
    background: rgba(255, 136, 0, 0.2);
    border-radius: 3px;
    color: white;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }

  .stat-card {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    padding: 8px;
    text-align: center;
  }

  .stat-card h4 {
    margin: 0 0 4px 0;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: #00ff88;
  }

  .cache-stats {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    padding: 8px;
  }

  .cache-stats h4 {
    margin: 0 0 6px 0;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
  }

  .cache-item {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 2px;
  }

  .no-files, .no-conversations, .no-context, .no-stats {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
    font-size: 10px;
    text-align: center;
    padding: 12px;
  }
</style> 