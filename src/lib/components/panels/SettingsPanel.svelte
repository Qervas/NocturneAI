<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsManager } from '../../services/ui/SettingsManager';

  let llmSettings: any = {};
  let isExpanded = {
    llm: true,
    ui: false,
    simulation: false
  };
  let testResults: Record<string, { success: boolean; message: string; data?: any }> = {};
  let isTesting = false;
  let currentProvider = 'ollama';
  
  // Reactive statement to update current provider when llmSettings changes
  $: if (llmSettings.provider) {
    currentProvider = llmSettings.provider;
  }

  onMount(() => {
    // Load current LLM settings
    llmSettings = settingsManager.getLLMSettings() || {};
    
    // Subscribe to settings changes
    const unsubscribe = settingsManager.store.subscribe(settings => {
      if (settings.llmSettings) {
        llmSettings = { ...settings.llmSettings };
      }
    });

    return unsubscribe;
  });

  function updateLLMSettings(key: string, value: any) {
    llmSettings = { ...llmSettings, [key]: value };
    settingsManager.updateLLMSettings({ [key]: value });
  }

  function updateEndpoint(provider: string, endpoint: string) {
    if (!llmSettings.endpoints) llmSettings.endpoints = {};
    llmSettings.endpoints[provider] = endpoint;
    settingsManager.setLLMEndpoint(provider, endpoint);
  }

  function updateApiKey(provider: string, apiKey: string) {
    if (!llmSettings.apiKeys) llmSettings.apiKeys = {};
    llmSettings.apiKeys[provider] = apiKey;
    settingsManager.setLLMApiKey(provider, apiKey);
  }

  function updateModel(provider: string, model: string) {
    if (!llmSettings.models) llmSettings.models = {};
    llmSettings.models[provider] = model;
    settingsManager.setLLMModel(provider, model);
  }

  async function testEndpoint(provider: string) {
    isTesting = true;
    testResults[provider] = { success: false, message: 'Testing...' };
    
    try {
      const result = await settingsManager.testLLMEndpoint(provider);
      testResults[provider] = result;
    } catch (error) {
      testResults[provider] = {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      isTesting = false;
    }
  }

  function getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      ollama: '🤖',
      openai: '🧠',
      google: '🔍',
      anthropic: '🎭'
    };
    return icons[provider] || '❓';
  }

  function getProviderName(provider: string): string {
    const names: Record<string, string> = {
      ollama: 'Ollama (Local)',
      openai: 'OpenAI',
      google: 'Google Gemini',
      anthropic: 'Anthropic Claude'
    };
    return names[provider] || provider;
  }

  function getDefaultEndpoint(provider: string): string {
    const endpoints: Record<string, string> = {
      ollama: 'http://localhost:11434',
      openai: 'https://api.openai.com/v1',
      google: 'https://generativelanguage.googleapis.com',
      anthropic: 'https://api.anthropic.com'
    };
    return endpoints[provider] || '';
  }

  function getDefaultModel(provider: string): string {
    const models: Record<string, string> = {
      ollama: 'gemma3:latest',
      openai: 'gpt-4',
      google: 'gemini-pro',
      anthropic: 'claude-3-sonnet-20240229'
    };
    return models[provider] || '';
  }
</script>

<div class="settings-panel">
  <div class="panel-header">
    <h2>⚙️ Settings</h2>
    <p class="panel-description">Configure your multi-agent system preferences</p>
  </div>

  <!-- LLM Model Settings -->
  <div class="settings-section">
    <div class="section-header" on:click={() => isExpanded.llm = !isExpanded.llm}>
      <h3>🤖 LLM Model Configuration</h3>
      <span class="expand-icon">{isExpanded.llm ? '−' : '+'}</span>
    </div>

    {#if isExpanded.llm}
      <div class="section-content">
        <!-- Provider Selection -->
        <div class="setting-group">
          <label class="setting-label">Active Provider:</label>
          <div class="provider-selector">
            {#each ['ollama', 'openai', 'google', 'anthropic'] as provider}
              <button 
                class="provider-btn {llmSettings.provider === provider ? 'active' : ''}"
                on:click={() => updateLLMSettings('provider', provider)}
              >
                {getProviderIcon(provider)} {getProviderName(provider)}
              </button>
            {/each}
          </div>
        </div>

        <!-- Current Provider Configuration -->
        <div class="current-provider">
          <h4>{getProviderIcon(currentProvider)} {getProviderName(currentProvider)} Configuration</h4>
          
          <!-- Endpoint -->
          <div class="setting-item">
            <label for="endpoint-{currentProvider}">Endpoint URL:</label>
                         <input 
               id="endpoint-{currentProvider}"
               type="text" 
               value={llmSettings.endpoints?.[currentProvider] || getDefaultEndpoint(currentProvider)}
               on:input={(e) => updateEndpoint(currentProvider, (e.target as HTMLInputElement).value)}
               placeholder="Enter endpoint URL"
             />
          </div>

          <!-- API Key (for non-Ollama providers) -->
          {#if currentProvider !== 'ollama'}
            <div class="setting-item">
              <label for="apikey-{currentProvider}">API Key:</label>
                             <input 
                 id="apikey-{currentProvider}"
                 type="password" 
                 value={llmSettings.apiKeys?.[currentProvider] || ''}
                 on:input={(e) => updateApiKey(currentProvider, (e.target as HTMLInputElement).value)}
                 placeholder="Enter API key"
               />
            </div>
          {/if}

          <!-- Model -->
          <div class="setting-item">
            <label for="model-{currentProvider}">Model:</label>
                         <input 
               id="model-{currentProvider}"
               type="text" 
               value={llmSettings.models?.[currentProvider] || getDefaultModel(currentProvider)}
               on:input={(e) => updateModel(currentProvider, (e.target as HTMLInputElement).value)}
               placeholder="Enter model name"
             />
          </div>

          <!-- Test Button -->
          <div class="setting-item">
            <button 
              class="test-btn {isTesting ? 'testing' : ''}"
              on:click={() => testEndpoint(currentProvider)}
              disabled={isTesting}
            >
              {isTesting ? '🔄 Testing...' : '🧪 Test Connection'}
            </button>
          </div>

          <!-- Test Results -->
          {#if testResults[currentProvider]}
            <div class="test-result {testResults[currentProvider].success ? 'success' : 'error'}">
              <div class="result-header">
                <span class="result-icon">
                  {testResults[currentProvider].success ? '✅' : '❌'}
                </span>
                <span class="result-message">{testResults[currentProvider].message}</span>
              </div>
              {#if testResults[currentProvider].data}
                <details class="result-details">
                  <summary>Response Data</summary>
                  <pre>{JSON.stringify(testResults[currentProvider].data, null, 2)}</pre>
                </details>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Global LLM Settings -->
        <div class="global-settings">
          <h4>🔧 Global Settings</h4>
          
          <div class="setting-item">
            <label for="timeout">Timeout (ms):</label>
                         <input 
               id="timeout"
               type="number" 
               value={llmSettings.timeout || 30000}
               on:input={(e) => updateLLMSettings('timeout', parseInt((e.target as HTMLInputElement).value))}
               min="1000"
               max="120000"
             />
          </div>

          <div class="setting-item">
            <label for="maxTokens">Max Tokens:</label>
                         <input 
               id="maxTokens"
               type="number" 
               value={llmSettings.maxTokens || 4096}
               on:input={(e) => updateLLMSettings('maxTokens', parseInt((e.target as HTMLInputElement).value))}
               min="1"
               max="32000"
             />
          </div>

          <div class="setting-item">
            <label for="temperature">Temperature:</label>
                         <input 
               id="temperature"
               type="range" 
               value={llmSettings.temperature || 0.7}
               on:input={(e) => updateLLMSettings('temperature', parseFloat((e.target as HTMLInputElement).value))}
               min="0"
               max="2"
               step="0.1"
             />
            <span class="range-value">{llmSettings.temperature || 0.7}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- UI Preferences -->
  <div class="settings-section">
    <div class="section-header" on:click={() => isExpanded.ui = !isExpanded.ui}>
      <h3>🎨 UI Preferences</h3>
      <span class="expand-icon">{isExpanded.ui ? '−' : '+'}</span>
    </div>

    {#if isExpanded.ui}
      <div class="section-content">
        <!-- Theme Settings -->
        <div class="setting-group">
          <h4>🎨 Theme & Appearance</h4>
          
          <div class="setting-item">
            <label for="theme">Theme:</label>
            <select 
              id="theme"
              value={llmSettings.ui?.theme || 'dark'}
              on:change={(e) => updateLLMSettings('ui', { ...llmSettings.ui, theme: (e.target as HTMLSelectElement).value })}
            >
              <option value="dark">🌙 Dark Theme</option>
              <option value="light">☀️ Light Theme</option>
              <option value="auto">🔄 Auto (System)</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="accentColor">Accent Color:</label>
            <div class="color-picker">
              {#each ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'] as color}
                <button 
                  class="color-btn {llmSettings.ui?.accentColor === color ? 'active' : ''}"
                  style="background-color: {color}"
                  on:click={() => updateLLMSettings('ui', { ...llmSettings.ui, accentColor: color })}
                ></button>
              {/each}
            </div>
          </div>

          <div class="setting-item">
            <label for="animationSpeed">Animation Speed:</label>
            <select 
              id="animationSpeed"
              value={llmSettings.ui?.animationSpeed || 'normal'}
              on:change={(e) => updateLLMSettings('ui', { ...llmSettings.ui, animationSpeed: (e.target as HTMLSelectElement).value })}
            >
              <option value="fast">⚡ Fast</option>
              <option value="normal">🐌 Normal</option>
              <option value="slow">🐌 Slow</option>
              <option value="disabled">❌ Disabled</option>
            </select>
          </div>
        </div>

        <!-- Layout Settings -->
        <div class="setting-group">
          <h4>📐 Layout & Display</h4>
          
          <div class="setting-item">
            <label for="panelLayout">Panel Layout:</label>
            <select 
              id="panelLayout"
              value={llmSettings.ui?.panelLayout || 'tiling'}
              on:change={(e) => updateLLMSettings('ui', { ...llmSettings.ui, panelLayout: (e.target as HTMLSelectElement).value })}
            >
              <option value="tiling">🧩 Tiling Layout</option>
              <option value="floating">🪟 Floating Panels</option>
              <option value="stacked">📚 Stacked Panels</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="defaultPanels">Default Visible Panels:</label>
            <div class="checkbox-group">
              {#each ['interaction', 'character', 'resources', 'settings', 'help'] as panel}
                <label class="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={llmSettings.ui?.defaultPanels?.includes(panel) || false}
                    on:change={(e) => {
                      const target = e.target as HTMLInputElement;
                      const current = llmSettings.ui?.defaultPanels || [];
                      const updated = target.checked 
                        ? [...current, panel]
                        : current.filter((p: string) => p !== panel);
                      updateLLMSettings('ui', { ...llmSettings.ui, defaultPanels: updated });
                    }}
                  />
                  <span>{panel.charAt(0).toUpperCase() + panel.slice(1)} Panel</span>
                </label>
              {/each}
            </div>
          </div>

          <div class="setting-item">
            <label for="fontSize">Font Size:</label>
            <input 
              id="fontSize"
              type="range" 
              value={llmSettings.ui?.fontSize || 14}
              on:input={(e) => updateLLMSettings('ui', { ...llmSettings.ui, fontSize: parseInt((e.target as HTMLInputElement).value) })}
              min="10"
              max="20"
              step="1"
            />
            <span class="range-value">{llmSettings.ui?.fontSize || 14}px</span>
          </div>
        </div>

        <!-- Interaction Settings -->
        <div class="setting-group">
          <h4>👆 Interaction Preferences</h4>
          
          <div class="setting-item">
            <label for="autoSave">Auto-save:</label>
            <select 
              id="autoSave"
              value={llmSettings.ui?.autoSave || 'enabled'}
              on:change={(e) => updateLLMSettings('ui', { ...llmSettings.ui, autoSave: (e.target as HTMLSelectElement).value })}
            >
              <option value="enabled">✅ Enabled</option>
              <option value="disabled">❌ Disabled</option>
              <option value="prompt">🤔 Prompt</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="confirmActions">Confirm Destructive Actions:</label>
            <select 
              id="confirmActions"
              value={llmSettings.ui?.confirmActions || 'enabled'}
              on:change={(e) => updateLLMSettings('ui', { ...llmSettings.ui, confirmActions: (e.target as HTMLSelectElement).value })}
            >
              <option value="enabled">✅ Always</option>
              <option value="important">⚠️ Important Only</option>
              <option value="disabled">❌ Never</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="tooltips">Tooltips:</label>
            <select 
              id="tooltips"
              value={llmSettings.ui?.tooltips || 'enabled'}
              on:change={(e) => updateLLMSettings('ui', { ...llmSettings.ui, tooltips: (e.target as HTMLSelectElement).value })}
            >
              <option value="enabled">✅ Enabled</option>
              <option value="minimal">📝 Minimal</option>
              <option value="disabled">❌ Disabled</option>
            </select>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Simulation Settings -->
  <div class="settings-section">
    <div class="section-header" on:click={() => isExpanded.simulation = !isExpanded.simulation}>
      <h3>🎮 Simulation Settings</h3>
      <span class="expand-icon">{isExpanded.simulation ? '−' : '+'}</span>
    </div>

    {#if isExpanded.simulation}
      <div class="section-content">
        <!-- Agent Behavior Settings -->
        <div class="setting-group">
          <h4>🤖 Agent Behavior</h4>
          
          <div class="setting-item">
            <label for="agentResponseTime">Agent Response Time (ms):</label>
            <input 
              id="agentResponseTime"
              type="number" 
              value={llmSettings.simulation?.agentResponseTime || 1000}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, agentResponseTime: parseInt((e.target as HTMLInputElement).value) })}
              min="0"
              max="10000"
              step="100"
            />
          </div>

          <div class="setting-item">
            <label for="maxConcurrentAgents">Max Concurrent Agents:</label>
            <input 
              id="maxConcurrentAgents"
              type="number" 
              value={llmSettings.simulation?.maxConcurrentAgents || 3}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, maxConcurrentAgents: parseInt((e.target as HTMLInputElement).value) })}
              min="1"
              max="10"
            />
          </div>

          <div class="setting-item">
            <label for="agentMemoryLimit">Agent Memory Limit (MB):</label>
            <input 
              id="agentMemoryLimit"
              type="number" 
              value={llmSettings.simulation?.agentMemoryLimit || 512}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, agentMemoryLimit: parseInt((e.target as HTMLInputElement).value) })}
              min="64"
              max="2048"
              step="64"
            />
          </div>
        </div>

        <!-- Resource Management -->
        <div class="setting-group">
          <h4>🌍 Resource Management</h4>
          
          <div class="setting-item">
            <label for="resourceDecayRate">Resource Decay Rate:</label>
            <input 
              id="resourceDecayRate"
              type="range" 
              value={llmSettings.simulation?.resourceDecayRate || 0.1}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, resourceDecayRate: parseFloat((e.target as HTMLInputElement).value) })}
              min="0"
              max="1"
              step="0.01"
            />
            <span class="range-value">{llmSettings.simulation?.resourceDecayRate || 0.1}</span>
          </div>

          <div class="setting-item">
            <label for="energyRegeneration">Energy Regeneration Rate:</label>
            <input 
              id="energyRegeneration"
              type="range" 
              value={llmSettings.simulation?.energyRegeneration || 0.05}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, energyRegeneration: parseFloat((e.target as HTMLInputElement).value) })}
              min="0"
              max="0.2"
              step="0.01"
            />
            <span class="range-value">{llmSettings.simulation?.energyRegeneration || 0.05}</span>
          </div>

          <div class="setting-item">
            <label for="knowledgeRetention">Knowledge Retention Rate:</label>
            <input 
              id="knowledgeRetention"
              type="range" 
              value={llmSettings.simulation?.knowledgeRetention || 0.8}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, knowledgeRetention: parseFloat((e.target as HTMLInputElement).value) })}
              min="0"
              max="1"
              step="0.05"
            />
            <span class="range-value">{llmSettings.simulation?.knowledgeRetention || 0.8}</span>
          </div>
        </div>

        <!-- Performance Settings -->
        <div class="setting-group">
          <h4>⚡ Performance & Optimization</h4>
          
          <div class="setting-item">
            <label for="updateInterval">Update Interval (ms):</label>
            <input 
              id="updateInterval"
              type="number" 
              value={llmSettings.simulation?.updateInterval || 100}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, updateInterval: parseInt((e.target as HTMLInputElement).value) })}
              min="50"
              max="1000"
              step="50"
            />
          </div>

          <div class="setting-item">
            <label for="maxHistoryLength">Max History Length:</label>
            <input 
              id="maxHistoryLength"
              type="number" 
              value={llmSettings.simulation?.maxHistoryLength || 1000}
              on:input={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, maxHistoryLength: parseInt((e.target as HTMLInputElement).value) })}
              min="100"
              max="10000"
              step="100"
            />
          </div>

          <div class="setting-item">
            <label for="enableCaching">Enable Caching:</label>
            <select 
              id="enableCaching"
              value={llmSettings.simulation?.enableCaching || 'enabled'}
              on:change={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, enableCaching: (e.target as HTMLSelectElement).value })}
            >
              <option value="enabled">✅ Enabled</option>
              <option value="disabled">❌ Disabled</option>
            </select>
          </div>
        </div>

        <!-- Debug Settings -->
        <div class="setting-group">
          <h4>🐛 Debug & Development</h4>
          
          <div class="setting-item">
            <label for="debugMode">Debug Mode:</label>
            <select 
              id="debugMode"
              value={llmSettings.simulation?.debugMode || 'disabled'}
              on:change={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, debugMode: (e.target as HTMLSelectElement).value })}
            >
              <option value="enabled">🐛 Enabled</option>
              <option value="verbose">📝 Verbose</option>
              <option value="disabled">❌ Disabled</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="logLevel">Log Level:</label>
            <select 
              id="logLevel"
              value={llmSettings.simulation?.logLevel || 'info'}
              on:change={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, logLevel: (e.target as HTMLSelectElement).value })}
            >
              <option value="error">❌ Error Only</option>
              <option value="warn">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
              <option value="debug">🐛 Debug</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="performanceMonitoring">Performance Monitoring:</label>
            <select 
              id="performanceMonitoring"
              value={llmSettings.simulation?.performanceMonitoring || 'enabled'}
              on:change={(e) => updateLLMSettings('simulation', { ...llmSettings.simulation, performanceMonitoring: (e.target as HTMLSelectElement).value })}
            >
              <option value="enabled">📊 Enabled</option>
              <option value="minimal">📈 Minimal</option>
              <option value="disabled">❌ Disabled</option>
            </select>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Actions -->
  <div class="settings-actions">
    <button class="action-btn reset-btn" on:click={() => settingsManager.clear()}>
      🔄 Reset to Defaults
    </button>
    <button class="action-btn export-btn" on:click={() => {
      const data = settingsManager.export();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agent-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    }}>
      📤 Export Settings
    </button>
  </div>
</div>

<style>
  .settings-panel {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 0.5rem;
    border: 1px solid #2a2a3a;
    max-height: 80vh;
    overflow-y: auto;
  }

  .panel-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .panel-header h2 {
    margin: 0 0 0.5rem 0;
    color: #e0e0e0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .panel-description {
    margin: 0;
    color: #888;
    font-size: 0.9rem;
  }

  .settings-section {
    margin-bottom: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .section-header:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .section-header h3 {
    margin: 0;
    color: #e0e0e0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .expand-icon {
    color: #888;
    font-size: 1.2rem;
    transition: color 0.2s ease;
  }

  .section-header:hover .expand-icon {
    color: #e0e0e0;
  }

  .section-content {
    padding: 1.5rem;
  }

  .setting-group {
    margin-bottom: 1.5rem;
  }

  .setting-group h4 {
    margin: 0 0 1rem 0;
    color: #e0e0e0;
    font-size: 1rem;
  }

  .setting-label {
    display: block;
    color: #ccc;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .provider-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .provider-btn {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #ccc;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .provider-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .provider-btn.active {
    background: rgba(76, 175, 80, 0.2);
    border-color: #4caf50;
    color: #4caf50;
  }

  .current-provider {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .current-provider h4 {
    margin: 0 0 1rem 0;
    color: #e0e0e0;
    font-size: 1rem;
  }

  .setting-item {
    margin-bottom: 1rem;
  }

  .setting-item label {
    display: block;
    color: #ccc;
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
  }

  .setting-item input {
    width: 100%;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 0.9rem;
  }

  .setting-item input:focus {
    outline: none;
    border-color: #4caf50;
  }

  .setting-item input[type="range"] {
    width: calc(100% - 3rem);
    margin-right: 0.5rem;
  }

  .range-value {
    color: #4caf50;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .test-btn {
    width: 100%;
    padding: 0.75rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .test-btn:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-1px);
  }

  .test-btn:disabled {
    background: #666;
    cursor: not-allowed;
  }

  .test-btn.testing {
    background: #ff9800;
  }

  .test-result {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 6px;
    border-left: 4px solid;
  }

  .test-result.success {
    background: rgba(76, 175, 80, 0.1);
    border-left-color: #4caf50;
  }

  .test-result.error {
    background: rgba(244, 67, 54, 0.1);
    border-left-color: #f44336;
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .result-icon {
    font-size: 1.2rem;
  }

  .result-message {
    color: #e0e0e0;
    font-weight: 500;
  }

  .result-details {
    margin-top: 0.5rem;
  }

  .result-details summary {
    color: #888;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .result-details pre {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    overflow-x: auto;
    margin-top: 0.5rem;
  }

  .global-settings {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .global-settings h4 {
    margin: 0 0 1rem 0;
    color: #e0e0e0;
    font-size: 1rem;
  }

  .checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ccc;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .checkbox-item input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: #4caf50; /* Customize checkbox color */
  }

  .color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .color-btn {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-btn:hover {
    border-color: #e0e0e0;
    transform: scale(1.1);
  }

  .color-btn.active {
    border-color: #4caf50;
    box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
  }

  .coming-soon {
    color: #888;
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }

  .settings-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .action-btn {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .reset-btn {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
    border: 1px solid rgba(244, 67, 54, 0.3);
  }

  .reset-btn:hover {
    background: rgba(244, 67, 54, 0.3);
  }

  .export-btn {
    background: rgba(33, 150, 243, 0.2);
    color: #2196f3;
    border: 1px solid rgba(33, 150, 243, 0.3);
  }

  .export-btn:hover {
    background: rgba(33, 150, 243, 0.3);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .settings-panel {
      padding: 1rem;
    }
    
    .provider-selector {
      grid-template-columns: 1fr;
    }
    
    .settings-actions {
      flex-direction: column;
    }
  }
</style> 