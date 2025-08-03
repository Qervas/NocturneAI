<script lang="ts">
  import { simulationController, type SimulationSpeed } from '../../services/core/SimulationController';
  import { onMount, onDestroy } from 'svelte';

  // Props
  export let compact: boolean = false;

  // Reactive stores from simulation controller
  $: speed = simulationController.speed;
  $: state = simulationController.state;
  $: statistics = simulationController.statistics;
  $: risks = simulationController.currentRisks;

  // Component state
  let showTooltip = '';
  let showAdvancedStats = false;
  let glowEffect = false;

  // Speed display configurations
  const speedConfig = {
    paused: { label: '⏸️', multiplier: '0x', color: '#888888', description: 'Simulation paused - inspect and plan' },
    normal: { label: '▶️', multiplier: '1x', color: '#4CAF50', description: 'Normal speed - balanced pace' },
    fast: { label: '⏩', multiplier: '2x', color: '#FF9800', description: 'Fast forward - increased risk of errors' },
    very_fast: { label: '⏭️', multiplier: '4x', color: '#F44336', description: 'Very fast - high risk, high reward' }
  };

  // Event handlers
  function handlePlay() {
    if ($state === 'paused') {
      simulationController.play();
      triggerGlowEffect();
    }
  }

  function handlePause() {
    if ($state === 'running') {
      simulationController.pause();
    }
  }

  function handleToggle() {
    simulationController.toggle();
    triggerGlowEffect();
  }

  function handleSpeedCycle() {
    simulationController.cycleSpeed();
    triggerGlowEffect();
  }

  function handleReset() {
    simulationController.reset();
  }

  function triggerGlowEffect() {
    glowEffect = true;
    setTimeout(() => glowEffect = false, 300);
  }

  // Tooltip management
  function showTooltipFor(key: string) {
    showTooltip = key;
  }

  function hideTooltip() {
    showTooltip = '';
  }

  // Format time helpers
  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function formatNumber(num: number): string {
    return num.toLocaleString();
  }

  function getRiskColor(risk: number): string {
    if (risk < 0.05) return '#4CAF50';
    if (risk < 0.15) return '#FF9800';
    return '#F44336';
  }

  // Lifecycle
  onMount(() => {
    // Start with a slight glow effect
    setTimeout(() => triggerGlowEffect(), 500);
  });
</script>

{#if compact}
  <!-- Compact Header Mode -->
  <div class="simulation-controls-compact" class:glow={glowEffect}>
    <div class="compact-controls">
      <!-- Play/Pause Button -->
      <button
        class="compact-btn primary"
        class:active={$state === 'running'}
        on:click={handleToggle}
        on:mouseenter={() => showTooltipFor('toggle')}
        on:mouseleave={hideTooltip}
        style="color: {$state === 'running' ? speedConfig[$speed].color : '#00ff88'}"
      >
        {$state === 'running' ? '⏸️' : '▶️'}
      </button>

      <!-- Speed Control -->
      <button
        class="compact-btn speed"
        class:active={$state === 'running'}
        on:click={handleSpeedCycle}
        on:mouseenter={() => showTooltipFor('speed')}
        on:mouseleave={hideTooltip}
        style="color: {speedConfig[$speed].color}"
      >
        <span class="speed-text">{speedConfig[$speed].multiplier}</span>
      </button>

      <!-- Status Display -->
      <div class="compact-status">
        <div
          class="status-dot"
          class:running={$state === 'running'}
          class:paused={$state === 'paused'}
        ></div>
        <span class="status-text">{$state === 'running' ? 'RUNNING' : 'PAUSED'}</span>
      </div>

      <!-- Quick Stats -->
      <div class="compact-stats">
        <span class="compact-stat">{formatNumber($statistics.tickCount)} ticks</span>
        <span class="compact-stat">{formatTime($statistics.totalRunTime)}</span>
      </div>

      <!-- Reset Button -->
      <button
        class="compact-btn secondary"
        on:click={handleReset}
        on:mouseenter={() => showTooltipFor('reset')}
        on:mouseleave={hideTooltip}
      >
        🔄
      </button>
    </div>

    <!-- Tooltips for compact mode -->
    {#if showTooltip}
      <div class="compact-tooltip">
        {#if showTooltip === 'toggle'}
          <div class="tooltip-content">
            <strong>{$state === 'running' ? 'Pause' : 'Play'} Simulation</strong>
            <p>{$state === 'running' ? 'Pause to inspect agents and plan strategy' : 'Start the simulation and watch your AI company work'}</p>
          </div>
        {:else if showTooltip === 'speed'}
          <div class="tooltip-content">
            <strong>Speed: {speedConfig[$speed].multiplier}</strong>
            <p>{speedConfig[$speed].description}</p>
            <small>Click to cycle through speeds</small>
          </div>
        {:else if showTooltip === 'reset'}
          <div class="tooltip-content">
            <strong>Reset Simulation</strong>
            <p>Clear all statistics and start fresh</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <!-- Full Control Panel Mode -->
  <div class="simulation-controls" class:glow={glowEffect}>
    <!-- Main Control Panel -->
    <div class="control-panel">
      <div class="primary-controls">
        <!-- Play/Pause Button -->
        <button
          class="control-btn primary"
          class:active={$state === 'running'}
          on:click={handleToggle}
          on:mouseenter={() => showTooltipFor('toggle')}
          on:mouseleave={hideTooltip}
          style="color: {$state === 'running' ? speedConfig[$speed].color : '#888'}"
        >
          {$state === 'running' ? '⏸️' : '▶️'}
        </button>

        <!-- Speed Control -->
        <button
          class="control-btn speed"
          class:active={$state === 'running'}
          on:click={handleSpeedCycle}
          on:mouseenter={() => showTooltipFor('speed')}
          on:mouseleave={hideTooltip}
          style="color: {speedConfig[$speed].color}"
        >
          <span class="speed-icon">{speedConfig[$speed].label}</span>
          <span class="speed-text">{speedConfig[$speed].multiplier}</span>
        </button>

        <!-- Reset Button -->
        <button
          class="control-btn secondary"
          on:click={handleReset}
          on:mouseenter={() => showTooltipFor('reset')}
          on:mouseleave={hideTooltip}
        >
          🔄
        </button>
      </div>

      <!-- Status Indicator -->
      <div class="status-indicator">
        <div
          class="status-dot"
          class:running={$state === 'running'}
          class:paused={$state === 'paused'}
        ></div>
        <span class="status-text">{$state.toUpperCase()}</span>
      </div>
    </div>

    <!-- Stats Panel -->
    <div class="stats-panel">
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{formatNumber($statistics.tickCount)}</span>
          <span class="stat-label">Ticks</span>
        </div>

        <div class="stat-item">
          <span class="stat-value">{formatTime($statistics.totalRunTime)}</span>
          <span class="stat-label">Runtime</span>
        </div>

        <div class="stat-item">
          <span class="stat-value">{formatNumber($statistics.agentActionCount)}</span>
          <span class="stat-label">Actions</span>
        </div>
      </div>

      <!-- Risk Indicators (only show during fast speeds) -->
      {#if $speed === 'fast' || $speed === 'very_fast'}
        <div class="risk-panel">
          <div class="risk-item">
            <span class="risk-label">Error Risk:</span>
            <span
              class="risk-value"
              style="color: {getRiskColor($risks.errorProbability)}"
            >
              {Math.round($risks.errorProbability * 100)}%
            </span>
          </div>

          <div class="risk-item">
            <span class="risk-label">Fatigue Risk:</span>
            <span
              class="risk-value"
              style="color: {getRiskColor($risks.agentFatigueProbability)}"
            >
              {Math.round($risks.agentFatigueProbability * 100)}%
            </span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Advanced Stats Toggle -->
    <button
      class="stats-toggle"
      on:click={() => showAdvancedStats = !showAdvancedStats}
    >
      {showAdvancedStats ? '⬆️' : '⬇️'} Stats
    </button>

    <!-- Advanced Stats Panel -->
    {#if showAdvancedStats}
      <div class="advanced-stats">
        <div class="advanced-stats-grid">
          <div class="advanced-stat">
            <span class="advanced-label">Avg Tick Duration:</span>
            <span class="advanced-value">{Math.round($statistics.avgTickDuration)}ms</span>
          </div>

          <div class="advanced-stat">
            <span class="advanced-label">Error Count:</span>
            <span class="advanced-value" style="color: {$statistics.errorCount > 0 ? '#F44336' : '#4CAF50'}">
              {$statistics.errorCount}
            </span>
          </div>

          <div class="advanced-stat">
            <span class="advanced-label">Success Rate:</span>
            <span class="advanced-value">
              {$statistics.agentActionCount > 0 ?
                Math.round(((($statistics.agentActionCount - $statistics.errorCount) / $statistics.agentActionCount) * 100)) : 100}%
            </span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Tooltips -->
    {#if showTooltip}
      <div class="tooltip">
        {#if showTooltip === 'toggle'}
          <div class="tooltip-content">
            <strong>{$state === 'running' ? 'Pause' : 'Play'} Simulation</strong>
            <p>{$state === 'running' ? 'Pause to inspect agents and plan strategy' : 'Start the simulation and watch your AI company work'}</p>
          </div>
        {:else if showTooltip === 'speed'}
          <div class="tooltip-content">
            <strong>Speed: {speedConfig[$speed].multiplier}</strong>
            <p>{speedConfig[$speed].description}</p>
            <small>Click to cycle through speeds</small>
          </div>
        {:else if showTooltip === 'reset'}
          <div class="tooltip-content">
            <strong>Reset Simulation</strong>
            <p>Clear all statistics and start fresh</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

  <style>
  /* Compact Header Mode Styles */
  .simulation-controls-compact {
    display: flex;
    align-items: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    position: relative;
  }

  .simulation-controls-compact.glow {
    filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.4));
  }

  .compact-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }

  .compact-btn {
    background: transparent;
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: #00ff88;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 32px;
    justify-content: center;
  }

  .compact-btn:hover {
    background: rgba(0, 255, 136, 0.1);
    border-color: #00ff88;
    transform: translateY(-1px);
  }

  .compact-btn.primary {
    background: rgba(0, 255, 136, 0.1);
    font-size: 16px;
  }

  .compact-btn.primary.active {
    background: rgba(0, 255, 136, 0.2);
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
  }

  .compact-btn.secondary {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .compact-btn.secondary:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }

  .compact-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(0, 255, 136, 0.1);
    border-radius: 6px;
  }

  .compact-stats {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .compact-stat {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    white-space: nowrap;
  }

  .speed-text {
    font-size: 12px;
    font-weight: 600;
  }

  .status-text {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .compact-tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    background: rgba(15, 15, 25, 0.95);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    padding: 8px 12px;
    color: #ffffff;
    font-size: 12px;
    max-width: 200px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    z-index: 1001;
    animation: tooltipFadeIn 0.2s ease;
  }

  /* Full Control Panel Mode Styles */
  .simulation-controls {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgba(25, 25, 35, 0.95), rgba(35, 35, 50, 0.95));
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    padding: 16px;
    min-width: 400px;
    z-index: 1000;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    transition: all 0.3s ease;
  }

  .simulation-controls.glow {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(76, 175, 80, 0.3);
  }

  .control-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .primary-controls {
    display: flex;
    gap: 12px;
  }

  .control-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 12px 16px;
    color: #ffffff;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 60px;
    justify-content: center;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .control-btn.primary {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(56, 142, 60, 0.3));
    border-color: rgba(76, 175, 80, 0.5);
  }

  .control-btn.primary.active {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.5), rgba(56, 142, 60, 0.5));
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.3);
  }

  .control-btn.speed {
    min-width: 80px;
  }

  .speed-text {
    font-size: 14px;
    font-weight: 600;
  }

  .control-btn.secondary {
    background: rgba(158, 158, 158, 0.2);
    border-color: rgba(158, 158, 158, 0.3);
    color: #cccccc;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #888888;
    transition: all 0.3s ease;
  }

  .status-dot.running {
    background: #4CAF50;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
    animation: pulse 2s infinite;
  }

  .status-dot.paused {
    background: #FF9800;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .stats-panel {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 8px;
  }

  .stats-row {
    display: flex;
    justify-content: space-around;
    gap: 16px;
  }

  .stat-item {
    text-align: center;
    flex: 1;
  }

  .stat-value {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 2px;
  }

  .stat-label {
    font-size: 12px;
    color: #cccccc;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .risk-panel {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-around;
  }

  .risk-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .risk-label {
    font-size: 11px;
    color: #cccccc;
    text-transform: uppercase;
  }

  .risk-value {
    font-size: 14px;
    font-weight: 600;
  }

  .stats-toggle {
    background: none;
    border: none;
    color: #cccccc;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
    width: 100%;
    text-align: center;
  }

  .stats-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .advanced-stats {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    margin-top: 8px;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .advanced-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .advanced-stat {
    text-align: center;
  }

  .advanced-label {
    display: block;
    font-size: 11px;
    color: #cccccc;
    margin-bottom: 4px;
  }

  .advanced-value {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }

  .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 12px;
    background: rgba(15, 15, 25, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 12px 16px;
    color: #ffffff;
    font-size: 14px;
    max-width: 280px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    z-index: 1001;
    animation: tooltipFadeIn 0.2s ease;
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .tooltip-content strong {
    display: block;
    margin-bottom: 6px;
    color: #4CAF50;
  }

  .tooltip-content p {
    margin: 0 0 4px 0;
    line-height: 1.4;
  }

  .tooltip-content small {
    color: #cccccc;
    font-size: 12px;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .simulation-controls {
      bottom: 10px;
      left: 10px;
      right: 10px;
      transform: none;
      min-width: unset;
      width: calc(100% - 20px);
    }

    .stats-row {
      gap: 8px;
    }

    .advanced-stats-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .tooltip {
      max-width: 200px;
    }
  }
</style>
