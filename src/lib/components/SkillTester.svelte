<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let isOpen = false;
  export let currentSkill = 'file-reader';
  
  const dispatch = createEventDispatcher();
  
  // Available skills for testing with sticky note colors
  const availableSkills = [
    {
      id: 'file-reader',
      name: 'File Reader',
      icon: '📖',
      color: '#00ff88',
      tabColor: '#fff2cc',
      description: 'Test file reading capabilities'
    },
    {
      id: 'file-writer',
      name: 'File Writer', 
      icon: '✏️',
      color: '#00bfff',
      tabColor: '#d4f1f4',
      description: 'Test file writing capabilities'
    },
    {
      id: 'directory-master',
      name: 'Directory Master',
      icon: '📁', 
      color: '#ff8800',
      tabColor: '#ffe6cc',
      description: 'Test directory operations'
    },
    {
      id: 'system-commander',
      name: 'System Commander',
      icon: '⚡',
      color: '#ff4444', 
      tabColor: '#f4cccc',
      description: 'Test system command execution'
    }
  ];
  
  function closeTester() {
    dispatch('close');
  }
  
  function switchSkill(skillId: string) {
    currentSkill = skillId;
  }
  
  function getCurrentSkill() {
    return availableSkills.find(s => s.id === currentSkill) || availableSkills[0];
  }
</script>

{#if isOpen}
  <div class="skill-tester-overlay" on:click={closeTester}>
    <div class="skill-tester-book" on:click|stopPropagation>
      <!-- Book Cover -->
      <div class="book-cover">
        <div class="book-title">Skill Tester</div>
        <div class="book-subtitle">Test your agent's capabilities</div>
      </div>
      
             <!-- Book Pages -->
       <div class="book-pages">
         <!-- Left Page -->
         <div class="page left-page">
           <div class="page-content">
             <div class="page-number">1</div>
             <div class="book-text">
               {#if currentSkill === 'file-reader'}
                 <h2>File Reader Test</h2>
                 <p>The File Reader skill allows agents to access and read files from the system. This capability is fundamental for data processing and analysis tasks.</p>
                 
                 <h3>Test Configuration</h3>
                 <p>To test the File Reader skill, specify the following parameters:</p>
                 
                 <ul>
                   <li><strong>Target File:</strong> The path to the file you want to read</li>
                   <li><strong>Encoding:</strong> Text encoding (UTF-8, ASCII, etc.)</li>
                   <li><strong>Buffer Size:</strong> Memory allocation for large files</li>
                   <li><strong>Timeout:</strong> Maximum time allowed for operation</li>
                 </ul>
                 
                 <div class="test-form">
                   <div class="form-group">
                     <label>File Path:</label>
                     <input type="text" placeholder="/path/to/file.txt" />
                   </div>
                   <div class="form-group">
                     <label>Encoding:</label>
                     <select>
                       <option>UTF-8</option>
                       <option>ASCII</option>
                       <option>ISO-8859-1</option>
                     </select>
                   </div>
                   <button class="run-test-btn">Run Test</button>
                 </div>
               {:else if currentSkill === 'file-writer'}
                 <h2>File Writer Test</h2>
                 <p>The File Writer skill enables agents to create and modify files on the system. This capability is essential for data persistence and content generation.</p>
                 
                 <h3>Test Configuration</h3>
                 <p>To test the File Writer skill, specify the following parameters:</p>
                 
                 <ul>
                   <li><strong>Target File:</strong> The path where the file should be created</li>
                   <li><strong>Content:</strong> The data to write to the file</li>
                   <li><strong>Mode:</strong> Write mode (overwrite, append, etc.)</li>
                   <li><strong>Permissions:</strong> File access permissions</li>
                 </ul>
                 
                 <div class="test-form">
                   <div class="form-group">
                     <label>File Path:</label>
                     <input type="text" placeholder="/path/to/output.txt" />
                   </div>
                   <div class="form-group">
                     <label>Content:</label>
                     <textarea placeholder="Enter content to write..."></textarea>
                   </div>
                   <button class="run-test-btn">Run Test</button>
                 </div>
               {:else if currentSkill === 'directory-master'}
                 <h2>Directory Master Test</h2>
                 <p>The Directory Master skill provides advanced directory and folder operations. This includes listing, creating, and managing directory structures.</p>
                 
                 <h3>Test Configuration</h3>
                 <p>To test the Directory Master skill, specify the following parameters:</p>
                 
                 <ul>
                   <li><strong>Target Directory:</strong> The directory path to operate on</li>
                   <li><strong>Operation:</strong> Type of operation (list, create, delete)</li>
                   <li><strong>Recursive:</strong> Include subdirectories</li>
                   <li><strong>Pattern:</strong> File matching pattern</li>
                 </ul>
                 
                 <div class="test-form">
                   <div class="form-group">
                     <label>Directory Path:</label>
                     <input type="text" placeholder="/path/to/directory" />
                   </div>
                   <div class="form-group">
                     <label>Operation:</label>
                     <select>
                       <option>List Contents</option>
                       <option>Create Directory</option>
                       <option>Delete Directory</option>
                     </select>
                   </div>
                   <button class="run-test-btn">Run Test</button>
                 </div>
               {:else if currentSkill === 'system-commander'}
                 <h2>System Commander Test</h2>
                 <p>The System Commander skill allows agents to execute system commands and scripts. This provides direct access to system operations.</p>
                 
                 <h3>Test Configuration</h3>
                 <p>To test the System Commander skill, specify the following parameters:</p>
                 
                 <ul>
                   <li><strong>Command:</strong> The system command to execute</li>
                   <li><strong>Arguments:</strong> Command line arguments</li>
                   <li><strong>Working Directory:</strong> Execution context</li>
                   <li><strong>Timeout:</strong> Maximum execution time</li>
                 </ul>
                 
                 <div class="test-form">
                   <div class="form-group">
                     <label>Command:</label>
                     <input type="text" placeholder="ls -la" />
                   </div>
                   <div class="form-group">
                     <label>Working Directory:</label>
                     <input type="text" placeholder="/current/directory" />
                   </div>
                   <button class="run-test-btn">Run Test</button>
                 </div>
               {/if}
             </div>
           </div>
         </div>
         
         <!-- Right Page -->
         <div class="page right-page">
           <div class="page-content">
             <div class="page-number">2</div>
             <div class="book-text">
               <h2>Test Results</h2>
               <p>Results from the most recent {getCurrentSkill().name} test execution:</p>
               
               <div class="test-results">
                 <div class="result-entry">
                   <span class="result-label">Status:</span>
                   <span class="result-value success">✓ Success</span>
                 </div>
                 <div class="result-entry">
                   <span class="result-label">Execution Time:</span>
                   <span class="result-value">0.8 seconds</span>
                 </div>
                 <div class="result-entry">
                   <span class="result-label">Memory Used:</span>
                   <span class="result-value">2.4 MB</span>
                 </div>
                 <div class="result-entry">
                   <span class="result-label">CPU Usage:</span>
                   <span class="result-value">12%</span>
                 </div>
               </div>
               
               <h3>Performance Analysis</h3>
               <p>The {getCurrentSkill().name} demonstrated excellent performance with fast execution times and accurate results. The skill successfully completed the requested operation.</p>
               
               <div class="performance-note">
                 <strong>Note:</strong> Performance may vary based on system resources, network conditions, and operation complexity.
               </div>
             </div>
           </div>
         </div>
       </div>
      
      <!-- Sticky Tabs (Book Marks) -->
      <div class="book-tabs">
                 {#each availableSkills as skill}
           <button 
             class="book-tab"
             class:active={currentSkill === skill.id}
             style="--tab-color: {skill.tabColor}"
             on:click={() => switchSkill(skill.id)}
           >
             <span class="tab-icon">{skill.icon}</span>
             <span class="tab-name">{skill.name}</span>
           </button>
         {/each}
      </div>
      
      <!-- Close Button -->
      <button class="close-btn" on:click={closeTester}>✕</button>
    </div>
  </div>
{/if}

<style>
  .skill-tester-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .skill-tester-book {
    position: relative;
    width: 800px;
    height: 600px;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 20px;
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.5),
      0 0 0 2px rgba(0, 255, 136, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .book-cover {
    background: linear-gradient(135deg, #00ff88 0%, #00bfff 100%);
    color: #000;
    padding: 20px;
    text-align: center;
    border-bottom: 2px solid rgba(0, 255, 136, 0.5);
  }
  
  .book-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .book-subtitle {
    font-size: 14px;
    opacity: 0.8;
  }
  
  .book-pages {
    display: flex;
    flex: 1;
    position: relative;
  }
  
  .page {
    flex: 1;
    padding: 40px;
    background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%);
    border-right: 1px solid #ccc;
    position: relative;
    overflow-y: auto;
  }
  
  .right-page {
    border-right: none;
    border-left: 1px solid #ccc;
  }
  
  .page-number {
    position: absolute;
    bottom: 20px;
    right: 20px;
    font-size: 12px;
    color: #666;
    font-style: italic;
  }
  
  .book-text {
    color: #333;
    font-family: 'Georgia', serif;
    line-height: 1.6;
    font-size: 14px;
  }
  
  .book-text h2 {
    color: #2c3e50;
    font-size: 20px;
    margin-bottom: 15px;
    border-bottom: 2px solid #3498db;
    padding-bottom: 5px;
  }
  
  .book-text h3 {
    color: #34495e;
    font-size: 16px;
    margin: 20px 0 10px 0;
  }
  
  .book-text p {
    margin-bottom: 15px;
    text-align: justify;
  }
  
  .book-text ul {
    margin: 15px 0;
    padding-left: 20px;
  }
  
  .book-text li {
    margin-bottom: 8px;
  }
  
  .test-form {
    margin: 20px 0;
    padding: 20px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    border: 1px solid #ddd;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    color: #2c3e50;
    margin-bottom: 5px;
    font-weight: 600;
    font-size: 13px;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    background: white;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
    color: #2c3e50;
    font-size: 14px;
    font-family: 'Georgia', serif;
  }
  
  .form-group textarea {
    min-height: 80px;
    resize: vertical;
  }
  
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
  
  .run-test-btn {
    background: #3498db;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .run-test-btn:hover {
    background: #2980b9;
    transform: translateY(-1px);
  }
  
  .test-results {
    margin: 20px 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 6px;
    border: 1px solid #ddd;
  }
  
  .result-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }
  
  .result-entry:last-child {
    border-bottom: none;
  }
  
  .result-label {
    font-weight: 600;
    color: #2c3e50;
    font-size: 13px;
  }
  
  .result-value {
    color: #34495e;
    font-size: 13px;
  }
  
  .result-value.success {
    color: #27ae60;
    font-weight: 600;
  }
  
  .performance-note {
    margin-top: 20px;
    padding: 15px;
    background: rgba(52, 152, 219, 0.1);
    border-left: 4px solid #3498db;
    border-radius: 4px;
    font-size: 13px;
    color: #2c3e50;
  }
  
  .results-area {
    margin-bottom: 30px;
  }
  
  .result-item {
    display: flex;
    align-items: center;
    padding: 10px;
    margin-bottom: 8px;
    border-radius: 6px;
    font-size: 14px;
  }
  
  .result-item.success {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
  }
  
  .result-item.info {
    background: rgba(0, 191, 255, 0.1);
    border: 1px solid rgba(0, 191, 255, 0.3);
  }
  
  .result-item.warning {
    background: rgba(255, 136, 0, 0.1);
    border: 1px solid rgba(255, 136, 0, 0.3);
  }
  
  .result-icon {
    margin-right: 10px;
    font-size: 16px;
  }
  
  .performance-metrics h4 {
    color: #00ff88;
    margin-bottom: 15px;
    font-size: 16px;
  }
  
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
  }
  
  .metric {
    text-align: center;
    padding: 15px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(0, 255, 136, 0.2);
  }
  
  .metric-label {
    display: block;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    margin-bottom: 5px;
  }
  
  .metric-value {
    display: block;
    color: #00ff88;
    font-size: 16px;
    font-weight: bold;
  }
  
  .book-tabs {
    position: absolute;
    right: -60px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .book-tab {
    width: 45px;
    height: 55px;
    background: var(--tab-color);
    border: none;
    border-radius: 6px 0 0 6px;
    color: #333;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
    position: relative;
  }
  
  .book-tab::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
    border-radius: 6px 0 0 6px;
  }
  
  .book-tab:hover {
    transform: translateX(-5px);
    box-shadow: -5px 0 10px rgba(0, 0, 0, 0.4);
  }
  
  .book-tab.active {
    transform: translateX(-10px);
    box-shadow: -8px 0 15px rgba(0, 0, 0, 0.5);
  }
  
  .tab-icon {
    font-size: 16px;
    margin-bottom: 2px;
  }
  
  .tab-name {
    font-size: 8px;
    text-align: center;
    line-height: 1;
  }
  
  .close-btn {
    position: absolute;
    top: 15px;
    right: 15px;
    width: 30px;
    height: 30px;
    background: rgba(255, 0, 0, 0.8);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;
  }
  
  .close-btn:hover {
    background: rgba(255, 0, 0, 1);
    transform: scale(1.1);
  }
</style> 