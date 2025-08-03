<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Props
  export let files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    content?: string;
  }> = [];

  // State
  let isVisible = false;
  let isDragging = false;
  let position = { x: 0, y: 0 };
  let dragOffset = { x: 0, y: 0 };
  let isCentered = true;
  let expandedFiles = writable(new Set<string>());
  let selectedFile: string | null = null;
  let searchTerm = '';
  let sortBy: 'name' | 'size' | 'date' = 'name';
  let sortOrder: 'asc' | 'desc' = 'asc';

  // Reactive computed
  $: selectedFileData = selectedFile ? getSelectedFile() : null;

  // Computed
  $: filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  $: sortedFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
        comparison = a.name.localeCompare(b.name);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return '📄';
      case 'py':
        return '🐍';
      case 'html':
      case 'htm':
        return '🌐';
      case 'css':
        return '🎨';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'txt':
        return '📄';
      case 'xml':
        return '📄';
      case 'yaml':
      case 'yml':
        return '📄';
      default:
        return '📄';
    }
  }

  function toggleFileExpansion(fileId: string) {
    if ($expandedFiles.has(fileId)) {
      $expandedFiles.delete(fileId);
    } else {
      $expandedFiles.add(fileId);
    }
    $expandedFiles = $expandedFiles;
  }

  function selectFile(fileId: string) {
    selectedFile = fileId;
  }

  function getSelectedFile() {
    return files.find(f => f.id === selectedFile);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function downloadFile(file: any) {
    const blob = new Blob([file.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Drag functionality
  function handleMouseDown(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      isDragging = true;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      event.preventDefault();
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging) {
      position = {
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y
      };
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }

  onMount(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Listen for show file explorer event
    const handleShowExplorer = () => {
      isVisible = true;
      centerWindow();
    };
    window.addEventListener('showFileExplorer', handleShowExplorer);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('showFileExplorer', handleShowExplorer);
    };
  });

  // Debug file content
  $: if (files.length > 0) {
    console.log('📁 Current files:', files.map(f => ({
      name: f.name,
      hasContent: !!f.content,
      contentLength: f.content?.length || 0
    })));
  }

  function centerWindow() {
    const windowWidth = 600;
    const windowHeight = 500;
    position = {
      x: Math.max(0, (window.innerWidth - windowWidth) / 2),
      y: Math.max(0, (window.innerHeight - windowHeight) / 2)
    };
  }
</script>

<!-- Floating File Explorer -->
{#if isVisible}
  <div 
    class="floating-file-explorer"
    style="left: {position.x}px; top: {position.y}px;"
    on:mousedown={handleMouseDown}
  >
    <div class="explorer-header">
      <div class="header-title">
        <span>📁 Files ({files.length})</span>
        <button class="close-btn" on:click={() => {
          isVisible = false;
          console.log('File explorer closed');
        }}>×</button>
      </div>
      <div class="header-controls">
        <input 
          type="text" 
          placeholder="Search..." 
          bind:value={searchTerm}
          class="search-input"
        />
        <select bind:value={sortBy} class="sort-select">
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
        <button 
          on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
          class="sort-btn"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>

    <div class="explorer-content">
      <div class="file-list">
        {#each sortedFiles as file (file.id)}
          <div class="file-item" class:selected={selectedFile === file.id}>
            <div class="file-header" on:click={() => selectFile(file.id)}>
              <span class="file-icon">{getFileIcon(file.name)}</span>
              <span class="file-name">{file.name}</span>
              <span class="file-size">{formatFileSize(file.size)}</span>
              {#if file.content}
                <button 
                  class="view-content-btn"
                  on:click|stopPropagation={() => toggleFileExpansion(file.id)}
                  title="View Content"
                >
                  {$expandedFiles.has(file.id) ? '▼ Hide' : '👁 View'}
                </button>
              {/if}
            </div>
            
            {#if $expandedFiles.has(file.id) && file.content}
              <div class="file-content">
                <div class="content-header">
                  <span>Preview ({file.content.length} chars)</span>
                  <div class="content-actions">
                    <button 
                      on:click={() => copyToClipboard(file.content || '')}
                      class="action-btn"
                      title="Copy"
                    >
                      📋
                    </button>
                    <button 
                      on:click={() => downloadFile(file)}
                      class="action-btn"
                      title="Download"
                    >
                      💾
                    </button>
                  </div>
                </div>
                <pre class="content-preview">{file.content || 'No content available'}</pre>
              </div>
            {:else if $expandedFiles.has(file.id) && !file.content}
              <div class="file-content">
                <div class="content-header">
                  <span>No Content Available</span>
                </div>
                <div class="content-preview">This file has no readable content.</div>
              </div>
            {/if}
          </div>
        {/each}
        
        {#if sortedFiles.length === 0}
          <div class="empty-state">
            <p>📁 No files</p>
          </div>
        {/if}
      </div>

      {#if selectedFileData}
        <div class="file-details">
          <h4>Details</h4>
          <div class="detail-item">
            <strong>Name:</strong> {selectedFileData.name}
          </div>
          <div class="detail-item">
            <strong>Size:</strong> {formatFileSize(selectedFileData.size)}
          </div>
          <div class="detail-item">
            <strong>Type:</strong> {selectedFileData.type || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>Content:</strong> {selectedFileData.content ? selectedFileData.content.length.toLocaleString() : '0'} chars
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .floating-file-explorer {
    position: fixed;
    width: 600px;
    height: 500px;
    background: rgba(0, 0, 0, 0.95);
    border: 2px solid rgba(0, 255, 136, 0.4);
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    backdrop-filter: blur(15px);
  }

  .explorer-header {
    padding: 12px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    background: rgba(0, 0, 0, 0.8);
    cursor: move;
  }

  .header-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    color: #00ff88;
    font-weight: 600;
    font-size: 14px;
  }

  .close-btn {
    background: none;
    border: none;
    color: #00ff88;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(0, 255, 136, 0.2);
  }

  .header-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .search-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 6px 8px;
    color: #ffffff;
    font-size: 12px;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .sort-select {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 6px;
    color: #ffffff;
    font-size: 12px;
  }

  .sort-btn {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 6px 8px;
    color: #00ff88;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .sort-btn:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  .explorer-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .file-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .file-item {
    border: 1px solid rgba(0, 255, 136, 0.1);
    border-radius: 4px;
    margin-bottom: 6px;
    background: rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .file-item:hover {
    border-color: rgba(0, 255, 136, 0.3);
    background: rgba(0, 0, 0, 0.4);
  }

  .file-item.selected {
    border-color: rgba(0, 255, 136, 0.5);
    background: rgba(0, 255, 136, 0.1);
  }

  .file-header {
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    gap: 8px;
  }

  .file-icon {
    font-size: 14px;
    min-width: 16px;
  }

  .file-name {
    flex: 1;
    color: #ffffff;
    font-weight: 500;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    min-width: 50px;
    text-align: right;
  }

  .view-content-btn {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: #00ff88;
    cursor: pointer;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .view-content-btn:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  .file-content {
    border-top: 1px solid rgba(0, 255, 136, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
    color: rgba(255, 255, 255, 0.8);
    font-size: 10px;
    font-weight: 500;
  }

  .content-actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 2px;
    padding: 2px 4px;
    color: #00ff88;
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  .content-preview {
    padding: 12px;
    margin: 0;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 0 0 6px 6px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.95);
    max-height: 300px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    border: 1px solid rgba(0, 255, 136, 0.1);
  }

  .file-details {
    width: 120px;
    padding: 8px;
    border-left: 1px solid rgba(0, 255, 136, 0.2);
    background: rgba(0, 0, 0, 0.3);
  }

  .file-details h4 {
    margin: 0 0 8px 0;
    color: #00ff88;
    font-size: 12px;
  }

  .detail-item {
    margin-bottom: 6px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.8);
  }

  .detail-item strong {
    color: #00ff88;
  }

  .empty-state {
    text-align: center;
    padding: 20px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
  }

  /* Custom scrollbar */
  .file-list::-webkit-scrollbar {
    width: 6px;
  }

  .file-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .file-list::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 136, 0.3);
    border-radius: 3px;
  }

  .file-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 136, 0.5);
  }

  .content-preview::-webkit-scrollbar {
    width: 6px;
  }

  .content-preview::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .content-preview::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 136, 0.3);
    border-radius: 3px;
  }

  .content-preview::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 136, 0.5);
  }
</style> 