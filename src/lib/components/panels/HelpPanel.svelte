<script lang="ts">
  let activeTab = 'overview';
  let isExpanded = {
    gettingStarted: true,
    features: false,
    troubleshooting: false,
    api: false
  };
  let searchQuery = '';
  let showSearchResults = false;
  let quickActions = [
    { icon: '⚙️', label: 'Open Settings', action: 'settings' },
    { icon: '🧪', label: 'Test Connection', action: 'test' },
    { icon: '📖', label: 'View Documentation', action: 'docs' },
    { icon: '🐛', label: 'Debug Mode', action: 'debug' }
  ];

  // Search functionality
  function performSearch() {
    if (searchQuery.trim()) {
      showSearchResults = true;
      // In a real implementation, this would search through help content
    }
  }

  function handleQuickAction(action: string) {
    switch (action) {
      case 'settings':
        // Navigate to settings
        break;
      case 'test':
        // Open test panel
        break;
      case 'docs':
        // Open documentation
        break;
      case 'debug':
        // Toggle debug mode
        break;
    }
  }

  // Filter content based on search
  $: filteredContent = searchQuery.trim() ? 
    getFilteredContent(searchQuery.toLowerCase()) : null;

  function getFilteredContent(query: string) {
    // This would search through all help content
    return {
      sections: [
        {
          title: 'LLM Configuration',
          content: 'Configure your LLM provider settings in the Settings panel...',
          tab: 'api'
        },
        {
          title: 'Agent Management',
          content: 'Manage your agents in the Character panel...',
          tab: 'features'
        }
      ]
    };
  }
</script>

<div class="help-panel">
  <div class="panel-header">
    <h2>❓ Help & Documentation</h2>
    <p class="panel-description">Get help with the multi-agent system</p>
  </div>

  <!-- Search Bar -->
  <div class="search-container">
    <div class="search-input">
      <input 
        type="text" 
        placeholder="🔍 Search help content..."
        bind:value={searchQuery}
        on:keydown={(e) => e.key === 'Enter' && performSearch()}
      />
      <button class="search-btn" on:click={performSearch}>
        🔍
      </button>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="quick-actions">
    {#each quickActions as action}
      <button 
        class="quick-action-btn"
        on:click={() => handleQuickAction(action.action)}
      >
        <span class="action-icon">{action.icon}</span>
        <span class="action-label">{action.label}</span>
      </button>
    {/each}
  </div>

  <!-- Search Results -->
  {#if showSearchResults && filteredContent}
    <div class="search-results">
      <h3>🔍 Search Results for "{searchQuery}"</h3>
      {#each filteredContent.sections as section}
        <div class="search-result-item">
          <h4>{section.title}</h4>
          <p>{section.content}</p>
          <button 
            class="view-section-btn"
            on:click={() => {
              activeTab = section.tab;
              showSearchResults = false;
              searchQuery = '';
            }}
          >
            View in {section.tab} tab
          </button>
        </div>
      {/each}
      <button 
        class="clear-search-btn"
        on:click={() => {
          showSearchResults = false;
          searchQuery = '';
        }}
      >
        ✕ Clear Search
      </button>
    </div>
  {:else if !showSearchResults}
    <!-- Navigation Tabs -->
    <div class="help-tabs">
      <button 
        class="tab-btn {activeTab === 'overview' ? 'active' : ''}"
        on:click={() => activeTab = 'overview'}
      >
        📖 Overview
      </button>
      <button 
        class="tab-btn {activeTab === 'features' ? 'active' : ''}"
        on:click={() => activeTab = 'features'}
      >
        ⚡ Features
      </button>
      <button 
        class="tab-btn {activeTab === 'troubleshooting' ? 'active' : ''}"
        on:click={() => activeTab = 'troubleshooting'}
      >
        🔧 Troubleshooting
      </button>
      <button 
        class="tab-btn {activeTab === 'api' ? 'active' : ''}"
        on:click={() => activeTab = 'api'}
      >
        🔌 API Reference
      </button>
    </div>

    <!-- Overview Tab -->
    {#if activeTab === 'overview'}
      <div class="tab-content">
        <div class="help-section">
          <h3>🎯 Multi-Agent System Overview</h3>
          <p>
            This is a sophisticated multi-agent system that enables AI agents to collaborate, 
            communicate, and perform complex tasks together. The system features:
          </p>
          
          <ul class="feature-list">
            <li><strong>🤖 Multiple AI Agents</strong> - Alpha, Beta, and Gamma with distinct personalities</li>
            <li><strong>🔧 Core Skills</strong> - File system, terminal commands, code analysis, and data processing</li>
            <li><strong>🧠 LLM Integration</strong> - Support for Ollama, OpenAI, Google Gemini, and Anthropic Claude</li>
            <li><strong>💬 Real-time Communication</strong> - Inter-agent messaging and coordination</li>
            <li><strong>📊 Resource Management</strong> - World resources tracking and analytics</li>
            <li><strong>🎮 Game-like Interface</strong> - Interactive, visual agent management</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>🚀 Getting Started</h3>
          <div class="getting-started-grid">
            <div class="step-card">
              <div class="step-number">1</div>
              <h4>Configure LLM Settings</h4>
              <p>Go to Settings → LLM Model Configuration and set up your preferred provider</p>
            </div>
            <div class="step-card">
              <div class="step-number">2</div>
              <h4>Test Your Connection</h4>
              <p>Use the test button to verify your LLM provider is working correctly</p>
            </div>
            <div class="step-card">
              <div class="step-number">3</div>
              <h4>Select Agents</h4>
              <p>Choose which agents to activate in the Character Panel</p>
            </div>
            <div class="step-card">
              <div class="step-number">4</div>
              <h4>Assign Skills</h4>
              <p>Enable specific skills for each agent based on your needs</p>
            </div>
            <div class="step-card">
              <div class="step-number">5</div>
              <h4>Start Interacting</h4>
              <p>Use the Interaction Panel to communicate with agents</p>
            </div>
          </div>
        </div>

        <div class="help-section">
          <h3>🎮 Interface Guide</h3>
          <div class="interface-guide">
            <div class="guide-item">
              <h4>💬 Interaction Panel</h4>
              <p>Central hub for communicating with agents. Type natural language requests and the system will route them to appropriate agents and skills.</p>
              <div class="guide-tips">
                <strong>💡 Tips:</strong>
                <ul>
                  <li>Use natural language - no special syntax required</li>
                  <li>Mention specific agents by name for direct communication</li>
                  <li>Ask for file operations, code analysis, or system commands</li>
                </ul>
              </div>
            </div>
            
            <div class="guide-item">
              <h4>👥 Character Panel</h4>
              <p>Manage agent selection, personalities, and skill assignments. Configure how agents behave and what they can do.</p>
              <div class="guide-tips">
                <strong>💡 Tips:</strong>
                <ul>
                  <li>Enable only the agents you need to save resources</li>
                  <li>Assign skills based on the task requirements</li>
                  <li>Customize agent personalities for different scenarios</li>
                </ul>
              </div>
            </div>
            
            <div class="guide-item">
              <h4>🌍 World Resources</h4>
              <p>Monitor system resources, agent status, and project progress. Track energy, materials, knowledge, and other metrics.</p>
              <div class="guide-tips">
                <strong>💡 Tips:</strong>
                <ul>
                  <li>Watch resource levels to optimize performance</li>
                  <li>Monitor agent energy and knowledge retention</li>
                  <li>Use resource data for system optimization</li>
                </ul>
              </div>
            </div>
            
            <div class="guide-item">
              <h4>⚙️ Settings</h4>
              <p>Configure LLM providers, endpoints, API keys, and system preferences. Test connections and manage configurations.</p>
              <div class="guide-tips">
                <strong>💡 Tips:</strong>
                <ul>
                  <li>Test connections before starting work</li>
                  <li>Save your configurations for future use</li>
                  <li>Export settings as backup</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- System Status -->
        <div class="help-section">
          <h3>📊 System Status</h3>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-icon">🟢</span>
              <span class="status-label">System Online</span>
            </div>
            <div class="status-item">
              <span class="status-icon">🤖</span>
              <span class="status-label">3 Agents Available</span>
            </div>
            <div class="status-item">
              <span class="status-icon">🔧</span>
              <span class="status-label">4 Skills Active</span>
            </div>
            <div class="status-item">
              <span class="status-icon">💾</span>
              <span class="status-label">Storage: 2.1GB</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

  <!-- Features Tab -->
  {#if activeTab === 'features'}
    <div class="tab-content">
      <div class="help-section">
        <h3>🔧 Core Skills</h3>
        
        <div class="skill-info">
          <h4>📁 File System Skill</h4>
          <p>Comprehensive file and directory management capabilities:</p>
          <ul>
            <li>Read, write, create, delete files</li>
            <li>Move and copy files between locations</li>
            <li>Search files by name, content, or pattern</li>
            <li>Get file metadata and information</li>
            <li>Directory creation and management</li>
          </ul>
        </div>

        <div class="skill-info">
          <h4>💻 Terminal Command Skill</h4>
          <p>Execute system commands and monitor system resources:</p>
          <ul>
            <li>Execute commands with arguments and working directory</li>
            <li>List running processes and system information</li>
            <li>Test network connectivity and port scanning</li>
            <li>User management and system administration</li>
            <li>Command execution with timeout handling</li>
          </ul>
        </div>

        <div class="skill-info">
          <h4>🔍 Code Analysis Skill</h4>
          <p>Analyze and understand code structure:</p>
          <ul>
            <li>Syntax analysis and validation</li>
            <li>Code structure understanding</li>
            <li>Function and class extraction</li>
            <li>Dependency analysis</li>
            <li>Language-specific analysis</li>
          </ul>
        </div>

        <div class="skill-info">
          <h4>📊 Data Processing Skill</h4>
          <p>Process and analyze data:</p>
          <ul>
            <li>Data parsing and validation</li>
            <li>Statistical analysis</li>
            <li>Data transformation and filtering</li>
            <li>Aggregation and summarization</li>
            <li>Export capabilities</li>
          </ul>
        </div>
      </div>

      <div class="help-section">
        <h3>🤖 Agent Personalities</h3>
        
        <div class="agent-info">
          <h4>👨‍💼 Alpha Agent</h4>
          <p><strong>Personality:</strong> Friendly and analytical</p>
          <p><strong>Specialties:</strong> File operations, data analysis, general assistance</p>
          <p><strong>Communication Style:</strong> Helpful, detailed explanations, step-by-step guidance</p>
        </div>

        <div class="agent-info">
          <h4>👩‍💻 Beta Agent</h4>
          <p><strong>Personality:</strong> Technical and precise</p>
          <p><strong>Specialties:</strong> Code analysis, system operations, technical troubleshooting</p>
          <p><strong>Communication Style:</strong> Technical, detailed, focused on accuracy</p>
        </div>

        <div class="agent-info">
          <h4>🎨 Gamma Agent</h4>
          <p><strong>Personality:</strong> Creative and inspiring</p>
          <p><strong>Specialties:</strong> Creative tasks, brainstorming, innovative solutions</p>
          <p><strong>Communication Style:</strong> Creative, inspiring, out-of-the-box thinking</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Troubleshooting Tab -->
  {#if activeTab === 'troubleshooting'}
    <div class="tab-content">
      <div class="help-section">
        <h3>🔧 Common Issues</h3>
        
        <div class="troubleshooting-item">
          <h4>❌ LLM Connection Failed</h4>
          <p><strong>Problem:</strong> Cannot connect to LLM provider</p>
          <p><strong>Solutions:</strong></p>
          <ul>
            <li>Check your internet connection</li>
            <li>Verify API keys are correct</li>
            <li>Ensure endpoint URLs are valid</li>
            <li>Test connection in Settings panel</li>
            <li>Check if Ollama is running (for local setup)</li>
          </ul>
        </div>

        <div class="troubleshooting-item">
          <h4>⚠️ File Operations Not Working</h4>
          <p><strong>Problem:</strong> Cannot read/write files</p>
          <p><strong>Solutions:</strong></p>
          <ul>
            <li>Ensure Tauri backend is running</li>
            <li>Check file permissions</li>
            <li>Verify file paths are correct</li>
            <li>Try running with elevated permissions</li>
          </ul>
        </div>

        <div class="troubleshooting-item">
          <h4>🤖 Agent Not Responding</h4>
          <p><strong>Problem:</strong> Agent doesn't respond to requests</p>
          <p><strong>Solutions:</strong></p>
          <ul>
            <li>Check if agent is enabled in Character Panel</li>
            <li>Verify required skills are assigned</li>
            <li>Check LLM connection status</li>
            <li>Try restarting the application</li>
          </ul>
        </div>

        <div class="troubleshooting-item">
          <h4>💾 Settings Not Saving</h4>
          <p><strong>Problem:</strong> Settings changes are not persisted</p>
          <p><strong>Solutions:</strong></p>
          <ul>
            <li>Check browser localStorage permissions</li>
            <li>Try clearing browser cache</li>
            <li>Export settings as backup</li>
            <li>Reset to defaults if needed</li>
          </ul>
        </div>
      </div>

      <div class="help-section">
        <h3>📞 Support</h3>
        <p>If you're still experiencing issues:</p>
        <ul>
          <li>Check the console for error messages</li>
          <li>Verify all dependencies are installed</li>
          <li>Ensure you have the latest version</li>
          <li>Try running in a different browser</li>
          <li>Report issues with detailed error messages</li>
        </ul>
      </div>
    </div>
  {/if}

  <!-- API Reference Tab -->
  {#if activeTab === 'api'}
    <div class="tab-content">
      <div class="help-section">
        <h3>🔌 LLM Provider APIs</h3>
        
        <div class="api-info">
          <h4>🤖 Ollama (Local)</h4>
          <p><strong>Endpoint:</strong> <code>http://localhost:11434</code></p>
          <p><strong>Default Model:</strong> <code>gemma3:latest</code></p>
          <p><strong>Setup:</strong> Install Ollama and run <code>ollama serve</code></p>
          <p><strong>No API key required</strong></p>
        </div>

        <div class="api-info">
          <h4>🧠 OpenAI</h4>
          <p><strong>Endpoint:</strong> <code>https://api.openai.com/v1</code></p>
          <p><strong>Default Model:</strong> <code>gpt-4</code></p>
          <p><strong>Setup:</strong> Get API key from <a href="https://platform.openai.com" target="_blank">OpenAI Platform</a></p>
        </div>

        <div class="api-info">
          <h4>🔍 Google Gemini</h4>
          <p><strong>Endpoint:</strong> <code>https://generativelanguage.googleapis.com</code></p>
          <p><strong>Default Model:</strong> <code>gemini-pro</code></p>
          <p><strong>Setup:</strong> Get API key from <a href="https://makersuite.google.com" target="_blank">Google AI Studio</a></p>
        </div>

        <div class="api-info">
          <h4>🎭 Anthropic Claude</h4>
          <p><strong>Endpoint:</strong> <code>https://api.anthropic.com</code></p>
          <p><strong>Default Model:</strong> <code>claude-3-sonnet-20240229</code></p>
          <p><strong>Setup:</strong> Get API key from <a href="https://console.anthropic.com" target="_blank">Anthropic Console</a></p>
        </div>
      </div>

      <div class="help-section">
        <h3>⚙️ Configuration Parameters</h3>
        
        <div class="config-info">
          <h4>Global Settings</h4>
          <ul>
            <li><strong>Timeout:</strong> Maximum time to wait for LLM response (ms)</li>
            <li><strong>Max Tokens:</strong> Maximum tokens in response</li>
            <li><strong>Temperature:</strong> Controls randomness (0.0 = deterministic, 2.0 = very random)</li>
          </ul>
        </div>

        <div class="config-info">
          <h4>Provider-Specific Settings</h4>
          <ul>
            <li><strong>Endpoint URL:</strong> API endpoint for the provider</li>
            <li><strong>API Key:</strong> Authentication key (except Ollama)</li>
            <li><strong>Model:</strong> Specific model to use</li>
          </ul>
        </div>
              </div>
      </div>
    {/if}

    <!-- Features Tab -->
    {#if activeTab === 'features'}
      <div class="tab-content">
        <div class="help-section">
          <h3>🔧 Core Skills</h3>
          
          <div class="skill-info">
            <h4>📁 File System Skill</h4>
            <p>Comprehensive file and directory management capabilities:</p>
            <ul>
              <li>Read, write, create, delete files</li>
              <li>Move and copy files between locations</li>
              <li>Search files by name, content, or pattern</li>
              <li>Get file metadata and information</li>
              <li>Directory creation and management</li>
            </ul>
          </div>

          <div class="skill-info">
            <h4>💻 Terminal Command Skill</h4>
            <p>Execute system commands and monitor system resources:</p>
            <ul>
              <li>Execute commands with arguments and working directory</li>
              <li>List running processes and system information</li>
              <li>Test network connectivity and port scanning</li>
              <li>User management and system administration</li>
              <li>Command execution with timeout handling</li>
            </ul>
          </div>

          <div class="skill-info">
            <h4>🔍 Code Analysis Skill</h4>
            <p>Analyze and understand code structure:</p>
            <ul>
              <li>Syntax analysis and validation</li>
              <li>Code structure understanding</li>
              <li>Function and class extraction</li>
              <li>Dependency analysis</li>
              <li>Language-specific analysis</li>
            </ul>
          </div>

          <div class="skill-info">
            <h4>📊 Data Processing Skill</h4>
            <p>Process and analyze data:</p>
            <ul>
              <li>Data parsing and validation</li>
              <li>Statistical analysis</li>
              <li>Data transformation and filtering</li>
              <li>Aggregation and summarization</li>
              <li>Export capabilities</li>
            </ul>
          </div>
        </div>

        <div class="help-section">
          <h3>🤖 Agent Personalities</h3>
          
          <div class="agent-info">
            <h4>👨‍💼 Alpha Agent</h4>
            <p><strong>Personality:</strong> Friendly and analytical</p>
            <p><strong>Specialties:</strong> File operations, data analysis, general assistance</p>
            <p><strong>Communication Style:</strong> Helpful, detailed explanations, step-by-step guidance</p>
          </div>

          <div class="agent-info">
            <h4>👩‍💻 Beta Agent</h4>
            <p><strong>Personality:</strong> Technical and precise</p>
            <p><strong>Specialties:</strong> Code analysis, system operations, technical troubleshooting</p>
            <p><strong>Communication Style:</strong> Technical, detailed, focused on accuracy</p>
          </div>

          <div class="agent-info">
            <h4>🎨 Gamma Agent</h4>
            <p><strong>Personality:</strong> Creative and inspiring</p>
            <p><strong>Specialties:</strong> Creative tasks, brainstorming, innovative solutions</p>
            <p><strong>Communication Style:</strong> Creative, inspiring, out-of-the-box thinking</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Troubleshooting Tab -->
    {#if activeTab === 'troubleshooting'}
      <div class="tab-content">
        <div class="help-section">
          <h3>🔧 Common Issues</h3>
          
          <div class="troubleshooting-item">
            <h4>❌ LLM Connection Failed</h4>
            <p><strong>Problem:</strong> Cannot connect to LLM provider</p>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Check your internet connection</li>
              <li>Verify API keys are correct</li>
              <li>Ensure endpoint URLs are valid</li>
              <li>Test connection in Settings panel</li>
              <li>Check if Ollama is running (for local setup)</li>
            </ul>
          </div>

          <div class="troubleshooting-item">
            <h4>⚠️ File Operations Not Working</h4>
            <p><strong>Problem:</strong> Cannot read/write files</p>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Ensure Tauri backend is running</li>
              <li>Check file permissions</li>
              <li>Verify file paths are correct</li>
              <li>Try running with elevated permissions</li>
            </ul>
          </div>

          <div class="troubleshooting-item">
            <h4>🤖 Agent Not Responding</h4>
            <p><strong>Problem:</strong> Agent doesn't respond to requests</p>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Check if agent is enabled in Character Panel</li>
              <li>Verify required skills are assigned</li>
              <li>Check LLM connection status</li>
              <li>Try restarting the application</li>
            </ul>
          </div>

          <div class="troubleshooting-item">
            <h4>💾 Settings Not Saving</h4>
            <p><strong>Problem:</strong> Settings changes are not persisted</p>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Check browser localStorage permissions</li>
              <li>Try clearing browser cache</li>
              <li>Export settings as backup</li>
              <li>Reset to defaults if needed</li>
            </ul>
          </div>
        </div>

        <div class="help-section">
          <h3>📞 Support</h3>
          <p>If you're still experiencing issues:</p>
          <ul>
            <li>Check the console for error messages</li>
            <li>Verify all dependencies are installed</li>
            <li>Ensure you have the latest version</li>
            <li>Try running in a different browser</li>
            <li>Report issues with detailed error messages</li>
          </ul>
        </div>
      </div>
    {/if}

    <!-- API Reference Tab -->
    {#if activeTab === 'api'}
      <div class="tab-content">
        <div class="help-section">
          <h3>🔌 LLM Provider APIs</h3>
          
          <div class="api-info">
            <h4>🤖 Ollama (Local)</h4>
            <p><strong>Endpoint:</strong> <code>http://localhost:11434</code></p>
            <p><strong>Default Model:</strong> <code>gemma3:latest</code></p>
            <p><strong>Setup:</strong> Install Ollama and run <code>ollama serve</code></p>
            <p><strong>No API key required</strong></p>
          </div>

          <div class="api-info">
            <h4>🧠 OpenAI</h4>
            <p><strong>Endpoint:</strong> <code>https://api.openai.com/v1</code></p>
            <p><strong>Default Model:</strong> <code>gpt-4</code></p>
            <p><strong>Setup:</strong> Get API key from <a href="https://platform.openai.com" target="_blank">OpenAI Platform</a></p>
          </div>

          <div class="api-info">
            <h4>🔍 Google Gemini</h4>
            <p><strong>Endpoint:</strong> <code>https://generativelanguage.googleapis.com</code></p>
            <p><strong>Default Model:</strong> <code>gemini-pro</code></p>
            <p><strong>Setup:</strong> Get API key from <a href="https://makersuite.google.com" target="_blank">Google AI Studio</a></p>
          </div>

          <div class="api-info">
            <h4>🎭 Anthropic Claude</h4>
            <p><strong>Endpoint:</strong> <code>https://api.anthropic.com</code></p>
            <p><strong>Default Model:</strong> <code>claude-3-sonnet-20240229</code></p>
            <p><strong>Setup:</strong> Get API key from <a href="https://console.anthropic.com" target="_blank">Anthropic Console</a></p>
          </div>
        </div>

        <div class="help-section">
          <h3>⚙️ Configuration Parameters</h3>
          
          <div class="config-info">
            <h4>Global Settings</h4>
            <ul>
              <li><strong>Timeout:</strong> Maximum time to wait for LLM response (ms)</li>
              <li><strong>Max Tokens:</strong> Maximum tokens in response</li>
              <li><strong>Temperature:</strong> Controls randomness (0.0 = deterministic, 2.0 = very random)</li>
            </ul>
          </div>

          <div class="config-info">
            <h4>Provider-Specific Settings</h4>
            <ul>
              <li><strong>Endpoint URL:</strong> API endpoint for the provider</li>
              <li><strong>API Key:</strong> Authentication key (except Ollama)</li>
              <li><strong>Model:</strong> Specific model to use</li>
            </ul>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .help-panel {
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

  .search-container {
    margin-bottom: 2rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .search-input {
    display: flex;
    gap: 0.5rem;
  }

  .search-input input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #ccc;
    font-size: 0.9rem;
  }

  .search-input input::placeholder {
    color: #888;
  }

  .search-btn {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #ccc;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .search-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .quick-actions {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .quick-action-btn {
    padding: 0.75rem 1.25rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #ccc;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .quick-action-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .search-results {
    margin-top: 2rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .search-results h3 {
    margin: 0 0 1rem 0;
    color: #e0e0e0;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .search-result-item {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .search-result-item h4 {
    margin: 0 0 0.5rem 0;
    color: #e0e0e0;
    font-size: 1rem;
  }

  .search-result-item p {
    margin: 0 0 1rem 0;
    color: #ccc;
    font-size: 0.9rem;
  }

  .view-section-btn {
    padding: 0.5rem 1rem;
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid #4caf50;
    border-radius: 6px;
    color: #4caf50;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.8rem;
  }

  .view-section-btn:hover {
    background: rgba(76, 175, 80, 0.3);
    transform: translateY(-1px);
  }

  .clear-search-btn {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: #ccc;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .clear-search-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .help-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 1rem;
  }

  .tab-btn {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #ccc;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .tab-btn.active {
    background: rgba(76, 175, 80, 0.2);
    border-color: #4caf50;
    color: #4caf50;
  }

  .tab-content {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .help-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .help-section h3 {
    margin: 0 0 1rem 0;
    color: #e0e0e0;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .help-section p {
    color: #ccc;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .feature-list {
    list-style: none;
    padding: 0;
  }

  .feature-list li {
    margin-bottom: 0.75rem;
    padding-left: 1.5rem;
    position: relative;
    color: #ccc;
  }

  .feature-list li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: #4caf50;
    font-weight: bold;
  }

  .getting-started {
    list-style: none;
    padding: 0;
  }

  .getting-started li {
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border-left: 4px solid #4caf50;
    color: #ccc;
  }

  .getting-started li strong {
    color: #4caf50;
  }

  .getting-started-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .step-card {
    padding: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
  }

  .step-number {
    font-size: 2rem;
    font-weight: bold;
    color: #4caf50;
    margin-bottom: 0.5rem;
  }

  .step-card h4 {
    margin: 0 0 0.5rem 0;
    color: #e0e0e0;
    font-size: 1rem;
  }

  .step-card p {
    margin: 0;
    color: #ccc;
    font-size: 0.9rem;
  }

  .interface-guide {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .guide-item {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .guide-item h4 {
    margin: 0 0 0.5rem 0;
    color: #e0e0e0;
    font-size: 1rem;
  }

  .guide-item p {
    margin: 0;
    color: #ccc;
    font-size: 0.9rem;
  }

  .guide-tips {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
  }

  .guide-tips strong {
    color: #4caf50;
    margin-bottom: 0.5rem;
  }

  .guide-tips ul {
    list-style: none;
    padding: 0;
    color: #ccc;
  }

  .guide-tips li {
    margin-bottom: 0.25rem;
    position: relative;
    padding-left: 1.5rem;
  }

  .guide-tips li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #4caf50;
  }

  .skill-info, .agent-info, .troubleshooting-item, .api-info, .config-info {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .skill-info h4, .agent-info h4, .troubleshooting-item h4, .api-info h4, .config-info h4 {
    margin: 0 0 0.5rem 0;
    color: #e0e0e0;
    font-size: 1rem;
  }

  .skill-info ul, .troubleshooting-item ul, .config-info ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    color: #ccc;
  }

  .skill-info li, .troubleshooting-item li, .config-info li {
    margin-bottom: 0.25rem;
  }

  .agent-info p {
    margin: 0.25rem 0;
    color: #ccc;
  }

  .agent-info strong {
    color: #4caf50;
  }

  .api-info p {
    margin: 0.25rem 0;
    color: #ccc;
  }

  .api-info code {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #4caf50;
  }

  .api-info a {
    color: #2196f3;
    text-decoration: none;
  }

  .api-info a:hover {
    text-decoration: underline;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .status-icon {
    font-size: 1.2rem;
  }

  .status-label {
    color: #ccc;
    font-size: 0.9rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .help-panel {
      padding: 1rem;
    }
    
    .search-input {
      flex-direction: column;
    }

    .search-input input, .search-input .search-btn {
      width: 100%;
    }

    .quick-actions {
      flex-direction: column;
      align-items: center;
    }

    .quick-action-btn {
      width: 100%;
      justify-content: center;
    }

    .help-tabs {
      flex-wrap: wrap;
    }
    
    .tab-btn {
      flex: 1;
      min-width: 120px;
    }
    
    .interface-guide {
      grid-template-columns: 1fr;
    }
  }
</style> 