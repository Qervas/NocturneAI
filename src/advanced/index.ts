/**
 * Advanced Features Module
 *
 * Phase 5: Advanced capabilities for NocturneAI including multi-agent coordination,
 * background task management, plugin system, and metrics collection.
 *
 * @module advanced
 */

// Agent Coordination
export {
  AgentCoordinator,
  createAgentCoordinator,
  type CoordinationStrategy,
  type AgentRole,
  type MessageType,
  type AgentMessage,
  type CoordinatedTask,
  type AgentParticipant,
  type CoordinationSession,
  type CoordinationOptions,
} from './coordination';

// Background Task Management
export {
  BackgroundTaskManager,
  createBackgroundTaskManager,
  type TaskStatus,
  type TaskPriority,
  type ExecutionMode,
  type BackgroundTask,
  type TaskContext,
  type TaskManagerOptions,
  type TaskResult,
  type TaskStatistics,
} from './tasks';

// Plugin System
export {
  PluginManager,
  createPluginManager,
  type PluginStatus,
  type PluginMetadata,
  type PluginHooks,
  type Plugin,
  type PluginContext,
  type PluginLogger,
  type PluginStorage,
  type PluginAPI,
  type PluginManagerOptions,
} from './plugins';

// Metrics and Analytics
export {
  MetricsCollector,
  createMetricsCollector,
  type MetricType,
  type MetricValue,
  type Metric,
  type MetricAggregations,
  type MetricQueryOptions,
  type TimeSeriesPoint,
  type MetricsCollectorOptions,
  type AlertConfig,
  type AlertEvent,
} from './metrics';
