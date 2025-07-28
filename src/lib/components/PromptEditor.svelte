<script lang="ts">
    import { agentPromptManager, agentPromptsStore, type AgentPrompt } from '../services/AgentPromptManager';
    import { selectedAgent } from '../services/CharacterManager';
    
    export let isOpen = false;
    export let onClose: () => void;
    
    let editingPrompt: AgentPrompt | null = null;
    let isAddingNew = false;
    
    // Reactive statement to get current agent prompts from the store
    $: currentAgentPrompts = $selectedAgent ? $agentPromptsStore[$selectedAgent] : null;
    
    function openEditPrompt(prompt: AgentPrompt) {
        editingPrompt = { ...prompt };
        isAddingNew = false;
    }
    
    function openAddPrompt() {
        editingPrompt = {
            id: '',
            name: '',
            description: '',
            prompt: '',
            category: 'custom',
            isEnabled: true
        };
        isAddingNew = true;
    }
    
    function savePrompt() {
        if (!$selectedAgent || !editingPrompt) {
            console.error('❌ Cannot save: missing agent or editing prompt');
            return;
        }
        
        console.log('💾 Saving prompt:', {
            agent: $selectedAgent,
            prompt: editingPrompt,
            isAddingNew
        });
        
        try {
            if (isAddingNew) {
                agentPromptManager.addAgentPrompt($selectedAgent, editingPrompt);
                console.log('✅ Added new prompt');
            } else {
                agentPromptManager.updateAgentPrompt($selectedAgent, editingPrompt.id, editingPrompt);
                console.log('✅ Updated existing prompt');
            }
            
            // Test the saved prompt
            const savedPrompts = agentPromptManager.getAgentPrompts($selectedAgent);
            const combinedPrompt = agentPromptManager.getCombinedPrompt($selectedAgent);
            console.log('📝 Saved prompts:', savedPrompts);
            console.log('🔗 Combined prompt:', combinedPrompt);
            
            editingPrompt = null;
        } catch (error) {
            console.error('❌ Error saving prompt:', error);
        }
    }
    
    function deletePrompt(promptId: string) {
        if (!$selectedAgent) return;
        agentPromptManager.removeAgentPrompt($selectedAgent, promptId);
    }
    
    function togglePrompt(promptId: string, isEnabled: boolean) {
        if (!$selectedAgent) return;
        agentPromptManager.updateAgentPrompt($selectedAgent, promptId, { isEnabled });
    }
    
    function getCategoryIcon(category: string): string {
        switch (category) {
            case 'system': return '👤';
            case 'behavior': return '🧠';
            case 'custom': return '✨';
            default: return '📄';
        }
    }
    
    function getCategoryColor(category: string): string {
        switch (category) {
            case 'system': return '#4CAF50';
            case 'behavior': return '#2196F3';
            case 'custom': return '#9C27B0';
            default: return '#757575';
        }
    }
</script>

{#if isOpen}
    <div class="prompt-editor-overlay" on:click={onClose}>
        <div class="prompt-editor-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>🧠 Agent Identity</h3>
                <button class="close-btn" on:click={onClose}>×</button>
            </div>
            
            <div class="modal-content">
                {#if $selectedAgent && currentAgentPrompts}
                    <div class="prompts-section">
                        <div class="section-header">
                            <h4>Identity Configuration for {$selectedAgent}</h4>
                            <button class="add-btn" on:click={openAddPrompt}>+ Add Identity Trait</button>
                        </div>
                        
                        <div class="prompts-list">
                            {#each currentAgentPrompts.prompts as prompt}
                                <div class="prompt-card" class:enabled={prompt.isEnabled}>
                                    <div class="prompt-header">
                                        <div class="prompt-info">
                                            <span class="category-icon" style="color: {getCategoryColor(prompt.category)}">
                                                {getCategoryIcon(prompt.category)}
                                            </span>
                                            <div class="prompt-details">
                                                <div class="prompt-name">{prompt.name}</div>
                                                <div class="prompt-description">{prompt.description}</div>
                                            </div>
                                        </div>
                                        <div class="prompt-actions">
                                            <label class="ios-toggle">
                                                <input 
                                                    type="checkbox" 
                                                    checked={prompt.isEnabled}
                                                    on:change={(e) => togglePrompt(prompt.id, (e.target as HTMLInputElement).checked)}
                                                />
                                                <span class="toggle-slider"></span>
                                            </label>
                                            <button class="edit-btn" on:click={() => openEditPrompt(prompt)}>✏️</button>
                                            <button class="delete-btn" on:click={() => deletePrompt(prompt.id)}>🗑️</button>
                                        </div>
                                    </div>
                                    <div class="prompt-preview">
                                        {prompt.prompt.substring(0, 100)}{prompt.prompt.length > 100 ? '...' : ''}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {:else}
                    <div class="no-agent-selected">
                        <div class="no-agent-icon">🧠</div>
                        <div class="no-agent-text">Select an agent to configure their identity</div>
                    </div>
                {/if}
            </div>
            
            {#if editingPrompt}
                <div class="edit-prompt-modal">
                    <div class="edit-header">
                        <h4>{isAddingNew ? 'Add Identity Trait' : 'Edit Identity Trait'}</h4>
                        <button class="close-btn" on:click={() => editingPrompt = null}>×</button>
                    </div>
                    
                    <div class="edit-form">
                        <div class="form-group">
                            <label>Name:</label>
                            <input 
                                type="text" 
                                bind:value={editingPrompt.name}
                                placeholder="Prompt name"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label>Description:</label>
                            <input 
                                type="text" 
                                bind:value={editingPrompt.description}
                                placeholder="Brief description"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label>Category:</label>
                            <select bind:value={editingPrompt.category}>
                                <option value="system">Core Identity</option>
                                <option value="behavior">Behavior Style</option>
                                <option value="custom">Custom Trait</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Identity Trait:</label>
                            <textarea 
                                bind:value={editingPrompt.prompt}
                                placeholder="Describe this aspect of the agent's identity..."
                                rows="6"
                            ></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" bind:checked={editingPrompt.isEnabled} />
                                <span>Enabled</span>
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button class="save-btn" on:click={savePrompt}>Save</button>
                            <button class="cancel-btn" on:click={() => editingPrompt = null}>Cancel</button>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style lang="css">
    .prompt-editor-overlay {
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
        backdrop-filter: blur(5px);
    }
    
    .prompt-editor-modal {
        background: rgba(20, 20, 20, 0.95);
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 12px;
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        background: rgba(0, 0, 0, 0.3);
    }
    
    .modal-header h3 {
        margin: 0;
        color: #00ff88;
        font-size: 1.2rem;
    }
    
    .close-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
    }
    
    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }
    
    .modal-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    }
    
    .prompts-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .section-header h4 {
        margin: 0;
        color: #00ff88;
        font-size: 1rem;
    }
    
    .add-btn {
        background: #00ff88;
        border: none;
        color: #000;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .add-btn:hover {
        background: #00cc6a;
        transform: translateY(-1px);
    }
    
    .prompts-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .prompt-card {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s ease;
    }
    
    .prompt-card:hover {
        border-color: rgba(0, 255, 136, 0.3);
        background: rgba(0, 255, 136, 0.05);
    }
    
    .prompt-card.enabled {
        border-color: rgba(0, 255, 136, 0.5);
        background: rgba(0, 255, 136, 0.1);
    }
    
    .prompt-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
    }
    
    .prompt-info {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
    }
    
    .category-icon {
        font-size: 1.2rem;
        margin-top: 2px;
    }
    
    .prompt-details {
        flex: 1;
    }
    
    .prompt-name {
        font-weight: bold;
        color: white;
        margin-bottom: 4px;
    }
    
    .prompt-description {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
    }
    
    .prompt-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .edit-btn, .delete-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
    }
    
    .edit-btn:hover {
        background: rgba(0, 255, 136, 0.2);
        color: #00ff88;
    }
    
    .delete-btn:hover {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
    }
    
    .prompt-preview {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.4;
        font-style: italic;
    }
    
    .ios-toggle {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        cursor: pointer;
    }
    
    .ios-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.2);
        transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    input:checked + .toggle-slider {
        background-color: #4CAF50;
        border-color: #4CAF50;
    }
    
    input:checked + .toggle-slider:before {
        transform: translateX(20px);
    }
    
    .no-agent-selected {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
    }
    
    .no-agent-icon {
        font-size: 3rem;
        margin-bottom: 12px;
        opacity: 0.7;
    }
    
    .no-agent-text {
        font-size: 0.9rem;
        line-height: 1.4;
    }
    
    .edit-prompt-modal {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        flex-direction: column;
        z-index: 10;
    }
    
    .edit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        background: rgba(0, 0, 0, 0.3);
    }
    
    .edit-header h4 {
        margin: 0;
        color: #00ff88;
        font-size: 1.1rem;
    }
    
    .edit-form {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .form-group label {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 10px 12px;
        color: white;
        font-size: 0.9rem;
        transition: all 0.2s ease;
    }
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #00ff88;
        background: rgba(0, 255, 136, 0.1);
    }
    
    .form-group textarea {
        resize: vertical;
        min-height: 120px;
        font-family: inherit;
    }
    
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }
    
    .checkbox-label input[type="checkbox"] {
        width: auto;
        margin: 0;
    }
    
    .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .save-btn, .cancel-btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }
    
    .save-btn {
        background: #00ff88;
        color: #000;
    }
    
    .save-btn:hover {
        background: #00cc6a;
        transform: translateY(-1px);
    }
    
    .cancel-btn {
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .cancel-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }
</style> 