<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { communicationManager } from "../services/CommunicationManager";
    import { characters, npcs } from "../services/CharacterManager";

    interface Connection {
        participants: [string, string];
        topic: string;
        duration: number;
        intensity: number;
        connectionId: string;
    }

    let connections: Connection[] = [];
    let updateInterval: number;
    let svgContainer: SVGSVGElement;

    // Get agent positions from your character system
    $: agentPositions = $characters.reduce(
        (positions, char) => {
            positions[char.id] = { x: char.position.x, y: char.position.y };
            return positions;
        },
        {} as Record<string, { x: number; y: number }>,
    );

    function updateConnections() {
        connections = communicationManager.getActiveConnections();
    }

    function getAgentColor(agentId: string): string {
        const character = $characters.find((c) => c.id === agentId);
        return character?.color || "#ffffff";
    }

    function getAgentName(agentId: string): string {
        const character = $characters.find((c) => c.id === agentId);
        return character?.name || agentId.replace("agent_", "").toUpperCase();
    }

    function getConnectionPath(agent1: string, agent2: string): string {
        const pos1 = agentPositions[agent1];
        const pos2 = agentPositions[agent2];

        if (!pos1 || !pos2) return "";

        // Create a curved path between agents
        const midX = (pos1.x + pos2.x) / 2;
        const midY = (pos1.y + pos2.y) / 2;
        const controlOffset = 50;

        return `M ${pos1.x} ${pos1.y} Q ${midX} ${midY - controlOffset} ${pos2.x} ${pos2.y}`;
    }

    function getIntensityOpacity(intensity: number): number {
        return Math.max(0.3, intensity);
    }

    function getIntensityWidth(intensity: number): number {
        return Math.max(2, intensity * 6);
    }

    function formatDuration(duration: number): string {
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }

    function getTopicEmoji(topic: string): string {
        const topicEmojis: Record<string, string> = {
            "data analysis": "📊",
            research: "🔬",
            methodology: "📋",
            creativity: "🎨",
            design: "🎨",
            art: "🖼️",
            logic: "🧠",
            reasoning: "🤔",
            protocols: "📋",
            automation: "🤖",
            communication: "💬",
            negotiation: "🤝",
        };

        return topicEmojis[topic] || "💭";
    }

    onMount(() => {
        updateConnections();
        updateInterval = setInterval(updateConnections, 2000);
    });

    onDestroy(() => {
        if (updateInterval) clearInterval(updateInterval);
    });
</script>

<div class="conversation-overlay">
    <svg bind:this={svgContainer} class="connection-svg" viewBox="0 0 1000 500">
        <!-- Draw connection lines -->
        {#each connections as connection (connection.connectionId)}
            {@const [agent1, agent2] = connection.participants}
            {@const path = getConnectionPath(agent1, agent2)}
            {@const color1 = getAgentColor(agent1)}
            {@const color2 = getAgentColor(agent2)}

            {#if path}
                <!-- Animated connection line -->
                <path
                    d={path}
                    fill="none"
                    stroke="url(#gradient-{connection.connectionId})"
                    stroke-width={getIntensityWidth(connection.intensity)}
                    opacity={getIntensityOpacity(connection.intensity)}
                    class="connection-line"
                />

                <!-- Gradient definition for this connection -->
                <defs>
                    <linearGradient id="gradient-{connection.connectionId}">
                        <stop offset="0%" stop-color={color1} />
                        <stop offset="100%" stop-color={color2} />
                    </linearGradient>
                </defs>

                <!-- Animated particles along the line -->
                <circle
                    r="3"
                    fill={color1}
                    opacity="0.8"
                    class="connection-particle"
                >
                    <animateMotion dur="3s" repeatCount="indefinite" {path} />
                </circle>

                <!-- Connection info tooltip area -->
                <g
                    class="connection-info"
                    transform="translate({(agentPositions[agent1]?.x +
                        agentPositions[agent2]?.x) /
                        2},
                               {(agentPositions[agent1]?.y +
                        agentPositions[agent2]?.y) /
                        2 -
                        30})"
                >
                    <rect
                        x="-50"
                        y="-15"
                        width="100"
                        height="30"
                        rx="15"
                        fill="rgba(0, 0, 0, 0.8)"
                        stroke="rgba(255, 255, 255, 0.2)"
                        stroke-width="1"
                        class="info-background"
                    />
                    <text
                        x="0"
                        y="0"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        fill="white"
                        font-size="10"
                        class="connection-topic"
                    >
                        {getTopicEmoji(connection.topic)}
                        {connection.topic}
                    </text>
                    <text
                        x="0"
                        y="12"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        fill="#aaa"
                        font-size="8"
                        class="connection-duration"
                    >
                        {formatDuration(connection.duration)}
                    </text>
                </g>
            {/if}
        {/each}
    </svg>

    <!-- Connection status panel -->
    {#if connections.length > 0}
        <div class="connections-panel">
            <h4>🔗 Active Conversations</h4>
            {#each connections as connection}
                {@const [agent1, agent2] = connection.participants}
                <div class="connection-item">
                    <div class="participants">
                        <span style="color: {getAgentColor(agent1)}"
                            >{getAgentName(agent1)}</span
                        >
                        <span class="connector">↔</span>
                        <span style="color: {getAgentColor(agent2)}"
                            >{getAgentName(agent2)}</span
                        >
                    </div>
                    <div class="topic">
                        {getTopicEmoji(connection.topic)}
                        {connection.topic}
                    </div>
                    <div class="meta">
                        <span class="duration"
                            >{formatDuration(connection.duration)}</span
                        >
                        <span class="intensity">
                            {"●".repeat(Math.ceil(connection.intensity * 5))}
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .conversation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
    }

    .connection-svg {
        width: 100%;
        height: 100%;
    }

    .connection-line {
        filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
        animation: pulse-line 2s ease-in-out infinite;
    }

    @keyframes pulse-line {
        0%,
        100% {
            opacity: 0.6;
            filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
        }
        50% {
            opacity: 1;
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
        }
    }

    .connection-particle {
        filter: drop-shadow(0 0 3px currentColor);
    }

    .connection-info {
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .connection-svg:hover .connection-info {
        opacity: 1;
    }

    .info-background {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .connection-topic {
        font-family: "Arial", sans-serif;
        font-weight: 500;
    }

    .connection-duration {
        font-family: "Courier New", monospace;
    }

    .connections-panel {
        position: fixed;
        top: 120px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        padding: 15px;
        min-width: 250px;
        max-width: 280px;
        pointer-events: auto;
        backdrop-filter: blur(10px);
        z-index: 5;
    }

    .connections-panel h4 {
        margin: 0 0 10px 0;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
    }

    .connection-item {
        margin-bottom: 12px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        border-left: 3px solid rgba(255, 255, 255, 0.3);
    }

    .participants {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .connector {
        color: #aaa;
        margin: 0 6px;
    }

    .topic {
        font-size: 11px;
        color: #ccc;
        margin-bottom: 4px;
    }

    .meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
    }

    .duration {
        color: #888;
        font-family: "Courier New", monospace;
    }

    .intensity {
        color: #4fc3f7;
        font-size: 8px;
        letter-spacing: 1px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .connections-panel {
            top: 80px;
            right: 10px;
            min-width: 200px;
            max-width: 220px;
            padding: 10px;
        }

        .connections-panel h4 {
            font-size: 12px;
        }

        .connection-item {
            padding: 6px;
        }

        .participants {
            font-size: 11px;
        }

        .topic {
            font-size: 10px;
        }
    }
</style>
