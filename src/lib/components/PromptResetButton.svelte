<script lang="ts">
  import { agentPromptManager } from '../services/AgentPromptManager';
  import { settingsManager } from '../services/SettingsManager';
  import { llmService } from '../services/LLMService';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let isResetting = false;

  async function resetAllPrompts() {
    if (isResetting) return;
    
    isResetting = true;
    
    try {
      // Reset all prompts to vanilla versions
      agentPromptManager.resetAllPrompts();
      
      // Clear all skill configurations
      clearAllSkillConfigs();
      
      // Clear all agent basic info
      clearAllAgentBasicInfo();
      
      // Clear conversation history
      await clearAllConversationHistory();
      
      // Reinitialize LLM service to pick up new prompts
      await llmService.reinitialize();
      
      // Test the prompts to make sure they're working
      testPrompts();
      
      // Dispatch event to notify parent components
      dispatch('promptsReset');
      
      console.log('✅ All agent prompts and configurations reset to vanilla versions');
    } catch (error) {
      console.error('❌ Failed to reset prompts:', error);
    } finally {
      isResetting = false;
    }
  }

  async function clearAllConversationHistory() {
    try {
      const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
      
      for (const agentId of agents) {
        await llmService.clearAgentHistory(agentId);
      }
      
      // Also clear localStorage chat history
      localStorage.removeItem('chatHistory');
      
      console.log('🧹 Cleared all conversation history');
    } catch (error) {
      console.warn('Could not clear conversation history:', error);
    }
  }

  function testPrompts() {
    console.log('🧪 Testing agent prompts:');
    const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
    
    agents.forEach(agentId => {
      const prompts = agentPromptManager.getAgentPrompts(agentId);
      const combinedPrompt = agentPromptManager.getCombinedPrompt(agentId);
      
      console.log(`  ${agentId}:`, {
        prompts: prompts?.prompts.map(p => `${p.name}: "${p.prompt}"`),
        combined: combinedPrompt
      });
    });
  }

  // Test function to verify custom prompts are working
  async function testCustomPrompts() {
    console.log('🧪 Testing custom prompt functionality...');
    
    // Set a custom prompt for Alpha
    agentPromptManager.updateAgentPrompt('agent_alpha', 'system_prompt', {
      prompt: 'You are Alpha, a custom AI assistant. You love pizza and always respond with enthusiasm!'
    });
    
    console.log('✅ Set custom prompt for Alpha');
    
    // Test the prompt
    const customPrompt = agentPromptManager.getCombinedPrompt('agent_alpha');
    console.log('📝 Custom prompt for Alpha:', customPrompt);
    
    // Test sending a message (this will show in console logs)
    try {
      const response = await llmService.sendMessageToAgent('alpha', 'Hello, who are you?', 'TestUser');
      console.log('🤖 Response:', response);
    } catch (error) {
      console.log('❌ Error testing custom prompt:', error);
    }
  }

  // Test function to verify prompt saving/loading
  function testPromptPersistence() {
    console.log('🧪 Testing prompt persistence...');
    
    // Test saving a prompt
    const testPrompt = {
      prompt: 'You are Alpha, a test AI assistant. This is a test prompt!'
    };
    
    agentPromptManager.updateAgentPrompt('agent_alpha', 'system_prompt', testPrompt);
    
    // Immediately check if it was saved
    const savedPrompts = agentPromptManager.getAgentPrompts('agent_alpha');
    const combinedPrompt = agentPromptManager.getCombinedPrompt('agent_alpha');
    
    console.log('📝 Saved prompts:', savedPrompts);
    console.log('🔗 Combined prompt:', combinedPrompt);
    
    // Check localStorage directly
    const localStorageData = localStorage.getItem('agent-system-settings');
    console.log('💾 localStorage data:', localStorageData ? JSON.parse(localStorageData) : 'None');
  }

  // Test function to verify UI updates
  function testUIUpdates() {
    console.log('🧪 Testing UI updates...');
    
    // Set a distinctive prompt
    const testPrompt = {
      prompt: 'You are Alpha, a UI test assistant. This prompt should appear in the UI!'
    };
    
    agentPromptManager.updateAgentPrompt('agent_alpha', 'system_prompt', testPrompt);
    
    console.log('✅ Set test prompt for UI update');
    console.log('📝 Check the Character Management panel - the prompt should update automatically');
  }

  function clearAllSkillConfigs() {
    // Clear skill configurations for all agents
    const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
    const skills = ['file_reader', 'file_writer', 'web_search', 'multi_agent_chat'];
    
    agents.forEach(agentId => {
      skills.forEach(skillId => {
        const skillKey = `${skillId}_${agentId}`;
        settingsManager.saveSkillConfig(skillKey, null);
      });
    });
    
    console.log('🧹 Cleared all skill configurations');
  }

  function clearAllAgentBasicInfo() {
    // Clear basic info for all agents
    const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
    
    agents.forEach(agentId => {
      settingsManager.saveAgentBasicInfo(agentId, null);
    });
    
    console.log('🧹 Cleared all agent basic info');
  }
</script>

<div class="button-group">
  <button 
    class="reset-btn" 
    on:click={resetAllPrompts}
    disabled={isResetting}
    title="Reset all agent prompts and configurations to vanilla versions"
  >
    {#if isResetting}
      🔄 Resetting...
    {:else}
      🔄 Reset All
    {/if}
  </button>
  
  <button 
    class="test-btn" 
    on:click={testCustomPrompts}
    title="Test custom prompt functionality"
  >
    🧪 Test Custom Prompts
  </button>
  
  <button 
    class="test-btn" 
    on:click={testPromptPersistence}
    title="Test prompt persistence"
  >
    💾 Test Persistence
  </button>
  
  <button 
    class="test-btn" 
    on:click={testUIUpdates}
    title="Test UI updates"
  >
    🖥️ Test UI Updates
  </button>
  
  <button 
    class="test-btn" 
    on:click={() => {
      console.log('🧪 Testing persistence...');
      agentPromptManager.updateAgentPrompt('agent_alpha', 'system_prompt', {
        prompt: 'You are Alpha, a persistence test assistant. This should survive refresh!'
      });
      console.log('✅ Set test prompt. Now refresh the page to test persistence.');
    }}
    title="Test persistence across page refresh"
  >
    💾 Test Persistence
  </button>
</div>

<style>
  .button-group {
    display: flex;
    gap: var(--space-sm);
  }

  .reset-btn, .test-btn {
    border: none;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    transition: all var(--transition-base);
  }

  .reset-btn {
    background: var(--accent-red);
    color: white;
  }

  .test-btn {
    background: var(--accent-blue);
    color: white;
  }

  .reset-btn:hover:not(:disabled), .test-btn:hover {
    transform: translateY(-1px);
  }

  .reset-btn:hover:not(:disabled) {
    background: #ff5252;
  }

  .test-btn:hover {
    background: #4a9eff;
  }

  .reset-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style> 