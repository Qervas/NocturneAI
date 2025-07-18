<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  export let ctx: CanvasRenderingContext2D | null = null;
  export let canvas: HTMLCanvasElement | null = null;
  export let mouseX = 0;
  export let mouseY = 0;
  export let time = 0;

  let isHovering = false;
  let isClicked = false;
  let clickTime = 0;

  function isMouseOverCharacter(mouseX: number, mouseY: number, cx: number, cy: number, size: number): boolean {
    if (!canvas) return false;
    
    // Mouse coordinates are already canvas-relative
    const canvasX = mouseX;
    const canvasY = mouseY;
    
    // Create a large, tolerant circular hover zone
    const hoverRadius = size * 1.2; // 20% larger than triangle size
    const distanceToCenter = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);
    
    return distanceToCenter <= hoverRadius;
  }

  function handleClick() {
    if (isHovering) {
      isClicked = true;
      clickTime = time;
    }
  }

  function draw() {
    if (!ctx || !canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    
    const size = Math.min(w, h) * 0.25;
    const cx = w / 2;
    const cy = h / 2;
    
    // Check if mouse is hovering over character
    isHovering = isMouseOverCharacter(mouseX, mouseY, cx, cy, size);
    
    // Breathing animation
    const breathScale = 1 + Math.sin(time * 0.02) * 0.1;
    const actualSize = Math.max(size * breathScale, 10); // Ensure minimum size
    
    // Click animation
    const clickScale = isClicked ? 1 + Math.sin((time - clickTime) * 0.3) * 0.2 : 1;
    
    // Hover scale effect
    const hoverScale = isHovering ? 1.1 : 1;
    
    const finalSize = Math.max(actualSize * clickScale * hoverScale, 5); // Ensure minimum final size
    
    // Body (triangle)
    ctx.beginPath();
    ctx.moveTo(cx, cy - finalSize / Math.sqrt(3)); // Top vertex
    ctx.lineTo(cx - finalSize / 2, cy + finalSize / (2 * Math.sqrt(3))); // Bottom left
    ctx.lineTo(cx + finalSize / 2, cy + finalSize / (2 * Math.sqrt(3))); // Bottom right
    ctx.closePath();
    
    // Gradient fill for body
    const gradient = ctx.createLinearGradient(cx, cy - finalSize, cx, cy + finalSize);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(0.5, '#00cc66');
    gradient.addColorStop(1, '#008844');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Glowing outline with hover effect
    const glowIntensity = isHovering ? 12 : 4;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = glowIntensity;
    ctx.stroke();
    
    // Additional hover glow
    if (isHovering) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 20;
      ctx.stroke();
      
      // Extra outer glow
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
      ctx.lineWidth = 30;
      ctx.stroke();
      
      // Circular hover zone indicator (subtle)
      const hoverRadius = finalSize * 1.2;
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, hoverRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    // Eyes with enhanced animation
    const eyeSize = Math.max(finalSize * 0.15, 1); // Ensure minimum size
    const eyeY = cy - finalSize * 0.1;
    const eyeSpacing = Math.max(finalSize * 0.3, 5); // Ensure minimum spacing
    
    // Eye movement based on mouse position
    const eyeOffsetX = isHovering ? (mouseX - cx) * 0.01 : 0;
    const eyeOffsetY = isHovering ? (mouseY - cy) * 0.01 : 0;
    
    // Left eye
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, eyeSize, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Right eye
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, eyeSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Pupils with blinking animation
    const blink = Math.sin(time * 0.1) > 0.8 ? 0 : 1;
    const pupilSize = Math.max(eyeSize * 0.6 * blink, 0.5); // Ensure minimum size
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, pupilSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing + eyeOffsetX, eyeY + eyeOffsetY, pupilSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Mouth with enhanced animation
    const mouthY = cy + finalSize * 0.2;
    const mouthWidth = Math.max(finalSize * 0.3, 10); // Ensure minimum width
    const mouthCurve = Math.sin(time * 0.05) * 5 + (isHovering ? 10 : 0);
    
    ctx.beginPath();
    ctx.moveTo(cx - mouthWidth, mouthY + mouthCurve);
    ctx.quadraticCurveTo(cx, mouthY + mouthCurve + 10, cx + mouthWidth, mouthY + mouthCurve);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Energy particles with enhanced effects
    for (let i = 0; i < 8; i++) {
      const angle = (time * 0.01) + (i * Math.PI / 4);
      const radius = Math.max(finalSize * 0.8, 20); // Ensure minimum radius
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const particleSize = Math.max(Math.sin(time * 0.02 + i) * 3 + 2, 1); // Ensure minimum size
      
      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(time * 0.02 + i) * 0.3})`;
      ctx.fill();
    }
    
    // Click effect particles
    if (isClicked && time - clickTime < 30) {
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI / 6) + (time - clickTime) * 0.2;
        const radius = Math.max((time - clickTime) * 2, 1); // Ensure minimum radius
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const alpha = 1 - (time - clickTime) / 30;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    }
    
    // Reset click state after animation
    if (isClicked && time - clickTime > 30) {
      isClicked = false;
    }
  }

  // Expose the draw function to parent
  export { draw, handleClick };
</script> 