<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import '@xterm/xterm/css/xterm.css';
  import { abilityManager } from '../../services/core/AbilityManager';
  import { selectedAgent } from '../../services/agents/CharacterManager';
  import { focusedAgent } from '../../services/agents/AgentSelectionManager';

  // Terminal state
  let terminalContainer: HTMLElement;
  let terminal: Terminal;
  let fitAddon: FitAddon;
  let terminalId = 'main-terminal';
  let isTerminalReady = false;

  // Tab management with terminal state preservation
  let activeTabId = 'main';
  let tabs: Array<{
    id: string;
    name: string;
    agentId: string | null;
    terminal: Terminal | null;
    isInitialized: boolean;
    commandHistory: string[];
  }> = [
    { id: 'main', name: 'Main Terminal', agentId: null, terminal: null, isInitialized: false, commandHistory: [] }
  ];

  // Agent state
  let activeAgentId: string | null = null;
  let terminalSessions = new Map<string, any>();
  let isProcessing = false;

  // Tab management functions
  function addTab(agentId: string) {
    const tabId = `agent-${agentId}`;
    const existingTab = tabs.find(tab => tab.id === tabId);
    
    if (!existingTab) {
      tabs = [...tabs, {
        id: tabId,
        name: `Agent ${agentId}`,
        agentId: agentId,
        terminal: null,
        isInitialized: false,
        commandHistory: []
      }];
    }
    
    switchToTab(tabId);
  }

  function switchToTab(tabId: string) {
    // Save current terminal state before switching
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab && terminal) {
      currentTab.terminal = terminal;
    }
    
    activeTabId = tabId;
    const tab = tabs.find(t => t.id === tabId);
    
    if (tab && tab.terminal) {
      // Switch to existing terminal - preserve its state
      terminal = tab.terminal;
      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      
      // Clear container and add terminal
      if (terminalContainer) {
        terminalContainer.innerHTML = '';
        terminal.open(terminalContainer);
        fitAddon.fit();
      }
      
      // Mark as initialized if it has content
      if (!tab.isInitialized) {
        tab.isInitialized = true;
      }
    } else if (tab && tab.agentId) {
      // Create new terminal for agent
      createAgentTerminal(tab.agentId);
    } else if (tab && tab.id === 'main' && !tab.isInitialized) {
      // Initialize main terminal if not already done
      initializeMainTerminal();
    }
  }

  function createAgentTerminal(agentId: string) {
    if (!terminalContainer) return;

    const newTerminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00'
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 500,
      cols: 80,
      rows: 24,
      fastScrollModifier: 'alt',
      fastScrollSensitivity: 5,
      scrollSensitivity: 1,
      allowTransparency: false,
      windowsMode: true
    });

    const newFitAddon = new FitAddon();
    newTerminal.loadAddon(newFitAddon);

    // Clear container
    terminalContainer.innerHTML = '';
    newTerminal.open(terminalContainer);
    newFitAddon.fit();

    // Update current terminal
    terminal = newTerminal;
    fitAddon = newFitAddon;

    // Store in tabs and mark as initialized
    const tab = tabs.find(t => t.id === `agent-${agentId}`);
    if (tab) {
      tab.terminal = newTerminal;
      tab.isInitialized = true;
    }

    // Set up input handling for this terminal
    setupTerminalInput(newTerminal, agentId);
    
    // Initialize session for this agent
    initializeAgentTerminalSession(agentId, newTerminal);
  }

  function initializeMainTerminal() {
    if (!terminalContainer) return;

    const newTerminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00'
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 500,
      cols: 80,
      rows: 24,
      fastScrollModifier: 'alt',
      fastScrollSensitivity: 5,
      scrollSensitivity: 1,
      allowTransparency: false,
      windowsMode: true
    });

    const newFitAddon = new FitAddon();
    newTerminal.loadAddon(newFitAddon);

    // Clear container
    terminalContainer.innerHTML = '';
    newTerminal.open(terminalContainer);
    newFitAddon.fit();

    // Update current terminal
    terminal = newTerminal;
    fitAddon = newFitAddon;

    // Store in tabs and mark as initialized
    const mainTab = tabs.find(t => t.id === 'main');
    if (mainTab) {
      mainTab.terminal = newTerminal;
      mainTab.isInitialized = true;
    }

    // Set up input handling for main terminal
    setupTerminalInput(newTerminal, 'main');
    
    // Initialize main terminal session
    initializeMainTerminalSession(newTerminal);
  }

  function setupTerminalInput(term: Terminal, agentId: string) {
    let commandBuffer = '';
    
    term.onData((data) => {
      if (!isTerminalReady || isProcessing) return;
      
      // Handle special keys
      if (data === '\r' || data === '\n') {
        // Enter pressed - execute command
        if (commandBuffer.trim()) {
          isProcessing = true;
          executeCommand(commandBuffer.trim());
          commandBuffer = '';
        } else {
          // Empty line - just show new prompt
          term.write('$ ');
        }
      } else if (data === '\u007F') {
        // Backspace
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data.charCodeAt(0) < 32) {
        // Other control characters - ignore
        return;
      } else {
        // Regular character
        commandBuffer += data;
        term.write(data);
      }
    });
  }

  function closeTab(tabId: string) {
    if (tabs.length <= 1) return; // Keep at least one tab
    
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex > -1) {
      // Dispose terminal if it exists
      const tab = tabs[tabIndex];
      if (tab.terminal) {
        tab.terminal.dispose();
      }
      
      // Remove tab
      tabs = tabs.filter(t => t.id !== tabId);
      
      // Switch to another tab if closing active tab
      if (activeTabId === tabId) {
        const newActiveTab = tabs[Math.max(0, tabIndex - 1)];
        switchToTab(newActiveTab.id);
      }
    }
  }

  // Ensure terminal ability is granted
  function ensureTerminalForAgent(agentId: string) {
    if (!abilityManager.hasAbility(agentId, 'terminal')) {
      abilityManager.grantAbility(agentId, 'terminal');
    }
    
    // For user agent, grant all abilities for testing
    if (agentId === 'user') {
      const allAbilities = ['terminal', 'workspace', 'file_reader', 'file_writer', 'web_search', 'communication'];
      allAbilities.forEach(abilityId => {
        if (!abilityManager.hasAbility(agentId, abilityId)) {
          abilityManager.grantAbility(agentId, abilityId);
        }
      });
    }
  }

  // Initialize xterm.js terminal
  async function initializeTerminal() {
    if (!terminalContainer) return;

    terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00'
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 500, // Reduced for better performance
      cols: 80,
      rows: 24,
      fastScrollModifier: 'alt',
      fastScrollSensitivity: 5,
      scrollSensitivity: 1,
      allowTransparency: false,
      windowsMode: true // Better Windows compatibility
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalContainer);
    fitAddon.fit();
    
    // Ensure terminal fills the container
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    // Store the main terminal
    tabs[0].terminal = terminal;

    // Handle terminal input with optimized processing
    let commandBuffer = '';
    
    terminal.onData((data) => {
      if (!activeAgentId || !isTerminalReady || isProcessing) return;
      
      // Handle special keys
      if (data === '\r' || data === '\n') {
        // Enter pressed - execute command
        if (commandBuffer.trim()) {
          isProcessing = true;
          executeCommand(commandBuffer.trim());
          commandBuffer = '';
        } else {
          // Empty line - just show new prompt
          terminal.write('$ ');
        }
      } else if (data === '\u007F') {
        // Backspace
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (data.charCodeAt(0) < 32) {
        // Other control characters - ignore
        return;
      } else {
        // Regular character - add to buffer and display
        commandBuffer += data;
        terminal.write(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Initialize terminal session
    await initializeTerminalSession();

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal?.dispose();
    };
  }

  // Initialize terminal session for agents
  async function initializeAgentTerminalSession(agentId: string, term: Terminal) {
    ensureTerminalForAgent(agentId);
    
    // Check if Tauri API is available
    const isTauriAvailable = typeof invoke !== 'undefined';
    
    // Write initial terminal header
    term.write(`🤖 Terminal initialized for ${agentId}\r\n`);
    term.write(`📁 Working directory: .\r\n`);
    term.write(`💻 System shell: ${navigator.platform.includes('Win') ? 'PowerShell (Win32)' : 'Bash (Unix)'}\r\n`);
    term.write(`⚡ Available abilities: ${getAgentAbilities(agentId).join(', ')}\r\n`);
    term.write(`🔗 Tauri API: ${isTauriAvailable ? '✅ Available' : '❌ Not Available'}\r\n`);
    term.write('$ ');

    isTerminalReady = true;
  }

  // Initialize main terminal session
  async function initializeMainTerminalSession(term: Terminal) {
    // Check if Tauri API is available
    const isTauriAvailable = typeof invoke !== 'undefined';
    
    // Write initial terminal header
    term.write(`🤖 Main Terminal\r\n`);
    term.write(`📁 Working directory: .\r\n`);
    term.write(`💻 System shell: ${navigator.platform.includes('Win') ? 'PowerShell (Win32)' : 'Bash (Unix)'}\r\n`);
    term.write(`🔗 Tauri API: ${isTauriAvailable ? '✅ Available' : '❌ Not Available'}\r\n`);
    term.write('$ ');

    isTerminalReady = true;
  }

  // Initialize terminal session (legacy - kept for compatibility)
  async function initializeTerminalSession() {
    if (!activeAgentId) return;

    ensureTerminalForAgent(activeAgentId);
    
    // Check if Tauri API is available
    const isTauriAvailable = typeof invoke !== 'undefined';
    
    // Write initial terminal header
    terminal.write(`🤖 Terminal initialized for ${activeAgentId}\r\n`);
    terminal.write(`📁 Working directory: .\r\n`);
    terminal.write(`💻 System shell: ${navigator.platform.includes('Win') ? 'PowerShell (Win32)' : 'Bash (Unix)'}\r\n`);
    terminal.write(`⚡ Available abilities: ${getAgentAbilities(activeAgentId).join(', ')}\r\n`);
    terminal.write(`🔗 Tauri API: ${isTauriAvailable ? '✅ Available' : '❌ Not Available'}\r\n`);
    terminal.write('$ ');

    isTerminalReady = true;
  }

  // Get agent abilities for display
  function getAgentAbilities(agentId: string): string[] {
    const abilities = [];
    if (abilityManager.hasAbility(agentId, 'terminal')) abilities.push('System Commander');
    if (abilityManager.hasAbility(agentId, 'workspace')) abilities.push('Workspace Manager');
    if (abilityManager.hasAbility(agentId, 'file_reader')) abilities.push('File Reader');
    if (abilityManager.hasAbility(agentId, 'file_writer')) abilities.push('File Writer');
    if (abilityManager.hasAbility(agentId, 'web_search')) abilities.push('Web Search');
    if (abilityManager.hasAbility(agentId, 'communication')) abilities.push('Communication');
    
    // Add elevated privileges for user
    if (agentId === 'user') {
      abilities.push('Elevated Privileges');
    }
    
    return abilities;
  }



  // Grant terminal ability manually
  function grantTerminalAbility() {
    if (activeAgentId) {
      abilityManager.grantAbility(activeAgentId, 'terminal');
      console.log('🔧 Terminal ability granted. Now has ability:', abilityManager.hasAbility(activeAgentId, 'terminal'));
    }
  }

  // Execute command with real-time streaming support
  async function executeCommand(command: string) {
    console.log('🚀 Executing command:', command);
    
    // Get Tauri invoke function
    let invoke: any;
    
    // Try to get invoke from global Tauri object first
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      invoke = (window as any).__TAURI__.core.invoke;
    } else {
      // Fallback to dynamic import
      try {
        const { core } = await import('@tauri-apps/api');
        invoke = core.invoke;
      } catch (error) {
        console.error('❌ Failed to import Tauri API:', error);
        terminal.write('\r\n❌ Tauri API not available\r\n');
        terminal.write('💡 Please run the desktop app for real terminal commands\r\n');
        terminal.write('$ ');
        isProcessing = false;
        return;
      }
    }
    
    // Check if this is an interactive command
    const interactiveCommands = ['python', 'node', 'npm start', 'cargo run', 'docker run -it'];
    const isInteractive = interactiveCommands.some(cmd => command.toLowerCase().includes(cmd));
    
    // Check if this is a long-running command
    const longRunningCommands = ['ping', 'npm install', 'cargo build', 'docker build', 'git clone', 'wget', 'curl'];
    const isLongRunning = longRunningCommands.some(cmd => command.toLowerCase().includes(cmd));
    
    // Use extended timeout for long-running commands
    const timeout = isLongRunning ? 60000 : 10000; // 60s for long-running, 10s for quick
    
    try {
      if (isInteractive) {
        // For interactive commands, we need to handle input/output streams
        await executeInteractiveCommand(command);
      } else {
        // For regular commands, use the standard approach with real-time updates
        await executeStreamingCommand(command, timeout);
      }
    } catch (err: any) {
      terminal.write(`\r\nError: ${err.message}\r\n$ `);
    } finally {
      isProcessing = false;
    }
  }

  // Execute streaming command with real-time output
  async function executeStreamingCommand(command: string, timeout: number) {
    const startTime = Date.now();
    
    // Show initial status
    terminal.write(`⏳ Executing: ${command}\r\n`);
    
    try {
      // Double-check that invoke is available
      if (typeof invoke === 'undefined') {
        throw new Error('Tauri invoke function not available');
      }
      
      const result = await Promise.race([
        invoke('execute_command', { 
          command: command, 
          working_dir: '.' 
        }) as Promise<any>,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Command timeout (${timeout/1000}s)`)), timeout)
        )
      ]);
      
      const executionTime = Date.now() - startTime;
      
      if (result.success) {
        // Show real-time output if available
        if (result.output) {
          terminal.write(result.output);
        }
        terminal.write(`\r\n✅ Command completed in ${executionTime}ms\r\n`);
      } else {
        terminal.write(`\r\n❌ Command failed: ${result.error || 'Unknown error'}\r\n`);
      }
      terminal.write('$ ');
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      
      if (err.message.includes('Tauri invoke function not available')) {
        terminal.write(`❌ Tauri API not available\r\n`);
        terminal.write('💡 Please run the desktop app for real terminal commands\r\n');
      } else {
        terminal.write(`⏰ Timeout after ${executionTime}ms: ${err.message}\r\n`);
        terminal.write('💡 For long-running commands, consider using background processes\r\n');
      }
      terminal.write('$ ');
    }
  }

  // Execute interactive command (simulated for now)
  async function executeInteractiveCommand(command: string) {
    terminal.write(`🔄 Starting interactive session: ${command}\r\n`);
    terminal.write('💡 Interactive mode is simulated. Real implementation would require PTY.\r\n');
    
    // Simulate interactive behavior
    if (command.includes('python')) {
      terminal.write('Python 3.9.0 (default, Oct 27 2020, 14:15:17)\r\n');
      terminal.write('[GCC 9.3.0] on linux\r\n');
      terminal.write('Type "help", "copyright", "credits" or "license" for more information.\r\n');
      terminal.write('>>> ');
      
      // For now, just show a simulated Python session
      setTimeout(() => {
        terminal.write('>>> print("Hello, World!")\r\n');
        terminal.write('Hello, World!\r\n');
        terminal.write('>>> exit()\r\n');
        terminal.write('Goodbye!\r\n$ ');
      }, 1000);
    } else {
      terminal.write('Interactive mode not yet implemented for this command.\r\n');
      terminal.write('$ ');
    }
  }

  // Handle real terminal commands
  function handleRealCommand(command: string) {
    // This function is no longer needed as we're using real Tauri commands
    console.log('Real command execution handled by Tauri backend');
  }

  // Watch for agent selection changes
  $: {
    if ($focusedAgent && $focusedAgent.id !== activeAgentId) {
      activeAgentId = $focusedAgent.id;
      if (terminal && isTerminalReady) {
        terminal.clear();
        initializeTerminalSession();
      }
    }
  }

  // Sync with CharacterManager
  $: {
    if ($focusedAgent) {
      selectedAgent.set($focusedAgent.id);
    }
  }

  onMount(async () => {
    await initializeTerminal();
    
    // Initialize main terminal if it's the active tab
    if (activeTabId === 'main') {
      const mainTab = tabs.find(t => t.id === 'main');
      if (mainTab && !mainTab.isInitialized) {
        initializeMainTerminal();
      }
    }
  });

  onDestroy(() => {
    terminal?.dispose();
  });
</script>

<div class="terminal-panel">
  <!-- Terminal Tabs with Add Tab Button -->
  <div class="terminal-tabs">
    {#each tabs as tab}
      <div 
        class="terminal-tab {activeTabId === tab.id ? 'active' : ''}"
        on:click={() => switchToTab(tab.id)}
      >
        <span class="tab-name">{tab.name}</span>
        <button 
          class="tab-close"
          on:click|stopPropagation={() => closeTab(tab.id)}
          title="Close tab"
        >
          ×
        </button>
      </div>
    {/each}
    
    <!-- Add Tab Button -->
    {#if $focusedAgent}
      <button 
        class="add-tab-btn"
        on:click={() => addTab($focusedAgent.id)}
        title="Add new terminal tab"
      >
        +
      </button>
    {/if}
  </div>
  
  <div class="terminal-container">
    <div bind:this={terminalContainer} class="xterm-container"></div>
  </div>
</div>

<style>
  .terminal-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #000;
    color: #00ff00;
    font-family: 'Consolas', 'Courier New', monospace;
  }





  .terminal-tabs {
    display: flex;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  }

  .terminal-tab {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #2a2a2a;
    border-right: 1px solid #333;
    cursor: pointer;
    color: #888;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .terminal-tab:hover {
    background: #3a3a3a;
    color: #ccc;
  }

  .terminal-tab.active {
    background: #000;
    color: #00ff00;
    border-bottom: 2px solid #00ff00;
  }

  .tab-name {
    margin-right: 8px;
  }

  .tab-close {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
  }

  .tab-close:hover {
    background: #444;
    color: #ff4444;
  }

  .add-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    background: #2a2a2a;
    border: none;
    color: #00ff00;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    transition: all 0.2s ease;
    border-left: 1px solid #333;
  }

  .add-tab-btn:hover {
    background: #3a3a3a;
    color: #00ff88;
  }

  .terminal-container {
    flex: 1;
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .xterm-container {
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* xterm.js custom styles */
  :global(.xterm) {
    height: 100% !important;
    width: 100% !important;
    padding: 0 !important;
  }

  :global(.xterm-viewport) {
    background: #000 !important;
    width: 100% !important;
    overflow: hidden !important; /* Hide xterm internal scrollbar */
  }

  :global(.xterm-screen) {
    background: #000 !important;
    width: 100% !important;
  }

  :global(.xterm-viewport::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.xterm-viewport::-webkit-scrollbar-track) {
    background: #1a1a1a;
  }

  :global(.xterm-viewport::-webkit-scrollbar-thumb) {
    background: #555;
    border-radius: 4px;
  }

  :global(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
    background: #777;
  }

  /* Custom scrollbar for terminal container */
  .terminal-container::-webkit-scrollbar {
    width: 12px;
  }

  .terminal-container::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 6px;
  }

  .terminal-container::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 6px;
    border: 2px solid #1a1a1a;
  }

  .terminal-container::-webkit-scrollbar-thumb:hover {
    background: #777;
  }

  .terminal-container::-webkit-scrollbar-corner {
    background: #1a1a1a;
  }


</style>
