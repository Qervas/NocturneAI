<script lang="ts">
  import { onMount } from 'svelte';
  import { worldResources, resourceTypes, formatResourceValue } from '../../stores/worldResources';

  let resources: any;
  let isExpanded = false;
  let selectedResource = '';
  let resourceHistory: any[] = [];

  onMount(() => {
    // Subscribe to world resources changes
    const unsubscribe = worldResources.subscribe((value: any) => {
      resources = value;
      // Store resource history for analytics
      resourceHistory.push({
        timestamp: Date.now(),
        resources: { ...value }
      });
      
      // Keep only last 50 entries
      if (resourceHistory.length > 50) {
        resourceHistory = resourceHistory.slice(-50);
      }
    });

    return unsubscribe;
  });

  // Calculate resource trends
  function getResourceTrend(resource: string): { trend: 'up' | 'down' | 'stable'; change: number } {
    if (resourceHistory.length < 2) {
      return { trend: 'stable', change: 0 };
    }

    const current = resourceHistory[resourceHistory.length - 1]?.resources[resource] || 0;
    const previous = resourceHistory[resourceHistory.length - 2]?.resources[resource] || 0;
    const change = current - previous;

    if (change > 0) return { trend: 'up', change };
    if (change < 0) return { trend: 'down', change: Math.abs(change) };
    return { trend: 'stable', change: 0 };
  }

  // Get resource efficiency
  function getResourceEfficiency(resource: string): number {
    const current = resources?.[resource] || 0;
    const max = getResourceMax(resource);
    return Math.round((current / max) * 100);
  }

  // Get resource maximum value
  function getResourceMax(resource: string): number {
    return resourceTypes[resource]?.max || 100;
  }

  // Get resource icon
  function getResourceIcon(resource: string): string {
    return resourceTypes[resource]?.icon || '📦';
  }

  // Get resource color based on efficiency
  function getResourceColor(efficiency: number): string {
    if (efficiency >= 80) return '#00ff00';
    if (efficiency >= 50) return '#ffff00';
    return '#ff0000';
  }
</script>

<div class="world-resources-panel">
  <div class="panel-header" on:click={() => isExpanded = !isExpanded}>
    <h3>🌍 World Resources</h3>
    <span class="expand-icon">{isExpanded ? '−' : '+'}</span>
  </div>

  {#if isExpanded}
    <div class="panel-content">
      <div class="resources-overview">
        <div class="resource-summary">
          <div class="summary-item">
            <span class="summary-label">Total Resources:</span>
            <span class="summary-value">{Object.keys(resources || {}).length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Active Agents:</span>
            <span class="summary-value">{resources?.agents || 0}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Active Projects:</span>
            <span class="summary-value">{resources?.projects || 0}</span>
          </div>
        </div>
      </div>

      <div class="resources-list">
        {#each Object.entries(resources || {}) as [resource, value]}
          {@const efficiency = getResourceEfficiency(resource)}
          {@const trend = getResourceTrend(resource)}
          {@const color = getResourceColor(efficiency)}
          
          <div 
            class="resource-item" 
            class:selected={selectedResource === resource}
            on:click={() => selectedResource = selectedResource === resource ? '' : resource}
          >
            <div class="resource-header">
              <div class="resource-icon">{getResourceIcon(resource)}</div>
              <div class="resource-info">
                <div class="resource-name">{resource.charAt(0).toUpperCase() + resource.slice(1)}</div>
                <div class="resource-value">{formatResourceValue(resource, value as number)}</div>
              </div>
              <div class="resource-trend {trend.trend}">
                {#if trend.trend === 'up'}
                  ↗️ +{trend.change}
                {:else if trend.trend === 'down'}
                  ↘️ -{trend.change}
                {:else}
                  ➡️
                {/if}
              </div>
            </div>
            
            <div class="resource-bar">
              <div 
                class="resource-fill" 
                style="width: {efficiency}%; background-color: {color}"
              ></div>
            </div>
            
            <div class="resource-details">
              <span class="efficiency">{efficiency}%</span>
              <span class="max">/ {getResourceMax(resource)}</span>
            </div>
          </div>
        {/each}
      </div>

      {#if selectedResource}
        <div class="resource-analytics">
          <h4>📊 {selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1)} Analytics</h4>
          <div class="analytics-content">
            <div class="analytics-item">
              <span class="analytics-label">Current Value:</span>
              <span class="analytics-value">{formatResourceValue(selectedResource, resources?.[selectedResource] || 0)}</span>
            </div>
            <div class="analytics-item">
              <span class="analytics-label">Efficiency:</span>
              <span class="analytics-value">{getResourceEfficiency(selectedResource)}%</span>
            </div>
            <div class="analytics-item">
              <span class="analytics-label">Trend:</span>
              <span class="analytics-value">{getResourceTrend(selectedResource).trend}</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .world-resources-panel {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 8px;
    margin: 0.5rem;
    border: 1px solid #2a2a3a;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .panel-header:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .panel-header h3 {
    margin: 0;
    color: #e0e0e0;
    font-size: 1rem;
    font-weight: 600;
  }

  .expand-icon {
    color: #888;
    font-size: 1.2rem;
    transition: color 0.2s ease;
  }

  .panel-header:hover .expand-icon {
    color: #e0e0e0;
  }

  .panel-content {
    padding: 1rem;
  }

  .resources-overview {
    margin-bottom: 1rem;
  }

  .resource-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .summary-label {
    color: #ccc;
    font-size: 0.8rem;
  }

  .summary-value {
    color: #e0e0e0;
    font-weight: 600;
  }

  .resources-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .resource-item {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .resource-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .resource-item.selected {
    background: rgba(255, 255, 255, 0.15);
    border-color: #4caf50;
  }

  .resource-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .resource-icon {
    font-size: 1.2rem;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  .resource-info {
    flex: 1;
  }

  .resource-name {
    font-size: 0.85rem;
    color: #ccc;
    margin-bottom: 0.25rem;
  }

  .resource-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e0e0e0;
  }

  .resource-trend {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
  }

  .resource-trend.up {
    background: rgba(0, 255, 0, 0.2);
    color: #00ff00;
  }

  .resource-trend.down {
    background: rgba(255, 0, 0, 0.2);
    color: #ff0000;
  }

  .resource-trend.stable {
    background: rgba(128, 128, 128, 0.2);
    color: #888;
  }

  .resource-bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .resource-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .resource-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }

  .efficiency {
    color: #e0e0e0;
    font-weight: 600;
  }

  .max {
    color: #888;
  }

  .resource-analytics {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .resource-analytics h4 {
    margin: 0 0 0.75rem 0;
    color: #e0e0e0;
    font-size: 0.9rem;
  }

  .analytics-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .analytics-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
  }

  .analytics-label {
    color: #ccc;
    font-size: 0.8rem;
  }

  .analytics-value {
    color: #e0e0e0;
    font-weight: 600;
    font-size: 0.8rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .resource-summary {
      grid-template-columns: 1fr;
    }
    
    .resource-header {
      gap: 0.5rem;
    }
    
    .resource-icon {
      font-size: 1rem;
      width: 1.2rem;
      height: 1.2rem;
    }
  }
</style> 