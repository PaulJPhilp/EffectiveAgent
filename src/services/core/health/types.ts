import type { Duration, Effect } from "effect";
import type { EffectiveError } from "@/errors.js";

/**
 * Health check status
 */
export type HealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";

/**
 * Health check severity
 */
export type HealthCheckSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Service capability status
 */
export interface ServiceCapability {
    readonly name: string;
    readonly enabled: boolean;
    readonly status: HealthStatus;
    readonly lastChecked: number;
    readonly details?: Record<string, unknown>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
    readonly checkName: string;
    readonly status: HealthStatus;
    readonly message: string;
    readonly duration: number;
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;
    readonly error?: EffectiveError;
}

/**
 * Service health report
 */
export interface ServiceHealthReport {
    readonly serviceName: string;
    readonly overallStatus: HealthStatus;
    readonly version?: string;
    readonly uptime: number;
    readonly capabilities: ReadonlyArray<ServiceCapability>;
    readonly checks: ReadonlyArray<HealthCheckResult>;
    readonly dependencies: ReadonlyArray<{
        readonly serviceName: string;
        readonly status: HealthStatus;
        readonly required: boolean;
    }>;
    readonly metrics: {
        readonly requestCount: number;
        readonly errorCount: number;
        readonly averageResponseTime: number;
        readonly lastActivity: number;
    };
    readonly timestamp: number;
}

/**
 * System health report
 */
export interface SystemHealthReport {
    readonly overallStatus: HealthStatus;
    readonly services: ReadonlyArray<ServiceHealthReport>;
    readonly systemInfo: {
        readonly nodeVersion: string;
        readonly platform: string;
        readonly arch: string;
        readonly memory: {
            readonly total: number;
            readonly used: number;
            readonly available: number;
        };
        readonly cpu: {
            readonly cores: number;
            readonly load: ReadonlyArray<number>;
        };
        readonly uptime: number;
    };
    readonly timestamp: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
    readonly name: string;
    readonly description: string;
    readonly severity: HealthCheckSeverity;
    readonly interval: Duration.Duration;
    readonly timeout: Duration.Duration;
    readonly retries: number;
    readonly enabled: boolean;
    readonly dependencies: ReadonlyArray<string>;
    readonly tags: Record<string, string>;
}

/**
 * Degradation strategy
 */
export interface DegradationStrategy {
    readonly name: string;
    readonly description: string;
    readonly triggers: ReadonlyArray<{
        readonly condition: "SERVICE_UNHEALTHY" | "DEPENDENCY_UNAVAILABLE" | "HIGH_ERROR_RATE" | "HIGH_LATENCY";
        readonly threshold?: number;
        readonly duration?: Duration.Duration;
    }>;
    readonly actions: ReadonlyArray<{
        readonly type: "DISABLE_FEATURE" | "USE_CACHE" | "REDUCE_CONCURRENCY" | "FALLBACK_SERVICE";
        readonly parameters: Record<string, unknown>;
    }>;
    readonly priority: number;
    readonly autoRecover: boolean;
}

/**
 * Health alert
 */
export interface HealthAlert {
    readonly id: string;
    readonly serviceName: string;
    readonly checkName: string;
    readonly severity: HealthCheckSeverity;
    readonly status: HealthStatus;
    readonly message: string;
    readonly firstOccurrence: number;
    readonly lastOccurrence: number;
    readonly count: number;
    readonly resolved: boolean;
    readonly resolvedAt?: number;
    readonly tags: Record<string, string>;
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitoringConfig {
    readonly globalInterval: Duration.Duration;
    readonly alertingEnabled: boolean;
    readonly degradationEnabled: boolean;
    readonly retentionPeriod: Duration.Duration;
    readonly alertThresholds: {
        readonly errorRate: number;
        readonly responseTime: number;
        readonly consecutiveFailures: number;
    };
}

/**
 * Service health monitoring interface
 */
export interface ServiceHealthMonitoringApi {
    readonly registerHealthCheck: (
        serviceName: string,
        checkName: string,
        check: Effect.Effect<HealthCheckResult, EffectiveError, any>
    ) => Effect.Effect<void, never, never>;

    readonly runHealthCheck: (
        serviceName: string,
        checkName: string
    ) => Effect.Effect<HealthCheckResult, EffectiveError, never>;

    readonly getServiceHealth: (serviceName: string) => Effect.Effect<ServiceHealthReport | undefined, never, never>;

    readonly getSystemHealth: () => Effect.Effect<SystemHealthReport, never, never>;

    readonly enableDegradationStrategy: (
        serviceName: string,
        strategy: DegradationStrategy
    ) => Effect.Effect<void, never, never>;

    readonly checkDegradationTriggers: (serviceName: string) => Effect.Effect<void, never, never>;

    readonly getHealthAlerts: (
        serviceName?: string,
        includeResolved?: boolean
    ) => Effect.Effect<ReadonlyArray<HealthAlert>, never, never>;

    readonly resolveAlert: (alertId: string) => Effect.Effect<void, never, never>;

    readonly updateServiceCapability: (
        serviceName: string,
        capability: ServiceCapability
    ) => Effect.Effect<void, never, never>;

    readonly recordServiceActivity: (
        serviceName: string,
        success: boolean,
        responseTime: number
    ) => Effect.Effect<void, never, never>;

    readonly setServiceDependency: (
        serviceName: string,
        dependencyName: string,
        required: boolean
    ) => Effect.Effect<void, never, never>;

    readonly startHealthMonitoring: (config: HealthMonitoringConfig) => Effect.Effect<void, never, never>;

    readonly stopHealthMonitoring: () => Effect.Effect<void, never, never>;

    readonly getHealthMetrics: (
        serviceName?: string,
        timeRange?: Duration.Duration
    ) => Effect.Effect<ReadonlyArray<{
        readonly timestamp: number;
        readonly serviceName: string;
        readonly status: HealthStatus;
        readonly responseTime: number;
        readonly errorCount: number;
    }>, never, never>;
}

/**
 * Health check function type
 */
export type HealthCheckFunction = Effect.Effect<HealthCheckResult, EffectiveError, any>;

/**
 * Service activity metrics
 */
export interface ServiceActivityMetrics {
    readonly serviceName: string;
    readonly requestCount: number;
    readonly errorCount: number;
    readonly totalResponseTime: number;
    readonly lastActivity: number;
    readonly uptime: number;
    readonly startTime: number;
}

/**
 * Health trend data
 */
export interface HealthTrendData {
    readonly serviceName: string;
    readonly timeWindow: Duration.Duration;
    readonly dataPoints: ReadonlyArray<{
        readonly timestamp: number;
        readonly status: HealthStatus;
        readonly responseTime: number;
        readonly errorRate: number;
    }>;
    readonly trends: {
        readonly statusTrend: "IMPROVING" | "STABLE" | "DEGRADING";
        readonly responseTrend: "IMPROVING" | "STABLE" | "DEGRADING";
        readonly errorTrend: "IMPROVING" | "STABLE" | "DEGRADING";
    };
}

/**
 * Health monitoring dashboard data
 */
export interface HealthDashboardData {
    readonly timestamp: number;
    readonly systemStatus: HealthStatus;
    readonly servicesSummary: {
        readonly healthy: number;
        readonly degraded: number;
        readonly unhealthy: number;
        readonly unknown: number;
    };
    readonly criticalAlerts: ReadonlyArray<HealthAlert>;
    readonly slowestServices: ReadonlyArray<{
        readonly serviceName: string;
        readonly averageResponseTime: number;
        readonly status: HealthStatus;
    }>;
    readonly errorRatesByService: ReadonlyArray<{
        readonly serviceName: string;
        readonly errorRate: number;
        readonly status: HealthStatus;
    }>;
    readonly degradationStrategiesActive: ReadonlyArray<{
        readonly serviceName: string;
        readonly strategyName: string;
        readonly activatedAt: number;
    }>;
}

/**
 * Circuit breaker integration for health monitoring
 */
export interface HealthCircuitBreakerConfig {
    readonly serviceName: string;
    readonly failureThreshold: number;
    readonly recoveryTime: Duration.Duration;
    readonly degradationThreshold: number;
} 