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

  // Agent state
  let activeAgentId: string | null = null;
  let terminalSessions = new Map<string, any>();
  let isProcessing = false;

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
          terminal.write('\r\n$ ');
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

  // Initialize terminal session
  async function initializeTerminalSession() {
    if (!activeAgentId) return;

    ensureTerminalForAgent(activeAgentId);
    
    // Check if Tauri API is available
    const isTauriAvailable = typeof invoke !== 'undefined';
    
    // Write initial terminal header
    terminal.write('\r\n');
    terminal.write(`🤖 Terminal initialized for ${activeAgentId}\r\n`);
    terminal.write(`📁 Working directory: .\r\n`);
    terminal.write(`💻 System shell: ${navigator.platform.includes('Win') ? 'PowerShell (Win32)' : 'Bash (Unix)'}\r\n`);
    terminal.write(`⚡ Available abilities: ${getAgentAbilities(activeAgentId).join(', ')}\r\n`);
    terminal.write(`🔗 Tauri API: ${isTauriAvailable ? '✅ Available' : '❌ Not Available'}\r\n`);
    terminal.write('\r\n');
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

  // Manual test function
  async function testTerminal() {
    console.log('🧪 Manual terminal test...');
    
    if (!activeAgentId) {
      console.log('❌ No agent selected');
      return;
    }

    if (!abilityManager.hasAbility(activeAgentId, 'terminal')) {
      console.log('❌ Agent does not have terminal ability');
      return;
    }

    // Check if Tauri API is available
    if (typeof invoke === 'undefined') {
      console.log('❌ Tauri API not available');
      terminal?.write('\r\n❌ Tauri API not available. Please run in Tauri desktop app.\r\n');
      return;
    }

    try {
      const result = await invoke('execute_command', { 
        command: 'echo "Manual test"', 
        working_dir: '.' 
      });
      console.log('🧪 Manual test result:', result);
      terminal?.write(`\r\n✅ Manual test successful: ${JSON.stringify(result)}\r\n`);
    } catch (error) {
      console.error('❌ Manual test failed:', error);
      terminal?.write(`\r\n❌ Manual test failed: ${error}\r\n`);
    }
  }

  // Grant terminal ability manually
  function grantTerminalAbility() {
    if (activeAgentId) {
      abilityManager.grantAbility(activeAgentId, 'terminal');
      console.log('🔧 Terminal ability granted. Now has ability:', abilityManager.hasAbility(activeAgentId, 'terminal'));
    }
  }

  // Execute command with extended timeout for long-running commands
  async function executeCommand(command: string) {
    console.log('🚀 Executing command:', command);
    
    // Check if Tauri API is available
    if (typeof invoke === 'undefined') {
      // Simulated terminal for web environment - instant response
      handleSimulatedCommand(command);
      isProcessing = false;
      return;
    }
    
    // Check if this is a long-running command
    const longRunningCommands = ['ping', 'npm', 'cargo', 'docker', 'git clone', 'wget', 'curl'];
    const isLongRunning = longRunningCommands.some(cmd => command.toLowerCase().includes(cmd));
    
    // Use extended timeout for long-running commands
    const timeout = isLongRunning ? 30000 : 5000; // 30s for long-running, 5s for quick
    
    try {
      const result = await Promise.race([
        invoke('execute_command', { 
          command: command, 
          working_dir: '.' 
        }) as Promise<any>,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Command timeout (${timeout/1000}s)`)), timeout)
        )
      ]);
      
      if (result.success) {
        terminal.write(result.output || '');
      } else {
        terminal.write(result.error || '');
      }
      terminal.write('\r\n$ ');
    } catch (err: any) {
      terminal.write(`\r\nError: ${err.message}\r\n$ `);
    } finally {
      isProcessing = false;
    }
  }

  // Handle simulated commands for web environment
  function handleSimulatedCommand(command: string) {
    const cmd = command.trim().toLowerCase();
    
    switch (cmd) {
      case 'ls':
      case 'dir':
        terminal.write('\r\n📁 Simulated directory listing:\r\n');
        terminal.write('📄 package.json\r\n');
        terminal.write('📄 README.md\r\n');
        terminal.write('📁 src/\r\n');
        terminal.write('📁 src-tauri/\r\n');
        terminal.write('📄 .gitignore\r\n');
        terminal.write('$ ');
        break;
      case 'pwd':
        terminal.write('\r\n/workspace\r\n$ ');
        break;
      case 'whoami':
        terminal.write('\r\nuser\r\n$ ');
        break;
      case 'echo hello':
        terminal.write('\r\nhello\r\n$ ');
        break;
      case 'help':
        terminal.write('\r\n🤖 Simulated Terminal Commands:\r\n');
        terminal.write('ls/dir - List files\r\n');
        terminal.write('pwd - Show current directory\r\n');
        terminal.write('whoami - Show current user\r\n');
        terminal.write('echo <text> - Echo text\r\n');
        terminal.write('help - Show this help\r\n');
        terminal.write('$ ');
        break;
      default:
        terminal.write(`\r\n❌ Command not found: ${command.trim()}\r\n`);
        terminal.write('💡 Try: ls, pwd, whoami, echo, help\r\n');
        terminal.write('$ ');
        break;
    }
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
  });

  onDestroy(() => {
    terminal?.dispose();
  });
</script>

<div class="terminal-panel">
  <div class="terminal-header">
    <h3>💻 Terminal</h3>
    <div class="terminal-controls">
      <button on:click={testTerminal} class="control-btn">Test Terminal</button>
      <button on:click={grantTerminalAbility} class="control-btn">Grant Terminal</button>
    </div>
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

  .terminal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  }

  .terminal-header h3 {
    margin: 0;
    color: #00ff00;
    font-size: 14px;
  }

  .terminal-controls {
    display: flex;
    gap: 8px;
  }

  .control-btn {
    background: #333;
    color: #00ff00;
    border: 1px solid #555;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 3px;
  }

  .control-btn:hover {
    background: #444;
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
