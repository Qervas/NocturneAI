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
    },
    {
      id: 'message-handler',
      name: 'Message Handler',
      icon: '📨',
      color: '#9b59b6',
      tabColor: '#f3e5f5',
      description: 'Test message processing capabilities'
    },
    {
      id: 'collaboration',
      name: 'Team Collaboration',
      icon: '🤝',
      color: '#3498db',
      tabColor: '#e3f2fd',
      description: 'Test team collaboration features'
    },
    {
      id: 'data-analyzer',
      name: 'Data Analyzer',
      icon: '📊',
      color: '#e74c3c',
      tabColor: '#ffebee',
      description: 'Test data analysis capabilities'
    },
    {
      id: 'pattern-recognition',
      name: 'Pattern Recognition',
      icon: '🧩',
      color: '#f39c12',
      tabColor: '#fff3e0',
      description: 'Test pattern recognition skills'
    },
    {
      id: 'access-control',
      name: 'Access Control',
      icon: '🔐',
      color: '#2c3e50',
      tabColor: '#eceff1',
      description: 'Test access control mechanisms'
    },
    {
      id: 'threat-detection',
      name: 'Threat Detection',
      icon: '🚨',
      color: '#e67e22',
      tabColor: '#fff8e1',
      description: 'Test security threat detection'
    },
    {
      id: 'encryption',
      name: 'Encryption',
      icon: '🔒',
      color: '#8e44ad',
      tabColor: '#f8f4ff',
      description: 'Test encryption and decryption'
    },
    {
      id: 'predictive-modeling',
      name: 'Predictive Modeling',
      icon: '🔮',
      color: '#1abc9c',
      tabColor: '#e0f2f1',
      description: 'Test predictive modeling capabilities'
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
                {:else if currentSkill === 'message-handler'}
                  <h2>Message Handler Test</h2>
                  <p>The Message Handler skill enables agents to process and respond to messages efficiently. This capability is essential for communication tasks.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Message Handler skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Message Type:</strong> Type of message to process</li>
                    <li><strong>Priority:</strong> Message priority level</li>
                    <li><strong>Response Format:</strong> Expected response format</li>
                    <li><strong>Processing Time:</strong> Maximum processing time</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Message Content:</label>
                      <textarea placeholder="Enter message to process..."></textarea>
                    </div>
                    <div class="form-group">
                      <label>Priority:</label>
                      <select>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                    <button class="run-test-btn">Run Test</button>
                  </div>
                {:else if currentSkill === 'collaboration'}
                  <h2>Team Collaboration Test</h2>
                  <p>The Team Collaboration skill allows agents to work effectively with other agents. This includes coordination and shared task management.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Team Collaboration skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Team Size:</strong> Number of agents in collaboration</li>
                    <li><strong>Task Type:</strong> Type of collaborative task</li>
                    <li><strong>Communication Protocol:</strong> Inter-agent communication method</li>
                    <li><strong>Coordination Level:</strong> Level of coordination required</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Team Members:</label>
                      <input type="text" placeholder="agent-1, agent-2, agent-3" />
                    </div>
                    <div class="form-group">
                      <label>Task Description:</label>
                      <textarea placeholder="Describe the collaborative task..."></textarea>
                    </div>
                    <button class="run-test-btn">Run Test</button>
                  </div>
                {:else if currentSkill === 'data-analyzer'}
                  <h2>Data Analyzer Test</h2>
                  <p>The Data Analyzer skill enables agents to analyze and interpret complex data sets. This includes statistical analysis and data visualization.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Data Analyzer skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Data Source:</strong> Source of data to analyze</li>
                    <li><strong>Analysis Type:</strong> Type of analysis to perform</li>
                    <li><strong>Output Format:</strong> Desired output format</li>
                    <li><strong>Accuracy Threshold:</strong> Minimum accuracy requirement</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Data File:</label>
                      <input type="text" placeholder="/path/to/data.csv" />
                    </div>
                    <div class="form-group">
                      <label>Analysis Type:</label>
                      <select>
                        <option>Statistical Analysis</option>
                        <option>Trend Analysis</option>
                        <option>Correlation Analysis</option>
                        <option>Predictive Analysis</option>
                      </select>
                    </div>
                    <button class="run-test-btn">Run Test</button>
                  </div>
                {:else if currentSkill === 'pattern-recognition'}
                  <h2>Pattern Recognition Test</h2>
                  <p>The Pattern Recognition skill allows agents to identify patterns and trends in information. This includes machine learning and AI capabilities.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Pattern Recognition skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Pattern Type:</strong> Type of pattern to recognize</li>
                    <li><strong>Data Set:</strong> Training and test data</li>
                    <li><strong>Algorithm:</strong> Recognition algorithm to use</li>
                    <li><strong>Confidence Level:</strong> Minimum confidence threshold</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Pattern Type:</label>
                      <select>
                        <option>Text Patterns</option>
                        <option>Image Patterns</option>
                        <option>Behavioral Patterns</option>
                        <option>Temporal Patterns</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Training Data:</label>
                      <input type="text" placeholder="/path/to/training_data" />
                    </div>
                    <button class="run-test-btn">Run Test</button>
                  </div>
                {:else if currentSkill === 'access-control'}
                  <h2>Access Control Test</h2>
                  <p>The Access Control skill manages permissions and access rights for various resources. This includes authentication and authorization.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Access Control skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Resource Type:</strong> Type of resource to protect</li>
                    <li><strong>Permission Level:</strong> Access permission level</li>
                    <li><strong>Authentication Method:</strong> Method of authentication</li>
                    <li><strong>Session Duration:</strong> Length of access session</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Resource Path:</label>
                      <input type="text" placeholder="/protected/resource" />
                    </div>
                    <div class="form-group">
                      <label>Permission Level:</label>
                      <select>
                        <option>Read Only</option>
                        <option>Read/Write</option>
                        <option>Admin</option>
                        <option>Owner</option>
                      </select>
                    </div>
                    <button class="run-test-btn">Run Test</button>
                  </div>
                {:else if currentSkill === 'threat-detection'}
                  <h2>Threat Detection Test</h2>
                  <p>The Threat Detection skill identifies and responds to security threats. This includes monitoring and alert systems.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Threat Detection skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Threat Type:</strong> Type of threat to detect</li>
                    <li><strong>Monitoring Scope:</strong> Scope of monitoring</li>
                    <li><strong>Alert Threshold:</strong> Threshold for alerts</li>
                    <li><strong>Response Action:</strong> Action to take on detection</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Monitoring Target:</label>
                      <input type="text" placeholder="system, network, files" />
                    </div>
                    <div class="form-group">
                      <label>Threat Type:</label>
                      <select>
                        <option>Malware Detection</option>
                        <option>Intrusion Detection</option>
                        <option>Anomaly Detection</option>
                        <option>Vulnerability Scan</option>
                      </select>
                    </div>
                    <button class="run-test-btn">Run Test</button>
                  </div>
                {:else if currentSkill === 'encryption'}
                  <h2>Encryption Test</h2>
                  <p>The Encryption skill handles encrypting and decrypting sensitive information. This includes various encryption algorithms and key management.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Encryption skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Algorithm:</strong> Encryption algorithm to use</li>
                    <li><strong>Key Size:</strong> Size of encryption key</li>
                    <li><strong>Data Type:</strong> Type of data to encrypt</li>
                    <li><strong>Key Management:</strong> Key management method</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Data to Encrypt:</label>
                      <textarea placeholder="Enter sensitive data to encrypt..."></textarea>
                    </div>
                    <div class="form-group">
                      <label>Algorithm:</label>
                      <select>
                        <option>AES-256</option>
                        <option>RSA-2048</option>
                        <option>ChaCha20</option>
                        <option>Twofish</option>
                      </select>
                    </div>
                    <button class="run-test-btn">Run Test</button>
                  </div>
                {:else if currentSkill === 'predictive-modeling'}
                  <h2>Predictive Modeling Test</h2>
                  <p>The Predictive Modeling skill creates models to predict future outcomes. This includes machine learning and statistical modeling.</p>
                  
                  <h3>Test Configuration</h3>
                  <p>To test the Predictive Modeling skill, specify the following parameters:</p>
                  
                  <ul>
                    <li><strong>Model Type:</strong> Type of predictive model</li>
                    <li><strong>Training Data:</strong> Data for model training</li>
                    <li><strong>Prediction Target:</strong> What to predict</li>
                    <li><strong>Accuracy Metric:</strong> Accuracy measurement method</li>
                  </ul>
                  
                  <div class="test-form">
                    <div class="form-group">
                      <label>Model Type:</label>
                      <select>
                        <option>Linear Regression</option>
                        <option>Neural Network</option>
                        <option>Decision Tree</option>
                        <option>Random Forest</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Training Dataset:</label>
                      <input type="text" placeholder="/path/to/training_dataset.csv" />
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
      
             <!-- Left Sticky Tabs -->
       <div class="book-tabs left-tabs">
         {#each availableSkills.slice(0, Math.ceil(availableSkills.length / 2)) as skill}
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
       
       <!-- Right Sticky Tabs -->
       <div class="book-tabs right-tabs">
         {#each availableSkills.slice(Math.ceil(availableSkills.length / 2)) as skill}
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
    width: 900px;
    height: 600px;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 20px;
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.5),
      0 0 0 2px rgba(0, 255, 136, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    overflow: visible;
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
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10;
  }
  
  .left-tabs {
    left: -50px;
  }
  
  .right-tabs {
    right: -50px;
  }
  
  .book-tab {
    width: 50px;
    height: 60px;
    background: var(--tab-color);
    border: none;
    color: #333;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .left-tabs .book-tab {
    border-radius: 0 8px 8px 0;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.3);
  }
  
  .right-tabs .book-tab {
    border-radius: 8px 0 0 8px;
    box-shadow: -3px 0 10px rgba(0, 0, 0, 0.3);
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
  
  .left-tabs .book-tab:hover {
    transform: translateX(5px);
    box-shadow: 5px 0 10px rgba(0, 0, 0, 0.4);
  }
  
  .left-tabs .book-tab.active {
    transform: translateX(10px);
    box-shadow: 8px 0 15px rgba(0, 0, 0, 0.5);
  }
  
  .right-tabs .book-tab:hover {
    transform: translateX(-5px);
    box-shadow: -5px 0 10px rgba(0, 0, 0, 0.4);
  }
  
  .right-tabs .book-tab.active {
    transform: translateX(-10px);
    box-shadow: -8px 0 15px rgba(0, 0, 0, 0.5);
  }
  
  .tab-icon {
    font-size: 16px;
    margin-bottom: 2px;
  }
  
  .tab-name {
    font-size: 9px;
    text-align: center;
    line-height: 1.1;
    font-weight: 600;
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