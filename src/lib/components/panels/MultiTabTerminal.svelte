<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { selectedAgent, getAgentFullId } from '../../services/agents/CharacterManager';
import { abilityManager } from '../../services/core/AbilityManager';

  interface TerminalSession {
    id: string;
    agentId: string;
    agentName: string;
    currentDirectory: string;
    history: Array<{
      type: 'command' | 'output' | 'error' | 'info';
      content: string;
      timestamp: Date;
    }>;
    commandHistory: string[];
    historyIndex: number;
    isExecuting: boolean;
    input: string;
  }

  // Terminal state
  let terminals: Map<string, TerminalSession> = new Map();
  let activeTerminalId: string | null = null;
  let terminalContainer: HTMLElement;
  let terminalInputs: Map<string, HTMLInputElement> = new Map();

  // Reactive updates
  $: if ($selectedAgent) {
    ensureTerminalForAgent($selectedAgent);
  }

  $: activeTerminal = activeTerminalId ? terminals.get(activeTerminalId) : null;

  onMount(() => {
    // Initialize terminal for current agent if exists
    if ($selectedAgent) {
      ensureTerminalForAgent($selectedAgent);
    }
    
    // Debug: Log terminal dimensions
    console.log('🔍 Terminal mounted, checking dimensions...');
    setTimeout(() => {
      const terminal = document.querySelector('.multi-tab-terminal') as HTMLElement;
      const input = document.querySelector('.terminal-input') as HTMLInputElement;
      const container = document.querySelector('.terminal-input-container') as HTMLElement;
      
      if (terminal) {
        console.log('📏 Terminal dimensions:', {
          width: terminal.clientWidth,
          height: terminal.clientHeight,
          offsetHeight: terminal.offsetHeight
        });
      }
      
      if (input) {
        console.log('📝 Input found:', {
          visible: input.offsetParent !== null,
          width: input.clientWidth,
          height: input.clientHeight
        });
      }
      
      if (container) {
        console.log('📦 Input container:', {
          visible: container.offsetParent !== null,
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    }, 1000);
  });

  function ensureTerminalForAgent(agentName: string) {
    const agentId = getAgentFullId(agentName);

    if (!terminals.has(agentId)) {
      const newTerminal: TerminalSession = {
        id: agentId,
        agentId: agentId,
        agentName: agentName,
        currentDirectory: './workspace',
        history: [],
        commandHistory: [],
        historyIndex: -1,
        isExecuting: false,
        input: ''
      };

      terminals.set(agentId, newTerminal);
      terminals = terminals; // Trigger reactivity

      // Ensure agent has terminal ability
      if (!abilityManager.hasAbility(agentId, 'terminal')) {
        abilityManager.grantAbility(agentId, 'terminal');
        console.log(`✅ Granted terminal ability to agent: ${agentId}`);
      }

      // Add welcome message
      addToHistory(agentId, 'info', `🤖 Terminal initialized for ${agentName}`);
      addToHistory(agentId, 'info', `📁 Working directory: ${newTerminal.currentDirectory}`);

      const abilities = getAgentAbilities(agentId);
      if (abilities.length > 0) {
        addToHistory(agentId, 'info', `⚡ Available abilities: ${abilities.join(', ')}`);
      } else {
        addToHistory(agentId, 'info', '⚠️ No abilities available for this agent');
      }
    }

    // Set as active terminal
    activeTerminalId = agentId;
  }

  function getAgentAbilities(agentId: string): string[] {
    const abilities = [];
    if (abilityManager.hasAbility(agentId, 'terminal')) abilities.push('System Commander');
    if (abilityManager.hasAbility(agentId, 'workspace')) abilities.push('File Operations');
    return abilities;
  }

  function addToHistory(terminalId: string, type: 'command' | 'output' | 'error' | 'info', content: string) {
    const terminal = terminals.get(terminalId);
    if (!terminal) return;

    terminal.history.push({
      type,
      content,
      timestamp: new Date()
    });

    terminals.set(terminalId, terminal);
    terminals = terminals; // Trigger reactivity

    tick().then(() => {
      if (terminalContainer && activeTerminalId === terminalId) {
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
      }
    });
  }

  function switchTerminal(terminalId: string) {
    activeTerminalId = terminalId;

    // Focus input after switching
    tick().then(() => {
      const input = terminalInputs.get(terminalId);
      if (input) {
        input.focus();
      }
    });
  }

  function closeTerminal(terminalId: string) {
    terminals.delete(terminalId);
    terminals = terminals; // Trigger reactivity

    // Switch to another terminal if this was active
    if (activeTerminalId === terminalId) {
      const remainingTerminals = Array.from(terminals.keys());
      activeTerminalId = remainingTerminals.length > 0 ? remainingTerminals[0] : null;
    }
  }

  async function executeCommand(terminalId: string) {
    const terminal = terminals.get(terminalId);
    if (!terminal || !terminal.input.trim() || terminal.isExecuting) return;

    const command = terminal.input.trim();
    terminal.input = '';
    terminal.isExecuting = true;

    // Add to command history
    addToHistory(terminalId, 'command', `$ ${command}`);
    terminal.commandHistory.unshift(command);
    if (terminal.commandHistory.length > 50) terminal.commandHistory.pop();
    terminal.historyIndex = -1;

    terminals.set(terminalId, terminal);
    terminals = terminals;

    try {
      // Handle built-in commands
      if (await handleBuiltInCommand(terminalId, command)) {
        terminal.isExecuting = false;
        terminals.set(terminalId, terminal);
        terminals = terminals;
        return;
      }

      // Execute through System Commander ability
      console.log(`🔍 Checking terminal ability for agent: ${terminal.agentId}`);
      console.log(`🔍 Has terminal ability: ${abilityManager.hasAbility(terminal.agentId, 'terminal')}`);
      console.log(`🔍 Available abilities: ${abilityManager.getAllAbilities().map(a => a.id)}`);
      
      if (abilityManager.hasAbility(terminal.agentId, 'terminal')) {
        console.log(`🚀 Executing command: ${command}`);
        const result = await abilityManager.executeAbility(terminal.agentId, 'terminal', {
          command: command,
          workingDir: terminal.currentDirectory
        });

        console.log(`📊 Command result:`, result);

        if (result.success) {
          if (result.output) {
            addToHistory(terminalId, 'output', result.output);
          }
          addToHistory(terminalId, 'info', `✅ Command completed (${result.executionTime}ms)`);
        } else {
          addToHistory(terminalId, 'error', `❌ Error: ${result.error}`);
        }
      } else {
        addToHistory(terminalId, 'error', '❌ System Commander ability not available');
      }
    } catch (error) {
      console.error(`❌ Terminal execution error:`, error);
      addToHistory(terminalId, 'error', `❌ Execution error: ${error}`);
    }

    terminal.isExecuting = false;
    terminals.set(terminalId, terminal);
    terminals = terminals;
  }

  async function handleBuiltInCommand(terminalId: string, command: string): Promise<boolean> {
    const terminal = terminals.get(terminalId);
    if (!terminal) return false;

    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'clear':
        terminal.history = [];
        terminals.set(terminalId, terminal);
        terminals = terminals;
        return true;

      case 'pwd':
        addToHistory(terminalId, 'output', terminal.currentDirectory);
        return true;

      case 'cd':
        if (parts.length > 1) {
          const newDir = parts[1];
          if (newDir === '..') {
            const pathParts = terminal.currentDirectory.split('/');
            if (pathParts.length > 1) {
              pathParts.pop();
              terminal.currentDirectory = pathParts.join('/') || './';
            }
          } else {
            terminal.currentDirectory = newDir.startsWith('./') ? newDir : `${terminal.currentDirectory}/${newDir}`;
          }
          addToHistory(terminalId, 'output', `📁 Changed directory to: ${terminal.currentDirectory}`);
          terminals.set(terminalId, terminal);
          terminals = terminals;
        } else {
          addToHistory(terminalId, 'output', terminal.currentDirectory);
        }
        return true;

      case 'ls':
      case 'dir':
        await listFiles(terminalId);
        return true;

      case 'cat':
      case 'type':
        if (parts.length > 1) {
          await readFile(terminalId, parts[1]);
        } else {
          addToHistory(terminalId, 'error', '❌ Usage: cat <filename>');
        }
        return true;

      case 'help':
        showHelp(terminalId);
        return true;

      case 'agent':
        if (parts.length > 1 && parts[1] === 'info') {
          showAgentInfo(terminalId);
        } else {
          addToHistory(terminalId, 'info', 'Usage: agent info');
        }
        return true;

      default:
        return false;
    }
  }

  async function listFiles(terminalId: string) {
    const terminal = terminals.get(terminalId);
    if (!terminal) return;

    if (abilityManager.hasAbility(terminal.agentId, 'workspace')) {
      try {
        const result = await abilityManager.executeAbility(terminal.agentId, 'workspace', {
          operation: 'list',
          path: terminal.currentDirectory
        });

        if (result.success && result.files) {
          const fileList = result.files.map((file: any) =>
            `${file.type === 'directory' ? '📁' : '📄'} ${file.name.padEnd(20)} ${file.type === 'file' ? formatFileSize(file.size) : ''}`
          ).join('\n');
          addToHistory(terminalId, 'output', fileList || 'Empty directory');
        } else {
          addToHistory(terminalId, 'error', `❌ Failed to list files: ${result.error}`);
        }
      } catch (error) {
        addToHistory(terminalId, 'error', `❌ Error: ${error}`);
      }
    } else {
      addToHistory(terminalId, 'error', '❌ File operations not available');
    }
  }

  async function readFile(terminalId: string, filename: string) {
    const terminal = terminals.get(terminalId);
    if (!terminal) return;

    if (abilityManager.hasAbility(terminal.agentId, 'workspace')) {
      const filePath = filename.startsWith('./') ? filename : `${terminal.currentDirectory}/${filename}`;

      try {
        const result = await abilityManager.executeAbility(terminal.agentId, 'workspace', {
          operation: 'read',
          path: filePath
        });

        if (result.success && result.content) {
          addToHistory(terminalId, 'output', `📄 Content of ${filename}:`);
          addToHistory(terminalId, 'output', result.content);
        } else {
          addToHistory(terminalId, 'error', `❌ Failed to read file: ${result.error}`);
        }
      } catch (error) {
        addToHistory(terminalId, 'error', `❌ Error: ${error}`);
      }
    } else {
      addToHistory(terminalId, 'error', '❌ File operations not available');
    }
  }

  function showHelp(terminalId: string) {
    const helpText = `🤖 Multi-Tab Terminal Help

Built-in Commands:
  help              - Show this help
  clear             - Clear terminal
  pwd               - Show current directory
  cd <dir>          - Change directory
  ls/dir            - List files
  cat <file>        - Display file content
  agent info        - Show agent information

System Commands:
  Any command available through System Commander ability

Tips:
  - Use Tab to switch between agent terminals
  - Each agent has their own terminal session
  - Commands are executed in the context of the selected agent
  - Use arrow keys to navigate command history`;

    addToHistory(terminalId, 'info', helpText);
  }

  function showAgentInfo(terminalId: string) {
    const terminal = terminals.get(terminalId);
    if (!terminal) return;

    const abilities = getAgentAbilities(terminal.agentId);
    const info = `🤖 Agent Information

Name: ${terminal.agentName}
ID: ${terminal.agentId}
Working Directory: ${terminal.currentDirectory}
Available Abilities: ${abilities.length > 0 ? abilities.join(', ') : 'None'}
Command History: ${terminal.commandHistory.length} commands
Terminal Session: Active`;

    addToHistory(terminalId, 'info', info);
  }

  function handleKeyPress(terminalId: string, event: KeyboardEvent) {
    const terminal = terminals.get(terminalId);
    if (!terminal) return;

    if (event.key === 'Enter') {
      executeCommand(terminalId);
    } else if (event.key === 'ArrowUp') {
      if (terminal.historyIndex < terminal.commandHistory.length - 1) {
        terminal.historyIndex++;
        terminal.input = terminal.commandHistory[terminal.historyIndex] || '';
        terminals.set(terminalId, terminal);
        terminals = terminals;
      }
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      if (terminal.historyIndex > 0) {
        terminal.historyIndex--;
        terminal.input = terminal.commandHistory[terminal.historyIndex] || '';
      } else if (terminal.historyIndex === 0) {
        terminal.historyIndex = -1;
        terminal.input = '';
      }
      terminals.set(terminalId, terminal);
      terminals = terminals;
      event.preventDefault();
    }
  }

  function formatFileSize(size: number): string {
    if (size === 0) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatTimestamp(date: Date): string {
    return date.toLocaleTimeString();
  }

  function getTerminalTitle(terminal: TerminalSession): string {
    return `${terminal.agentName} ${terminal.isExecuting ? '⏳' : ''}`;
  }

  // Action to bind terminal input
  function bindTerminalInput(node: HTMLInputElement, terminalId: string) {
    terminalInputs.set(terminalId, node);
    return {
      destroy() {
        terminalInputs.delete(terminalId);
      }
    };
  }
</script>

<div class="multi-tab-terminal">
  <!-- Terminal Tabs -->
  <div class="terminal-tabs">
    {#each Array.from(terminals.values()) as terminal}
      <div
        class="terminal-tab"
        class:active={activeTerminalId === terminal.id}
        class:executing={terminal.isExecuting}
        on:click={() => switchTerminal(terminal.id)}
      >
        <span class="tab-icon">🤖</span>
        <span class="tab-title">{getTerminalTitle(terminal)}</span>
        <button
          class="tab-close"
          on:click|stopPropagation={() => closeTerminal(terminal.id)}
          title="Close terminal"
        >
          ×
        </button>
      </div>
    {/each}

    {#if Array.from(terminals.keys()).length === 0}
      <div class="no-terminals">
        <span>No terminals open. Select an agent to create a terminal.</span>
      </div>
    {/if}
  </div>

  <!-- Terminal Content -->
  {#if activeTerminal}
    <div class="terminal-content">
      <!-- Terminal Output -->
      <div class="terminal-output" bind:this={terminalContainer}>
        {#each activeTerminal.history as entry}
          <div class="terminal-line {entry.type}">
            <span class="timestamp">{formatTimestamp(entry.timestamp)}</span>
            <span class="content">{entry.content}</span>
          </div>
        {/each}
        {#if activeTerminal.isExecuting}
          <div class="terminal-line info">
            <span class="timestamp">{formatTimestamp(new Date())}</span>
            <span class="content">⏳ Executing...</span>
          </div>
        {/if}
      </div>

      <!-- Terminal Input -->
      <div class="terminal-input-container">
        <span class="prompt">[{activeTerminal.agentName}]$ </span>
        <input
          bind:value={activeTerminal.input}
          on:keydown={(e: KeyboardEvent) => handleKeyPress(activeTerminal.id, e)}
          placeholder="Enter command..."
          disabled={activeTerminal.isExecuting}
          class="terminal-input"
          use:bindTerminalInput={activeTerminal.id}
        />
      </div>
    </div>
  {:else}
    <div class="no-active-terminal">
      <div class="no-terminal-content">
        <div class="no-terminal-icon">📟</div>
        <h3>No Terminal Active</h3>
        <p>Select an agent to open their terminal session</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .multi-tab-terminal {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
    min-height: 200px;
    background: #0c0c0c;
    color: #00ff00;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    border-top: 1px solid #333;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    position: relative;
    max-width: 100%;
    min-width: 320px;
  }

  .terminal-tabs {
    display: flex;
    background: #1a1a1a;
    border-bottom: 2px solid #00ff00;
    min-height: 32px;
    max-height: 32px;
    align-items: center;
    padding: 0 8px;
    overflow-x: auto;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
  }

  .terminal-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #2a2a2a;
    border: 1px solid #333;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-width: 120px;
    margin-right: 2px;
    color: #00ff00;
  }

  .terminal-tab:hover {
    background: #3a3a3a;
    border-color: #00ff00;
  }

  .terminal-tab.active {
    background: #0c0c0c;
    border-color: #00ff00;
    border-bottom-color: #0c0c0c;
    color: #00ff00;
    font-weight: bold;
  }

  .terminal-tab.executing {
    background: #1a3a1a;
    color: #00ff00;
  }

  .terminal-tab.executing.active {
    background: #0c2a0c;
    color: #00ff00;
  }

  .tab-icon {
    font-size: 12px;
    color: #00ff00;
  }

  .tab-title {
    font-size: 12px;
    flex: 1;
    color: #00ff00;
  }

  .tab-close {
    background: none;
    border: none;
    color: #666;
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    margin-left: 4px;
    border-radius: 2px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .tab-close:hover {
    background: #ff0000;
    color: #fff;
  }

  .no-terminals {
    color: #666;
    font-size: 12px;
    padding: 8px 16px;
    font-style: italic;
  }

  .terminal-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #0c0c0c;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .terminal-output {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    background: #0c0c0c;
    line-height: 1.4;
    color: #00ff00;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    min-height: 0;
    max-height: calc(100% - 72px);
  }

  .terminal-line {
    margin-bottom: 4px;
    display: flex;
    gap: 8px;
    word-break: break-word;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  .terminal-line.command {
    color: #00ff00;
    font-weight: bold;
  }

  .terminal-line.output {
    color: #00ff00;
  }

  .terminal-line.error {
    color: #ff0000;
    font-weight: bold;
  }

  .terminal-line.info {
    color: #00ffff;
  }

  .timestamp {
    color: #666;
    font-size: 11px;
    min-width: 70px;
    flex-shrink: 0;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  .content {
    flex: 1;
    white-space: pre-wrap;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  .terminal-input-container {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #0c0c0c;
    border-top: 1px solid #00ff00;
    min-height: 40px;
    max-height: 40px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    border-bottom: 1px solid #00ff00;
  }

  .prompt {
    color: #00ff00;
    font-weight: bold;
    margin-right: 8px;
    white-space: nowrap;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
  }

  .terminal-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #00ff00;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    outline: none;
    caret-color: #00ff00;
    min-height: 20px;
    padding: 4px 0;
    border: 1px solid transparent;
    border-radius: 2px;
  }

  .terminal-input:focus {
    background: rgba(0, 255, 0, 0.05);
    box-shadow: inset 0 0 0 1px rgba(0, 255, 0, 0.3);
    border-color: #00ff00;
  }

  .terminal-input:disabled {
    opacity: 0.6;
    color: #666;
  }

  .terminal-input::placeholder {
    color: #666;
    font-style: italic;
  }

  .no-active-terminal {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0c0c0c;
    color: #00ff00;
  }

  .no-terminal-content {
    text-align: center;
    color: #666;
  }

  .no-terminal-icon {
    font-size: 64px;
    margin-bottom: 16px;
    color: #00ff00;
  }

  .no-terminal-content h3 {
    margin: 0 0 8px 0;
    color: #00ff00;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  .no-terminal-content p {
    margin: 0;
    font-size: 12px;
    color: #666;
    font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  /* Scrollbar styling - Linux terminal style */
  .terminal-output::-webkit-scrollbar {
    width: 12px;
  }

  .terminal-output::-webkit-scrollbar-track {
    background: #0c0c0c;
    border: 1px solid #333;
  }

  .terminal-output::-webkit-scrollbar-thumb {
    background: #00ff00;
    border-radius: 2px;
    border: 1px solid #0c0c0c;
  }

  .terminal-output::-webkit-scrollbar-thumb:hover {
    background: #00cc00;
  }

  .terminal-tabs::-webkit-scrollbar {
    height: 6px;
  }

  .terminal-tabs::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .terminal-tabs::-webkit-scrollbar-thumb {
    background: #00ff00;
    border-radius: 2px;
  }

  /* Focus styles for better visibility */
  .terminal-input:focus {
    background: rgba(0, 255, 0, 0.05);
    box-shadow: inset 0 0 0 1px rgba(0, 255, 0, 0.3);
  }

  /* Cursor blink animation */
  .terminal-input:focus::after {
    content: '|';
    animation: blink 1s infinite;
    color: #00ff00;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
</style>
