<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { characterManager, characters } from "../services/CharacterManager";
  import type { Character } from "../types/Character";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number = 0;
  let time = 0;
  let mouseX = 0;
  let mouseY = 0;
  let agentCharacters: Character[] = [];

  // Subscribe to characters from the character manager
  $: agentCharacters = $characters.filter(c => c.type === 'npc');

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
  }

  function drawCharacter(character: Character, isActive: boolean = false) {
    if (!ctx || !canvas) return;
    
    const size = Math.min(canvas.width, canvas.height) * 0.1;
    const cx = character.position.x;
    const cy = character.position.y;
    
    // Check if mouse is hovering over this character
    const isHovering = isMouseOverCharacter(mouseX, mouseY, cx, cy, size);
    
    // Breathing animation
    const breathScale = 1 + Math.sin(time * 0.02) * 0.1;
    const actualSize = Math.max(size * breathScale, 10);
    
    // Active character gets a bigger scale
    const activeScale = isActive ? 1.2 : 1;
    const hoverScale = isHovering ? 1.1 : 1;
    const finalSize = Math.max(actualSize * activeScale * hoverScale, 5);
    
    // Body (triangle)
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

  function animate() {
    time += 1;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw all agent characters
      const activeChar = characterManager.activeCharacter;
      agentCharacters.forEach(character => {
        const isActive = activeChar?.id === character.id;
        drawCharacter(character, isActive);
      });
    }
    animationId = requestAnimationFrame(animate);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.6;
    ctx = canvas.getContext("2d");
  }

  onMount(() => {
    // Initialize character manager with sample data
    characterManager.initializeSampleData();
    
    resizeCanvas();
    animate();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleMouseClick);
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener("resize", resizeCanvas);
    if (canvas) {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleMouseClick);
    }
  });
</script>

<canvas bind:this={canvas} class="gaming-canvas"></canvas>

<style>
  .gaming-canvas {
    display: block;
    margin: 2rem auto 1rem auto;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #00ff88;
    border-radius: 12px;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1);
    max-width: 90vw;
    max-height: 60vh;
    cursor: pointer;
  }
</style> 