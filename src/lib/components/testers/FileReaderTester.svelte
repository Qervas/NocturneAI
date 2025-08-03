<script lang="ts">
  // File reader state
  let selectedFile: File | null = null;
  let fileContent: string = '';
  let imagePreview: string = '';
  let isReading = false;
  let readError: string = '';
  let fileInfo = {
    type: '',
    size: 0,
    dimensions: { width: 0, height: 0 },
    isImage: false,
    isText: false,
    isBinary: false
  };
  
  // File reader functions
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile = target.files[0];
      readError = '';
      fileContent = '';
      imagePreview = '';
      resetFileInfo();
      
      // Determine file type
      const fileType = selectedFile.type;
      fileInfo.type = fileType;
      fileInfo.size = selectedFile.size;
      
      if (fileType.startsWith('image/')) {
        fileInfo.isImage = true;
        createImagePreview();
      } else if (fileType.startsWith('text/') || isTextFile(selectedFile.name)) {
        fileInfo.isText = true;
      } else {
        fileInfo.isBinary = true;
      }
    }
  }
  
  function isTextFile(filename: string): boolean {
    const textExtensions = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.py', '.java', '.cpp', '.c', '.h', '.ts', '.jsx', '.tsx', '.vue', '.svelte', '.log', '.ini', '.conf', '.yml', '.yaml'];
    return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }
  
  function createImagePreview() {
    if (!selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview = e.target?.result as string;
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        fileInfo.dimensions = { width: img.width, height: img.height };
      };
      img.src = imagePreview;
    };
    reader.readAsDataURL(selectedFile);
  }
  
  async function readFile() {
    if (!selectedFile) {
      readError = 'Please select a file first';
      return;
    }
    
    isReading = true;
    readError = '';
    fileContent = '';
    const startTime = performance.now();
    
    try {
      if (fileInfo.isText) {
        const content = await selectedFile.text();
        fileContent = content;
      } else if (fileInfo.isImage) {
        // For images, we already have the preview
        fileContent = `Image file: ${selectedFile.name}\nDimensions: ${fileInfo.dimensions.width} × ${fileInfo.dimensions.height}`;
      } else {
        // For binary files, show file info
        fileContent = `Binary file: ${selectedFile.name}\nSize: ${formatFileSize(selectedFile.size)}\nType: ${selectedFile.type || 'Unknown'}`;
      }
    } catch (error) {
      readError = `Error reading file: ${error}`;
    } finally {
      isReading = false;
    }
  }
  
  function resetFileInfo() {
    fileInfo = {
      type: '',
      size: 0,
      dimensions: { width: 0, height: 0 },
      isImage: false,
      isText: false,
      isBinary: false
    };
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div class="test-form">
  <div class="form-group">
    <label>File:</label>
    <input 
      type="file" 
      accept="*"
      on:change={handleFileSelect}
    />
  </div>
  
  {#if selectedFile}
    <div class="file-info">
      <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
      {#if fileInfo.isImage}
        <br><span class="file-type">🖼️ Image File</span>
      {:else if fileInfo.isText}
        <br><span class="file-type">📄 Text File</span>
      {:else}
        <br><span class="file-type">📦 Binary File</span>
      {/if}
    </div>
  {/if}
  
  <button 
    class="run-test-btn" 
    on:click={readFile}
    disabled={!selectedFile || isReading}
  >
    {isReading ? 'Reading...' : 'Read File'}
  </button>
  
  {#if readError}
    <div class="error-message">{readError}</div>
  {/if}
</div>

{#if imagePreview && fileInfo.isImage}
  <div class="image-preview">
    <h4>Image Preview</h4>
    <img src={imagePreview} alt="Preview" />
    <div class="image-info">
      <strong>Dimensions:</strong> {fileInfo.dimensions.width} × {fileInfo.dimensions.height}<br>
      <strong>Size:</strong> {formatFileSize(fileInfo.size)}<br>
      <strong>Type:</strong> {fileInfo.type}
    </div>
  </div>
{/if}

{#if fileContent}
  <div class="file-content-preview">
    <h4>File Content</h4>
    <pre>{fileContent}</pre>
  </div>
{/if}

<style>
  .test-form {
    background: #F8F9FA;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    border: 1px solid #E9ECEF;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #2C3E50;
  }

  .form-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #BDC3C7;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
  }

  .run-test-btn {
    background: linear-gradient(135deg, #3498DB, #2980B9);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .run-test-btn:hover {
    background: linear-gradient(135deg, #2980B9, #1F618D);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .run-test-btn:disabled {
    background: #BDC3C7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .file-info {
    background: #E3F2FD;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 10px 0;
    border-left: 3px solid #2196F3;
    font-size: 13px;
    color: #1565C0;
  }

  .file-type {
    font-size: 11px;
    opacity: 0.8;
  }

  .error-message {
    background: #FFEBEE;
    color: #C62828;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 10px 0;
    border-left: 3px solid #F44336;
    font-size: 13px;
  }

  .image-preview {
    background: #F5F5F5;
    border: 1px solid #E0E0E0;
    border-radius: 6px;
    padding: 15px;
    margin-top: 15px;
  }

  .image-preview h4 {
    margin: 0 0 10px 0;
    color: #2C3E50;
    font-size: 14px;
  }

  .image-preview img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .image-info {
    background: #E8F5E8;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    color: #2C3E50;
  }

  .file-content-preview {
    background: #F5F5F5;
    border: 1px solid #E0E0E0;
    border-radius: 6px;
    padding: 15px;
    margin-top: 15px;
    max-height: 300px;
    overflow-y: auto;
  }

  .file-content-preview h4 {
    margin: 0 0 10px 0;
    color: #2C3E50;
    font-size: 14px;
  }

  .file-content-preview pre {
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #333;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style> 