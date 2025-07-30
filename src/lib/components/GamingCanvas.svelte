<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        characterManager,
        characters,
        activeCharacter,
        selectedAgent,
        getAgentShortName,
    } from "../services/CharacterManager";
    import { selectedAgents, focusedAgent, agentSelectionManager } from "../services/AgentSelectionManager";
    import { communicationManager } from "../services/CommunicationManager";
    import {
        simulationController,
        type SimulationSpeed,
    } from "../services/SimulationController";
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
    let activeConnections: any[] = [];

    // Simulation integration
    let simulationSpeed: SimulationSpeed = "normal";
    let simulationState = "paused";
    let speedMultiplier = 1;
    let unsubscribeSimulation: (() => void)[] = [];

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
    $: agentCharacters = $characters.filter((c) => c.type === "npc");
    $: allCharacters = $characters; // All characters including user
    
    // Sync with InteractionPanel agent selection
    $: currentSelectedAgents = $selectedAgents;
    $: currentFocusedAgent = $focusedAgent;

    // Update animation speed based on simulation speed
    $: {
        switch (simulationSpeed) {
            case "paused":
                speedMultiplier = 0;
                break;
            case "normal":
                speedMultiplier = 1;
                break;
            case "fast":
                speedMultiplier = 2;
                break;
            case "very_fast":
                speedMultiplier = 4;
                break;
        }
    }

    function handleMouseMove(event: MouseEvent) {
        if (!canvas) return;

        // Convert to canvas-relative coordinates
        const rect = canvas.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
    }

    function isMouseOverCharacter(
        mouseX: number,
        mouseY: number,
        charX: number,
        charY: number,
        size: number,
    ): boolean {
        if (!canvas) return false;

        const hoverRadius = size * 1.2;
        const distance = Math.sqrt(
            (mouseX - charX) ** 2 + (mouseY - charY) ** 2,
        );
        return distance <= hoverRadius;
    }

    function handleMouseClick(event: MouseEvent) {
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Check if click is on any character
        agentCharacters.forEach((character) => {
            const size = Math.min(canvas.width, canvas.height) * 0.1;
            if (
                isMouseOverCharacter(
                    clickX,
                    clickY,
                    character.position.x,
                    character.position.y,
                    size,
                )
            ) {
                console.log(`Clicked on ${character.name}!`);
                
                // Handle multi-selection with Ctrl/Cmd key
                if (event.ctrlKey || event.metaKey) {
                    // Toggle agent selection
                    agentSelectionManager.toggleAgentSelection(character.id);
                } else {
                    // Single selection - clear others and select this one
                    agentSelectionManager.selectAgent(character.id);
                }
                
                // Update the old system for backward compatibility with terminal
                const shortName = getAgentShortName(character.id);
                selectedAgent.set(shortName);
                characterManager.setActiveCharacter(character.id);
                
                // Make sure the new system stays in sync
                agentSelectionManager.syncWithLegacySystem(character.id, shortName);
                
                console.log(`Selected agent: ${character.name} (${character.id} -> ${shortName})`);
                console.log(`Current selection:`, currentSelectedAgents.map(a => a.name));
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
        const agents = ["agent_alpha", "agent_beta", "agent_gamma"];
        const fromAgent = agents[Math.floor(Math.random() * agents.length)];
        const toAgent = agents.filter((a) => a !== fromAgent)[
            Math.floor(Math.random() * 2)
        ];

        const fromChar = allCharacters.find((c) => c.id === fromAgent);
        const toChar = allCharacters.find((c) => c.id === toAgent);

        if (!fromChar || !toChar) return;

        const testMessage: AnimatedMessage = {
            id: "test_" + Date.now(),
            fromAgent: fromAgent,
            toAgent: toAgent,
            startTime: time,
            duration: 300,
            progress: 0,
            content: "Test message bubble",
            intent: "social_chat",
            fromPos: { x: fromChar.position.x, y: fromChar.position.y },
            toPos: { x: toChar.position.x, y: toChar.position.y },
            currentPos: { x: fromChar.position.x, y: fromChar.position.y },
            color: "#00ffff",
            alpha: 1,
        };

        activeMessages.push(testMessage);
        console.log(
            `🚀 Created test message: ${fromAgent} -> ${toAgent}, active messages:`,
            activeMessages.length,
        );
    }

    // Handle keyboard events for testing
    function handleKeyPress(event: KeyboardEvent) {
        if (event.key === "t" || event.key === "T") {
            createTestMessageBubble();
        }
    }

    // Simple function to trigger message for testing
    function triggerTestMessage() {
        createTestMessageBubble();
    }

    function drawCharacter(character: Character, isActive: boolean = false) {
        if (!ctx || !canvas || !character) return;

        try {
            // Check if this character is sending or receiving a message
            const isTransmitting = activeMessages.some(
                (msg) =>
                    msg.fromAgent === character.id ||
                    msg.toAgent === character.id,
            );

            // Check if this character is selected in InteractionPanel
            const isSelectedInInteraction = currentSelectedAgents.some(agent => agent.id === character.id);
            const isFocusedInInteraction = currentFocusedAgent?.id === character.id;

            const size = Math.min(canvas.width, canvas.height) * 0.15; // Increased from 0.1 to make characters larger
            const cx = character.position.x;
            const cy = character.position.y;

            // Check if mouse is hovering over this character
            const isHovering = isMouseOverCharacter(
                mouseX,
                mouseY,
                cx,
                cy,
                size,
            );

            // Breathing animation
            const breathScale = 1 + Math.sin(time * 0.02) * 0.1;
            const actualSize = Math.max(size * breathScale, 30); // Increased minimum size from 10 to 30

            // Scale factors for different states
            const activeScale = isActive ? 1.3 : 1; // Active character
            const selectedScale = isSelectedInInteraction ? 1.25 : 1; // Selected in InteractionPanel
            const focusedScale = isFocusedInInteraction ? 1.4 : 1; // Focused in InteractionPanel
            const hoverScale = isHovering ? 1.15 : 1; // Mouse hover
            
            const finalSize = Math.max(
                actualSize * activeScale * selectedScale * focusedScale * hoverScale,
                25,
            );

            // Body shape depends on character type
            if (character.type === "user") {
                // Human user: Draw as a circle (more human-like)
                ctx.beginPath();
                ctx.arc(cx, cy, finalSize / 2, 0, 2 * Math.PI);

                // Special gradient for human user
                const gradient = ctx.createRadialGradient(
                    cx,
                    cy,
                    0,
                    cx,
                    cy,
                    finalSize / 2,
                );
                gradient.addColorStop(0, "#ffffff");
                gradient.addColorStop(0.3, character.color);
                gradient.addColorStop(1, character.color + "88");
                ctx.fillStyle = gradient;
                ctx.fill();

                // Human user gets special border
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.strokeStyle = character.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // AI Agents: Triangle shape
                ctx.beginPath();
                ctx.moveTo(cx, cy - finalSize / Math.sqrt(3)); // Top vertex
                ctx.lineTo(
                    cx - finalSize / 2,
                    cy + finalSize / (2 * Math.sqrt(3)),
                ); // Bottom left
                ctx.lineTo(
                    cx + finalSize / 2,
                    cy + finalSize / (2 * Math.sqrt(3)),
                ); // Bottom right
                ctx.closePath();

                // Use character's color for gradient
                const gradient = ctx.createLinearGradient(
                    cx,
                    cy - finalSize,
                    cx,
                    cy + finalSize,
                );
                gradient.addColorStop(0, character.color);
                gradient.addColorStop(0.5, character.color + "CC");
                gradient.addColorStop(1, character.color + "88");
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // Glowing outline with multiple state effects
            let glowIntensity = 3;
            let glowColor = "#ffffff";
            
            if (isFocusedInInteraction) {
                glowIntensity = 10;
                glowColor = "#ff6b6b"; // Red for focused agent
            } else if (isSelectedInInteraction) {
                glowIntensity = 8;
                glowColor = "#00ff88"; // Green for selected agents
            } else if (isActive) {
                glowIntensity = 8;
                glowColor = "#ffff00"; // Yellow for active
            } else if (isTransmitting) {
                glowIntensity = 6;
                glowColor = "#00ffff"; // Cyan for transmitting
            } else if (isHovering) {
                glowIntensity = 4;
                glowColor = "#ffffff"; // White for hover
            }
            
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = glowIntensity;
            ctx.stroke();

            // Additional special effect glows
            if (isFocusedInInteraction) {
                // Pulsing red glow for focused agent
                const pulseIntensity = 0.8 + Math.sin(time * 0.1) * 0.2;
                ctx.strokeStyle = `rgba(255, 107, 107, ${pulseIntensity})`;
                ctx.lineWidth = 25;
                ctx.stroke();
            }
            
            if (isSelectedInInteraction && !isFocusedInInteraction) {
                // Steady green glow for selected agents
                ctx.strokeStyle = "rgba(0, 255, 136, 0.6)";
                ctx.lineWidth = 18;
                ctx.stroke();
            }

            // Additional hover glow
            if (isHovering) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                ctx.lineWidth = 15;
                ctx.stroke();
            }

            // Message transmission pulse glow
            if (isTransmitting) {
                const pulseIntensity = 0.7 + Math.sin(time * 0.08) * 0.3;
                ctx.strokeStyle = `rgba(0, 255, 255, ${pulseIntensity})`;
                ctx.lineWidth = 12;
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
            ctx.arc(
                cx - eyeSpacing + eyeOffsetX,
                eyeY + eyeOffsetY,
                eyeSize,
                0,
                2 * Math.PI,
            );
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.strokeStyle = character.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Right eye
            ctx.beginPath();
            ctx.arc(
                cx + eyeSpacing + eyeOffsetX,
                eyeY + eyeOffsetY,
                eyeSize,
                0,
                2 * Math.PI,
            );
            ctx.fill();
            ctx.stroke();

            // Pupils with blinking animation
            const blink = Math.sin(time * 0.1) > 0.8 ? 0 : 1;
            const pupilSize = Math.max(eyeSize * 0.6 * blink, 0.5);

            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(
                cx - eyeSpacing + eyeOffsetX,
                eyeY + eyeOffsetY,
                pupilSize,
                0,
                2 * Math.PI,
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                cx + eyeSpacing + eyeOffsetX,
                eyeY + eyeOffsetY,
                pupilSize,
                0,
                2 * Math.PI,
            );
            ctx.fill();

            // Mouth
            const mouthY = cy + finalSize * 0.2;
            const mouthWidth = Math.max(finalSize * 0.3, 10);
            const mouthCurve =
                Math.sin(time * 0.05) * 5 + (isHovering ? 10 : 0);

            ctx.beginPath();
            ctx.moveTo(cx - mouthWidth, mouthY + mouthCurve);
            ctx.quadraticCurveTo(
                cx,
                mouthY + mouthCurve + 10,
                cx + mouthWidth,
                mouthY + mouthCurve,
            );
            ctx.strokeStyle = character.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Energy particles
            for (let i = 0; i < 6; i++) {
                const angle = time * 0.01 + (i * Math.PI) / 3;
                const radius = Math.max(finalSize * 0.9, 20);
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                const particleSize = Math.max(
                    Math.sin(time * 0.02 + i) * 2 + 1,
                    1,
                );

                ctx.beginPath();
                ctx.arc(x, y, particleSize, 0, 2 * Math.PI);
                ctx.fillStyle = character.color + "80";
                ctx.fill();
            }

            // Character name label
            ctx.fillStyle = character.color;
            ctx.font = `${Math.max(12, finalSize * 0.15)}px 'Courier New', monospace`;
            ctx.textAlign = "center";
            ctx.fillText(character.name, cx, cy + finalSize + 20);

            // Status indicator
            const statusColor =
                character.status === "online" ? "#00ff00" : "#888888";
            ctx.beginPath();
            ctx.arc(
                cx + finalSize * 0.4,
                cy - finalSize * 0.4,
                4,
                0,
                2 * Math.PI,
            );
            ctx.fillStyle = statusColor;
            ctx.fill();
        } catch (error) {
            console.warn(`🎮 Failed to draw character ${character.id}:`, error);
        }
    }

    // Draw message transmission lines when agents are sending messages
    function drawMessageTransmissionLines() {
        if (!ctx || !canvas || activeMessages.length === 0) return;



        // Draw temporary message lines (simple one-reply conversations)
        // Group messages by sender-receiver pairs to avoid duplicate lines
        const messagePairs = new Map();

        activeMessages.forEach((msg) => {
            const key = `${msg.fromAgent}-${msg.toAgent}`;
            if (!messagePairs.has(key)) {
                messagePairs.set(key, msg);
            }
        });

        messagePairs.forEach((msg) => {
            const fromChar = allCharacters.find((c) => c.id === msg.fromAgent);
            const toChar = allCharacters.find((c) => c.id === msg.toAgent);

            if (!fromChar || !toChar) return;

            const x1 = fromChar.position.x;
            const y1 = fromChar.position.y;
            const x2 = toChar.position.x;
            const y2 = toChar.position.y;

            // Create animated transmission line for temporary messages
            const pulseIntensity = 0.7 + Math.sin(time * 0.1) * 0.3;
            const lineWidth = 3;

            // Main transmission line (straight line, not arc)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(255, 165, 0, ${pulseIntensity})`; // Orange for temp messages
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // Add glow effect
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulseIntensity * 0.5})`;
            ctx.lineWidth = lineWidth + 2;
            ctx.stroke();

            // Draw animated particles along the line
            const particleCount = 3;
            for (let i = 0; i < particleCount; i++) {
                const progress = (time * 0.03 + i * 0.33) % 1;
                const x = x1 + (x2 - x1) * progress;
                const y = y1 + (y2 - y1) * progress;

                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(255, 255, 255, ${pulseIntensity})`;
                ctx.fill();
            }

            // Draw message intent label in the middle
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2 - 15;

            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(midX - 20, midY - 8, 40, 16);

            ctx.fillStyle = "#ffa500";
            ctx.font = "10px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText(getIntentIcon(msg.intent), midX, midY + 3);
        });
    }

    // Network Visualization Functions
    function updateCommunications() {
        try {
            // Update active connections based on message activity
            activeConnections =
                communicationManager.getActiveConnections() || [];

            const recentMessages = communicationManager
                .getPendingMessages("all")
                .slice(-5);

            recentMessages.forEach((msg) => {
                if (!messageHistory.find((m) => m.id === msg.id)) {
                    messageHistory.push(msg);

                    if (msg.fromAgent !== msg.toAgent && msg.toAgent) {
                        createMessageAnimation(msg);
                    }
                }
            });
        } catch (error) {
            console.warn("🎮 Failed to update communications:", error);
        }
    }

    function createMessageAnimation(message: AgentMessage) {
        const fromChar = allCharacters.find((c) => c.id === message.fromAgent);
        const toChar = allCharacters.find((c) => c.id === message.toAgent);

        if (!fromChar || !toChar) {
            console.log(
                "Could not find characters for message:",
                message.fromAgent,
                "->",
                message.toAgent,
            );
            return;
        }

        // Different colors for different message types
        let messageColor = "#00ffff"; // Default cyan
        if (message.messageType === "user_message") {
            messageColor = "#ffff00"; // Yellow for user messages
        } else if (message.toAgent === "player_main") {
            messageColor = "#ff44ff"; // Pink/magenta for agent responses to user
        } else if (message.intent === "question") {
            messageColor = "#ff8800"; // Orange for questions
        } else if (message.intent === "social_chat") {
            messageColor = "#88ff88"; // Green for social chat
        }

        const animatedMessage: AnimatedMessage = {
            id: message.id,
            fromAgent: message.fromAgent,
            toAgent: message.toAgent || "all",
            startTime: time,
            duration: 300, // Increased from 180 to 300 for longer visibility
            progress: 0,
            content: message.content,
            intent: message.intent,
            fromPos: { x: fromChar.position.x, y: fromChar.position.y },
            toPos: { x: toChar.position.x, y: toChar.position.y },
            currentPos: { x: fromChar.position.x, y: fromChar.position.y },
            color: messageColor,
            alpha: 1,
        };

        activeMessages.push(animatedMessage);
        console.log(
            "Created message animation:",
            animatedMessage.fromAgent,
            "->",
            animatedMessage.toAgent,
            "Active messages:",
            activeMessages.length,
        );

        if (activeMessages.length > 8) {
            activeMessages = activeMessages.slice(-8);
        }
    }

    function getIntentColor(intent: string): string {
        const colors: Record<string, string> = {
            question: "#FFD700",
            request_help: "#FF6B6B",
            share_info: "#4ECDC4",
            collaborate: "#45B7D1",
            social_chat: "#96CEB4",
            challenge: "#FFEAA7",
            acknowledge: "#74B9FF",
            suggest: "#FD79A8",
            compliment: "#FDCB6E",
            critique: "#E17055",
        };
        return colors[intent] || "#FFFFFF";
    }

    function getIntentIcon(intent: string): string {
        const icons: Record<string, string> = {
            question: "❓",
            request_help: "🤝",
            share_info: "💡",
            collaborate: "🤜",
            social_chat: "💬",
            challenge: "⚔️",
            acknowledge: "✅",
            suggest: "💭",
            compliment: "👍",
            critique: "📝",
        };
        return icons[intent] || "💬";
    }

    function drawAnimatedMessages() {
        if (!ctx) return;

        activeMessages.forEach((msg, index) => {
            msg.progress = Math.min(1, (time - msg.startTime) / msg.duration);
            const easeProgress = 1 - Math.pow(1 - msg.progress, 2);

            // Higher arc for more visible path
            const arcHeight = 60 * Math.sin(msg.progress * Math.PI);
            msg.currentPos.x =
                msg.fromPos.x + (msg.toPos.x - msg.fromPos.x) * easeProgress;
            msg.currentPos.y =
                msg.fromPos.y +
                (msg.toPos.y - msg.fromPos.y) * easeProgress -
                arcHeight;

            msg.alpha = msg.progress < 0.8 ? 1 : 1 - (msg.progress - 0.8) / 0.2;

            // Larger and more visible message bubble
            const pulse = 1 + Math.sin(time * 0.2 + index) * 0.4;
            const bubbleSize = 16 * pulse; // Increased from 8 to 16

            if (ctx) {
                // Draw outer glow effect
                ctx.beginPath();
                ctx.arc(
                    msg.currentPos.x,
                    msg.currentPos.y,
                    bubbleSize + 8,
                    0,
                    2 * Math.PI,
                );
                ctx.fillStyle =
                    msg.color +
                    Math.round(msg.alpha * 60)
                        .toString(16)
                        .padStart(2, "0");
                ctx.fill();

                // Draw main bubble
                ctx.beginPath();
                ctx.arc(
                    msg.currentPos.x,
                    msg.currentPos.y,
                    bubbleSize,
                    0,
                    2 * Math.PI,
                );
                ctx.fillStyle =
                    msg.color +
                    Math.round(msg.alpha * 255)
                        .toString(16)
                        .padStart(2, "0");
                ctx.fill();

                // White border for visibility
                ctx.strokeStyle =
                    "#FFFFFF" +
                    Math.round(msg.alpha * 255)
                        .toString(16)
                        .padStart(2, "0");
                ctx.lineWidth = 3;
                ctx.stroke();

                // Intent icon - larger and more visible
                const icon = getIntentIcon(msg.intent);
                ctx.fillStyle =
                    "#000000" +
                    Math.round(msg.alpha * 255)
                        .toString(16)
                        .padStart(2, "0");
                ctx.font = "bold 16px Arial"; // Increased from 12px to 16px
                ctx.textAlign = "center";
                ctx.fillText(icon, msg.currentPos.x, msg.currentPos.y + 6);
            }
        });

        activeMessages = activeMessages.filter((msg) => msg.progress < 1);
    }

    function animate() {
        // Apply simulation speed to animation
        if (simulationState === "running") {
            time += speedMultiplier;
        } else if (simulationState === "paused") {
            // Still animate but don't advance time-based animations
            time += 0.1; // Very slow animation to show pause state
        }

        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Add visual effects based on simulation state
            if (simulationState === "paused") {
                // Dim background for pause state
                ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (speedMultiplier > 1) {
                // Add speed blur effect for fast forward
                ctx.globalAlpha = 0.9;
            }

            // Draw all characters (agents + user)
            allCharacters.forEach((character) => {
                const isActive =
                    $activeCharacter && $activeCharacter.id === character.id;
                drawCharacter(character, isActive);
            });

            // Draw message transmission lines between agents
            drawMessageTransmissionLines();

            // Draw animated messages on top
            drawAnimatedMessages();

            // Reset alpha
            ctx.globalAlpha = 1.0;

            // Add simulation speed indicator
            drawSpeedIndicator();
        }
        animationId = requestAnimationFrame(animate);
    }

    function resizeCanvas() {
        if (!canvas) return;
        // Make canvas more square and less wide
        const maxWidth = Math.min(window.innerWidth * 0.8, 1000); // Limit max width
        const aspectRatio = 4 / 3; // More square aspect ratio
        canvas.width = maxWidth;
        canvas.height = maxWidth / aspectRatio;
        ctx = canvas.getContext("2d");
    }

    function drawSpeedIndicator() {
        if (!ctx || simulationState === "paused") return;

        const speedText = `${speedMultiplier}x`;
        const fontSize = 16;
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = speedMultiplier > 1 ? "#FF9800" : "#4CAF50";
        ctx.globalAlpha = 0.7;

        // Position in top-right corner
        const textWidth = ctx.measureText(speedText).width;
        ctx.fillText(speedText, canvas.width - textWidth - 20, 30);

        ctx.globalAlpha = 1.0;
    }

    function setupSimulationIntegration() {
        // Subscribe to simulation controller stores
        const speedUnsub = simulationController.speed.subscribe((speed) => {
            simulationSpeed = speed;
        });

        const stateUnsub = simulationController.state.subscribe((state) => {
            simulationState = state;
        });

        // Subscribe to simulation ticks for agent events
        const tickUnsub = simulationController.onTick((tick) => {
            // Create message animations for tick events
            tick.eventsTriggered.forEach((event) => {
                if (event === "agent_interaction") {
                    createTestMessageBubble(); // Trigger visual feedback
                }
            });
        });

        unsubscribeSimulation.push(speedUnsub, stateUnsub, tickUnsub);
    }

    onMount(() => {
        try {
            // Initialize character manager with sample data
            characterManager.initializeSampleData();
            console.log("🎮 Canvas: Characters initialized");

            // Setup simulation integration
            setupSimulationIntegration();

            // Initialize canvas
            if (canvas) {
                resizeCanvas();
                animate();
                updateCommunications();

                // Update communications every 2 seconds (still needed for fetching messages)
                updateInterval = setInterval(updateCommunications, 2000);

                // Add event listeners with error handling
                try {
                    window.addEventListener("resize", resizeCanvas);
                    window.addEventListener("keydown", handleKeyPress);
                    canvas.addEventListener("mousemove", handleMouseMove);
                    canvas.addEventListener("click", handleMouseClick);
                    console.log("🎮 Canvas: Event listeners added");
                } catch (error) {
                    console.warn(
                        "🎮 Canvas: Failed to add some event listeners:",
                        error,
                    );
                }

                console.log("🎮 Canvas: Initialization complete");
            } else {
                console.error("🎮 Canvas: Canvas element not found");
            }
        } catch (error) {
            console.error("🎮 Canvas: Critical initialization error:", error);
        }
    });

    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        // Cleanup simulation subscriptions
        unsubscribeSimulation.forEach((unsub) => unsub());

        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("keydown", handleKeyPress);
        if (canvas) {
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("click", handleMouseClick);
        }
    });
</script>

<div class="canvas-container">
    <canvas bind:this={canvas} class="gaming-canvas"></canvas>

    <!-- Test button for message transmission -->
    <button
        class="test-message-btn"
        on:click={triggerTestMessage}
        title="Send test message (or press T)"
    >
        📨 Test Message
    </button>
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
        box-shadow:
            0 0 20px rgba(0, 255, 136, 0.3),
            inset 0 0 20px rgba(0, 255, 136, 0.1);
        max-width: 85vw;
        max-height: 70vh;
        cursor: pointer;
    }

    .test-message-btn {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 255, 136, 0.2);
        border: 1px solid #00ff88;
        border-radius: 6px;
        color: #00ff88;
        padding: 8px 12px;
        font-size: 12px;
        font-family: "Courier New", monospace;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(5px);
    }

    .test-message-btn:hover {
        background: rgba(0, 255, 136, 0.4);
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        transform: translateY(-1px);
    }
</style>
