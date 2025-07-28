<script lang="ts">
    import { skillConfigManager, type SkillConfig } from '../services/SkillConfigManager';
    import { selectedAgent } from '../services/CharacterManager';
    
    export let isOpen = false;
    export let onClose: () => void;
    export let skillId: string = '';
    export let skillName: string = '';
    
    let editingConfig: SkillConfig | null = null;
    let isAddingNew = false;
    
    $: currentSkillConfig = skillId ? 
        skillConfigManager.getSkillConfig(skillId, $selectedAgent || 'global') : null;
    
    function openEditConfig(config: SkillConfig) {
        editingConfig = { ...config };
        isAddingNew = false;
    }
    
    function openAddConfig() {
        editingConfig = {
            id: '',
            name: '',
            description: '',
            category: 'prompt',
            configType: 'prompt',
            value: '',
            isEnabled: true
        };
        isAddingNew = true;
    }
    
    function saveConfig() {
        if (!editingConfig) return;
        
        const agentId = $selectedAgent || 'global';
        
        if (isAddingNew) {
            // Add new config
            const newConfig = {
                ...editingConfig,
                id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            // Update the skill config
            const currentConfig = currentSkillConfig;
            if (currentConfig) {
                skillConfigManager.store.update(current => {
                    const key = `${skillId}_${agentId}`;
                    const updatedConfigs = [...currentConfig.configs, newConfig];
                    
                    return {
                        ...current,
                        [key]: {
                            ...currentConfig,
                            configs: updatedConfigs
                        }
                    };
                });
            }
        } else {
            // Update existing config
            skillConfigManager.updateSkillConfig(skillId, agentId, editingConfig.id, editingConfig);
        }
        
        editingConfig = null;
    }
    
    function deleteConfig(configId: string) {
        const agentId = $selectedAgent || 'global';
        
        const currentConfig = currentSkillConfig;
        if (currentConfig) {
            skillConfigManager.store.update(current => {
                const key = `${skillId}_${agentId}`;
                const updatedConfigs = currentConfig.configs.filter(c => c.id !== configId);
                
                return {
                    ...current,
                    [key]: {
                        ...currentConfig,
                        configs: updatedConfigs
                    }
                };
            });
        }
    }
    
    function toggleConfig(configId: string, isEnabled: boolean) {
        const agentId = $selectedAgent || 'global';
        skillConfigManager.updateSkillConfig(skillId, agentId, configId, { isEnabled });
    }
    
    function getConfigTypeIcon(configType: string): string {
        switch (configType) {
            case 'prompt': return '💬';
            case 'parameters': return '⚙️';
            case 'behavior': return '🎯';
            default: return '📄';
        }
    }
    
    function getConfigTypeColor(configType: string): string {
        switch (configType) {
            case 'prompt': return '#4CAF50';
            case 'parameters': return '#2196F3';
            case 'behavior': return '#FF9800';
            default: return '#757575';
        }
    }
</script>

{#if isOpen}
    <div class="skill-config-overlay" on:click={onClose}>
        <div class="skill-config-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>⚙️ Configure {skillName}</h3>
                <button class="close-btn" on:click={onClose}>×</button>
            </div>
            
            <div class="modal-content">
                {#if currentSkillConfig}
                    <div class="config-section">
                        <div class="section-header">
                            <h4>Configuration {#if $selectedAgent}for {$selectedAgent}{:else}(Global){/if}</h4>
                            <button class="add-btn" on:click={openAddConfig}>+ Add Config</button>
                        </div>
                        
                        <div class="configs-list">
                            {#each currentSkillConfig.configs as config}
                                <div class="config-card" class:enabled={config.isEnabled}>
                                    <div class="config-header">
                                        <div class="config-info">
                                            <span class="config-type-icon" style="color: {getConfigTypeColor(config.configType)}">
                                                {getConfigTypeIcon(config.configType)}
                                            </span>
                                            <div class="config-details">
                                                <div class="config-name">{config.name}</div>
                                                <div class="config-description">{config.description}</div>
                                            </div>
                                        </div>
                                        <div class="config-actions">
                                            <label class="ios-toggle">
                                                <input 
                                                    type="checkbox" 
                                                    checked={config.isEnabled}
                                                    on:change={(e) => toggleConfig(config.id, (e.target as HTMLInputElement).checked)}
                                                />
                                                <span class="toggle-slider"></span>
                                            </label>
                                            <button class="edit-btn" on:click={() => openEditConfig(config)}>✏️</button>
                                            <button class="delete-btn" on:click={() => deleteConfig(config.id)}>🗑️</button>
                                        </div>
                                    </div>
                                    <div class="config-preview">
                                        {#if config.configType === 'prompt'}
                                            {(config.value as string).substring(0, 100)}{(config.value as string).length > 100 ? '...' : ''}
                                        {:else}
                                            {JSON.stringify(config.value)}
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {:else}
                    <div class="no-config-available">
                        <div class="no-config-icon">⚙️</div>
                        <div class="no-config-text">No configuration available for this skill</div>
                        <button class="add-btn" on:click={openAddConfig}>+ Create Configuration</button>
                    </div>
                {/if}
            </div>
            
            {#if editingConfig}
                <div class="edit-config-modal">
                    <div class="edit-header">
                        <h4>{isAddingNew ? 'Add New Config' : 'Edit Config'}</h4>
                        <button class="close-btn" on:click={() => editingConfig = null}>×</button>
                    </div>
                    
                    <div class="edit-form">
                        <div class="form-group">
                            <label>Name:</label>
                            <input 
                                type="text" 
                                bind:value={editingConfig.name}
                                placeholder="Config name"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label>Description:</label>
                            <input 
                                type="text" 
                                bind:value={editingConfig.description}
                                placeholder="Brief description"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label>Type:</label>
                            <select bind:value={editingConfig.configType}>
                                <option value="prompt">Prompt</option>
                                <option value="parameters">Parameters</option>
                                <option value="behavior">Behavior</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Value:</label>
                            {#if editingConfig.configType === 'prompt'}
                                <textarea 
                                    bind:value={editingConfig.value}
                                    placeholder="Enter the prompt text..."
                                    rows="6"
                                ></textarea>
                            {:else}
                                <textarea 
                                    bind:value={editingConfig.value}
                                    placeholder="Enter JSON configuration..."
                                    rows="4"
                                ></textarea>
                            {/if}
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" bind:checked={editingConfig.isEnabled} />
                                <span>Enabled</span>
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button class="save-btn" on:click={saveConfig}>Save</button>
                            <button class="cancel-btn" on:click={() => editingConfig = null}>Cancel</button>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style lang="css">
    .skill-config-overlay {
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
    
    .skill-config-modal {
        background: rgba(20, 20, 20, 0.95);
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 12px;
        width: 90%;
        max-width: 700px;
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
    
    .config-section {
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
    
    .configs-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .config-card {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s ease;
    }
    
    .config-card:hover {
        border-color: rgba(0, 255, 136, 0.3);
        background: rgba(0, 255, 136, 0.05);
    }
    
    .config-card.enabled {
        border-color: rgba(0, 255, 136, 0.5);
        background: rgba(0, 255, 136, 0.1);
    }
    
    .config-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
    }
    
    .config-info {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
    }
    
    .config-type-icon {
        font-size: 1.2rem;
        margin-top: 2px;
    }
    
    .config-details {
        flex: 1;
    }
    
    .config-name {
        font-weight: bold;
        color: white;
        margin-bottom: 4px;
    }
    
    .config-description {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
    }
    
    .config-actions {
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
    
    .config-preview {
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
    
    .no-config-available {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
        gap: 16px;
    }
    
    .no-config-icon {
        font-size: 3rem;
        opacity: 0.7;
    }
    
    .no-config-text {
        font-size: 0.9rem;
        line-height: 1.4;
    }
    
    .edit-config-modal {
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