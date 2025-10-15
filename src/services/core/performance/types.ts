import type { Duration, Effect } from "effect";

/**
 * Performance metric types
 */
export type MetricType = "COUNTER" | "GAUGE" | "HISTOGRAM" | "TIMER";

/**
 * Time unit for metrics
 */
export type TimeUnit = "NANOSECONDS" | "MICROSECONDS" | "MILLISECONDS" | "SECONDS";

/**
 * Performance metric data
 */
export interface PerformanceMetric {
    readonly name: string;
    readonly type: MetricType;
    readonly value: number;
    readonly unit?: TimeUnit;
    readonly tags: Record<string, string>;
    readonly timestamp: number;
    readonly description?: string;
}

/**
 * Memory usage metrics
 */
export interface MemoryMetrics {
    readonly heapUsed: number;
    readonly heapTotal: number;
    readonly external: number;
    readonly rss: number;
    readonly heapUsedPercent: number;
    readonly timestamp: number;
}

/**
 * CPU usage metrics
 */
export interface CPUMetrics {
    readonly user: number;
    readonly system: number;
    readonly total: number;
    readonly percent: number;
    readonly timestamp: number;
}

/**
 * Service performance metrics
 */
export interface ServiceMetrics {
    readonly serviceName: string;
    readonly operationName: string;
    readonly requestCount: number;
    readonly errorCount: number;
    readonly averageLatency: number;
    readonly p95Latency: number;
    readonly p99Latency: number;
    readonly minLatency: number;
    readonly maxLatency: number;
    readonly throughput: number; // requests per second
    readonly errorRate: number; // percentage
    readonly timestamp: number;
}

/**
 * Operation timing data
 */
export interface OperationTiming {
    readonly operationName: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly duration: number;
    readonly success: boolean;
    readonly errorType?: string;
    readonly metadata: Record<string, unknown>;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
    readonly metricName: string;
    readonly warningThreshold: number;
    readonly criticalThreshold: number;
    readonly unit: TimeUnit;
    readonly enabled: boolean;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
    readonly id: string;
    readonly metricName: string;
    readonly currentValue: number;
    readonly threshold: number;
    readonly severity: "WARNING" | "CRITICAL";
    readonly message: string;
    readonly timestamp: number;
    readonly resolved: boolean;
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
    readonly name: string;
    readonly description: string;
    readonly iterations: number;
    readonly warmupIterations: number;
    readonly concurrency: number;
    readonly timeout: Duration.Duration;
    readonly tags: Record<string, string>;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
    readonly name: string;
    readonly totalIterations: number;
    readonly successfulIterations: number;
    readonly failedIterations: number;
    readonly averageLatency: number;
    readonly medianLatency: number;
    readonly p95Latency: number;
    readonly p99Latency: number;
    readonly minLatency: number;
    readonly maxLatency: number;
    readonly throughput: number;
    readonly errorRate: number;
    readonly startTime: number;
    readonly endTime: number;
    readonly duration: number;
    readonly memoryUsage: MemoryMetrics;
    readonly cpuUsage: CPUMetrics;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
    readonly refreshInterval: Duration.Duration;
    readonly metricsRetention: Duration.Duration;
    readonly alertingEnabled: boolean;
    readonly thresholds: ReadonlyArray<PerformanceThreshold>;
}

/**
 * Dashboard data
 */
export interface DashboardData {
    readonly timestamp: number;
    readonly systemMetrics: {
        readonly memory: MemoryMetrics;
        readonly cpu: CPUMetrics;
    };
    readonly serviceMetrics: ReadonlyArray<ServiceMetrics>;
    readonly recentAlerts: ReadonlyArray<PerformanceAlert>;
    readonly topSlowOperations: ReadonlyArray<{
        readonly operationName: string;
        readonly averageLatency: number;
        readonly requestCount: number;
    }>;
    readonly errorRateByService: ReadonlyArray<{
        readonly serviceName: string;
        readonly errorRate: number;
        readonly requestCount: number;
    }>;
}

/**
 * Performance monitoring service interface
 */
export interface PerformanceMonitoringServiceApi {
    readonly recordMetric: (metric: PerformanceMetric) => Effect.Effect<void, never, never>;

    readonly recordTiming: (operationName: string, duration: number, success: boolean, metadata?: Record<string, unknown>) => Effect.Effect<void, never, never>;

    readonly startTimer: (operationName: string, metadata?: Record<string, unknown>) => Effect.Effect<() => Effect.Effect<void, never, never>, never, never>;

    readonly withTiming: <A, E, R>(
        operationName: string,
        operation: Effect.Effect<A, E, R>,
        metadata?: Record<string, unknown>
    ) => Effect.Effect<A, E, R>;

    readonly getSystemMetrics: () => Effect.Effect<{ memory: MemoryMetrics; cpu: CPUMetrics }, never, never>;

    readonly getServiceMetrics: (serviceName?: string) => Effect.Effect<ReadonlyArray<ServiceMetrics>, never, never>;

    readonly getDashboardData: () => Effect.Effect<DashboardData, never, never>;

    readonly runBenchmark: <A, E, R>(
        config: BenchmarkConfig,
        operation: Effect.Effect<A, E, R>
    ) => Effect.Effect<BenchmarkResult, never, R>;

    readonly getMetricHistory: (
        metricName: string,
        timeRange: Duration.Duration
    ) => Effect.Effect<ReadonlyArray<PerformanceMetric>, never, never>;

    readonly setThreshold: (threshold: PerformanceThreshold) => Effect.Effect<void, never, never>;

    readonly getAlerts: (includeResolved?: boolean) => Effect.Effect<ReadonlyArray<PerformanceAlert>, never, never>;

    readonly resolveAlert: (alertId: string) => Effect.Effect<void, never, never>;

    readonly exportMetrics: (format: "JSON" | "CSV" | "PROMETHEUS") => Effect.Effect<string, never, never>;
}

/**
 * Metric aggregation period
 */
export type AggregationPeriod = "1m" | "5m" | "15m" | "1h" | "1d";

/**
 * Aggregated metric data
 */
export interface AggregatedMetric {
    readonly name: string;
    readonly period: AggregationPeriod;
    readonly startTime: number;
    readonly endTime: number;
    readonly count: number;
    readonly sum: number;
    readonly min: number;
    readonly max: number;
    readonly average: number;
    readonly p50: number;
    readonly p95: number;
    readonly p99: number;
}

/**
 * Performance profiler data
 */
export interface ProfilerData {
    readonly operationName: string;
    readonly callStack: ReadonlyArray<{
        readonly function: string;
        readonly file: string;
        readonly line: number;
        readonly duration: number;
    }>;
    readonly memoryAllocation: number;
    readonly cpuTime: number;
    readonly wallTime: number;
} 