/**
 * NocturneAI - Main Entry Point
 *
 * Autonomous multi-agent system powered by GitHub Copilot
 * with interactive terminal interface.
 *
 * @packageDocumentation
 */

// Core exports
export * from "./core/types/index.js";
export * from "./core/errors/index.js";
export * from "./core/interfaces/index.js";
export * from "./core/constants/index.js";

// Infrastructure exports
export * from "./infrastructure/llm/index.js";
export * from "./infrastructure/context/index.js";

// Version and metadata
export const VERSION = "0.1.0";
export const NAME = "@nocturne/ai";

/**
 * Initialize NocturneAI with configuration
 *
 * @param config - Configuration options
 * @returns Initialized client instance
 */
export async function initialize(config?: {
  baseURL?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  caching?: boolean;
}) {
  const { CopilotClient } = await import(
    "./infrastructure/llm/CopilotClient.js"
  );
  return new CopilotClient(config);
}

/**
 * Get the default token counter instance
 */
export {
  getTokenCounter,
  resetTokenCounter,
} from "./infrastructure/llm/TokenCounter.js";

/**
 * Create a new Copilot client
 */
export { CopilotClient } from "./infrastructure/llm/CopilotClient.js";

/**
 * Create a new token counter
 */
export { TokenCounter } from "./infrastructure/llm/TokenCounter.js";
