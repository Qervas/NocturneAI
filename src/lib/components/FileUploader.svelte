<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let multiple = false;
	export let accept = '*';
	export let maxSize = 10 * 1024 * 1024; // 10MB default
	
	const dispatch = createEventDispatcher();
	
	let dragOver = false;
	let isUploading = false;
	let uploadProgress = 0;
	let dropZone: HTMLElement;
	let fileInput: HTMLInputElement;
	
	interface FileInfo {
		file: File;
		id: string;
		name: string;
		size: number;
		type: string;
		progress: number;
		status: 'pending' | 'uploading' | 'success' | 'error';
		error?: string;
	}
	
	let files: FileInfo[] = [];
	
	// Handle drag events
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}
	
	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
	}
	
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		
		const droppedFiles = event.dataTransfer?.files;
		if (droppedFiles) {
			processFiles(Array.from(droppedFiles));
		}
	}
	
	// Handle paste events
	function handlePaste(event: ClipboardEvent) {
		const pastedFiles = event.clipboardData?.files;
		if (pastedFiles) {
			processFiles(Array.from(pastedFiles));
		}
	}
	
	// Handle file input change
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			processFiles(Array.from(target.files));
		}
	}
	
	// Process files
	function processFiles(fileList: File[]) {
		const newFiles: FileInfo[] = fileList.map(file => ({
			file,
			id: generateId(),
			name: file.name,
			size: file.size,
			type: file.type,
			progress: 0,
			status: 'pending'
		}));
		
		// Validate files
		const validFiles = newFiles.filter(file => {
			// Check file size
			if (file.size > maxSize) {
				file.status = 'error';
				file.error = `File too large (${formatFileSize(file.size)}). Max size: ${formatFileSize(maxSize)}`;
				return false;
			}
			
			// Check file type if accept is specified
			if (accept !== '*') {
				const acceptedTypes = accept.split(',').map(t => t.trim());
				const isValidType = acceptedTypes.some(type => {
					if (type.startsWith('.')) {
						// Extension check
						return file.name.toLowerCase().endsWith(type.toLowerCase());
					} else if (type.includes('*')) {
						// MIME type pattern
						const pattern = type.replace('*', '.*');
						return new RegExp(pattern).test(file.type);
					} else {
						// Exact MIME type
						return file.type === type;
					}
				});
				
				if (!isValidType) {
					file.status = 'error';
					file.error = `File type not allowed. Accepted: ${accept}`;
					return false;
				}
			}
			
			return true;
		});
		
		if (multiple) {
			files = [...files, ...validFiles];
		} else {
			files = validFiles;
		}
		
		// Upload files
		uploadFiles(validFiles);
	}
	
	// Upload files
	async function uploadFiles(filesToUpload: FileInfo[]) {
		isUploading = true;
		
		for (const fileInfo of filesToUpload) {
			if (fileInfo.status === 'error') continue;
			
			fileInfo.status = 'uploading';
			
			try {
				// Simulate file upload with progress
				await simulateFileUpload(fileInfo);
				
				fileInfo.status = 'success';
				fileInfo.progress = 100;
				
				// Dispatch success event
				dispatch('fileUploaded', {
					file: fileInfo.file,
					fileInfo
				});
				
			} catch (error) {
				fileInfo.status = 'error';
				fileInfo.error = error instanceof Error ? error.message : 'Upload failed';
				
				// Dispatch error event
				dispatch('fileError', {
					file: fileInfo.file,
					fileInfo,
					error: fileInfo.error
				});
			}
		}
		
		isUploading = false;
	}
	
	// Simulate file upload with progress
	async function simulateFileUpload(fileInfo: FileInfo): Promise<void> {
		return new Promise((resolve, reject) => {
			const duration = 1000 + Math.random() * 2000; // 1-3 seconds
			const interval = 50;
			const steps = duration / interval;
			let currentStep = 0;
			
			const progressInterval = setInterval(() => {
				currentStep++;
				fileInfo.progress = Math.min((currentStep / steps) * 100, 99);
				
				if (currentStep >= steps) {
					clearInterval(progressInterval);
					resolve();
				}
			}, interval);
		});
	}
	
	// Remove file
	function removeFile(fileId: string) {
		files = files.filter(f => f.id !== fileId);
		dispatch('fileRemoved', { fileId });
	}
	
	// Retry upload
	function retryUpload(fileInfo: FileInfo) {
		fileInfo.status = 'pending';
		fileInfo.progress = 0;
		fileInfo.error = undefined;
		uploadFiles([fileInfo]);
	}
	
	// Generate unique ID
	function generateId(): string {
		return Math.random().toString(36).substr(2, 9);
	}
	
	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
	
	// Get file icon based on type
	function getFileIcon(fileType: string): string {
		if (fileType.startsWith('image/')) return '🖼️';
		if (fileType.startsWith('video/')) return '🎥';
		if (fileType.startsWith('audio/')) return '🎵';
		if (fileType.includes('pdf')) return '📄';
		if (fileType.includes('text/') || fileType.includes('javascript') || fileType.includes('json')) return '📝';
		if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return '📦';
		return '📎';
	}
	
	// Get status color
	function getStatusColor(status: string): string {
		switch (status) {
			case 'success': return 'var(--success-color)';
			case 'error': return 'var(--error-color)';
			case 'uploading': return 'var(--primary-color)';
			default: return 'var(--text-muted)';
		}
	}
</script>

<div class="file-uploader" class:drag-over={dragOver}>
	<!-- Hidden file input -->
	<input 
		bind:this={fileInput}
		type="file" 
		{multiple} 
		{accept}
		on:change={handleFileSelect}
		style="display: none;"
	/>
	
	<!-- Drop zone -->
	<div 
		bind:this={dropZone}
		class="drop-zone"
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
		on:paste={handlePaste}
	>
		<div class="drop-zone-content">
			<div class="upload-icon">📁</div>
			<h3>Drop files here</h3>
			<p>or</p>
			<button class="upload-btn" on:click={() => fileInput?.click()}>
				📎 Choose Files
			</button>
			<p class="upload-hint">
				You can also paste files (Ctrl+V) or drag & drop them here
			</p>
			{#if accept !== '*'}
				<p class="file-types">Accepted: {accept}</p>
			{/if}
			<p class="file-size">Max size: {formatFileSize(maxSize)}</p>
		</div>
	</div>
	
	<!-- File list -->
	{#if files.length > 0}
		<div class="file-list">
			<h4>📎 Files ({files.length})</h4>
			{#each files as fileInfo (fileInfo.id)}
				<div class="file-item" class:error={fileInfo.status === 'error'}>
					<div class="file-info">
						<div class="file-icon">{getFileIcon(fileInfo.type)}</div>
						<div class="file-details">
							<div class="file-name">{fileInfo.name}</div>
							<div class="file-meta">
								{formatFileSize(fileInfo.size)} • {fileInfo.type || 'Unknown type'}
							</div>
						</div>
					</div>
					
					<div class="file-status">
						{#if fileInfo.status === 'pending'}
							<span class="status pending">⏳ Pending</span>
						{:else if fileInfo.status === 'uploading'}
							<div class="progress-container">
								<div class="progress-bar">
									<div class="progress-fill" style="width: {fileInfo.progress}%"></div>
								</div>
								<span class="progress-text">{Math.round(fileInfo.progress)}%</span>
							</div>
						{:else if fileInfo.status === 'success'}
							<span class="status success">✅ Uploaded</span>
						{:else if fileInfo.status === 'error'}
							<span class="status error">❌ Error</span>
						{/if}
					</div>
					
					<div class="file-actions">
						{#if fileInfo.status === 'error'}
							<button class="action-btn retry" on:click={() => retryUpload(fileInfo)}>
								🔄 Retry
							</button>
						{/if}
						<button class="action-btn remove" on:click={() => removeFile(fileInfo.id)}>
							🗑️
						</button>
					</div>
					
					{#if fileInfo.error}
						<div class="file-error">
							{fileInfo.error}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.file-uploader {
		width: 100%;
	}

	.drop-zone {
		border: 2px dashed var(--border-color);
		border-radius: 8px;
		padding: 30px;
		text-align: center;
		transition: all 0.3s ease;
		background: var(--card-bg);
		cursor: pointer;
	}

	.drop-zone:hover {
		border-color: var(--primary-color);
		background: var(--hover-bg);
	}

	.drop-zone.drag-over {
		border-color: var(--primary-color);
		background: var(--primary-bg);
		transform: scale(1.02);
	}

	.drop-zone-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.upload-icon {
		font-size: 48px;
		margin-bottom: 10px;
	}

	.drop-zone h3 {
		margin: 0;
		color: var(--heading-color);
		font-size: 18px;
	}

	.drop-zone p {
		margin: 5px 0;
		color: var(--text-muted);
		font-size: 14px;
	}

	.upload-btn {
		background: var(--primary-color);
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.upload-btn:hover {
		background: var(--primary-hover);
		transform: translateY(-1px);
	}

	.upload-hint {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 10px;
	}

	.file-types, .file-size {
		font-size: 11px;
		color: var(--text-muted);
		margin: 2px 0;
	}

	.file-list {
		margin-top: 20px;
	}

	.file-list h4 {
		margin: 0 0 15px 0;
		color: var(--heading-color);
		font-size: 16px;
	}

	.file-item {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 8px;
		transition: all 0.2s;
	}

	.file-item:hover {
		border-color: var(--primary-color);
		background: var(--hover-bg);
	}

	.file-item.error {
		border-color: var(--error-color);
		background: var(--error-bg);
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}

	.file-icon {
		font-size: 24px;
		flex-shrink: 0;
	}

	.file-details {
		flex: 1;
		min-width: 0;
	}

	.file-name {
		font-weight: 500;
		color: var(--text-color);
		margin-bottom: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-meta {
		font-size: 12px;
		color: var(--text-muted);
	}

	.file-status {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}

	.status {
		font-size: 12px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.status.pending {
		background: var(--warning-bg);
		color: var(--warning-text);
	}

	.status.success {
		background: var(--success-bg);
		color: var(--success-text);
	}

	.status.error {
		background: var(--error-bg);
		color: var(--error-text);
	}

	.progress-container {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
	}

	.progress-bar {
		flex: 1;
		height: 6px;
		background: var(--border-color);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--primary-color);
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 12px;
		color: var(--text-muted);
		min-width: 30px;
		text-align: right;
	}

	.file-actions {
		display: flex;
		gap: 5px;
		justify-content: flex-end;
	}

	.action-btn {
		background: none;
		border: none;
		padding: 4px 8px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s;
	}

	.action-btn:hover {
		background: var(--hover-bg);
	}

	.action-btn.retry {
		color: var(--primary-color);
	}

	.action-btn.remove {
		color: var(--error-color);
	}

	.file-error {
		margin-top: 8px;
		padding: 8px;
		background: var(--error-bg);
		color: var(--error-text);
		border-radius: 4px;
		font-size: 12px;
	}
</style> 