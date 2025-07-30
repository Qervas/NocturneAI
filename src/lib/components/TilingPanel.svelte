<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let title: string;
  export let icon: string;
  export let x: number;
  export let y: number;
  export let width: number;
  export let height: number;
  export let isFocused: boolean = false;
  export let isDragged: boolean = false;
  export let isVisible: boolean = true;

  const dispatch = createEventDispatcher();

  let panelElement: HTMLElement;
  let headerElement: HTMLElement;

  $: panelStyle = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    z-index: ${isFocused ? 100 : 1};
  `;

  function handleHeaderMouseDown(e: MouseEvent) {
    if (e.target === headerElement || headerElement.contains(e.target as Node)) {
      e.preventDefault();
      dispatch('drag', e);
      dispatch('focus');
    }
  }

  function handleClose() {
    dispatch('close');
  }

  function handleFocus() {
    dispatch('focus');
  }
</script>

<div
  bind:this={panelElement}
  class="tiling-panel"
  class:focused={isFocused}
  class:dragged={isDragged}
  class:hidden={!isVisible}
  style={panelStyle}
  data-panel-id={id}
  on:click={handleFocus}
  role="region"
  aria-label={title}
>
  <!-- Panel Header -->
  <div
    bind:this={headerElement}
    class="panel-header"
    on:mousedown={handleHeaderMouseDown}
  >
    <div class="panel-title">
      <span class="panel-icon">{icon}</span>
      <span class="panel-name">{title}</span>
      {#if isFocused}
        <span class="focus-indicator">●</span>
      {/if}
    </div>

    <div class="panel-controls">
      <!-- Close button -->
      <button 
        class="panel-btn close-btn" 
        on:click={handleClose} 
        title="Close Panel"
      >
        ✕
      </button>
    </div>
  </div>

  <!-- Panel Content -->
  <div class="panel-content">
    <slot />
  </div>

  <!-- Resize handles for panel edges -->
  <div class="resize-handles">
    <!-- Right edge -->
    <div class="resize-handle right" data-direction="horizontal"></div>
    <!-- Bottom edge -->
    <div class="resize-handle bottom" data-direction="vertical"></div>
    <!-- Corner -->
    <div class="resize-handle corner" data-direction="both"></div>
  </div>
</div>

<style>
  .tiling-panel {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(0, 255, 136, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .tiling-panel.focused {
    border-color: rgba(0, 255, 136, 0.6);
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
  }

  .tiling-panel.dragged {
    opacity: 0.7;
    transform: scale(0.98);
    z-index: 1000 !important;
  }

  .tiling-panel.hidden {
    display: none;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.4);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    cursor: move;
    user-select: none;
    min-height: 28px;
    transition: all 0.2s ease;
  }

  .tiling-panel.focused .panel-header {
    background: rgba(0, 255, 136, 0.1);
    border-bottom-color: rgba(0, 255, 136, 0.4);
  }

  .panel-header:hover {
    background: rgba(0, 255, 136, 0.15);
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 500;
  }

  .panel-icon {
    font-size: 14px;
  }

  .panel-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .focus-indicator {
    color: #00ff88;
    font-size: 8px;
    animation: pulse-focus 2s infinite;
  }

  @keyframes pulse-focus {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .panel-controls {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .panel-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 11px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
  }

  .panel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }


  .close-btn:hover {
    background: rgba(255, 99, 99, 0.2);
    color: #ff6363;
  }

  .panel-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
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
    transition: background 0.2s ease;
  }

  .resize-handle:hover {
    background: rgba(0, 255, 136, 0.3);
  }

  .resize-handle.right {
    right: -2px;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: ew-resize;
  }

  .resize-handle.bottom {
    bottom: -2px;
    left: 0;
    right: 0;
    height: 4px;
    cursor: ns-resize;
  }

  .resize-handle.corner {
    bottom: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    cursor: se-resize;
  }

  /* Vim-like visual feedback */
  .tiling-panel.focused::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border: 2px solid rgba(0, 255, 136, 0.4);
    pointer-events: none;
    z-index: -1;
  }

  /* Status indicators */
  .panel-header::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 3px;
    background: rgba(0, 255, 136, 0.6);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .tiling-panel.focused .panel-header::after {
    opacity: 1;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .panel-header {
      padding: 4px 8px;
      min-height: 24px;
    }

    .panel-title {
      font-size: 12px;
      gap: 6px;
    }

    .panel-btn {
      min-width: 14px;
      height: 14px;
      font-size: 10px;
    }

    .resize-handle.right,
    .resize-handle.bottom {
      width: 6px;
      height: 6px;
    }

    .resize-handle.corner {
      width: 10px;
      height: 10px;
    }
  }
</style>