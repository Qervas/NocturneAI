<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { selectedAgent, getAgentFullId } from '../services/CharacterManager';
  import { abilityManager } from '../services/AbilityManager';

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
      if (abilityManager.hasAbility(terminal.agentId, 'terminal')) {
        const result = await abilityManager.executeAbility(terminal.agentId, 'terminal', {
          command: command,
          workingDir: terminal.currentDirectory
        });

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
          bind:this={terminalInputs[activeTerminal.id]}
          bind:value={activeTerminal.input}
          on:keydown={(e) => handleKeyPress(activeTerminal.id, e)}
          placeholder="Enter command..."
          disabled={activeTerminal.isExecuting}
          class="terminal-input"
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
    background: #1e1e1e;
    color: #f0f0f0;
    font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    border-top: 1px solid #333;
  }

  .terminal-tabs {
    display: flex;
    background: #2d2d2d;
    border-bottom: 1px solid #333;
    min-height: 35px;
    align-items: center;
    padding: 0 8px;
    overflow-x: auto;
  }

  .terminal-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #2d2d2d;
    border: 1px solid transparent;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-width: 120px;
    margin-right: 2px;
  }

  .terminal-tab:hover {
    background: #333;
  }

  .terminal-tab.active {
    background: #1e1e1e;
    border-color: #007acc;
    border-bottom-color: #1e1e1e;
  }

  .terminal-tab.executing {
    background: #2d4a2d;
  }

  .terminal-tab.executing.active {
    background: #1e2d1e;
  }

  .tab-icon {
    font-size: 12px;
  }

  .tab-title {
    font-size: 12px;
    flex: 1;
  }

  .tab-close {
    background: none;
    border: none;
    color: #999;
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
  }

  .tab-close:hover {
    background: #555;
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
  }

  .terminal-output {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    background: #1e1e1e;
    line-height: 1.4;
  }

  .terminal-line {
    margin-bottom: 4px;
    display: flex;
    gap: 8px;
    word-break: break-word;
  }

  .terminal-line.command {
    color: #4CAF50;
    font-weight: bold;
  }

  .terminal-line.output {
    color: #f0f0f0;
  }

  .terminal-line.error {
    color: #f44336;
  }

  .terminal-line.info {
    color: #2196F3;
  }

  .timestamp {
    color: #666;
    font-size: 11px;
    min-width: 70px;
    flex-shrink: 0;
  }

  .content {
    flex: 1;
    white-space: pre-wrap;
  }

  .terminal-input-container {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #2d2d2d;
    border-top: 1px solid #333;
  }

  .prompt {
    color: #4CAF50;
    font-weight: bold;
    margin-right: 8px;
    white-space: nowrap;
  }

  .terminal-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #f0f0f0;
    font-family: inherit;
    font-size: inherit;
    outline: none;
  }

  .terminal-input:disabled {
    opacity: 0.6;
  }

  .no-active-terminal {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e1e1e;
  }

  .no-terminal-content {
    text-align: center;
    color: #666;
  }

  .no-terminal-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .no-terminal-content h3 {
    margin: 0 0 8px 0;
    color: #999;
  }

  .no-terminal-content p {
    margin: 0;
    font-size: 12px;
  }

  /* Scrollbar styling */
  .terminal-output::-webkit-scrollbar {
    width: 8px;
  }

  .terminal-output::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  .terminal-output::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }

  .terminal-output::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .terminal-tabs::-webkit-scrollbar {
    height: 4px;
  }

  .terminal-tabs::-webkit-scrollbar-track {
    background: #2d2d2d;
  }

  .terminal-tabs::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 2px;
  }
</style>
