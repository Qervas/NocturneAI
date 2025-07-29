<script lang="ts">
	import "../lib/styles/ui-framework.css";
	import GameChat from "../lib/components/GameChat.svelte";
	import GamingCanvas from "../lib/components/GamingCanvas.svelte";
	import ConversationConnections from "../lib/components/ConversationConnections.svelte";
	import SimulationControls from "../lib/components/SimulationControls.svelte";
	import PerkPanel from "../lib/components/PerkPanel.svelte";
	import WorldResources from "../lib/components/WorldResources.svelte";
	import CharacterPanel from "../lib/components/CharacterPanel.svelte";
	import FileAbilityTester from "../lib/components/FileAbilityTester.svelte";
	import FloatingFileExplorer from "../lib/components/FloatingFileExplorer.svelte";

	import { selectedAgent } from "../lib/services/CharacterManager";
	import { layout, layoutManager } from "../lib/services/LayoutManager";
	import LayoutDebug from "../lib/components/LayoutDebug.svelte";
	import { uploadedFiles } from "../lib/services/FileStore";

	let activeTab = "skills"; // "skills" | "character" | "resources" | "files"
	
	// Layout management
	let chatContainer: HTMLElement | undefined;
	let propertiesContainer: HTMLElement | undefined;
	let canvasContainer: HTMLElement | undefined;
	
	// Observe layout components
	$: if (chatContainer) {
		layoutManager.observeElement(chatContainer, 'chat');
	}
	
	$: if (propertiesContainer) {
		layoutManager.observeElement(propertiesContainer, 'properties');
	}
	
	$: if (canvasContainer) {
		layoutManager.observeElement(canvasContainer, 'canvas');
	}
</script>

<div class="game-layout" style="grid-template-rows: {$layout.gridTemplateRows};">
	<!-- Game Header -->
	<header class="game-header">
		<div class="header-left">
			<h1>🤖 Multi-Agent System</h1>
		</div>
		<div class="header-center">
			<div class="game-status">
				<span class="status-indicator">●</span>
				<span class="status-text">Simulation Active</span>
			</div>
		</div>
		<div class="header-right">
			<div class="header-controls">
				<button class="game-btn" on:click={() => layoutManager.toggleSidebar('left')} title="Toggle Chat">
					💬
				</button>
				<button class="game-btn" on:click={() => layoutManager.toggleSidebar('right')} title="Toggle Properties">
					⚙️
				</button>
				<button class="game-btn">Settings</button>
				<button class="game-btn">Help</button>
			</div>
		</div>
	</header>

	<!-- Main Game Area -->
	<main class="game-main" style="grid-template-columns: {$layout.gridTemplateColumns};">
		<!-- Left Sidebar - Chat -->
		{#if $layout.leftSidebar.visible}
			<aside class="game-sidebar left-sidebar" style="width: {$layout.leftSidebar.width}px;">
				<div class="sidebar-header">
					<h3>💬 Chat</h3>
					{#if $layout.chatOverflow}
						<span class="overflow-indicator" title="Content overflow detected">⚠️</span>
					{/if}
				</div>
				<div class="sidebar-content" bind:this={chatContainer}>
					<GameChat />
				</div>
			</aside>
		{/if}

		<!-- Center - Simulation -->
		<section class="game-center" style="width: {$layout.center.width}px;">
			<div class="simulation-container" bind:this={canvasContainer}>
				<GamingCanvas />
				<ConversationConnections />
			</div>
			<div class="game-controls">
				<SimulationControls />
			</div>
		</section>

		<!-- Right Sidebar - Properties Panel -->
		{#if $layout.rightSidebar.visible}
			<aside class="game-sidebar right-sidebar" style="width: {$layout.rightSidebar.width}px;">
				<div class="properties-panel" bind:this={propertiesContainer}>
					<!-- Properties Header -->
					<div class="properties-header">
						<h3>⚙️ Properties</h3>
						{#if $selectedAgent}
							<span class="selected-agent">Selected: {$selectedAgent}</span>
						{/if}
						{#if $layout.propertiesOverflow}
							<span class="overflow-indicator" title="Content overflow detected">⚠️</span>
						{/if}
					</div>

					<!-- Properties Tabs -->
					<div class="properties-tabs">
						<button 
							class="property-tab" 
							class:active={activeTab === "skills"}
							on:click={() => activeTab = "skills"}
						>
							⚡ Skills
						</button>
						<button 
							class="property-tab" 
							class:active={activeTab === "character"}
							on:click={() => activeTab = "character"}
						>
							👤 Character
						</button>
						<button 
							class="property-tab" 
							class:active={activeTab === "resources"}
							on:click={() => activeTab = "resources"}
						>
							🌎 Resources
						</button>
						<button 
							class="property-tab" 
							class:active={activeTab === "files"}
							on:click={() => activeTab = "files"}
						>
							📁 Files
						</button>
					</div>

					<!-- Properties Content -->
					<div class="properties-content">
						{#if activeTab === "skills"}
							<PerkPanel />
						{:else if activeTab === "character"}
							<CharacterPanel />
						{:else if activeTab === "resources"}
							<WorldResources />
						{:else if activeTab === "files"}
							<FileAbilityTester />
						{/if}
					</div>
				</div>
			</aside>
		{/if}
	</main>
</div>

<!-- Layout Debug Component -->
<LayoutDebug />

<!-- Floating File Explorer -->
<FloatingFileExplorer files={$uploadedFiles} />

<style lang="css">
	.game-layout {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100vh;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
		color: #ffffff;
	}

	.game-header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 12px 20px;
		background: rgba(0, 0, 0, 0.8);
		border-bottom: 1px solid rgba(0, 255, 136, 0.3);
		backdrop-filter: blur(10px);
	}

	.header-left h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #00ff88;
		font-weight: bold;
	}

	.header-center {
		display: flex;
		justify-content: center;
	}

	.game-status {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: rgba(0, 255, 136, 0.1);
		border: 1px solid rgba(0, 255, 136, 0.3);
		border-radius: 6px;
	}

	.status-indicator {
		color: #00ff88;
		font-size: 0.8rem;
		animation: pulse 2s infinite;
	}

	.status-text {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.header-right {
		display: flex;
		justify-content: flex-end;
	}

	.header-controls {
		display: flex;
		gap: 8px;
	}

	.game-btn {
		background: transparent;
		border: 1px solid rgba(0, 255, 136, 0.3);
		color: rgba(255, 255, 255, 0.8);
		padding: 6px 12px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s ease;
	}

	.game-btn:hover {
		background: rgba(0, 255, 136, 0.1);
		color: #00ff88;
		border-color: #00ff88;
	}

	.game-main {
		display: grid;
		height: 100%;
		overflow: hidden;
		transition: grid-template-columns 0.3s ease;
	}

	.game-sidebar {
		background: rgba(0, 0, 0, 0.6);
		border-right: 1px solid rgba(0, 255, 136, 0.2);
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		transition: width 0.3s ease;
	}

	.right-sidebar {
		border-right: none;
		border-left: 1px solid rgba(0, 255, 136, 0.2);
	}

	.sidebar-header {
		padding: 12px 16px;
		border-bottom: 1px solid rgba(0, 255, 136, 0.2);
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-shrink: 0;
	}

	.sidebar-header h3 {
		margin: 0;
		font-size: 1rem;
		color: #00ff88;
		font-weight: bold;
	}

	.sidebar-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.overflow-indicator {
		color: #ff6b6b;
		font-size: 0.8rem;
		cursor: help;
	}

	.game-center {
		display: flex;
		flex-direction: column;
		background: rgba(0, 0, 0, 0.4);
	}

	.simulation-container {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.game-controls {
		padding: 12px;
		border-top: 1px solid rgba(0, 255, 136, 0.2);
		background: rgba(0, 0, 0, 0.3);
	}

	/* Properties Panel Styles */
	.properties-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.properties-header {
		padding: 12px 16px;
		border-bottom: 1px solid rgba(0, 255, 136, 0.2);
		background: rgba(0, 0, 0, 0.3);
	}

	.properties-header h3 {
		margin: 0 0 4px 0;
		font-size: 1rem;
		color: #00ff88;
		font-weight: bold;
	}

	.selected-agent {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.properties-tabs {
		display: flex;
		border-bottom: 1px solid rgba(0, 255, 136, 0.2);
		background: rgba(0, 0, 0, 0.2);
	}

	.property-tab {
		flex: 1;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		padding: 10px 12px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s ease;
		border-bottom: 2px solid transparent;
	}

	.property-tab:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(0, 255, 136, 0.1);
	}

	.property-tab.active {
		color: #00ff88;
		border-bottom-color: #00ff88;
		background: rgba(0, 255, 136, 0.1);
	}

	.properties-content {
		flex: 1;
		overflow: hidden;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
