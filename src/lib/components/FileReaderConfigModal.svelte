<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { FILE_TYPES, DEFAULT_FILE_READER_CONFIG, type FileReaderConfig, type FileTypeConfig } from '../abilities/file-operations/FileReader';
  import { settingsManager } from '../services/SettingsManager';

  const dispatch = createEventDispatcher();

  export let isVisible = false;
  export let agentId: string = '';

  let config: FileReaderConfig = { ...DEFAULT_FILE_READER_CONFIG };
  let selectedFileTypes: string[] = [...DEFAULT_FILE_READER_CONFIG.allowedFileTypes];
  let maxFileSize: number = DEFAULT_FILE_READER_CONFIG.maxFileSize;
  let encoding: 'utf-8' | 'ascii' | 'binary' = DEFAULT_FILE_READER_CONFIG.encoding;
  let extractTextFromPDF: boolean = DEFAULT_FILE_READER_CONFIG.extractTextFromPDF;
  let extractTextFromImages: boolean = DEFAULT_FILE_READER_CONFIG.extractTextFromImages;
  let preserveFormatting: boolean = DEFAULT_FILE_READER_CONFIG.preserveFormatting;
  let includeMetadata: boolean = DEFAULT_FILE_READER_CONFIG.includeMetadata;

  // Load existing configuration
  $: if (isVisible && agentId) {
    loadConfig();
  }

  function loadConfig() {
    const skillKey = `file_reader_${agentId}`;
    const savedConfig = settingsManager.getSkillConfig(skillKey);
    if (savedConfig) {
      config = { ...DEFAULT_FILE_READER_CONFIG, ...savedConfig };
      selectedFileTypes = [...config.allowedFileTypes];
      maxFileSize = config.maxFileSize;
      encoding = config.encoding;
      extractTextFromPDF = config.extractTextFromPDF;
      extractTextFromImages = config.extractTextFromImages;
      preserveFormatting = config.preserveFormatting;
      includeMetadata = config.includeMetadata;
    }
  }

  function saveConfig() {
    const newConfig: FileReaderConfig = {
      allowedFileTypes: selectedFileTypes,
      maxFileSize,
      encoding,
      extractTextFromPDF,
      extractTextFromImages,
      preserveFormatting,
      includeMetadata
    };

    const skillKey = `file_reader_${agentId}`;
    settingsManager.saveSkillConfig(skillKey, newConfig);
    dispatch('configSaved', { config: newConfig });
    closeModal();
  }

  function closeModal() {
    isVisible = false;
    dispatch('close');
  }

  function toggleFileType(fileTypeId: string) {
    const index = selectedFileTypes.indexOf(fileTypeId);
    if (index > -1) {
      selectedFileTypes = selectedFileTypes.filter(id => id !== fileTypeId);
    } else {
      selectedFileTypes = [...selectedFileTypes, fileTypeId];
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} bytes`;
  }

  function getSupportedFileTypes(): FileTypeConfig[] {
    return Object.values(FILE_TYPES).filter(type => type.supported);
  }

  function getUnsupportedFileTypes(): FileTypeConfig[] {
    return Object.values(FILE_TYPES).filter(type => !type.supported);
  }
</script>

{#if isVisible}
  <div class="modal-overlay" on:click={closeModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>📁 File Reader Configuration</h3>
        <button class="close-btn" on:click={closeModal}>×</button>
      </div>

      <div class="modal-body">
        <div class="config-section">
          <h4>📋 Allowed File Types</h4>
          <p class="section-description">Select which file types the agent can read:</p>
          
          <div class="file-types-grid">
            {#each getSupportedFileTypes() as fileType}
              <label class="file-type-item" class:selected={selectedFileTypes.includes(fileType.id)}>
                <input
                  type="checkbox"
                  checked={selectedFileTypes.includes(fileType.id)}
                  on:change={() => toggleFileType(fileType.id)}
                />
                <div class="file-type-info">
                  <div class="file-type-name">{fileType.name}</div>
                  <div class="file-type-extensions">{fileType.extensions.join(', ')}</div>
                  <div class="file-type-description">{fileType.description}</div>
                  <div class="file-type-size">Max: {formatFileSize(fileType.maxSize)}</div>
                </div>
              </label>
            {/each}
          </div>

          {#if getUnsupportedFileTypes().length > 0}
            <div class="unsupported-section">
              <h5>🚫 Unsupported File Types</h5>
              <div class="file-types-grid">
                {#each getUnsupportedFileTypes() as fileType}
                  <div class="file-type-item unsupported">
                    <div class="file-type-info">
                      <div class="file-type-name">{fileType.name}</div>
                      <div class="file-type-extensions">{fileType.extensions.join(', ')}</div>
                      <div class="file-type-description">{fileType.description}</div>
                      <div class="file-type-status">Not yet implemented</div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <div class="config-section">
          <h4>⚙️ Reading Options</h4>
          
          <div class="form-group">
            <label for="max-file-size">Maximum File Size:</label>
            <input
              id="max-file-size"
              type="range"
              min="1024"
              max="100 * 1024 * 1024"
              step="1024"
              bind:value={maxFileSize}
            />
            <span class="file-size-display">{formatFileSize(maxFileSize)}</span>
          </div>

          <div class="form-group">
            <label for="encoding">Text Encoding:</label>
            <select id="encoding" bind:value={encoding}>
              <option value="utf-8">UTF-8 (Recommended)</option>
              <option value="ascii">ASCII</option>
              <option value="binary">Binary</option>
            </select>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={extractTextFromPDF} />
              Extract text from PDF files
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={extractTextFromImages} />
              Extract text from images (OCR)
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={preserveFormatting} />
              Preserve original formatting
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={includeMetadata} />
              Include file metadata
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={closeModal}>Cancel</button>
        <button class="btn btn-primary" on:click={saveConfig}>Save Configuration</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    color: var(--text-primary);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h3 {
    margin: 0;
    color: var(--accent-color);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: var(--space-md);
  }

  .config-section {
    margin-bottom: var(--space-lg);
  }

  .config-section h4 {
    color: var(--accent-color);
    margin-bottom: var(--space-sm);
  }

  .section-description {
    color: var(--text-secondary);
    margin-bottom: var(--space-md);
    font-size: var(--font-size-sm);
  }

  .file-types-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .file-type-item {
    display: flex;
    align-items: flex-start;
    padding: var(--space-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-base);
    background: var(--input-bg);
  }

  .file-type-item:hover {
    border-color: var(--accent-color);
    background: var(--hover-bg);
  }

  .file-type-item.selected {
    border-color: var(--accent-color);
    background: rgba(0, 255, 136, 0.1);
  }

  .file-type-item.unsupported {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .file-type-item input[type="checkbox"] {
    margin-right: var(--space-sm);
    margin-top: 2px;
  }

  .file-type-info {
    flex: 1;
  }

  .file-type-name {
    font-weight: bold;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .file-type-extensions {
    font-size: var(--font-size-sm);
    color: var(--accent-color);
    margin-bottom: 2px;
  }

  .file-type-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .file-type-size {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .file-type-status {
    font-size: var(--font-size-sm);
    color: var(--accent-red);
  }

  .unsupported-section {
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--border-color);
  }

  .unsupported-section h5 {
    color: var(--accent-red);
    margin-bottom: var(--space-sm);
  }

  .form-group {
    margin-bottom: var(--space-md);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-xs);
    color: var(--text-primary);
  }

  .form-group input[type="range"] {
    width: 100%;
    margin-bottom: var(--space-xs);
  }

  .form-group select {
    width: 100%;
    padding: var(--space-sm);
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    margin-right: var(--space-sm);
  }

  .file-size-display {
    font-size: var(--font-size-sm);
    color: var(--accent-color);
    font-weight: bold;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-top: 1px solid var(--border-color);
  }

  .btn {
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-mono);
    transition: all var(--transition-base);
  }

  .btn-primary {
    background: var(--accent-color);
    color: var(--text-on-accent);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--button-secondary-bg);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: var(--button-secondary-hover);
  }
</style> 