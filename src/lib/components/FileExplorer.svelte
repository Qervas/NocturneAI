<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Props
  export let isOpen = false;
  export let files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    content?: string;
  }> = [];

  // State
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
        // For now, use name as proxy for date since we don't store upload time
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
    $expandedFiles = $expandedFiles; // Trigger reactivity
  }

  function selectFile(fileId: string) {
    selectedFile = fileId;
  }

  function getFileContent(fileId: string) {
    const file = files.find(f => f.id === fileId);
    return file?.content || '';
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
</script>

<div class="file-explorer" class:open={isOpen}>
  <div class="explorer-header">
    <h3>📁 File Explorer</h3>
    <div class="header-controls">
      <input 
        type="text" 
        placeholder="Search files..." 
        bind:value={searchTerm}
        class="search-input"
      />
      <select bind:value={sortBy} class="sort-select">
        <option value="name">Name</option>
        <option value="size">Size</option>
        <option value="date">Date</option>
      </select>
      <button 
        on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
        class="sort-button"
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
                class="expand-button"
                on:click|stopPropagation={() => toggleFileExpansion(file.id)}
              >
                {$expandedFiles.has(file.id) ? '▼' : '▶'}
              </button>
            {/if}
          </div>
          
          {#if $expandedFiles.has(file.id) && file.content}
            <div class="file-content">
              <div class="content-header">
                <span>Content Preview</span>
                <div class="content-actions">
                  <button 
                    on:click={() => copyToClipboard(file.content || '')}
                    class="action-button"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                  <button 
                    on:click={() => downloadFile(file)}
                    class="action-button"
                    title="Download file"
                  >
                    💾
                  </button>
                </div>
              </div>
              <pre class="content-preview">{file.content}</pre>
            </div>
          {/if}
        </div>
      {/each}
      
      {#if sortedFiles.length === 0}
        <div class="empty-state">
          <p>📁 No files uploaded yet</p>
          <p>Upload files to see them here</p>
        </div>
      {/if}
    </div>

         {#if selectedFileData}
       <div class="file-details">
         <h4>File Details</h4>
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
           <strong>Content Length:</strong> {selectedFileData.content ? selectedFileData.content.length.toLocaleString() : '0'} characters
         </div>
       </div>
     {/if}
  </div>
</div>

<style>
  .file-explorer {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    margin: 10px 0;
    max-height: 600px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .file-explorer.open {
    max-height: 600px;
  }

  .explorer-header {
    padding: 15px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    background: rgba(0, 0, 0, 0.5);
  }

  .explorer-header h3 {
    margin: 0 0 10px 0;
    color: #00ff88;
    font-size: 16px;
  }

  .header-controls {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .search-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 8px 12px;
    color: #ffffff;
    font-size: 14px;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .sort-select {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 8px;
    color: #ffffff;
    font-size: 14px;
  }

  .sort-button {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.5);
    border-radius: 4px;
    padding: 8px 12px;
    color: #00ff88;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .sort-button:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  .explorer-content {
    display: flex;
    height: 500px;
  }

  .file-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .file-item {
    border: 1px solid rgba(0, 255, 136, 0.1);
    border-radius: 6px;
    margin-bottom: 8px;
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
    padding: 12px;
    cursor: pointer;
    gap: 10px;
  }

  .file-icon {
    font-size: 18px;
    min-width: 20px;
  }

  .file-name {
    flex: 1;
    color: #ffffff;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    min-width: 60px;
    text-align: right;
  }

  .expand-button {
    background: none;
    border: none;
    color: #00ff88;
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
    border-radius: 3px;
    transition: all 0.2s ease;
  }

  .expand-button:hover {
    background: rgba(0, 255, 136, 0.2);
  }

  .file-content {
    border-top: 1px solid rgba(0, 255, 136, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    font-weight: 500;
  }

  .content-actions {
    display: flex;
    gap: 5px;
  }

  .action-button {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 3px;
    padding: 4px 8px;
    color: #00ff88;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .action-button:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  .content-preview {
    padding: 15px;
    margin: 0;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0 0 6px 6px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.9);
    max-height: 300px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .file-details {
    width: 250px;
    padding: 15px;
    border-left: 1px solid rgba(0, 255, 136, 0.2);
    background: rgba(0, 0, 0, 0.3);
  }

  .file-details h4 {
    margin: 0 0 15px 0;
    color: #00ff88;
    font-size: 14px;
  }

  .detail-item {
    margin-bottom: 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }

  .detail-item strong {
    color: #00ff88;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.5);
  }

  .empty-state p {
    margin: 5px 0;
    font-size: 14px;
  }

  /* Custom scrollbar */
  .file-list::-webkit-scrollbar {
    width: 8px;
  }

  .file-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .file-list::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 136, 0.3);
    border-radius: 4px;
  }

  .file-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 136, 0.5);
  }

  .content-preview::-webkit-scrollbar {
    width: 8px;
  }

  .content-preview::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .content-preview::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 136, 0.3);
    border-radius: 4px;
  }

  .content-preview::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 136, 0.5);
  }
</style> 