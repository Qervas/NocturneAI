<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { selectedAgents, focusedAgent, agentSelectionManager, agentSelectionStore, type Agent } from '../services/AgentSelectionManager';
    import { get } from 'svelte/store';

    export let agents: any[] = [];
    
    // Get agents from AgentSelectionManager instead of props
    $: availableAgents = $agentSelectionStore.availableAgents;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let animationId: number;
    let isInitialized = false;

    // Game world properties
    let worldBounds = { width: 0, height: 0 };
    let camera = { x: 0, y: 0, zoom: 1 };
    let time = 0;

    // Character system with intelligent positioning
    class GameCharacter {
        id: string;
        name: string;
        type: 'user' | 'agent';
        position: { x: number; y: number };
        targetPosition: { x: number; y: number };
        velocity: { x: number; y: number };
        size: number;
        baseSize: number;
        color: string;
        status: string;
        animation: {
            phase: number;
            speed: number;
            amplitude: number;
            bobOffset: number;
        };
        
        constructor(data: any) {
            this.id = data.id;
            this.name = data.name;
            this.type = data.type || 'agent';
            this.position = { x: 0, y: 0 };
            this.targetPosition = { x: 0, y: 0 };
            this.velocity = { x: 0, y: 0 };
            this.baseSize = this.type === 'user' ? 35 : 30;
            this.size = this.baseSize;
            this.color = data.color || (this.type === 'user' ? '#00bfff' : '#00ff88');
            this.status = data.status || 'active';
            this.animation = {
                phase: Math.random() * Math.PI * 2,
                speed: 0.02 + Math.random() * 0.01,
                amplitude: 3 + Math.random() * 2,
                bobOffset: Math.random() * Math.PI * 2
            };
        }

        update(deltaTime: number) {
            // Smooth movement towards target
            const dx = this.targetPosition.x - this.position.x;
            const dy = this.targetPosition.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 1) {
                const moveSpeed = 0.08;
                this.velocity.x = dx * moveSpeed;
                this.velocity.y = dy * moveSpeed;
                this.position.x += this.velocity.x;
                this.position.y += this.velocity.y;
            }

            // Update animation
            this.animation.phase += this.animation.speed;
            
            // Breathing/pulsing effect
            const pulse = Math.sin(this.animation.phase) * 0.1 + 1;
            this.size = this.baseSize * pulse;

            // Selection effect
            const selectionState = get(agentSelectionStore);
            const isSelected = selectionState.selectedAgents[this.id] || false;
            const isFocused = selectionState.focusedAgent === this.id;
            if (isSelected || isFocused) {
                this.size *= 1.1;
            }
        }

        draw(ctx: CanvasRenderingContext2D, time: number) {
            const { x, y } = this.position;
            const selectionState = get(agentSelectionStore);
            const isSelected = selectionState.selectedAgents[this.id] || false;
            const isFocused = selectionState.focusedAgent === this.id;
            
            // Floating animation
            const bobOffset = Math.sin(time * this.animation.speed + this.animation.bobOffset) * this.animation.amplitude;
            const drawY = y + bobOffset;

            // Draw selection aura
            if (isSelected || isFocused) {
                const auraSize = this.size + 15 + Math.sin(time * 0.05) * 5;
                const gradient = ctx.createRadialGradient(x, drawY, this.size, x, drawY, auraSize);
                gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
                gradient.addColorStop(0.7, isFocused ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 191, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, drawY, auraSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw character shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(x, y + this.size + 5, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw character body with gradient
            const agent = availableAgents.find(a => a.id === this.id);
            const isActive = agent ? agent.isActive : true;
            const baseColor = isActive ? this.color : this.darkenColor(this.color, 0.6);
            
            const gradient = ctx.createRadialGradient(x - this.size * 0.3, drawY - this.size * 0.3, 0, x, drawY, this.size);
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(1, this.darkenColor(baseColor, 0.3));
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            
            if (this.type === "user") {
                // User as glowing orb
                ctx.arc(x, drawY, this.size, 0, Math.PI * 2);
            } else {
                // Agents as dynamic triangular forms
                const points = 3;
                const angleOffset = time * 0.01;
                for (let i = 0; i < points; i++) {
                    const angle = (i / points) * Math.PI * 2 + angleOffset;
                    const px = x + Math.cos(angle) * this.size;
                    const py = drawY + Math.sin(angle) * this.size * 0.8;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
            }
            ctx.fill();

            // Draw character outline with glow
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw status indicator
            if (this.status === 'active') {
                const statusSize = 6;
                const statusX = x + this.size * 0.7;
                const statusY = drawY - this.size * 0.7;
                
                ctx.fillStyle = '#00ff88';
                ctx.beginPath();
                ctx.arc(statusX, statusY, statusSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Pulsing effect
                const pulseSize = statusSize + Math.sin(time * 0.1) * 2;
                ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(statusX, statusY, pulseSize, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw character name with better typography
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            // Text shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillText(this.name, x + 1, drawY + this.size + 15 + 1);
            
            // Main text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(this.name, x, drawY + this.size + 15);
        }

        darkenColor(color: string, factor: number): string {
            // Simple color darkening with proper syntax
            const hex = color.replace('#', '');
            const r = Math.max(0, Math.floor(parseInt(hex.substr(0, 2), 16) * (1 - factor)));
            const g = Math.max(0, Math.floor(parseInt(hex.substr(2, 2), 16) * (1 - factor)));
            const b = Math.max(0, Math.floor(parseInt(hex.substr(4, 2), 16) * (1 - factor)));
            return `rgb(${r}, ${g}, ${b})`;
        }
    }

    // Game characters
    let gameCharacters: GameCharacter[] = [];
    let userCharacter: GameCharacter;

    // Initialize characters
    function initializeCharacters() {
        gameCharacters = [];
        
        // Create user character
        userCharacter = new GameCharacter({
            id: 'user',
            name: 'User',
            type: 'user',
            color: '#00bfff',
            status: 'active'
        });
        gameCharacters.push(userCharacter);

        // Create agent characters from AgentSelectionManager
        availableAgents.forEach(agent => {
            const gameChar = new GameCharacter({
                id: agent.id,
                name: agent.name,
                type: 'agent',
                color: agent.color || '#00ff88',
                status: agent.isActive ? 'active' : 'inactive'
            });
            gameCharacters.push(gameChar);
        });

        // Position characters intelligently
        positionCharacters();
    }

    // Intelligent character positioning system
    function positionCharacters() {
        if (!canvas || gameCharacters.length === 0) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const agentCharacters = gameCharacters.filter(c => c.type === 'agent');
        
        // Position user at bottom center
        userCharacter.targetPosition = {
            x: centerX,
            y: centerY + Math.min(canvas.width, canvas.height) * 0.25
        };

        // Position agents in an intelligent formation
        if (agentCharacters.length === 1) {
            // Single agent: opposite to user
            agentCharacters[0].targetPosition = {
                x: centerX,
                y: centerY - Math.min(canvas.width, canvas.height) * 0.25
            };
        } else if (agentCharacters.length === 2) {
            // Two agents: flanking formation
            const spacing = Math.min(canvas.width, canvas.height) * 0.3;
            agentCharacters[0].targetPosition = {
                x: centerX - spacing,
                y: centerY - spacing * 0.5
            };
            agentCharacters[1].targetPosition = {
                x: centerX + spacing,
                y: centerY - spacing * 0.5
            };
        } else {
            // Multiple agents: dynamic circle formation
            const radius = Math.min(canvas.width, canvas.height) * 0.25;
            const angleStep = (Math.PI * 2) / agentCharacters.length;
            
            agentCharacters.forEach((character, index) => {
                const angle = index * angleStep - Math.PI / 2; // Start from top
                character.targetPosition = {
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius * 0.7 // Flatten the circle
                };
            });
        }
    }

    // Intelligent canvas resizing
    function resizeCanvas() {
        if (!canvas) return;
        
        const container = canvas.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set display size
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        // Set actual canvas size for crisp rendering
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale context for high DPI
        ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        
        worldBounds = { width: rect.width, height: rect.height };
        positionCharacters();
    }

    // Enhanced background rendering
    function drawBackground(ctx: CanvasRenderingContext2D) {
        const { width, height } = worldBounds;
        
        // Animated gradient background
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
        );
        gradient.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Animated grid
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
        ctx.lineWidth = 1;
        
        const gridSize = 50;
        const offsetX = (time * 0.5) % gridSize;
        const offsetY = (time * 0.3) % gridSize;
        
        for (let x = -offsetX; x < width + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = -offsetY; y < height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    // Draw connections between characters
    function drawConnections(ctx: CanvasRenderingContext2D) {
        const selectionState = get(agentSelectionStore);
        const selectedIds = Object.keys(selectionState.selectedAgents).filter(id => selectionState.selectedAgents[id]);
        
        if (selectedIds.length < 2) return;
        
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        for (let i = 0; i < selectedIds.length; i++) {
            for (let j = i + 1; j < selectedIds.length; j++) {
                const char1 = gameCharacters.find(c => c.id === selectedIds[i]);
                const char2 = gameCharacters.find(c => c.id === selectedIds[j]);
                
                if (char1 && char2) {
                    ctx.beginPath();
                    ctx.moveTo(char1.position.x, char1.position.y);
                    ctx.lineTo(char2.position.x, char2.position.y);
                    ctx.stroke();
                }
            }
        }
        
        ctx.setLineDash([]);
    }

    // Main game loop
    function gameLoop(currentTime: number) {
        if (!ctx || !canvas) return;
        
        time = currentTime * 0.001; // Convert to seconds
        const deltaTime = 16; // Assume 60fps
        
        // Clear canvas
        ctx.clearRect(0, 0, worldBounds.width, worldBounds.height);
        
        // Draw background
        drawBackground(ctx);
        
        // Update characters
        gameCharacters.forEach(character => {
            character.update(deltaTime);
        });
        
        // Draw connections
        drawConnections(ctx);
        
        // Draw characters (sorted by y-position for proper layering)
        const sortedCharacters = [...gameCharacters].sort((a, b) => a.position.y - b.position.y);
        sortedCharacters.forEach(character => {
            if (ctx) {
                character.draw(ctx, time);
            }
        });
        
        // Continue the loop
        animationId = requestAnimationFrame(gameLoop);
    }

    // Handle canvas clicks for character selection
    function handleCanvasClick(event: MouseEvent) {
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Find clicked character
        for (const character of gameCharacters) {
            const dx = x - character.position.x;
            const dy = y - character.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= character.size && character.type === 'agent') {
                // Check if agent is active before allowing selection
                const agent = availableAgents.find(a => a.id === character.id);
                if (agent && agent.isActive) {
                    // Toggle selection using the manager
                    agentSelectionManager.toggleAgentSelection(character.id);
                }
                break;
            }
        }
    }

    // Lifecycle
    onMount(() => {
        if (canvas) {
            resizeCanvas();
            initializeCharacters();
            animationId = requestAnimationFrame(gameLoop);
            isInitialized = true;
        }
        
        // Handle window resize
        const handleResize = () => {
            if (isInitialized) {
                resizeCanvas();
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });

    // Reactive updates
    $: if (isInitialized && availableAgents) {
        initializeCharacters();
    }
</script>

<div class="gaming-canvas-container">
    <canvas
        bind:this={canvas}
        class="gaming-canvas"
        on:click={handleCanvasClick}
    ></canvas>
</div>

<style>
    .gaming-canvas-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, rgba(0, 20, 40, 0.8), rgba(0, 0, 0, 0.9));
        overflow: hidden;
        position: relative;
    }

    .gaming-canvas {
        display: block;
        cursor: pointer;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
        transition: box-shadow 0.3s ease;
    }

    .gaming-canvas:hover {
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.4);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .gaming-canvas {
            border-radius: 4px;
        }
    }
</style>