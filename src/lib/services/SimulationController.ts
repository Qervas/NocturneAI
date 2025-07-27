import { writable, type Writable } from "svelte/store";
import { communicationManager } from "./CommunicationManager";
import { skillTreeManager } from "./PerkManager";
import { characterManager } from "./CharacterManager";

export type SimulationSpeed = "paused" | "normal" | "fast" | "very_fast";
export type SimulationState = "running" | "paused" | "loading";

interface SimulationStats {
  tickCount: number;
  totalRunTime: number;
  avgTickDuration: number;
  agentActionCount: number;
  errorCount: number;
}

interface SimulationRisks {
  errorProbability: number;
  agentFatigueProbability: number;
  systemOverloadRisk: number;
}

interface SimulationTick {
  timestamp: Date;
  tickNumber: number;
  speed: SimulationSpeed;
  eventsTriggered: string[];
  risks?: SimulationRisks;
}

export class SimulationController {
  // Core state
  private currentSpeed: SimulationSpeed = "normal";
  private currentState: SimulationState = "paused";
  private tickInterval: number | null = null;
  private animationFrame: number | null = null;

  // Timing configuration
  private readonly speedConfig = {
    paused: 0,
    normal: 1000, // 1 second per tick
    fast: 500, // 0.5 seconds per tick (2x speed)
    very_fast: 250, // 0.25 seconds per tick (4x speed)
  };

  // Statistics and risks
  private stats: SimulationStats = {
    tickCount: 0,
    totalRunTime: 0,
    avgTickDuration: 0,
    agentActionCount: 0,
    errorCount: 0,
  };

  private lastTickTime = 0;
  private sessionStartTime = 0;

  // Svelte stores for reactive UI
  public readonly speed: Writable<SimulationSpeed> = writable("normal");
  public readonly state: Writable<SimulationState> = writable("paused");
  public readonly statistics: Writable<SimulationStats> = writable(this.stats);
  public readonly currentRisks: Writable<SimulationRisks> = writable({
    errorProbability: 0,
    agentFatigueProbability: 0,
    systemOverloadRisk: 0,
  });

  // Event handlers - modules can subscribe to these
  private tickHandlers: Array<(tick: SimulationTick) => void> = [];
  private speedChangeHandlers: Array<
    (oldSpeed: SimulationSpeed, newSpeed: SimulationSpeed) => void
  > = [];
  private stateChangeHandlers: Array<(state: SimulationState) => void> = [];

  constructor() {
    // Initialize stores
    this.speed.set(this.currentSpeed);
    this.state.set(this.currentState);
    this.statistics.set(this.stats);

    // Save/restore simulation state
    this.loadSimulationState();

    // Set up auto-save
    setInterval(() => this.saveSimulationState(), 5000);
  }

  // ===== CORE SIMULATION CONTROL =====

  public play(): void {
    if (this.currentState === "paused") {
      this.currentState = "running";
      this.state.set(this.currentState);

      if (this.sessionStartTime === 0) {
        this.sessionStartTime = Date.now();
      }

      this.startSimulationLoop();
      this.notifyStateChange("running");

      console.log(`🎮 Simulation PLAY - Speed: ${this.currentSpeed}`);
    }
  }

  public pause(): void {
    if (this.currentState === "running") {
      this.currentState = "paused";
      this.state.set(this.currentState);

      this.stopSimulationLoop();
      this.notifyStateChange("paused");

      console.log("⏸️ Simulation PAUSED");
    }
  }

  public setSpeed(newSpeed: SimulationSpeed): void {
    const oldSpeed = this.currentSpeed;
    this.currentSpeed = newSpeed;
    this.speed.set(newSpeed);

    // Update current risks based on speed
    this.updateRisksForSpeed(newSpeed);

    // Restart loop if running to apply new timing
    if (this.currentState === "running") {
      this.stopSimulationLoop();
      this.startSimulationLoop();
    }

    this.notifySpeedChange(oldSpeed, newSpeed);
    console.log(`⚡ Simulation speed changed: ${oldSpeed} -> ${newSpeed}`);
  }

  public toggle(): void {
    if (this.currentState === "running") {
      this.pause();
    } else {
      this.play();
    }
  }

  public cycleSpeed(): void {
    const speeds: SimulationSpeed[] = ["normal", "fast", "very_fast"];
    const currentIndex = speeds.indexOf(this.currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.setSpeed(speeds[nextIndex]);
  }

  // ===== SIMULATION LOOP =====

  private startSimulationLoop(): void {
    if (this.currentSpeed === "paused") return;

    const interval = this.speedConfig[this.currentSpeed];
    this.lastTickTime = Date.now();

    this.tickInterval = setInterval(() => {
      this.executeTick();
    }, interval);
  }

  private stopSimulationLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private executeTick(): void {
    const tickStart = Date.now();
    const tickNumber = ++this.stats.tickCount;

    // Calculate risks for this tick
    const risks = this.calculateTickRisks();

    // Create tick object
    const tick: SimulationTick = {
      timestamp: new Date(),
      tickNumber,
      speed: this.currentSpeed,
      eventsTriggered: [],
      risks,
    };

    try {
      // Execute tick events
      this.processAgentActions(tick);
      this.processCommunications(tick);
      this.processGamificationEvents(tick);

      // Notify all subscribers
      this.notifyTick(tick);

      // Update statistics
      this.updateStatistics(tickStart, tick);
    } catch (error) {
      console.error("❌ Simulation tick error:", error);
      this.stats.errorCount++;

      // If too many errors, auto-pause
      if (this.stats.errorCount > 5) {
        console.warn("⚠️ Too many errors, auto-pausing simulation");
        this.pause();
      }
    }
  }

  // ===== TICK PROCESSORS =====

  private processAgentActions(tick: SimulationTick): void {
    // Trigger autonomous agent conversations
    if (Math.random() < this.getAgentActionProbability()) {
      // Apply speed-based error chances
      const hasError = Math.random() < tick.risks!.errorProbability;

      if (!hasError) {
        // Trigger normal agent interaction
        this.triggerAgentInteraction();
        tick.eventsTriggered.push("agent_interaction");
        this.stats.agentActionCount++;

        // Award XP for successful actions
        this.awardExperienceForActions();
      } else {
        // Simulate agent "error" or fatigue
        tick.eventsTriggered.push("agent_error");
        this.stats.errorCount++;
        console.log("⚠️ Agent fatigue detected during fast forward");
      }
    }
  }

  private processCommunications(tick: SimulationTick): void {
    // Process any queued communications at simulation speed
    const pendingMessages = communicationManager.getPendingMessages("all");

    if (pendingMessages.length > 0) {
      tick.eventsTriggered.push("communication_processed");
    }
  }

  private processGamificationEvents(tick: SimulationTick): void {
    // Random XP gains, ability unlocks, etc.
    if (Math.random() < 0.1) {
      // 10% chance per tick for bonus XP
      this.awardBonusExperience();
      tick.eventsTriggered.push("xp_gain");
    }

    if (Math.random() < 0.02) {
      // 2% chance per tick for milestone rewards
      this.awardMilestoneRewards();
      tick.eventsTriggered.push("ability_unlock");
    }
  }

  private triggerAgentInteraction(): void {
    // This integrates with the new natural conversation system
    communicationManager.triggerSimulationTick();
  }

  // ===== EXPERIENCE SYSTEM =====

  private awardExperienceForActions(): void {
    const npcs = characterManager.getNPCs();
    const activeAgents = npcs.filter((npc) => npc.status === "online");

    if (activeAgents.length > 0) {
      // Award XP to random active agent(s)
      const agentToReward =
        activeAgents[Math.floor(Math.random() * activeAgents.length)];
      const baseXP = this.getSpeedMultiplier() * 25; // 25 XP base, multiplied by speed
      skillTreeManager.grantExperience(
        agentToReward.id,
        baseXP,
        "agent interaction",
      );

      // Small chance for group XP
      if (Math.random() < 0.3 && activeAgents.length > 1) {
        const secondAgent = activeAgents.find((a) => a.id !== agentToReward.id);
        if (secondAgent) {
          skillTreeManager.grantExperience(
            secondAgent.id,
            baseXP * 0.5,
            "collaboration",
          );
        }
      }
    }
  }

  private awardBonusExperience(): void {
    const npcs = characterManager.getNPCs();
    const activeAgents = npcs.filter((npc) => npc.status === "online");

    if (activeAgents.length > 0) {
      const bonusXP = Math.floor(Math.random() * 50) + 25; // 25-75 XP
      const luckyAgent =
        activeAgents[Math.floor(Math.random() * activeAgents.length)];
      skillTreeManager.grantExperience(
        luckyAgent.id,
        bonusXP,
        "performance bonus",
      );
    }
  }

  private awardMilestoneRewards(): void {
    const npcs = characterManager.getNPCs();
    const activeAgents = npcs.filter((npc) => npc.status === "online");

    if (activeAgents.length > 0) {
      const milestoneXP = 100; // Larger milestone reward
      const topPerformer =
        activeAgents[Math.floor(Math.random() * activeAgents.length)];
      skillTreeManager.grantExperience(
        topPerformer.id,
        milestoneXP,
        "milestone achievement",
      );
    }
  }

  // ===== RISK MANAGEMENT =====

  private calculateTickRisks(): SimulationRisks {
    const baseError = 0.01; // 1% base error rate
    const speedMultiplier = this.getSpeedMultiplier();

    return {
      errorProbability: Math.min(
        0.3,
        baseError * Math.pow(speedMultiplier, 1.5),
      ),
      agentFatigueProbability: Math.min(0.2, baseError * speedMultiplier * 2),
      systemOverloadRisk: speedMultiplier > 2 ? 0.1 : 0,
    };
  }

  private updateRisksForSpeed(speed: SimulationSpeed): void {
    const risks = this.calculateTickRisks();
    this.currentRisks.set(risks);
  }

  private getSpeedMultiplier(): number {
    switch (this.currentSpeed) {
      case "paused":
        return 0;
      case "normal":
        return 1;
      case "fast":
        return 2;
      case "very_fast":
        return 4;
      default:
        return 1;
    }
  }

  private getAgentActionProbability(): number {
    switch (this.currentSpeed) {
      case "paused":
        return 0;
      case "normal":
        return 0.08; // 8% chance per tick - much lower for more natural pacing
      case "fast":
        return 0.15; // 15% chance per tick
      case "very_fast":
        return 0.25; // 25% chance per tick
      default:
        return 0.08;
    }
  }

  // ===== STATISTICS =====

  private updateStatistics(tickStart: number, tick: SimulationTick): void {
    const tickDuration = Date.now() - tickStart;
    this.stats.totalRunTime = Date.now() - this.sessionStartTime;
    this.stats.avgTickDuration =
      (this.stats.avgTickDuration * (this.stats.tickCount - 1) + tickDuration) /
      this.stats.tickCount;

    this.statistics.set({ ...this.stats });
  }

  // ===== EVENT SUBSCRIPTION =====

  public onTick(handler: (tick: SimulationTick) => void): () => void {
    this.tickHandlers.push(handler);
    return () => {
      this.tickHandlers = this.tickHandlers.filter((h) => h !== handler);
    };
  }

  public onSpeedChange(
    handler: (oldSpeed: SimulationSpeed, newSpeed: SimulationSpeed) => void,
  ): () => void {
    this.speedChangeHandlers.push(handler);
    return () => {
      this.speedChangeHandlers = this.speedChangeHandlers.filter(
        (h) => h !== handler,
      );
    };
  }

  public onStateChange(handler: (state: SimulationState) => void): () => void {
    this.stateChangeHandlers.push(handler);
    return () => {
      this.stateChangeHandlers = this.stateChangeHandlers.filter(
        (h) => h !== handler,
      );
    };
  }

  private notifyTick(tick: SimulationTick): void {
    this.tickHandlers.forEach((handler) => {
      try {
        handler(tick);
      } catch (error) {
        console.error("Error in tick handler:", error);
      }
    });
  }

  private notifySpeedChange(
    oldSpeed: SimulationSpeed,
    newSpeed: SimulationSpeed,
  ): void {
    this.speedChangeHandlers.forEach((handler) => {
      try {
        handler(oldSpeed, newSpeed);
      } catch (error) {
        console.error("Error in speed change handler:", error);
      }
    });
  }

  private notifyStateChange(state: SimulationState): void {
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(state);
      } catch (error) {
        console.error("Error in state change handler:", error);
      }
    });
  }

  // ===== PERSISTENCE =====

  private saveSimulationState(): void {
    const state = {
      speed: this.currentSpeed,
      stats: this.stats,
      sessionStartTime: this.sessionStartTime,
    };

    try {
      localStorage.setItem("nocturne_simulation_state", JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to save simulation state:", error);
    }
  }

  private loadSimulationState(): void {
    try {
      const saved = localStorage.getItem("nocturne_simulation_state");
      if (saved) {
        const state = JSON.parse(saved);
        this.currentSpeed = state.speed || "normal";
        this.stats = { ...this.stats, ...state.stats };
        this.sessionStartTime = state.sessionStartTime || 0;

        this.speed.set(this.currentSpeed);
        this.statistics.set(this.stats);
      }
    } catch (error) {
      console.warn("Failed to load simulation state:", error);
    }
  }

  // ===== GETTERS =====

  public getCurrentSpeed(): SimulationSpeed {
    return this.currentSpeed;
  }

  public getCurrentState(): SimulationState {
    return this.currentState;
  }

  public getStatistics(): SimulationStats {
    return { ...this.stats };
  }

  public isRunning(): boolean {
    return this.currentState === "running";
  }

  public isPaused(): boolean {
    return this.currentState === "paused";
  }

  // ===== UTILITY METHODS =====

  public reset(): void {
    this.pause();
    this.stats = {
      tickCount: 0,
      totalRunTime: 0,
      avgTickDuration: 0,
      agentActionCount: 0,
      errorCount: 0,
    };
    this.sessionStartTime = 0;
    this.statistics.set(this.stats);
    console.log("🔄 Simulation reset");
  }

  public destroy(): void {
    this.stopSimulationLoop();
    this.saveSimulationState();
    console.log("🔥 SimulationController destroyed");
  }
}

// Export singleton instance
export const simulationController = new SimulationController();
