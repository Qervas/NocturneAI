<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { characterManager, characters, activeCharacter } from "../services/CharacterManager";
  import { communicationManager } from "../services/CommunicationManager";
  import type { Character } from "../types/Character";
  import type { AgentMessage } from "../types/Communication";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number = 0;
  let time = 0;
  let mouseX = 0;
  let mouseY = 0;
  let agentCharacters: Character[] = [];
  let allCharacters: Character[] = [];
  
  // Network visualization variables
  let activeMessages: AnimatedMessage[] = [];
  let messageHistory: AgentMessage[] = [];
  let updateInterval: number;
  let showNetworkOverlay = true;

  interface AnimatedMessage {
    id: string;
    fromAgent: string;
    toAgent: string;
    startTime: number;
    duration: number;
    progress: number;
    content: string;
    intent: string;
    fromPos: { x: number; y: number };
    toPos: { x: number; y: number };
    currentPos: { x: number; y: number };
    color: string;
    alpha: number;
  }

  // Subscribe to characters from the character manager
  $: agentCharacters = $characters.filter(c => c.type === 'npc');
  $: allCharacters = $characters; // All characters including user

  function handleMouseMove(event: MouseEvent) {
    if (!canvas) return;
    
    // Convert to canvas-relative coordinates
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function isMouseOverCharacter(mouseX: number, mouseY: number, charX: number, charY: number, size: number): boolean {
    if (!canvas) return false;
    
    const hoverRadius = size * 1.2;
    const distance = Math.sqrt((mouseX - charX) ** 2 + (mouseY - charY) ** 2);
    return distance <= hoverRadius;
  }

  function handleMouseClick(event: MouseEvent) {
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check if click is on any character
    agentCharacters.forEach(character => {
      const size = Math.min(canvas.width, canvas.height) * 0.1;
      if (isMouseOverCharacter(clickX, clickY, character.position.x, character.position.y, size)) {
        console.log(`Clicked on ${character.name}!`);
        // You can add character selection logic here
        characterManager.setActiveCharacter(character.id);
      }
    });
    
    // Test message bubble creation with right-click or ctrl+click
    if (event.button === 2 || event.ctrlKey) {
      createTestMessageBubble();
      event.preventDefault();
    }
  }

  // Test function to create a visible message bubble
  function createTestMessageBubble() {
    const testMessage: AnimatedMessage = {
      id: 'test_' + Date.now(),
      fromAgent: 'agent_alpha',
      toAgent: 'agent_beta',
      startTime: time,
      duration: 300,
      progress: 0,
      content: 'Test message bubble',
      intent: 'social_chat',
      fromPos: { x: 250, y: 180 },
      toPos: { x: 750, y: 180 },
      currentPos: { x: 250, y: 180 },
      color: '#ff00ff',
      alpha: 1
    };
    
    activeMessages.push(testMessage);
    console.log('Created test message bubble, active messages:', activeMessages.length);
  }

  function drawCharacter(character: Character, isActive: boolean = false) {
    if (!ctx || !canvas) return;
    
    const size = Math.min(canvas.width, canvas.height) * 0.15; // Increased from 0.1 to make characters larger
    const cx = character.position.x;
    const cy = character.position.y;
    
    // Check if mouse is hovering over this character
    const isHovering = isMouseOverCharacter(mouseX, mouseY, cx, cy, size);
    
    // Breathing animation
    const breathScale = 1 + Math.sin(time * 0.02) * 0.1;
    const actualSize = Math.max(size * breathScale, 30); // Increased minimum size from 10 to 30
    
    // Active character gets a bigger scale
    const activeScale = isActive ? 1.3 : 1; // Increased from 1.2 to 1.3
    const hoverScale = isHovering ? 1.15 : 1; // Increased from 1.1 to 1.15
    const finalSize = Math.max(actualSize * activeScale * hoverScale, 25); // Increased minimum from 5 to 25
    
    // Body shape depends on character type
    if (character.type === 'user') {
      // Human user: Draw as a circle (more human-like)
      ctx.beginPath();
      ctx.arc(cx, cy, finalSize / 2, 0, 2 * Math.PI);
      
      // Special gradient for human user
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, finalSize / 2);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, character.color);
      gradient.addColorStop(1, character.color + '88');
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Human user gets special border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = character.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // AI Agents: Triangle shape
      ctx.beginPath();
      ctx.moveTo(cx, cy - finalSize / Math.sqrt(3)); // Top vertex
      ctx.lineTo(cx - finalSize / 2, cy + finalSize / (2 * Math.sqrt(3))); // Bottom left
      ctx.lineTo(cx + finalSize / 2, cy + finalSize / (2 * Math.sqrt(3))); // Bottom right
      ctx.closePath();
      
      // Use character's color for gradient
      const gradient = ctx.createLinearGradient(cx, cy - finalSize, cx, cy + finalSize);
      gradient.addColorStop(0, character.color);
      gradient.addColorStop(0.5, character.color + 'CC');
      gradient.addColorStop(1, character.color + '88');
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    // Glowing outline with hover and active effects
    const glowIntensity = isActive ? 8 : (isHovering ? 6 : 3);
    ctx.strokeStyle = isActive ? '#ffff00' : '#00ffff';
    ctx.lineWidth = glowIntensity;
    ctx.stroke();
    
    // Additional hover glow
    if (isHovering) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.lineWidth = 15;
      ctx.stroke();
    }
    
    // Active character special effects
    if (isActive) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 20;
      ctx.stroke();
    }
    
    // Eyes
    const eyeSize = Math.max(finalSize * 0.15, 1);
    const eyeY = cy - finalSize * 0.1;
    const eyeSpacing = Math.max(finalSize * 0.3, 5);
    
    // Eye movement based on mouse position
    const eyeOffsetX = isHovering ? (mouseX - cx) * 0.01 : 0;
    const eyeOffsetY = isHovering ? (mouseY - cy) * 0.01 : 0;
    
    // Left eye
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, eyeSize, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = character.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Right eye
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, eyeSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Pupils with blinking animation
    const blink = Math.sin(time * 0.1) > 0.8 ? 0 : 1;
    const pupilSize = Math.max(eyeSize * 0.6 * blink, 0.5);
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, pupilSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, pupilSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Mouth
    const mouthY = cy + finalSize * 0.2;
    const mouthWidth = Math.max(finalSize * 0.3, 10);
    const mouthCurve = Math.sin(time * 0.05) * 5 + (isHovering ? 10 : 0);
    
    ctx.beginPath();
    ctx.moveTo(cx - mouthWidth, mouthY + mouthCurve);
    ctx.quadraticCurveTo(cx, mouthY + mouthCurve + 10, cx + mouthWidth, mouthY + mouthCurve);
    ctx.strokeStyle = character.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Energy particles
    for (let i = 0; i < 6; i++) {
      const angle = (time * 0.01) + (i * Math.PI / 3);
      const radius = Math.max(finalSize * 0.9, 20);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const particleSize = Math.max(Math.sin(time * 0.02 + i) * 2 + 1, 1);
      
      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, 2 * Math.PI);
      ctx.fillStyle = character.color + '80';
      ctx.fill();
    }
    
    // Character name label
    ctx.fillStyle = character.color;
    ctx.font = `${Math.max(12, finalSize * 0.15)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(character.name, cx, cy + finalSize + 20);
    
    // Status indicator
    const statusColor = character.status === 'online' ? '#00ff00' : '#888888';
    ctx.beginPath();
    ctx.arc(cx + finalSize * 0.4, cy - finalSize * 0.4, 4, 0, 2 * Math.PI);
    ctx.fillStyle = statusColor;
    ctx.fill();
  }

  // Network Visualization Functions
  function updateCommunications() {
    const recentMessages = communicationManager.getPendingMessages('all').slice(-5);
    
    recentMessages.forEach(msg => {
      if (!messageHistory.find(m => m.id === msg.id)) {
        messageHistory.push(msg);
        
        if (msg.fromAgent !== msg.toAgent && msg.toAgent) {
          createMessageAnimation(msg);
        }
      }
    });
  }

  function createMessageAnimation(message: AgentMessage) {
    const fromChar = allCharacters.find(c => c.id === message.fromAgent);
    const toChar = allCharacters.find(c => c.id === message.toAgent);
    
    if (!fromChar || !toChar) {
      console.log('Could not find characters for message:', message.fromAgent, '->', message.toAgent);
      return;
    }

    // Different colors for different message types
    let messageColor = '#00ffff'; // Default cyan
    if (message.messageType === 'user_message') {
      messageColor = '#ffff00'; // Yellow for user messages
    } else if (message.toAgent === 'player_main') {
      messageColor = '#ff44ff'; // Pink/magenta for agent responses to user
    } else if (message.intent === 'question') {
      messageColor = '#ff8800'; // Orange for questions
    } else if (message.intent === 'social_chat') {
      messageColor = '#88ff88'; // Green for social chat
    }

    const animatedMessage: AnimatedMessage = {
      id: message.id,
      fromAgent: message.fromAgent,
      toAgent: message.toAgent || 'all',
      startTime: time,
      duration: 300, // Increased from 180 to 300 for longer visibility
      progress: 0,
      content: message.content,
      intent: message.intent,
      fromPos: { x: fromChar.position.x, y: fromChar.position.y },
      toPos: { x: toChar.position.x, y: toChar.position.y },
      currentPos: { x: fromChar.position.x, y: fromChar.position.y },
      color: messageColor,
      alpha: 1
    };

    activeMessages.push(animatedMessage);
    console.log('Created message animation:', animatedMessage.fromAgent, '->', animatedMessage.toAgent, 'Active messages:', activeMessages.length);
    
    if (activeMessages.length > 8) {
      activeMessages = activeMessages.slice(-8);
    }
  }

  function getIntentColor(intent: string): string {
    const colors: Record<string, string> = {
      question: '#FFD700', request_help: '#FF6B6B', share_info: '#4ECDC4',
      collaborate: '#45B7D1', social_chat: '#96CEB4', challenge: '#FFEAA7',
      acknowledge: '#74B9FF', suggest: '#FD79A8', compliment: '#FDCB6E', critique: '#E17055'
    };
    return colors[intent] || '#FFFFFF';
  }

  function getIntentIcon(intent: string): string {
    const icons: Record<string, string> = {
      question: '❓', request_help: '🤝', share_info: '💡', collaborate: '🤜',
      social_chat: '💬', challenge: '⚔️', acknowledge: '✅', suggest: '💭',
      compliment: '👍', critique: '📝'
    };
    return icons[intent] || '💬';
  }

  function drawAnimatedMessages() {
    if (!ctx) return;

    activeMessages.forEach((msg, index) => {
      msg.progress = Math.min(1, (time - msg.startTime) / msg.duration);
      const easeProgress = 1 - Math.pow(1 - msg.progress, 2);
      
      // Higher arc for more visible path
      const arcHeight = 60 * Math.sin(msg.progress * Math.PI);
      msg.currentPos.x = msg.fromPos.x + (msg.toPos.x - msg.fromPos.x) * easeProgress;
      msg.currentPos.y = msg.fromPos.y + (msg.toPos.y - msg.fromPos.y) * easeProgress - arcHeight;
      
      msg.alpha = msg.progress < 0.8 ? 1 : (1 - (msg.progress - 0.8) / 0.2);
      
      // Larger and more visible message bubble
      const pulse = 1 + Math.sin(time * 0.2 + index) * 0.4;
      const bubbleSize = 16 * pulse; // Increased from 8 to 16
      
      if (ctx) {
        // Draw outer glow effect
        ctx.beginPath();
        ctx.arc(msg.currentPos.x, msg.currentPos.y, bubbleSize + 8, 0, 2 * Math.PI);
        ctx.fillStyle = msg.color + Math.round(msg.alpha * 60).toString(16).padStart(2, '0');
        ctx.fill();
        
        // Draw main bubble
        ctx.beginPath();
        ctx.arc(msg.currentPos.x, msg.currentPos.y, bubbleSize, 0, 2 * Math.PI);
        ctx.fillStyle = msg.color + Math.round(msg.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
        
        // White border for visibility
        ctx.strokeStyle = '#FFFFFF' + Math.round(msg.alpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Intent icon - larger and more visible
        const icon = getIntentIcon(msg.intent);
        ctx.fillStyle = '#000000' + Math.round(msg.alpha * 255).toString(16).padStart(2, '0');
        ctx.font = 'bold 16px Arial'; // Increased from 12px to 16px
        ctx.textAlign = 'center';
        ctx.fillText(icon, msg.currentPos.x, msg.currentPos.y + 6);
      }
    });
    
    activeMessages = activeMessages.filter(msg => msg.progress < 1);
  }

  function animate() {
    time += 1;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw all characters (agents + user)
      allCharacters.forEach(character => {
        const isActive = $activeCharacter && $activeCharacter.id === character.id;
        drawCharacter(character, isActive);
      });
      
      // Draw animated messages on top
      drawAnimatedMessages();
    }
    animationId = requestAnimationFrame(animate);
  }

  function resizeCanvas() {
    if (!canvas) return;
    // Make canvas more square and less wide
    const maxWidth = Math.min(window.innerWidth * 0.8, 1000); // Limit max width
    const aspectRatio = 4/3; // More square aspect ratio
    canvas.width = maxWidth;
    canvas.height = maxWidth / aspectRatio;
    ctx = canvas.getContext("2d");
  }

  onMount(() => {
    // Initialize character manager with sample data
    characterManager.initializeSampleData();
    
    resizeCanvas();
    animate();
    updateCommunications();
    
    // Update communications every 2 seconds
    updateInterval = setInterval(updateCommunications, 2000);
    
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleMouseClick);
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    window.removeEventListener("resize", resizeCanvas);
    if (canvas) {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleMouseClick);
    }
  });
</script>

<div class="canvas-container">
  <canvas bind:this={canvas} class="gaming-canvas"></canvas>
  
  <!-- Network Stats Overlay -->
  {#if showNetworkOverlay}
    <div class="network-stats">
      <div class="stats-header">
        <h3>NEURAL NETWORK</h3>
        <button 
          class="toggle-btn" 
          on:click={() => showNetworkOverlay = !showNetworkOverlay}
          title="Toggle Network Overlay"
        >
          👁️
        </button>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">ACTIVE</span>
          <span class="stat-value">{activeMessages.length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">TOTAL</span>
          <span class="stat-value">{communicationManager.getNetworkStats().totalMessages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">AGENTS</span>
          <span class="stat-value">{agentCharacters.length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">USERS</span>
          <span class="stat-value">{allCharacters.filter(c => c.type === 'user').length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">TRUST</span>
          <span class="stat-value">{Math.round(communicationManager.getNetworkStats().averageTrustLevel * 100)}%</span>
        </div>
      </div>
      
      <!-- Message Type Legend -->
      <div class="message-legend">
        <h4>Message Colors:</h4>
        <div class="legend-item">
          <span class="color-dot" style="background-color: #ffff00;"></span>
          <span>Your Messages</span>
        </div>
        <div class="legend-item">
          <span class="color-dot" style="background-color: #ff44ff;"></span>
          <span>Agent Replies</span>
        </div>
        <div class="legend-item">
          <span class="color-dot" style="background-color: #88ff88;"></span>
          <span>Agent Chat</span>
        </div>
        <div class="legend-item">
          <span class="color-dot" style="background-color: #ff8800;"></span>
          <span>Questions</span>
        </div>
      </div>
    </div>
  {:else}
    <button 
      class="show-stats-btn" 
      on:click={() => showNetworkOverlay = !showNetworkOverlay}
      title="Show Network Stats"
    >
      📊
    </button>
  {/if}
</div>

<style>
  .canvas-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .gaming-canvas {
    display: block;
    margin: 2rem auto 1rem auto;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #00ff88;
    border-radius: 12px;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1);
    max-width: 85vw;
    max-height: 70vh;
    cursor: pointer;
  }

  .network-stats {
    position: absolute;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 20, 40, 0.9) 100%);
    border: 1px solid rgba(0, 255, 136, 0.5);
    border-radius: 8px;
    padding: 12px;
    min-width: 180px;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3), inset 0 0 10px rgba(0, 255, 136, 0.1);
    animation: pulse-glow 3s ease-in-out infinite;
  }

  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.3);
  }

  .stats-header h3 {
    color: #00FF88;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: bold;
    margin: 0;
    letter-spacing: 1px;
    text-shadow: 0 0 5px #00FF88;
  }

  .toggle-btn {
    background: transparent;
    border: 1px solid rgba(0, 255, 136, 0.5);
    border-radius: 4px;
    color: #00FF88;
    cursor: pointer;
    padding: 4px 6px;
    font-size: 12px;
    transition: all 0.3s ease;
  }

  .toggle-btn:hover {
    background: rgba(0, 255, 136, 0.1);
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    transform: scale(1.1);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px;
    background: rgba(0, 255, 136, 0.05);
    border: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .stat-item:hover {
    background: rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.4);
    transform: translateY(-2px);
  }

  .stat-label {
    font-family: 'Courier New', monospace;
    font-size: 9px;
    color: rgba(0, 255, 136, 0.8);
    font-weight: bold;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .stat-value {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: #FFFFFF;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }

  .show-stats-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 20, 40, 0.8) 100%);
    border: 1px solid rgba(0, 255, 136, 0.5);
    border-radius: 50%;
    color: #00FF88;
    cursor: pointer;
    padding: 10px;
    font-size: 16px;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
  }

  .show-stats-btn:hover {
    background: linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 40, 80, 0.8) 100%);
    box-shadow: 0 0 25px rgba(0, 255, 136, 0.6);
    transform: scale(1.1) rotate(10deg);
  }

  .message-legend {
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid rgba(0, 255, 136, 0.3);
  }

  .message-legend h4 {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    color: rgba(0, 255, 136, 0.9);
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-family: 'Courier New', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.8);
  }

  .color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    box-shadow: 0 0 4px currentColor;
    flex-shrink: 0;
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.3), inset 0 0 10px rgba(0, 255, 136, 0.1);
    }
    50% {
      box-shadow: 0 0 30px rgba(0, 255, 136, 0.5), inset 0 0 15px rgba(0, 255, 136, 0.2);
    }
  }

  @media (max-width: 768px) {
    .network-stats {
      top: 10px;
      right: 10px;
      min-width: 140px;
      padding: 8px;
    }
    .show-stats-btn {
      top: 10px;
      right: 10px;
      padding: 8px;
      font-size: 14px;
    }
  }
</style> 