<script lang="ts">
  import { onMount } from 'svelte';
  import { flexLayoutStore, layoutCalculations, panelConfigs, flexLayoutManager } from '../services/FlexibleLayoutManager';
  import FlexiblePanel from './FlexiblePanel.svelte';
  
  // Import components
  import GameChat from './GameChat.svelte';
  import GamingCanvas from './GamingCanvas.svelte';
  import ConversationConnections from './ConversationConnections.svelte';
  import PerkPanel from './PerkPanel.svelte';
  import WorldResources from './WorldResources.svelte';
  import CharacterPanel from './CharacterPanel.svelte';
  import MultiTabTerminal from './MultiTabTerminal.svelte';

  $: layout = $flexLayoutStore;
  $: calculations = $layoutCalculations;
  $: configs = $panelConfigs;

  // Component mapping
  const componentMap = {
    'GameChat': GameChat,
    'GamingCanvas': GamingCanvas,
    'ConversationConnections': ConversationConnections,
    'PropertiesPanel': PerkPanel, // We'll create a wrapper for the properties tabs
    'MultiTabTerminal': MultiTabTerminal
  };

  // Properties panel state for tabs
  let activeTab = "skills";

  function getComponent(componentName: string) {
    return componentMap[componentName as keyof typeof componentMap] || null;
  }

  function getDockArea(panelId: string, dockPosition: string) {
    if (!dockPosition || !calculations.dockAreas[dockPosition as keyof typeof calculations.dockAreas]) return null;
    
    const area = calculations.dockAreas[dockPosition as keyof typeof calculations.dockAreas];
    const dockedPanels = layout.dockedPanels[dockPosition as keyof typeof layout.dockedPanels];
    const panelIndex = dockedPanels.indexOf(panelId);
    
    if (panelIndex === -1) return null;

    // Calculate panel area within dock
    if (dockPosition === 'left' || dockPosition === 'right') {
      const panelHeight = area.height / dockedPanels.length;
      return {
        x: area.x,
        y: area.y + (panelIndex * panelHeight),
        width: area.width,
        height: panelHeight
      };
    } else if (dockPosition === 'bottom' || dockPosition === 'top') {
      const panelWidth = area.width / dockedPanels.length;
      return {
        x: area.x + (panelIndex * panelWidth),
        y: area.y,
        width: panelWidth,
        height: area.height
      };
    }
    
    return area;
  }

  // Handle split pane resizing
  let isResizingSplit = false;
  let resizingSplitType = '';

  function handleSplitResize(type: string, e: MouseEvent) {
    e.preventDefault();
    isResizingSplit = true;
    resizingSplitType = type;

    const startX = e.clientX;
    const startY = e.clientY;
    const startRatios = { ...layout.splitRatios };

    function onMouseMove(e: MouseEvent) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      switch (type) {
        case 'left':
          const leftRatio = startRatios.leftWidth + (deltaX / calculations.availableWidth);
          flexLayoutManager.setSplitRatio('leftWidth', leftRatio);
          break;
        case 'right':
          const rightRatio = startRatios.rightWidth - (deltaX / calculations.availableWidth);
          flexLayoutManager.setSplitRatio('rightWidth', rightRatio);
          break;
        case 'bottom':
          const bottomRatio = startRatios.bottomHeight - (deltaY / calculations.availableHeight);
          flexLayoutManager.setSplitRatio('bottomHeight', bottomRatio);
          break;
      }
    }

    function onMouseUp() {
      isResizingSplit = false;
      resizingSplitType = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  onMount(() => {
    return () => {
      // Cleanup if needed
    };
  });
</script>

<div class="flexible-layout-container">
  <!-- Split Pane Resizers -->
  {#if layout.dockedPanels.left.length > 0}
    <div
      class="split-resizer vertical left"
      style="left: {calculations.dockAreas.left.width}px;"
      on:mousedown={(e) => handleSplitResize('left', e)}
    ></div>
  {/if}

  {#if layout.dockedPanels.right.length > 0}
    <div
      class="split-resizer vertical right"
      style="left: {calculations.dockAreas.right.x - 3}px;"
      on:mousedown={(e) => handleSplitResize('right', e)}
    ></div>
  {/if}

  {#if layout.dockedPanels.bottom.length > 0}
    <div
      class="split-resizer horizontal bottom"
      style="top: {calculations.dockAreas.bottom.y - 3}px;"
      on:mousedown={(e) => handleSplitResize('bottom', e)}
    ></div>
  {/if}

  <!-- Background area for empty space -->
  <div class="background-area" style="left: {calculations.centerArea.x}px; top: {calculations.centerArea.y}px; width: {calculations.centerArea.width}px; height: {calculations.centerArea.height}px;">
    <div class="background-content">
      <div class="background-message">
        <h3>🎮 Flexible Layout</h3>
        <p>📱 <strong>Drag panels:</strong> Click and drag panel headers to move them</p>
        <p>🔗 <strong>Dock panels:</strong> Use dock buttons (⬅️➡️⬇️) to snap to edges</p>
        <p>🔍 <strong>Maximize:</strong> Double-click headers or use maximize button (🗖)</p>
        <p>📏 <strong>Resize:</strong> Drag panel edges or dock area splitters</p>
        <p>👆 <strong>Toggle:</strong> Use header buttons to show/hide panels</p>
      </div>
    </div>
  </div>

  <!-- Render all panels -->
  {#each Array.from(layout.panels.entries()) as [panelId, panelState]}
    {@const config = configs.get(panelId)}
    {#if config && panelState.isVisible}
      <FlexiblePanel
        {panelId}
        {config}
        state={panelState}
        isDocked={panelState.isDocked}
        dockArea={panelState.isDocked ? getDockArea(panelId, panelState.dockPosition || '') : null}
      >
        {#if config.component === 'PropertiesPanel'}
          <!-- Properties Panel with Tabs -->
          <div class="properties-panel">
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
            </div>

            <div class="properties-content">
              {#if activeTab === "skills"}
                <PerkPanel />
              {:else if activeTab === "character"}
                <CharacterPanel />
              {:else if activeTab === "resources"}
                <WorldResources />
              {/if}
            </div>
          </div>
        {:else if config.component === 'GamingCanvas'}
          <div class="canvas-container">
            <GamingCanvas />
            <ConversationConnections />
          </div>
        {:else}
          <svelte:component this={getComponent(config.component)} />
        {/if}
      </FlexiblePanel>
    {/if}
  {/each}

  <!-- Drop zones for docking (shown during drag) -->
  {#if layout.isDragging && layout.dragTarget}
    <div class="dock-zones">
      <div class="dock-zone left" 
           on:click={() => flexLayoutManager.dockPanel(layout.dragTarget, 'left')}>
        <div class="dock-zone-label">⬅️ Dock Left</div>
      </div>
      <div class="dock-zone right"
           on:click={() => flexLayoutManager.dockPanel(layout.dragTarget, 'right')}>
        <div class="dock-zone-label">➡️ Dock Right</div>
      </div>
      <div class="dock-zone bottom"
           on:click={() => flexLayoutManager.dockPanel(layout.dragTarget, 'bottom')}>
        <div class="dock-zone-label">⬇️ Dock Bottom</div>
      </div>
      <div class="dock-zone top"
           on:click={() => flexLayoutManager.dockPanel(layout.dragTarget, 'top')}>
        <div class="dock-zone-label">⬆️ Dock Top</div>
      </div>
    </div>
  {/if}
</div>

<style>
  .flexible-layout-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .background-area {
    position: absolute;
    background: rgba(0, 0, 0, 0.2);
    border: 1px dashed rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .background-content {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 20px;
  }

  .background-message h3 {
    color: #00ff88;
    margin-bottom: 16px;
    font-size: 1.2rem;
  }

  .background-message p {
    margin: 8px 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .split-resizer {
    position: absolute;
    background: rgba(0, 255, 136, 0.2);
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 1000;
  }

  .split-resizer:hover {
    opacity: 1;
    background: rgba(0, 255, 136, 0.4);
  }

  .split-resizer.vertical {
    width: 6px;
    height: 100%;
    cursor: ew-resize;
    top: 0;
  }

  .split-resizer.horizontal {
    height: 6px;
    width: 100%;
    cursor: ns-resize;
    left: 0;
  }

  /* Properties Panel Styles */
  .properties-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .properties-tabs {
    display: flex;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    background: rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
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

  /* Dock Zones */
  .dock-zones {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10000;
  }

  .dock-zone {
    position: absolute;
    background: rgba(0, 255, 136, 0.15);
    border: 2px dashed rgba(0, 255, 136, 0.6);
    pointer-events: all;
    opacity: 0.7;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse-dock 2s infinite;
  }

  @keyframes pulse-dock {
    0%, 100% { 
      border-color: rgba(0, 255, 136, 0.6);
      background: rgba(0, 255, 136, 0.15);
    }
    50% { 
      border-color: rgba(0, 255, 136, 0.8);
      background: rgba(0, 255, 136, 0.25);
    }
  }

  .dock-zone:hover {
    opacity: 1;
    background: rgba(0, 255, 136, 0.3);
    border-color: #00ff88;
    transform: scale(1.02);
  }

  .dock-zone-label {
    color: #00ff88;
    font-weight: bold;
    font-size: 14px;
    text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    pointer-events: none;
  }

  .dock-zone.left {
    left: 10px;
    top: 70px;
    width: 180px;
    bottom: 10px;
  }

  .dock-zone.right {
    right: 10px;
    top: 70px;
    width: 180px;
    bottom: 10px;
  }

  .dock-zone.bottom {
    left: 10px;
    right: 10px;
    bottom: 10px;
    height: 120px;
  }

  .dock-zone.top {
    left: 10px;
    right: 10px;
    top: 70px;
    height: 80px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .split-resizer {
      opacity: 1;
    }

    .split-resizer.vertical {
      width: 8px;
    }

    .split-resizer.horizontal {
      height: 8px;
    }

    .dock-zone {
      opacity: 0.5;
    }
  }
</style>