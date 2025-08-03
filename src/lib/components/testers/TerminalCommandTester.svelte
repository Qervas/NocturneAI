<script lang="ts">
  import { onMount } from 'svelte';
  import { abilityManager } from '../../services/core/AbilityManager';

  let testResults: any[] = [];
  let isRunning = false;
  let selectedOperation = 'command_execute';
  let command = 'echo "Hello World"';
  let args: string[] = [];
  let workingDirectory = '.';
  let timeout = 30000;
  let agentId = 'test-agent';

  onMount(() => {
    // Ensure the terminal ability is available for testing
    if (!abilityManager.hasAbility(agentId, 'terminal')) {
      abilityManager.grantAbility(agentId, 'terminal');
      console.log('✅ Granted terminal ability to test agent');
    }
    
    // Test if terminal ability is working
    console.log('🔍 Testing terminal ability...');
    console.log('Has terminal ability:', abilityManager.hasAbility(agentId, 'terminal'));
    console.log('Available abilities:', abilityManager.getAllAbilities().map(a => a.id));
  });

  async function runTest() {
    if (isRunning) return;
    
    isRunning = true;
    testResults = [];

    try {
      const testCases = [
        {
          operation: 'command_execute',
          parameters: {
            command: command,
            args: args,
            workingDirectory: workingDirectory,
            timeout: timeout
          },
          description: 'Execute command'
        },
        {
          operation: 'system_info',
          parameters: {},
          description: 'Get system information'
        },
        {
          operation: 'process_list',
          parameters: { includeSystem: false },
          description: 'List processes'
        }
      ];

      for (const testCase of testCases) {
        const result = await abilityManager.executeAbility(agentId, 'terminal', {
          command: testCase.parameters.command || 'echo "test"',
          workingDirectory: testCase.parameters.workingDirectory || '.',
          timeout: testCase.parameters.timeout || 30000
        });

        testResults.push({
          operation: testCase.operation,
          description: testCase.description,
          success: result.success,
          message: result.message || result.output || 'Command executed',
          data: result.data || result.output,
          error: result.error,
          metadata: {
            exitCode: result.exitCode,
            executionTime: result.executionTime
          }
        });
      }
    } catch (error) {
      testResults.push({
        operation: 'error',
        description: 'Test execution failed',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      isRunning = false;
    }
  }

  function addArg() {
    args = [...args, ''];
  }

  function removeArg(index: number) {
    args = args.filter((_, i) => i !== index);
  }

  function updateArg(index: number, value: string) {
    args[index] = value;
    args = [...args];
  }
</script>

<div class="terminal-tester">
  <h3>🔧 Terminal Command Skill Tester</h3>
  
  <div class="test-controls">
    <div class="form-group">
      <label for="operation">Operation:</label>
      <select id="operation" bind:value={selectedOperation}>
        <option value="command_execute">Command Execute</option>
        <option value="command_info">Command Info</option>
        <option value="process_list">Process List</option>
        <option value="system_info">System Info</option>
        <option value="network_test">Network Test</option>
        <option value="port_scan">Port Scan</option>
        <option value="file_operation">File Operation</option>
        <option value="user_management">User Management</option>
      </select>
    </div>

    <div class="form-group">
      <label for="command">Command:</label>
      <input 
        id="command" 
        type="text" 
        bind:value={command} 
        placeholder="Enter command to execute"
      />
    </div>

    <div class="form-group">
      <label>Arguments:</label>
      <div class="args-container">
        {#each args as arg, index}
          <div class="arg-input">
                         <input 
               type="text" 
               value={arg} 
               on:input={(e) => updateArg(index, (e.target as HTMLInputElement).value)}
               placeholder="Argument {index + 1}"
             />
            <button type="button" on:click={() => removeArg(index)}>×</button>
          </div>
        {/each}
        <button type="button" on:click={addArg}>+ Add Argument</button>
      </div>
    </div>

    <div class="form-group">
      <label for="workingDir">Working Directory:</label>
      <input 
        id="workingDir" 
        type="text" 
        bind:value={workingDirectory} 
        placeholder="Working directory"
      />
    </div>

    <div class="form-group">
      <label for="timeout">Timeout (ms):</label>
      <input 
        id="timeout" 
        type="number" 
        bind:value={timeout} 
        min="1000" 
        max="60000"
      />
    </div>

    <button 
      class="test-button" 
      on:click={runTest} 
      disabled={isRunning}
    >
      {isRunning ? 'Running Tests...' : 'Run Terminal Tests'}
    </button>
  </div>

  {#if testResults.length > 0}
    <div class="test-results">
      <h4>Test Results:</h4>
      
      {#each testResults as result}
        <div class="test-result {result.success ? 'success' : 'error'}">
          <div class="result-header">
            <span class="operation">{result.operation}</span>
            <span class="status">{result.success ? '✅' : '❌'}</span>
          </div>
          
          <div class="result-description">{result.description}</div>
          <div class="result-message">{result.message}</div>
          
          {#if result.error}
            <div class="result-error">Error: {result.error}</div>
          {/if}
          
          {#if result.data}
            <div class="result-data">
              <details>
                <summary>Data</summary>
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </details>
            </div>
          {/if}
          
          {#if result.metadata}
            <div class="result-metadata">
              <details>
                <summary>Metadata</summary>
                <pre>{JSON.stringify(result.metadata, null, 2)}</pre>
              </details>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .terminal-tester {
    padding: 1rem;
    background: #1a1a1a;
    color: #e0e0e0;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
  }

  .test-controls {
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 0.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: bold;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.5rem;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #e0e0e0;
    border-radius: 4px;
  }

  .args-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .arg-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .arg-input input {
    flex: 1;
  }

  .arg-input button {
    padding: 0.25rem 0.5rem;
    background: #d32f2f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .test-button {
    width: 100%;
    padding: 0.75rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    margin-top: 1rem;
  }

  .test-button:disabled {
    background: #666;
    cursor: not-allowed;
  }

  .test-results {
    margin-top: 1rem;
  }

  .test-result {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 4px;
    border-left: 4px solid;
  }

  .test-result.success {
    background: #1b5e20;
    border-left-color: #4caf50;
  }

  .test-result.error {
    background: #b71c1c;
    border-left-color: #f44336;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .operation {
    font-weight: bold;
    text-transform: uppercase;
  }

  .status {
    font-size: 1.2rem;
  }

  .result-description {
    font-style: italic;
    margin-bottom: 0.5rem;
  }

  .result-message {
    margin-bottom: 0.5rem;
  }

  .result-error {
    color: #ffcdd2;
    font-weight: bold;
  }

  .result-data,
  .result-metadata {
    margin-top: 0.5rem;
  }

  .result-data summary,
  .result-metadata summary {
    cursor: pointer;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .result-data pre,
  .result-metadata pre {
    background: #2a2a2a;
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.8rem;
  }
</style> 