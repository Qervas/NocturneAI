<script lang="ts">
	import "../lib/styles/ui-framework.css";
	import SimulationControls from "../lib/components/game/SimulationControls.svelte";
	import FloatingFileExplorer from "../lib/components/layout/FloatingFileExplorer.svelte";
	import TilingLayoutContainer from "../lib/components/layout/TilingLayoutContainer.svelte";


	import { selectedAgent, characterManager, characters } from "../lib/services/agents/CharacterManager";
	import { tilingLayoutManager, tilingLayoutStore } from "../lib/services/ui/TilingLayoutManager";
	import { uploadedFiles } from "../lib/services/data/FileStore";
	import { onMount } from "svelte";

	// Initialize character data on mount
	onMount(() => {
		characterManager.initializeSampleData();
	});

	$: layout = $tilingLayoutStore;

	// Helper function to check if a panel is visible
	function isPanelVisible(panelId: string): boolean {
		const findPanel = (node: any): boolean => {
			if (node.id === panelId) return node.isVisible !== false;
			if (node.children) {
				return node.children.some((child: any) => findPanel(child));
			}
			return false;
		};
		return findPanel(layout.rootNode);
	}

	// Panel toggle functions for header buttons
	function toggleChat() {
		tilingLayoutManager.togglePanel('sidebar-left');
	}

	function toggleCanvas() {
		tilingLayoutManager.togglePanel('canvas-area');
	}

	function toggleProperties() {
		tilingLayoutManager.togglePanel('sidebar-right');
	}

	function toggleTerminal() {
		tilingLayoutManager.togglePanel('terminal-area');
	}

	function toggleSettings() {
		tilingLayoutManager.togglePanel('settings-panel');
	}

	function toggleHelp() {
		tilingLayoutManager.togglePanel('help-panel');
	}
</script>

<div class="game-layout">
	<!-- Game Header -->
	<header class="game-header">
		<div class="header-left">
			<h1>🤖 Multi-Agent System</h1>
		</div>
		<div class="header-center">
			<SimulationControls compact={true} />
		</div>
		<div class="header-right">
			<div class="header-controls">
				<button 
					class="game-btn" 
					class:active={isPanelVisible('sidebar-left')}
					on:click={toggleChat} 
					title="Toggle Chat"
				>
					💬
				</button>
				<button 
					class="game-btn" 
					class:active={isPanelVisible('canvas-area')}
					on:click={toggleCanvas} 
					title="Toggle Game Canvas"
				>
					🎮
				</button>
				<button 
					class="game-btn" 
					class:active={isPanelVisible('sidebar-right')}
					on:click={toggleProperties} 
					title="Toggle Properties"
				>
					⚙️
				</button>
				<button 
					class="game-btn" 
					class:active={isPanelVisible('terminal-area')}
					on:click={toggleTerminal} 
					title="Toggle Terminal"
				>
					📟
				</button>
				<button 
					class="game-btn" 
					class:active={isPanelVisible('settings-panel')}
					on:click={toggleSettings} 
					title="Toggle Settings"
				>
					⚙️
				</button>
				<button 
					class="game-btn" 
					class:active={isPanelVisible('help-panel')}
					on:click={toggleHelp} 
					title="Toggle Help"
				>
					❓
				</button>
			</div>
		</div>
	</header>

	<!-- Tiling Layout Container -->
	<main class="game-main">
		<TilingLayoutContainer />
	</main>
</div>

<!-- Floating File Explorer -->
<FloatingFileExplorer files={$uploadedFiles} />

<style lang="css">
	.game-layout {
		display: grid;
		grid-template-rows: 60px 1fr;
		height: 100vh;
		width: 100vw;
		max-width: 100vw;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
		color: #ffffff;
		overflow: hidden;
		box-sizing: border-box;
	}

	.game-header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 12px 20px;
		background: rgba(0, 0, 0, 0.8);
		border-bottom: 1px solid rgba(0, 255, 136, 0.3);
		backdrop-filter: blur(10px);
		z-index: 1000;
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
		align-items: center;
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

	.game-btn.active {
		background: rgba(0, 255, 136, 0.2);
		color: #00ff88;
		border-color: #00ff88;
		box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
	}

	.game-main {
		position: relative;
		overflow: hidden;
		height: calc(100vh - 60px);
		margin: 0;
		padding: 0;
	}
</style>
