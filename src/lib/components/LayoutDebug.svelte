<script lang="ts">
  import { layout } from '../services/LayoutManager';
  
  let showDebug = false;
  
  function toggleDebug() {
    showDebug = !showDebug;
  }
</script>

<!-- Debug Toggle Button -->
<button 
  class="debug-toggle" 
  on:click={toggleDebug}
  title="Toggle Layout Debug"
>
  🐛
</button>

<!-- Debug Panel -->
{#if showDebug}
  <div class="debug-panel">
    <h4>Layout Debug</h4>
    <div class="debug-info">
      <div><strong>Viewport:</strong> {$layout.viewportWidth} × {$layout.viewportHeight}</div>
      <div><strong>Available:</strong> {$layout.availableWidth} × {$layout.availableHeight}</div>
      <div><strong>Left Sidebar:</strong> {$layout.leftSidebar.width}px × {$layout.leftSidebar.height}px {#if $layout.leftSidebar.visible}(visible){:else}(hidden){/if}</div>
      <div><strong>Center:</strong> {$layout.center.width}px × {$layout.center.height}px</div>
      <div><strong>Right Sidebar:</strong> {$layout.rightSidebar.width}px × {$layout.rightSidebar.height}px {#if $layout.rightSidebar.visible}(visible){:else}(hidden){/if}</div>
      <div><strong>Grid:</strong> {$layout.gridTemplateColumns}</div>
      <div><strong>Overflow:</strong> Chat: {$layout.chatOverflow}, Properties: {$layout.propertiesOverflow}, Canvas: {$layout.canvasOverflow}</div>
      <div><strong>Responsive:</strong> Mobile: {$layout.isMobile}, Tablet: {$layout.isTablet}, Desktop: {$layout.isDesktop}</div>
    </div>
  </div>
{/if}

<style>
  .debug-toggle {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #00ff88;
    color: #00ff88;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  
  .debug-panel {
    position: fixed;
    top: 50px;
    right: 10px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid #00ff88;
    padding: 12px;
    border-radius: 4px;
    font-size: 11px;
    max-width: 300px;
    color: #ffffff;
  }
  
  .debug-panel h4 {
    margin: 0 0 8px 0;
    color: #00ff88;
    font-size: 12px;
  }
  
  .debug-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .debug-info div {
    line-height: 1.2;
  }
</style> 