/**
 * ModeManager
 *
 * Manages interaction modes for NocturneAI chat interface.
 * Handles mode switching, state management, and event emissions.
 *
 * Modes:
 * - ASK: Conversational responses using router LLM (no tools, no confirmations)
 * - EDIT: Human-approved actions with ReAct agent (tools + confirmations)
 * - AGENT: Autonomous execution (auto-execute, no confirmations)
 */

import { EventEmitter } from 'events';
import type {
  IModeHandler,
  InteractionMode,
  ModeSwitchEvent,
} from '../../../core/interfaces/IModeHandler.js';

/**
 * Mode Manager Configuration
 */
export interface ModeManagerConfig {
  /**
   * Default mode on initialization
   */
  defaultMode?: InteractionMode;

  /**
   * Event bus for emitting mode change events
   */
  eventBus?: EventEmitter;

  /**
   * Enable logging
   */
  enableLogging?: boolean;
}

/**
 * Mode Manager
 *
 * Centralizes mode management and switching logic.
 */
export class ModeManager {
  private currentMode: InteractionMode;
  private handlers: Map<InteractionMode, IModeHandler>;
  private eventBus: EventEmitter;
  private enableLogging: boolean;
  private modeHistory: ModeSwitchEvent[];

  /**
   * Create a new ModeManager
   *
   * @param config Mode manager configuration
   */
  constructor(config: ModeManagerConfig = {}) {
    this.currentMode = config.defaultMode || 'ask';
    this.handlers = new Map();
    this.eventBus = config.eventBus || new EventEmitter();
    this.enableLogging = config.enableLogging ?? true;
    this.modeHistory = [];

    this.log('info', `ModeManager initialized with mode: ${this.currentMode}`);
  }

  /**
   * Register a mode handler
   *
   * @param handler Mode handler to register
   */
  registerHandler(handler: IModeHandler): void {
    this.handlers.set(handler.mode, handler);
    this.log('info', `Registered handler for mode: ${handler.mode} (${handler.displayName})`);
  }

  /**
   * Get the current mode
   *
   * @returns Current interaction mode
   */
  getCurrentMode(): InteractionMode {
    return this.currentMode;
  }

  /**
   * Get the current mode handler
   *
   * @returns Current mode handler or undefined if not registered
   */
  getCurrentHandler(): IModeHandler | undefined {
    return this.handlers.get(this.currentMode);
  }

  /**
   * Switch to a different mode
   *
   * @param newMode Mode to switch to
   * @param reason Optional reason for switch
   * @returns True if switch was successful
   */
  switchMode(newMode: InteractionMode, reason?: string): boolean {
    if (newMode === this.currentMode) {
      this.log('debug', `Already in ${newMode} mode, no switch needed`);
      return true;
    }

    const newHandler = this.handlers.get(newMode);
    if (!newHandler) {
      this.log('error', `No handler registered for mode: ${newMode}`);
      return false;
    }

    const oldMode = this.currentMode;
    this.currentMode = newMode;

    // Create mode switch event
    const switchEvent: ModeSwitchEvent = {
      fromMode: oldMode,
      toMode: newMode,
      reason,
      timestamp: new Date(),
    };

    // Add to history
    this.modeHistory.push(switchEvent);

    // Emit event
    this.eventBus.emit('mode:switched', switchEvent);

    this.log(
      'info',
      `Switched from ${oldMode} to ${newMode} mode${reason ? ` (${reason})` : ''}`
    );

    return true;
  }

  /**
   * Check if a mode is available
   *
   * @param mode Mode to check
   * @returns True if handler is registered for this mode
   */
  isModeAvailable(mode: InteractionMode): boolean {
    return this.handlers.has(mode);
  }

  /**
   * Get all available modes
   *
   * @returns Array of available modes
   */
  getAvailableModes(): InteractionMode[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get mode handler by mode type
   *
   * @param mode Mode to get handler for
   * @returns Mode handler or undefined if not registered
   */
  getHandler(mode: InteractionMode): IModeHandler | undefined {
    return this.handlers.get(mode);
  }

  /**
   * Get all registered handlers
   *
   * @returns Map of mode to handler
   */
  getAllHandlers(): Map<InteractionMode, IModeHandler> {
    return new Map(this.handlers);
  }

  /**
   * Get mode history
   *
   * @param limit Optional limit on number of events to return
   * @returns Array of mode switch events
   */
  getModeHistory(limit?: number): ModeSwitchEvent[] {
    if (limit && limit > 0) {
      return this.modeHistory.slice(-limit);
    }
    return [...this.modeHistory];
  }

  /**
   * Clear mode history
   */
  clearHistory(): void {
    this.modeHistory = [];
    this.log('debug', 'Mode history cleared');
  }

  /**
   * Get mode information
   *
   * @param mode Mode to get info for (defaults to current mode)
   * @returns Mode information object
   */
  getModeInfo(mode?: InteractionMode): {
    mode: InteractionMode;
    displayName: string;
    description: string;
    capabilities: ReturnType<IModeHandler['getCapabilities']>;
  } | null {
    const targetMode = mode || this.currentMode;
    const handler = this.handlers.get(targetMode);

    if (!handler) {
      return null;
    }

    return {
      mode: handler.mode,
      displayName: handler.displayName,
      description: handler.description,
      capabilities: handler.getCapabilities(),
    };
  }

  /**
   * Get all modes information
   *
   * @returns Array of mode information objects
   */
  getAllModesInfo(): Array<{
    mode: InteractionMode;
    displayName: string;
    description: string;
    capabilities: ReturnType<IModeHandler['getCapabilities']>;
    isCurrent: boolean;
  }> {
    return Array.from(this.handlers.values()).map((handler) => ({
      mode: handler.mode,
      displayName: handler.displayName,
      description: handler.description,
      capabilities: handler.getCapabilities(),
      isCurrent: handler.mode === this.currentMode,
    }));
  }

  /**
   * Log a message
   *
   * @param level Log level
   * @param message Message to log
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.enableLogging) {
      return;
    }

    const prefix = `[ModeManager]`;
    console.log(`${prefix} ${level.toUpperCase()}: ${message}`);
  }

  /**
   * Get event bus for external listeners
   *
   * @returns Event emitter
   */
  getEventBus(): EventEmitter {
    return this.eventBus;
  }

  /**
   * Add event listener for mode switches
   *
   * @param listener Event listener function
   */
  onModeSwitch(listener: (event: ModeSwitchEvent) => void): void {
    this.eventBus.on('mode:switched', listener);
  }

  /**
   * Remove event listener for mode switches
   *
   * @param listener Event listener function to remove
   */
  offModeSwitch(listener: (event: ModeSwitchEvent) => void): void {
    this.eventBus.off('mode:switched', listener);
  }
}
