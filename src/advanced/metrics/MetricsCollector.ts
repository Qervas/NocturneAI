/**
 * Metrics Collector
 *
 * Collects, aggregates, and reports performance metrics and analytics.
 * Tracks system health, resource usage, and application performance.
 *
 * Features:
 * - Real-time metrics collection
 * - Time-series data aggregation
 * - Percentile and histogram calculations
 * - Custom metric definitions
 * - Metric labels and dimensions
 * - Automatic metric expiration
 * - Export to multiple formats
 * - Alerts and thresholds
 *
 * @module MetricsCollector
 */

import { EventEmitter } from 'events';

/**
 * Metric types
 */
export type MetricType =
  | 'counter'     // Monotonically increasing value
  | 'gauge'       // Point-in-time value
  | 'histogram'   // Distribution of values
  | 'summary';    // Percentiles over time

/**
 * Metric value
 */
export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

/**
 * Metric definition
 */
export interface Metric {
  name: string;
  type: MetricType;
  description?: string;
  unit?: string;
  values: MetricValue[];
  aggregations?: MetricAggregations;
}

/**
 * Metric aggregations
 */
export interface MetricAggregations {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p95?: number;
  p99?: number;
  stddev?: number;
}

/**
 * Metric query options
 */
export interface MetricQueryOptions {
  startTime?: number;
  endTime?: number;
  labels?: Record<string, string>;
  limit?: number;
  aggregateBy?: 'minute' | 'hour' | 'day';
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Metrics collector options
 */
export interface MetricsCollectorOptions {
  retentionPeriod?: number;
  flushInterval?: number;
  enableAutoFlush?: boolean;
  maxMetrics?: number;
  maxValuesPerMetric?: number;
  computePercentiles?: boolean;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  name: string;
  metricName: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration?: number;
  labels?: Record<string, string>;
  enabled: boolean;
}

/**
 * Alert event
 */
export interface AlertEvent {
  alert: AlertConfig;
  metric: Metric;
  value: number;
  timestamp: number;
  message: string;
}

/**
 * Metrics Collector
 *
 * Collects and manages application metrics.
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector({
 *   retentionPeriod: 3600000, // 1 hour
 *   enableAutoFlush: true
 * });
 *
 * // Record counter
 * collector.increment('api.requests', 1, { method: 'GET', path: '/users' });
 *
 * // Record gauge
 * collector.gauge('memory.usage', process.memoryUsage().heapUsed);
 *
 * // Record histogram
 * collector.histogram('request.duration', duration, { endpoint: '/api' });
 *
 * // Get metrics
 * const metrics = collector.getMetric('api.requests', {
 *   startTime: Date.now() - 3600000,
 *   labels: { method: 'GET' }
 * });
 *
 * // Set alert
 * collector.addAlert({
 *   name: 'high-error-rate',
 *   metricName: 'api.errors',
 *   condition: 'gt',
 *   threshold: 100,
 *   enabled: true
 * });
 * ```
 */
export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, Metric>;
  private alerts: Map<string, AlertConfig>;
  private alertStates: Map<string, { triggeredAt?: number; lastValue?: number }>;
  private options: Required<MetricsCollectorOptions>;
  private flushTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: MetricsCollectorOptions = {}) {
    super();

    this.metrics = new Map();
    this.alerts = new Map();
    this.alertStates = new Map();

    this.options = {
      retentionPeriod: 3600000, // 1 hour
      flushInterval: 60000, // 1 minute
      enableAutoFlush: true,
      maxMetrics: 10000,
      maxValuesPerMetric: 10000,
      computePercentiles: true,
      ...options,
    };

    if (this.options.enableAutoFlush) {
      this.startAutoFlush();
    }

    this.startCleanup();
  }

  /**
   * Increment counter metric
   */
  increment(
    name: string,
    value: number = 1,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, 'counter', value, labels);
  }

  /**
   * Decrement counter metric
   */
  decrement(
    name: string,
    value: number = 1,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, 'counter', -value, labels);
  }

  /**
   * Set gauge metric
   */
  gauge(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, 'gauge', value, labels);
  }

  /**
   * Record histogram value
   */
  histogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, 'histogram', value, labels);
  }

  /**
   * Record summary value
   */
  summary(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, 'summary', value, labels);
  }

  /**
   * Record metric value
   */
  private recordMetric(
    name: string,
    type: MetricType,
    value: number,
    labels?: Record<string, string>,
  ): void {
    if (this.metrics.size >= this.options.maxMetrics) {
      this.emit('error', new Error('Maximum metrics limit reached'));
      return;
    }

    let metric = this.metrics.get(name);

    if (!metric) {
      metric = {
        name,
        type,
        values: [],
      };
      this.metrics.set(name, metric);
      this.emit('metric:created', { name, type });
    }

    // Validate type consistency
    if (metric.type !== type) {
      this.emit('error', new Error(
        `Metric type mismatch: ${name} is ${metric.type}, not ${type}`
      ));
      return;
    }

    const metricValue: MetricValue = {
      value,
      timestamp: Date.now(),
      labels,
    };

    metric.values.push(metricValue);

    // Trim old values
    if (metric.values.length > this.options.maxValuesPerMetric) {
      metric.values.shift();
    }

    this.emit('metric:recorded', { name, value, labels });

    // Check alerts
    this.checkAlerts(name, value, labels);
  }

  /**
   * Get metric
   */
  getMetric(name: string, options?: MetricQueryOptions): Metric | undefined {
    const metric = this.metrics.get(name);
    if (!metric) {
      return undefined;
    }

    let values = metric.values;

    // Apply time filter
    if (options?.startTime) {
      values = values.filter((v) => v.timestamp >= options.startTime!);
    }
    if (options?.endTime) {
      values = values.filter((v) => v.timestamp <= options.endTime!);
    }

    // Apply label filter
    if (options?.labels) {
      values = values.filter((v) => {
        if (!v.labels) return false;
        return Object.entries(options.labels!).every(
          ([key, value]) => v.labels![key] === value,
        );
      });
    }

    // Apply limit
    if (options?.limit) {
      values = values.slice(-options.limit);
    }

    // Compute aggregations
    const aggregations = this.computeAggregations(values);

    return {
      ...metric,
      values,
      aggregations,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(options?: MetricQueryOptions): Metric[] {
    const metrics: Metric[] = [];

    for (const [name] of this.metrics) {
      const metric = this.getMetric(name, options);
      if (metric) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  /**
   * Get metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get time series data
   */
  getTimeSeries(
    name: string,
    options?: MetricQueryOptions,
  ): TimeSeriesPoint[] {
    const metric = this.getMetric(name, options);
    if (!metric) {
      return [];
    }

    return metric.values.map((v) => ({
      timestamp: v.timestamp,
      value: v.value,
      labels: v.labels,
    }));
  }

  /**
   * Compute aggregations for values
   */
  private computeAggregations(values: MetricValue[]): MetricAggregations {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
      };
    }

    const numValues = values.map((v) => v.value);
    const sum = numValues.reduce((a, b) => a + b, 0);
    const min = Math.min(...numValues);
    const max = Math.max(...numValues);
    const avg = sum / numValues.length;

    const aggregations: MetricAggregations = {
      count: numValues.length,
      sum,
      min,
      max,
      avg,
    };

    // Compute percentiles if enabled
    if (this.options.computePercentiles) {
      const sorted = [...numValues].sort((a, b) => a - b);
      aggregations.p50 = this.percentile(sorted, 50);
      aggregations.p95 = this.percentile(sorted, 95);
      aggregations.p99 = this.percentile(sorted, 99);
    }

    // Compute standard deviation
    const variance =
      numValues.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
      numValues.length;
    aggregations.stddev = Math.sqrt(variance);

    return aggregations;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Add alert
   */
  addAlert(config: AlertConfig): void {
    this.alerts.set(config.name, config);
    this.alertStates.set(config.name, {});
    this.emit('alert:added', config);
  }

  /**
   * Remove alert
   */
  removeAlert(name: string): void {
    this.alerts.delete(name);
    this.alertStates.delete(name);
    this.emit('alert:removed', { name });
  }

  /**
   * Get all alerts
   */
  getAlerts(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Enable/disable alert
   */
  setAlertEnabled(name: string, enabled: boolean): void {
    const alert = this.alerts.get(name);
    if (alert) {
      alert.enabled = enabled;
      this.emit('alert:updated', alert);
    }
  }

  /**
   * Check alerts for metric
   */
  private checkAlerts(
    metricName: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    for (const [name, alert] of this.alerts) {
      if (!alert.enabled || alert.metricName !== metricName) {
        continue;
      }

      // Check label match
      if (alert.labels) {
        if (!labels) continue;
        const match = Object.entries(alert.labels).every(
          ([key, val]) => labels[key] === val,
        );
        if (!match) continue;
      }

      // Check condition
      const triggered = this.checkCondition(value, alert.condition, alert.threshold);

      const state = this.alertStates.get(name)!;

      if (triggered) {
        if (!state.triggeredAt) {
          state.triggeredAt = Date.now();
          state.lastValue = value;

          // Fire alert if duration is met (or no duration specified)
          if (!alert.duration || Date.now() - state.triggeredAt >= alert.duration) {
            this.fireAlert(alert, metricName, value);
          }
        } else if (alert.duration && Date.now() - state.triggeredAt >= alert.duration) {
          // Alert already triggered and duration met
          this.fireAlert(alert, metricName, value);
        }
      } else {
        // Reset state if condition no longer met
        state.triggeredAt = undefined;
        state.lastValue = undefined;
      }
    }
  }

  /**
   * Check alert condition
   */
  private checkCondition(
    value: number,
    condition: AlertConfig['condition'],
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  /**
   * Fire alert
   */
  private fireAlert(alert: AlertConfig, metricName: string, value: number): void {
    const metric = this.metrics.get(metricName);
    if (!metric) return;

    const alertEvent: AlertEvent = {
      alert,
      metric,
      value,
      timestamp: Date.now(),
      message: `Alert '${alert.name}': ${metricName} ${alert.condition} ${alert.threshold} (current: ${value})`,
    };

    this.emit('alert:triggered', alertEvent);
  }

  /**
   * Export metrics in various formats
   */
  export(format: 'json' | 'prometheus' | 'csv'): string {
    switch (format) {
      case 'json':
        return this.exportJSON();
      case 'prometheus':
        return this.exportPrometheus();
      case 'csv':
        return this.exportCSV();
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  /**
   * Export as JSON
   */
  private exportJSON(): string {
    const metrics = this.getAllMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Export in Prometheus format
   */
  private exportPrometheus(): string {
    let output = '';

    for (const metric of this.metrics.values()) {
      // Help text
      if (metric.description) {
        output += `# HELP ${metric.name} ${metric.description}\n`;
      }

      // Type
      output += `# TYPE ${metric.name} ${metric.type}\n`;

      // Values
      for (const value of metric.values) {
        const labels = value.labels
          ? Object.entries(value.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';

        output += `${metric.name}${labels ? `{${labels}}` : ''} ${value.value} ${value.timestamp}\n`;
      }

      output += '\n';
    }

    return output;
  }

  /**
   * Export as CSV
   */
  private exportCSV(): string {
    let csv = 'metric,type,value,timestamp,labels\n';

    for (const metric of this.metrics.values()) {
      for (const value of metric.values) {
        const labels = value.labels ? JSON.stringify(value.labels) : '';
        csv += `${metric.name},${metric.type},${value.value},${value.timestamp},"${labels}"\n`;
      }
    }

    return csv;
  }

  /**
   * Reset metric
   */
  resetMetric(name: string): void {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.values = [];
      this.emit('metric:reset', { name });
    }
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    for (const [name] of this.metrics) {
      this.resetMetric(name);
    }
    this.emit('metrics:reset');
  }

  /**
   * Delete metric
   */
  deleteMetric(name: string): void {
    this.metrics.delete(name);
    this.emit('metric:deleted', { name });
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.retentionPeriod / 2);
  }

  /**
   * Flush metrics (compute aggregations and emit)
   */
  flush(): void {
    const metrics = this.getAllMetrics();
    this.emit('metrics:flush', metrics);
  }

  /**
   * Clean up old metric values
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.options.retentionPeriod;
    let removedCount = 0;

    for (const metric of this.metrics.values()) {
      const before = metric.values.length;
      metric.values = metric.values.filter((v) => v.timestamp >= cutoff);
      removedCount += before - metric.values.length;
    }

    if (removedCount > 0) {
      this.emit('metrics:cleanup', { removed: removedCount });
    }
  }

  /**
   * Get statistics about collector
   */
  getStatistics(): {
    metricCount: number;
    totalValues: number;
    memoryUsage: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    let totalValues = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const metric of this.metrics.values()) {
      totalValues += metric.values.length;

      for (const value of metric.values) {
        if (value.timestamp < oldestTimestamp) {
          oldestTimestamp = value.timestamp;
        }
        if (value.timestamp > newestTimestamp) {
          newestTimestamp = value.timestamp;
        }
      }
    }

    // Rough memory estimate
    const memoryUsage = totalValues * 32; // Approximate bytes per value

    return {
      metricCount: this.metrics.size,
      totalValues,
      memoryUsage,
      oldestTimestamp,
      newestTimestamp,
    };
  }

  /**
   * Shutdown collector
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.flush();
    this.emit('shutdown');
    this.removeAllListeners();
  }
}

/**
 * Create metrics collector
 *
 * @param options - Metrics collector options
 * @returns Metrics collector instance
 */
export function createMetricsCollector(
  options?: MetricsCollectorOptions,
): MetricsCollector {
  return new MetricsCollector(options);
}
