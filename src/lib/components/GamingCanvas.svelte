<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import LivingCharacter from "./LivingCharacter.svelte";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number = 0;
  let time = 0;
  let mouseX = 0;
  let mouseY = 0;
  let character: LivingCharacter;

  function handleMouseMove(event: MouseEvent) {
    if (!canvas) return;
    
    // Convert to canvas-relative coordinates
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function handleMouseClick(event: MouseEvent) {
    if (character) {
      character.handleClick();
    }
  }

  function animate() {
    time += 1;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (character) {
        character.draw();
      }
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
    resizeCanvas();
    animate();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleMouseClick);
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("click", handleMouseClick);
  });
</script>

<canvas bind:this={canvas} class="gaming-canvas"></canvas>

<LivingCharacter 
  bind:this={character}
  {ctx}
  {canvas}
  {mouseX}
  {mouseY}
  {time}
/>

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
  }
</style> 