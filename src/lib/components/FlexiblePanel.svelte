<script lang="ts">
  import { flexLayoutManager, type PanelConfig, type PanelState } from '../services/FlexibleLayoutManager';
  import { onMount, createEventDispatcher } from 'svelte';

  export let panelId: string;
  export let config: PanelConfig;
  export let state: PanelState;
  export let isDocked: boolean = false;
  export let dockArea: { x: number; y: number; width: number; height: number } | null = null;

  const dispatch = createEventDispatcher();

  let panelElement: HTMLElement;
  let headerElement: HTMLElement;
  let isDragging = false;
  let isResizing = false;
  let dragOffset = { x: 0, y: 0 };

  $: panelStyle = isDocked && dockArea ? 
    `position: absolute; left: ${dockArea.x}px; top: ${dockArea.y}px; width: ${dockArea.width}px; height: ${dockArea.height}px;` :
    `position: absolute; left: ${state.x}px; top: ${state.y}px; width: ${state.width}px; height: ${state.height}px; z-index: ${state.zIndex};`;

  function handleHeaderMouseDown(e: MouseEvent) {
    if (e.target === headerElement || headerElement.contains(e.target as Node)) {
      e.preventDefault();
      flexLayoutManager.startPanelDrag(panelId, e);
      isDragging = true;
    }
  }

  function handleResizeMouseDown(handle: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    flexLayoutManager.startPanelResize(panelId, handle, e);
    isResizing = true;
  }

  function handleClose() {
    flexLayoutManager.togglePanel(panelId);
  }

  function handleMaximize() {
    flexLayoutManager.maximizePanel(panelId);
  }

  function handleDock(position: 'left' | 'right' | 'bottom' | 'top') {
    isDragging = false;
    flexLayoutManager.dockPanel(panelId, position);
  }

  function handleUndock() {
    flexLayoutManager.undockPanel(panelId);
  }

  function handleDoubleClick() {
    if (isDocked) {
      handleUndock();
    } else {
      handleMaximize();
    }
  }

  onMount(() => {
    function handleGlobalMouseUp() {
      isDragging = false;
      isResizing = false;
    }

    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  });
</script>

<div
  bind:this={panelElement}
  class="flexible-panel"
  class:docked={isDocked}
  class:floating={!isDocked}
  class:maximized={state.isMaximized}
  class:minimized={state.isMinimized}
  class:dragging={isDragging}
  style={panelStyle}
>
  <!-- Panel Header -->
  <div
    bind:this={headerElement}
    class="panel-header"
    on:mousedown={handleHeaderMouseDown}
    on:dblclick={handleDoubleClick}
  >
    <div class="panel-title">
      {#if config.icon}
        <span class="panel-icon">{config.icon}</span>
      {/if}
      <span class="panel-name">{config.title}</span>
    </div>

    <div class="panel-controls">
      {#if !isDocked}
        <!-- Dock buttons for floating panels -->
        <button class="panel-btn dock-btn" on:click={() => handleDock('left')} title="Dock Left">
          ⬅️
        </button>
        <button class="panel-btn dock-btn" on:click={() => handleDock('right')} title="Dock Right">
          ➡️
        </button>
        <button class="panel-btn dock-btn" on:click={() => handleDock('bottom')} title="Dock Bottom">
          ⬇️
        </button>
      {:else}
        <!-- Undock button for docked panels -->
        <button class="panel-btn undock-btn" on:click={handleUndock} title="Undock">
          🔓
        </button>
      {/if}

      <button class="panel-btn maximize-btn" on:click={handleMaximize} title="Maximize">
        {state.isMaximized ? '🗗' : '🗖'}
      </button>

      {#if config.closable}
        <button class="panel-btn close-btn" on:click={handleClose} title="Close">
          ✕
        </button>
      {/if}
    </div>
  </div>

  <!-- Panel Content -->
  <div class="panel-content">
    <slot />
  </div>

  <!-- Resize Handles (only for floating panels) -->
  {#if !isDocked && config.resizable}
    <div class="resize-handles">
      <!-- Corner handles -->
      <div
        class="resize-handle corner top-left"
        on:mousedown={(e) => handleResizeMouseDown('top-left', e)}
      ></div>
      <div
        class="resize-handle corner top-right"
        on:mousedown={(e) => handleResizeMouseDown('top-right', e)}
      ></div>
      <div
        class="resize-handle corner bottom-left"
        on:mousedown={(e) => handleResizeMouseDown('bottom-left', e)}
      ></div>
      <div
        class="resize-handle corner bottom-right"
        on:mousedown={(e) => handleResizeMouseDown('bottom-right', e)}
      ></div>

      <!-- Edge handles -->
      <div
        class="resize-handle edge top"
        on:mousedown={(e) => handleResizeMouseDown('top', e)}
      ></div>
      <div
        class="resize-handle edge bottom"
        on:mousedown={(e) => handleResizeMouseDown('bottom', e)}
      ></div>
      <div
        class="resize-handle edge left"
        on:mousedown={(e) => handleResizeMouseDown('left', e)}
      ></div>
      <div
        class="resize-handle edge right"
        on:mousedown={(e) => handleResizeMouseDown('right', e)}
      ></div>
    </div>
  {/if}
</div>

<style>
  .flexible-panel {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .flexible-panel.floating {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .flexible-panel.docked {
    border-radius: 0;
    border: none;
    border-right: 1px solid rgba(0, 255, 136, 0.2);
  }

  .flexible-panel.maximized {
    position: fixed !important;
    top: 60px !important;
    left: 0 !important;
    width: 100vw !important;
    height: calc(100vh - 60px) !important;
    z-index: 9999 !important;
    border-radius: 0;
  }

  .flexible-panel.dragging {
    opacity: 0.8;
    transform: rotate(2deg);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    cursor: move;
    user-select: none;
    min-height: 32px;
    transition: all 0.2s ease;
    position: relative;
  }

  .panel-header:hover {
    background: rgba(0, 255, 136, 0.1);
    border-bottom-color: rgba(0, 255, 136, 0.4);
  }

  .panel-header:active {
    background: rgba(0, 255, 136, 0.2);
  }

  .panel-header::before {
    content: '⋮⋮';
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
    letter-spacing: -2px;
    transition: color 0.2s ease;
  }

  .panel-header:hover::before {
    color: rgba(0, 255, 136, 0.6);
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    margin-left: 16px; /* Make room for drag handle */
  }

  .panel-icon {
    font-size: 16px;
  }

  .panel-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .panel-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .panel-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 12px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
  }

  .panel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .dock-btn:hover {
    background: rgba(0, 255, 136, 0.2);
    color: #00ff88;
  }

  .close-btn:hover {
    background: rgba(255, 99, 99, 0.2);
    color: #ff6363;
  }

  .maximize-btn:hover {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
  }

  .undock-btn:hover {
    background: rgba(0, 123, 255, 0.2);
    color: #007bff;
  }

  .panel-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Resize Handles */
  .resize-handles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .resize-handle {
    position: absolute;
    pointer-events: all;
    background: transparent;
  }

  .resize-handle.corner {
    width: 12px;
    height: 12px;
  }

  .resize-handle.edge {
    background: rgba(0, 255, 136, 0.1);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .flexible-panel:hover .resize-handle.edge {
    opacity: 1;
  }

  .resize-handle.top-left {
    top: -6px;
    left: -6px;
    cursor: nw-resize;
  }

  .resize-handle.top-right {
    top: -6px;
    right: -6px;
    cursor: ne-resize;
  }

  .resize-handle.bottom-left {
    bottom: -6px;
    left: -6px;
    cursor: sw-resize;
  }

  .resize-handle.bottom-right {
    bottom: -6px;
    right: -6px;
    cursor: se-resize;
  }

  .resize-handle.top {
    top: -3px;
    left: 12px;
    right: 12px;
    height: 6px;
    cursor: n-resize;
  }

  .resize-handle.bottom {
    bottom: -3px;
    left: 12px;
    right: 12px;
    height: 6px;
    cursor: s-resize;
  }

  .resize-handle.left {
    left: -3px;
    top: 12px;
    bottom: 12px;
    width: 6px;
    cursor: w-resize;
  }

  .resize-handle.right {
    right: -3px;
    top: 12px;
    bottom: 12px;
    width: 6px;
    cursor: e-resize;
  }

  /* Dock area highlights */
  .flexible-panel.docked.left {
    border-right: 2px solid rgba(0, 255, 136, 0.5);
  }

  .flexible-panel.docked.right {
    border-left: 2px solid rgba(0, 255, 136, 0.5);
  }

  .flexible-panel.docked.bottom {
    border-top: 2px solid rgba(0, 255, 136, 0.5);
  }

  .flexible-panel.docked.top {
    border-bottom: 2px solid rgba(0, 255, 136, 0.5);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .panel-controls {
      gap: 2px;
    }

    .panel-btn {
      min-width: 18px;
      height: 18px;
      font-size: 10px;
    }

    .resize-handle.corner {
      width: 16px;
      height: 16px;
    }

    .resize-handle.edge {
      opacity: 1;
    }
  }
</style>