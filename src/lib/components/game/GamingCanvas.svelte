<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { selectedAgents, focusedAgent, agentSelectionManager, agentSelectionStore, type Agent } from '../../services/agents/AgentSelectionManager';
    import { get } from 'svelte/store';
    import { selectedAgent as terminalSelectedAgent } from '../../services/agents/CharacterManager';

    export let agents: any[] = [];
    
    // Get agents from AgentSelectionManager instead of props
    $: availableAgents = $agentSelectionStore.availableAgents;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let animationId: number;
    let isInitialized = false;

    // Game world properties with enhanced camera system
    let worldBounds = { width: 0, height: 0 };
    let camera = { 
        x: 0, 
        y: 0, 
        zoom: 1,
        targetZoom: 1,
        minZoom: 0.3,
        maxZoom: 3.0,
        zoomSpeed: 0.1
    };
    
    // Pan controls
    let isPanning = false;
    let lastMousePos = { x: 0, y: 0 };
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
            // Apply camera transform
            const screenX = (this.position.x - camera.x) * camera.zoom + worldBounds.width / 2;
            const screenY = (this.position.y - camera.y) * camera.zoom + worldBounds.height / 2;
            const screenSize = this.size * camera.zoom;
            
            const selectionState = get(agentSelectionStore);
            const isSelected = selectionState.selectedAgents[this.id] || false;
            const isFocused = selectionState.focusedAgent === this.id;
            
            // Floating animation
            const bobOffset = Math.sin(time * this.animation.speed + this.animation.bobOffset) * this.animation.amplitude * camera.zoom;
            const drawY = screenY + bobOffset;

            // Draw selection aura
            if (isSelected || isFocused) {
                const auraSize = screenSize + 15 * camera.zoom + Math.sin(time * 0.05) * 5 * camera.zoom;
                const gradient = ctx.createRadialGradient(screenX, drawY, screenSize, screenX, drawY, auraSize);
                gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
                gradient.addColorStop(0.7, isFocused ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 191, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenX, drawY, auraSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw character shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(screenX, screenY + screenSize + 5 * camera.zoom, screenSize * 0.8, screenSize * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw character body with gradient
            const agent = availableAgents.find(a => a.id === this.id);
            const isActive = agent ? agent.isActive : true;
            const baseColor = isActive ? this.color : this.darkenColor(this.color, 0.6);
            
            const gradient = ctx.createRadialGradient(screenX - screenSize * 0.3, drawY - screenSize * 0.3, 0, screenX, drawY, screenSize);
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(1, this.darkenColor(baseColor, 0.3));
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            
            if (this.type === "user") {
                // User as glowing orb
                ctx.arc(screenX, drawY, screenSize, 0, Math.PI * 2);
            } else {
                // Agents as dynamic triangular forms
                const points = 3;
                const angleOffset = time * 0.01;
                for (let i = 0; i < points; i++) {
                    const angle = (i / points) * Math.PI * 2 + angleOffset;
                    const px = screenX + Math.cos(angle) * screenSize;
                    const py = drawY + Math.sin(angle) * screenSize * 0.8;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
            }
            ctx.fill();

            // Draw character outline with glow
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 * camera.zoom;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10 * camera.zoom;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw status indicator
            if (this.status === 'active') {
                const statusSize = 6 * camera.zoom;
                const statusX = screenX + screenSize * 0.7;
                const statusY = drawY - screenSize * 0.7;
                
                ctx.fillStyle = '#00ff88';
                ctx.beginPath();
                ctx.arc(statusX, statusY, statusSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Pulsing effect
                const pulseSize = statusSize + Math.sin(time * 0.1) * 2 * camera.zoom;
                ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
                ctx.lineWidth = 1 * camera.zoom;
                ctx.beginPath();
                ctx.arc(statusX, statusY, pulseSize, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw character name with better typography
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${12 * camera.zoom}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            // Text shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillText(this.name, screenX + 1 * camera.zoom, drawY + screenSize + 15 * camera.zoom + 1 * camera.zoom);
            
            // Main text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(this.name, screenX, drawY + screenSize + 15 * camera.zoom);
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

    // Initialize characters with viewport constraints
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

        // Position characters intelligently within viewport bounds
        positionCharacters();
        
        // Center camera on all characters
        centerCameraOnCharacters();
    }

    // Intelligent character positioning system with viewport constraints
    function positionCharacters() {
        if (!canvas || gameCharacters.length === 0) return;

        const centerX = 0; // World coordinates (camera will handle screen positioning)
        const centerY = 0;
        const agentCharacters = gameCharacters.filter(c => c.type === 'agent');
        
        // Calculate safe positioning area (within viewport bounds)
        const safeRadius = Math.min(worldBounds.width, worldBounds.height) * 0.15 / camera.zoom;
        
        // Position user at bottom center
        userCharacter.targetPosition = {
            x: centerX,
            y: centerY + safeRadius * 0.8
        };

        // Position agents in an intelligent formation
        if (agentCharacters.length === 1) {
            // Single agent: opposite to user
            agentCharacters[0].targetPosition = {
                x: centerX,
                y: centerY - safeRadius * 0.8
            };
        } else if (agentCharacters.length === 2) {
            // Two agents: flanking formation
            const spacing = safeRadius * 0.6;
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
            const radius = safeRadius * 0.7;
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

    // Center camera on all characters
    function centerCameraOnCharacters() {
        if (gameCharacters.length === 0) return;
        
        // Calculate bounds of all characters
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        gameCharacters.forEach(char => {
            minX = Math.min(minX, char.position.x);
            maxX = Math.max(maxX, char.position.x);
            minY = Math.min(minY, char.position.y);
            maxY = Math.max(maxY, char.position.y);
        });
        
        // Add padding
        const padding = 100;
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        // Center camera
        camera.x = (minX + maxX) / 2;
        camera.y = (minY + maxY) / 2;
        
        // Adjust zoom to fit all characters
        const charWidth = maxX - minX;
        const charHeight = maxY - minY;
        const scaleX = worldBounds.width / charWidth;
        const scaleY = worldBounds.height / charHeight;
        const targetZoom = Math.min(scaleX, scaleY, camera.maxZoom) * 0.8; // 80% of fit
        
        camera.targetZoom = Math.max(targetZoom, camera.minZoom);
    }

    // Camera controls
    function handleWheel(event: WheelEvent) {
        event.preventDefault();
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = camera.targetZoom * zoomFactor;
        camera.targetZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom));
    }

    function handleMouseDown(event: MouseEvent) {
        if (event.button === 0) { // Left click
            isPanning = true;
            lastMousePos = { x: event.clientX, y: event.clientY };
            canvas.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(event: MouseEvent) {
        if (isPanning) {
            const deltaX = event.clientX - lastMousePos.x;
            const deltaY = event.clientY - lastMousePos.y;
            
            camera.x -= deltaX / camera.zoom;
            camera.y -= deltaY / camera.zoom;
            
            lastMousePos = { x: event.clientX, y: event.clientY };
        }
    }

    function handleMouseUp() {
        isPanning = false;
        canvas.style.cursor = 'pointer';
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

    // Enhanced background rendering with camera
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

        // Animated grid with camera transform
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);
        
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
        ctx.lineWidth = 1 / camera.zoom;
        
        const gridSize = 50;
        const offsetX = (time * 0.5) % gridSize;
        const offsetY = (time * 0.3) % gridSize;
        
        // Calculate grid bounds based on camera
        const left = camera.x - width / (2 * camera.zoom);
        const right = camera.x + width / (2 * camera.zoom);
        const top = camera.y - height / (2 * camera.zoom);
        const bottom = camera.y + height / (2 * camera.zoom);
        
        for (let x = Math.floor(left / gridSize) * gridSize - offsetX; x < right; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
            ctx.stroke();
        }
        
        for (let y = Math.floor(top / gridSize) * gridSize - offsetY; y < bottom; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Draw connections between characters with camera transform
    function drawConnections(ctx: CanvasRenderingContext2D) {
        const selectionState = get(agentSelectionStore);
        const selectedIds = Object.keys(selectionState.selectedAgents).filter(id => selectionState.selectedAgents[id]);
        
        if (selectedIds.length < 2) return;
        
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 2 * camera.zoom;
        ctx.setLineDash([5 * camera.zoom, 5 * camera.zoom]);
        
        for (let i = 0; i < selectedIds.length; i++) {
            for (let j = i + 1; j < selectedIds.length; j++) {
                const char1 = gameCharacters.find(c => c.id === selectedIds[i]);
                const char2 = gameCharacters.find(c => c.id === selectedIds[j]);
                
                if (char1 && char2) {
                    const screenX1 = (char1.position.x - camera.x) * camera.zoom + worldBounds.width / 2;
                    const screenY1 = (char1.position.y - camera.y) * camera.zoom + worldBounds.height / 2;
                    const screenX2 = (char2.position.x - camera.x) * camera.zoom + worldBounds.width / 2;
                    const screenY2 = (char2.position.y - camera.y) * camera.zoom + worldBounds.height / 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(screenX1, screenY1);
                    ctx.lineTo(screenX2, screenY2);
                    ctx.stroke();
                }
            }
        }
        
        ctx.setLineDash([]);
    }

    // Main game loop with camera updates
    function gameLoop(currentTime: number) {
        if (!ctx || !canvas) return;
        
        time = currentTime * 0.001; // Convert to seconds
        const deltaTime = 16; // Assume 60fps
        
        // Smooth camera zoom
        camera.zoom += (camera.targetZoom - camera.zoom) * camera.zoomSpeed;
        
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

    // Handle canvas clicks for character selection with camera transform
    function handleCanvasClick(event: MouseEvent) {
        if (!canvas || isPanning) return;
        
        const rect = canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const worldX = (screenX - worldBounds.width / 2) / camera.zoom + camera.x;
        const worldY = (screenY - worldBounds.height / 2) / camera.zoom + camera.y;
        
        // Find clicked character
        for (const character of gameCharacters) {
            const dx = worldX - character.position.x;
            const dy = worldY - character.position.y;
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

    // Reactive updates - only initialize once when agents are first loaded
    $: if (isInitialized && availableAgents && availableAgents.length > 0 && gameCharacters.length === 0) {
        initializeCharacters();
    }

    $: {
        $focusedAgent;
        terminalSelectedAgent.set($focusedAgent?.id ?? null);
    }
</script>

<div class="gaming-canvas-container">
    <canvas
        bind:this={canvas}
        class="gaming-canvas"
        on:click={handleCanvasClick}
        on:wheel={handleWheel}
        on:mousedown={handleMouseDown}
        on:mousemove={handleMouseMove}
        on:mouseup={handleMouseUp}
        on:mouseleave={handleMouseUp}
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
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
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