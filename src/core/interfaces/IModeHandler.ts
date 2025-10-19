/**
 * IModeHandler Interface
 *
 * Defines the contract for different interaction modes in NocturneAI.
 * Each mode handles natural language input differently:
 * - ASK mode: Pure conversational responses (router LLM only, no tools)
 * - EDIT mode: Human-approved actions (ReAct + confirmations)
 * - AGENT mode: Autonomous execution (auto-execute, no confirmations)
 */

import type { ChatMessage, ConfirmationStatus } from '../../presentation/ui/types.js';

/**
 * Mode types
 */
export type InteractionMode = 'ask' | 'edit' | 'agent';

/**
 * Mode handler interface
 *
 * Each mode provides its own implementation of natural language processing.
 */
export interface IModeHandler {
  /**
   * Mode identifier
   */
  readonly mode: InteractionMode;

  /**
   * Mode display name
   */
  readonly displayName: string;

  /**
   * Mode description
   */
  readonly description: string;

  /**
   * Check if this handler can process the given input
   *
   * @param input User input string
   * @returns True if handler can process input
   */
  canHandleInput(input: string): boolean;

  /**
   * Handle natural language input
   *
   * @param input User input string
   * @param context Additional context for processing
   * @returns Promise that resolves when processing is complete
   */
  handleNaturalLanguage(
    input: string,
    context: Record<string, unknown>
  ): Promise<void>;

  /**
   * Whether this mode supports action confirmations
   *
   * @returns True if mode shows confirmation dialogs
   */
  supportsConfirmations(): boolean;

  /**
   * Handle confirmation response (optional - only for modes that support confirmations)
   *
   * @param confirmationId Confirmation ID
   * @param response User response (approved, modified, cancelled)
   * @param modifiedInput Modified input if response is 'modified'
   * @returns Promise that resolves when confirmation is handled
   */
  handleConfirmation?(
    confirmationId: string,
    response: ConfirmationStatus,
    modifiedInput?: string
  ): Promise<void>;

  /**
   * Get mode capabilities
   *
   * @returns Object describing mode capabilities
   */
  getCapabilities(): {
    usesTools: boolean;
    requiresConfirmation: boolean;
    autonomous: boolean;
    usesRouter: boolean;
    usesReAct: boolean;
  };
}

/**
 * Mode context information
 */
export interface ModeContext {
  /**
   * Recent chat messages
   */
  recentMessages?: ChatMessage[];

  /**
   * Current timestamp
   */
  timestamp?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Mode switch event
 */
export interface ModeSwitchEvent {
  /**
   * Previous mode
   */
  fromMode: InteractionMode;

  /**
   * New mode
   */
  toMode: InteractionMode;

  /**
   * Reason for switch
   */
  reason?: string;

  /**
   * Timestamp of switch
   */
  timestamp: Date;
}
