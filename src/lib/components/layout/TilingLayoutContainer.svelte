<script lang="ts">
  import { tilingLayoutStore, tilingCalculations, tilingLayoutManager } from '../../services/ui/TilingLayoutManager';
  import { characters } from '../../services/agents/CharacterManager';
  import TilingPanel from './TilingPanel.svelte';
  
  // Import components
  import InteractionPanel from '../panels/InteractionPanel.svelte';
  import GamingCanvas from '../game/GamingCanvas.svelte';
  import ConversationConnections from '../communication/ConversationConnections.svelte';
  import MultiAgentPropertiesPanel from '../panels/MultiAgentPropertiesPanel.svelte';
  import WorldResources from '../panels/WorldResources.svelte';
  import CharacterPanel from '../panels/CharacterPanel.svelte';
  import MultiTabTerminal from '../panels/MultiTabTerminal.svelte';
  import SettingsPanel from '../panels/SettingsPanel.svelte';
  import HelpPanel from '../panels/HelpPanel.svelte';

  $: layout = $tilingLayoutStore;
  $: panels = $tilingCalculations;

  // Component mapping
  const componentMap = {
    'GameChat': InteractionPanel,
    'GamingCanvas': GamingCanvas,
    'ConversationConnections': ConversationConnections,
    'MultiTabTerminal': MultiTabTerminal,
    'SettingsPanel': SettingsPanel,
    'HelpPanel': HelpPanel
  };

  // Properties panel state for tabs
  let activeTab = "skills";

  function getComponent(componentName: string) {
    return componentMap[componentName as keyof typeof componentMap] || null;
  }

</script>

<div class="tiling-layout-container">
  <!-- Render all panels in tiling layout -->
  {#each panels as panel}
    <TilingPanel
      id={panel.id}
      title={panel.title || 'Panel'}
      icon={panel.icon || '📄'}
      x={panel.x}
      y={panel.y}
      width={panel.width}
      height={panel.height}
      isFocused={panel.isFocused}
      isDragged={panel.isDragged}
      isVisible={panel.isVisible}
      on:focus={() => tilingLayoutManager.focusPanel(panel.id)}
      on:drag={(e: any) => tilingLayoutManager.startDrag(panel.id, e.detail)}
      on:close={() => tilingLayoutManager.closePanel(panel.id)}
    >
      {#if panel.component === 'PropertiesPanel'}
        <!-- Multi-Agent Properties Panel (Red Alert style) -->
        <MultiAgentPropertiesPanel />
      {:else if panel.component === 'GamingCanvas'}
        <div class="canvas-container">
          <GamingCanvas />
          <ConversationConnections />
        </div>
      {:else}
        <svelte:component this={getComponent(panel.component)} />
      {/if}
    </TilingPanel>
  {/each}

</div>

<style>
  .tiling-layout-container {
    position: relative;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.1);
    margin: 0;
    padding: 0;
    top: 0;
    left: 0;
    box-sizing: border-box;
    min-width: 320px;
    min-height: 240px;
  }


  .canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
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


  /* Responsive adjustments */
  @media (max-width: 768px) {
    .properties-tabs {
      flex-wrap: wrap;
    }

    .property-tab {
      min-width: 80px;
    }
  }
</style>