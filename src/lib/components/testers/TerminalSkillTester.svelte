<script lang="ts">
  import { abilityManager } from '../../services/core/AbilityManager';
  import { terminalSkill } from '../../services/core/abilities/terminal/TerminalSkill';
  import { focusedAgent } from '../../services/agents/AgentSelectionManager';

  let testCommand = 'dir';
  let testResult: any = null;
  let isExecuting = false;
  let commandHistory: any[] = [];

  async function testTerminalSkill() {
    if (!$focusedAgent) {
      alert('Please select an agent first');
      return;
    }

    if (!testCommand.trim()) {
      alert('Please enter a command');
      return;
    }

    isExecuting = true;
    testResult = null;

    try {
      console.log(`🧪 Testing terminal skill for agent: ${$focusedAgent.id}`);
      console.log(`🧪 Command: ${testCommand}`);

      // Grant terminal skill to agent if not already granted
      if (!abilityManager.hasAbility($focusedAgent.id, 'terminal_skill')) {
        abilityManager.grantAbility($focusedAgent.id, 'terminal_skill');
        console.log(`🔧 Granted terminal_skill to agent: ${$focusedAgent.id}`);
      }

      // Execute the command through the terminal skill
      const result = await abilityManager.executeAbility($focusedAgent.id, 'terminal_skill', {
        command: testCommand,
        workingDir: '.'
      });

      testResult = result;
      commandHistory.unshift({
        agentId: $focusedAgent.id,
        command: testCommand,
        result: result,
        timestamp: new Date()
      });

      console.log('🧪 Terminal skill result:', result);
    } catch (error) {
      console.error('❌ Terminal skill test failed:', error);
      testResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      isExecuting = false;
    }
  }

  function clearHistory() {
    commandHistory = [];
    testResult = null;
  }

  function getSkillHistory() {
    if (!$focusedAgent) return [];
    return terminalSkill.getCommandHistory($focusedAgent.id);
  }
</script>

<div class="terminal-skill-tester">
  <h3>🧪 Terminal Skill Tester</h3>
  
  <div class="test-section">
    <div class="input-group">
      <label for="testCommand">Command:</label>
      <input 
        id="testCommand"
        type="text" 
        bind:value={testCommand}
        placeholder="Enter command (e.g., dir, whoami, echo hello)"
        disabled={isExecuting}
      />
      <button 
        on:click={testTerminalSkill}
        disabled={isExecuting || !$focusedAgent}
        class="test-btn"
      >
        {isExecuting ? '⏳ Executing...' : '🚀 Execute'}
      </button>
    </div>

    {#if !$focusedAgent}
      <p class="warning">⚠️ Please select an agent first</p>
    {/if}
  </div>

  {#if testResult}
    <div class="result-section">
      <h4>📊 Result:</h4>
      <div class="result-details">
        <div class="result-item">
          <strong>Success:</strong> 
          <span class={testResult.success ? 'success' : 'error'}>
            {testResult.success ? '✅ Yes' : '❌ No'}
          </span>
        </div>
        
        {#if testResult.executionTime}
          <div class="result-item">
            <strong>Execution Time:</strong> {testResult.executionTime}ms
          </div>
        {/if}
        
        {#if testResult.exitCode !== undefined}
          <div class="result-item">
            <strong>Exit Code:</strong> {testResult.exitCode}
          </div>
        {/if}
        
        {#if testResult.output}
          <div class="result-item">
            <strong>Output:</strong>
            <pre class="output">{testResult.output}</pre>
          </div>
        {/if}
        
        {#if testResult.error}
          <div class="result-item">
            <strong>Error:</strong>
            <pre class="error">{testResult.error}</pre>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if commandHistory.length > 0}
    <div class="history-section">
      <div class="history-header">
        <h4>📜 Command History</h4>
        <button on:click={clearHistory} class="clear-btn">🗑️ Clear</button>
      </div>
      
      <div class="history-list">
        {#each commandHistory as entry}
          <div class="history-item">
            <div class="history-command">
              <strong>{entry.agentId}:</strong> {entry.command}
            </div>
            <div class="history-result">
              <span class={entry.result.success ? 'success' : 'error'}>
                {entry.result.success ? '✅' : '❌'}
              </span>
              {entry.timestamp.toLocaleTimeString()}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if $focusedAgent}
    <div class="skill-info">
      <h4>🔧 Skill Information:</h4>
      <div class="skill-details">
        <div class="skill-item">
          <strong>Agent:</strong> {$focusedAgent.id}
        </div>
        <div class="skill-item">
          <strong>Has Terminal Skill:</strong> 
          <span class={abilityManager.hasAbility($focusedAgent.id, 'terminal_skill') ? 'success' : 'error'}>
            {abilityManager.hasAbility($focusedAgent.id, 'terminal_skill') ? '✅ Yes' : '❌ No'}
          </span>
        </div>
        <div class="skill-item">
          <strong>Skill History:</strong> {getSkillHistory().length} commands
        </div>
        <div class="skill-item">
          <strong>Working Directory:</strong> {terminalSkill.getWorkingDirectory()}
        </div>
        <div class="skill-item">
          <strong>Max Execution Time:</strong> {terminalSkill.getMaxExecutionTime()}ms
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .terminal-skill-tester {
    padding: 16px;
    background: #1a1a1a;
    border-radius: 8px;
    color: #00ff00;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  h3 {
    margin: 0 0 16px 0;
    color: #00ff00;
    font-size: 18px;
  }

  h4 {
    margin: 16px 0 8px 0;
    color: #00ff00;
    font-size: 14px;
  }

  .test-section {
    margin-bottom: 16px;
  }

  .input-group {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  label {
    font-weight: bold;
    min-width: 80px;
  }

  input {
    flex: 1;
    padding: 8px;
    background: #000;
    border: 1px solid #333;
    color: #00ff00;
    font-family: inherit;
    border-radius: 4px;
  }

  input:focus {
    outline: none;
    border-color: #00ff00;
  }

  .test-btn {
    padding: 8px 16px;
    background: #333;
    color: #00ff00;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }

  .test-btn:hover:not(:disabled) {
    background: #444;
  }

  .test-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .warning {
    color: #ffaa00;
    font-style: italic;
    margin: 8px 0;
  }

  .result-section {
    margin-bottom: 16px;
    padding: 12px;
    background: #000;
    border-radius: 4px;
    border: 1px solid #333;
  }

  .result-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .result-item {
    display: flex;
    gap: 8px;
  }

  .result-item strong {
    min-width: 120px;
  }

  .success {
    color: #00ff00;
  }

  .error {
    color: #ff4444;
  }

  .output, .error {
    background: #000;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #333;
    margin-top: 4px;
    white-space: pre-wrap;
    font-family: inherit;
    font-size: 12px;
    max-height: 200px;
    overflow-y: auto;
  }

  .history-section {
    margin-bottom: 16px;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .clear-btn {
    padding: 4px 8px;
    background: #333;
    color: #ff4444;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
  }

  .clear-btn:hover {
    background: #444;
  }

  .history-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: #000;
    border-radius: 4px;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .history-command {
    flex: 1;
  }

  .history-result {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    opacity: 0.8;
  }

  .skill-info {
    padding: 12px;
    background: #000;
    border-radius: 4px;
    border: 1px solid #333;
  }

  .skill-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .skill-item {
    display: flex;
    gap: 8px;
    font-size: 12px;
  }

  .skill-item strong {
    min-width: 140px;
  }
</style> 