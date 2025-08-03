<script lang="ts">
  export let isOpen: boolean = false;
  export let currentSkill: string = '';

  // Import all available testers
  import FileReaderTester from '../testers/FileReaderTester.svelte';
  import FileWriterTester from '../testers/FileWriterTester.svelte';
  import DirectoryMasterTester from '../testers/DirectoryMasterTester.svelte';
  import SystemCommanderTester from '../testers/SystemCommanderTester.svelte';
  import MessageHandlerTester from '../testers/MessageHandlerTester.svelte';
  import CollaborationTester from '../testers/CollaborationTester.svelte';
  import DataAnalyzerTester from '../testers/DataAnalyzerTester.svelte';
  import PatternRecognitionTester from '../testers/PatternRecognitionTester.svelte';
  import AccessControlTester from '../testers/AccessControlTester.svelte';
  import EncryptionTester from '../testers/EncryptionTester.svelte';
  import ThreatDetectionTester from '../testers/ThreatDetectionTester.svelte';
  import PredictiveModelingTester from '../testers/PredictiveModelingTester.svelte';

  // Skill to tester mapping
  const skillTesterMap = {
    'file-reader': FileReaderTester,
    'file-writer': FileWriterTester,
    'directory-master': DirectoryMasterTester,
    'system-commander': SystemCommanderTester,
    'message-handler': MessageHandlerTester,
    'collaboration': CollaborationTester,
    'data-analyzer': DataAnalyzerTester,
    'pattern-recognition': PatternRecognitionTester,
    'access-control': AccessControlTester,
    'encryption': EncryptionTester,
    'threat-detection': ThreatDetectionTester,
    'predictive-modeling': PredictiveModelingTester
  };

  function closeTester() {
    isOpen = false;
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeTester();
    }
  }

  $: CurrentTester = skillTesterMap[currentSkill as keyof typeof skillTesterMap];
</script>

{#if isOpen}
  <div class="tester-overlay" on:click={handleBackdropClick}>
    <div class="tester-modal">
      <div class="tester-header">
        <h3>🧪 Test {currentSkill.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
        <button class="close-btn" on:click={closeTester}>×</button>
      </div>
      
      <div class="tester-content">
        {#if CurrentTester}
          <svelte:component this={CurrentTester} />
        {:else}
          <div class="no-tester">
            <p>No tester available for this skill yet.</p>
            <p>Skill ID: {currentSkill}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .tester-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .tester-modal {
    background: var(--bg-primary);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    max-width: 90vw;
    max-height: 90vh;
    width: 800px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tester-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .tester-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 24px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.1);
  }

  .tester-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .no-tester {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
  }

  .no-tester p {
    margin: 8px 0;
  }
</style> 