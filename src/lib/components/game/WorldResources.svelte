<script lang="ts">
  import { onMount } from 'svelte';
  import { worldResources, resourceTypes, getResourcePercentage, getResourceColor, formatResourceValue } from '../../stores/worldResources';

  let resources: any;
  let isVisible = true;
  let lastUpdate = Date.now();

  onMount(() => {
    // Subscribe to world resources changes
    const unsubscribe = worldResources.subscribe((value: any) => {
      resources = value;
      lastUpdate = Date.now();
    });

    return unsubscribe;
  });
</script>

<div class="world-resources" class:hidden={!isVisible}>
  <div class="resources-header">
    <h3>🌍 World Resources</h3>
    <button class="toggle-btn" on:click={() => isVisible = !isVisible}>
      {isVisible ? '−' : '+'}
    </button>
  </div>

  {#if isVisible}
    <div class="resources-grid">
      {#each Object.entries(resources || {}) as [resource, value]}
        {@const resourceInfo = resourceTypes[resource]}
        {@const percentage = getResourcePercentage(resource, value as number)}
        {@const color = getResourceColor(resource, value as number)}
        
        <div class="resource-item" style="--resource-color: {color}">
          <div class="resource-icon">{resourceInfo?.icon || '📦'}</div>
          <div class="resource-info">
            <div class="resource-name">{resourceInfo?.name || resource}</div>
            <div class="resource-value">{formatResourceValue(resource, value as number)}</div>
            <div class="resource-bar">
              <div 
                class="resource-fill" 
                style="width: {percentage}%; background-color: {color}"
              ></div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="resources-footer">
      <small>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</small>
    </div>
  {/if}
</div>

<style>
  .world-resources {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 12px;
    padding: 1rem;
    margin: 0.5rem;
    border: 1px solid #2a2a3a;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  }

  .world-resources.hidden {
    opacity: 0.7;
  }

  .resources-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .resources-header h3 {
    margin: 0;
    color: #e0e0e0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .toggle-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: color 0.2s ease;
  }

  .toggle-btn:hover {
    color: #e0e0e0;
  }

  .resources-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }

  .resource-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .resource-icon {
    font-size: 1.5rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  .resource-info {
    flex: 1;
    min-width: 0;
  }

  .resource-name {
    font-size: 0.85rem;
    color: #ccc;
    margin-bottom: 0.25rem;
    font-weight: 500;
  }

  .resource-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--resource-color, #e0e0e0);
    margin-bottom: 0.5rem;
  }

  .resource-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .resource-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .resources-footer {
    margin-top: 1rem;
    text-align: center;
    color: #888;
    font-size: 0.8rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .resources-grid {
      grid-template-columns: 1fr;
    }
    
    .resource-item {
      padding: 0.5rem;
    }
    
    .resource-icon {
      font-size: 1.2rem;
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  /* Animation for resource updates */
  .resource-value {
    animation: pulse 0.5s ease-in-out;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
</style> 