import { Duration, Effect, HashMap, Ref } from "effect";
import {
    BenchmarkConfig,
    BenchmarkResult,
    CPUMetrics,
    DashboardData,
    MemoryMetrics,
    OperationTiming,
    PerformanceAlert,
    PerformanceMetric,
    PerformanceMonitoringServiceApi,
    PerformanceThreshold,
    ServiceMetrics
} from "./types.js";

interface MetricsState {
    readonly metrics: ReadonlyArray<PerformanceMetric>;
    readonly timings: ReadonlyArray<OperationTiming>;
    readonly thresholds: ReadonlyArray<PerformanceThreshold>;
    readonly alerts: ReadonlyArray<PerformanceAlert>;
}

/**
 * Performance monitoring service implementation
 */
export class PerformanceMonitoringService extends Effect.Service<PerformanceMonitoringServiceApi>()("PerformanceMonitoringService", {
    effect: Effect.gen(function* () {
        // Internal state management
        const state = yield* Ref.make<MetricsState>({
            metrics: [],
            timings: [],
            thresholds: [],
            alerts: []
        });

        // Helper function to calculate percentiles
        const calculatePercentile = (values: ReadonlyArray<number>, percentile: number): number => {
            if (values.length === 0) return 0;
            const sorted = [...values].sort((a, b) => a - b);
            const index = Math.ceil((percentile / 100) * sorted.length) - 1;
            return sorted[Math.max(0, index)];
        };

        // Helper function to get system memory metrics
        const getMemoryMetrics = (): MemoryMetrics => {
            const memUsage = process.memoryUsage();
            return {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss,
                heapUsedPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
                timestamp: Date.now()
            };
        };

        // Helper function to get system CPU metrics
        const getCPUMetrics = (): CPUMetrics => {
            const cpuUsage = process.cpuUsage();
            const total = cpuUsage.user + cpuUsage.system;
            return {
                user: cpuUsage.user,
                system: cpuUsage.system,
                total,
                percent: 0, // Would need multiple samples to calculate percentage
                timestamp: Date.now()
            };
        };

        // Helper function to generate alert ID
        const generateAlertId = (): string => {
            return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        };

        // Helper function to check thresholds and generate alerts
        const checkThresholds = (metric: PerformanceMetric) =>
            Effect.gen(function* () {
                const currentState = yield* Ref.get(state);
                const relevantThresholds = currentState.thresholds.filter(
                    t => t.enabled && t.metricName === metric.name
                );

                const newAlerts: PerformanceAlert[] = [];

                for (const threshold of relevantThresholds) {
                    // Check if value exceeds thresholds
                    if (metric.value >= threshold.criticalThreshold) {
                        newAlerts.push({
                            id: generateAlertId(),
                            metricName: metric.name,
                            currentValue: metric.value,
                            threshold: threshold.criticalThreshold,
                            severity: "CRITICAL",
                            message: `Metric '${metric.name}' exceeded critical threshold: ${metric.value} >= ${threshold.criticalThreshold}`,
                            timestamp: Date.now(),
                            resolved: false
                        });
                    } else if (metric.value >= threshold.warningThreshold) {
                        newAlerts.push({
                            id: generateAlertId(),
                            metricName: metric.name,
                            currentValue: metric.value,
                            threshold: threshold.warningThreshold,
                            severity: "WARNING",
                            message: `Metric '${metric.name}' exceeded warning threshold: ${metric.value} >= ${threshold.warningThreshold}`,
                            timestamp: Date.now(),
                            resolved: false
                        });
                    }
                }

                if (newAlerts.length > 0) {
                    yield* Ref.update(state, s => ({
                        ...s,
                        alerts: [...s.alerts, ...newAlerts]
                    }));
                }
            });

        // Helper function to clean old metrics (retention policy)
        const cleanOldMetrics = (retentionMs: number) =>
            Effect.gen(function* () {
                const now = Date.now();
                const cutoff = now - retentionMs;

                yield* Ref.update(state, s => ({
                    ...s,
                    metrics: s.metrics.filter(m => m.timestamp >= cutoff),
                    timings: s.timings.filter(t => t.startTime >= cutoff)
                }));
            });

        // Start background cleanup task
        yield* Effect.fork(
            Effect.gen(function* () {
                while (true) {
                    yield* Effect.sleep(Duration.minutes(5));
                    yield* cleanOldMetrics(Duration.toMillis(Duration.hours(24))); // 24 hour retention
                }
            })
        );

        return {
            recordMetric: (metric: PerformanceMetric) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => ({
                        ...s,
                        metrics: [...s.metrics, metric]
                    }));

                    // Check thresholds for this metric
                    yield* checkThresholds(metric);
                }),

            recordTiming: (operationName: string, duration: number, success: boolean, metadata = {}) =>
                Effect.gen(function* () {
                    const timing: OperationTiming = {
                        operationName,
                        startTime: Date.now() - duration,
                        endTime: Date.now(),
                        duration,
                        success,
                        errorType: success ? undefined : "unknown",
                        metadata
                    };

                    yield* Ref.update(state, s => ({
                        ...s,
                        timings: [...s.timings, timing]
                    }));

                    // Record as a metric as well
                    const metric: PerformanceMetric = {
                        name: `operation.${operationName}.duration`,
                        type: "TIMER",
                        value: duration,
                        unit: "MILLISECONDS",
                        tags: {
                            operation: operationName,
                            success: success.toString(),
                            ...Object.entries(metadata).reduce((acc, [k, v]) => ({
                                ...acc,
                                [k]: String(v)
                            }), {})
                        },
                        timestamp: Date.now(),
                        description: `Operation timing for ${operationName}`
                    };

                    yield* Ref.update(state, s => ({
                        ...s,
                        metrics: [...s.metrics, metric]
                    }));

                    yield* checkThresholds(metric);
                }),

            startTimer: (operationName: string, metadata = {}) =>
                Effect.gen(function* () {
                    const startTime = Date.now();

                    return () =>
                        Effect.gen(function* () {
                            const endTime = Date.now();
                            const duration = endTime - startTime;

                            yield* Ref.update(state, s => ({
                                ...s,
                                timings: [...s.timings, {
                                    operationName,
                                    startTime,
                                    endTime,
                                    duration,
                                    success: true,
                                    metadata
                                }]
                            }));
                        });
                }),

            withTiming: <A, E, R>(
                operationName: string,
                operation: Effect.Effect<A, E, R>,
                metadata = {}
            ) =>
                Effect.gen(function* () {
                    const startTime = Date.now();
                    const result = yield* Effect.either(operation);
                    const endTime = Date.now();
                    const duration = endTime - startTime;

                    const timing: OperationTiming = {
                        operationName,
                        startTime,
                        endTime,
                        duration,
                        success: result._tag === "Right",
                        errorType: result._tag === "Left" ? (result.left as any)?.constructor?.name : undefined,
                        metadata
                    };

                    yield* Ref.update(state, s => ({
                        ...s,
                        timings: [...s.timings, timing]
                    }));

                    // Record performance metric
                    const metric: PerformanceMetric = {
                        name: `operation.${operationName}.duration`,
                        type: "TIMER",
                        value: duration,
                        unit: "MILLISECONDS",
                        tags: {
                            operation: operationName,
                            success: (result._tag === "Right").toString(),
                            ...Object.entries(metadata).reduce((acc, [k, v]) => ({
                                ...acc,
                                [k]: String(v)
                            }), {})
                        },
                        timestamp: Date.now(),
                        description: `Operation timing for ${operationName}`
                    };

                    yield* Ref.update(state, s => ({
                        ...s,
                        metrics: [...s.metrics, metric]
                    }));

                    yield* checkThresholds(metric);

                    if (result._tag === "Right") {
                        return result.right;
                    } else {
                        return yield* Effect.fail(result.left);
                    }
                }),

            getSystemMetrics: () =>
                Effect.succeed({
                    memory: getMemoryMetrics(),
                    cpu: getCPUMetrics()
                }),

            getServiceMetrics: (serviceName?: string) =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    const timings = serviceName
                        ? currentState.timings.filter(t => t.operationName.startsWith(serviceName))
                        : currentState.timings;

                    // Group by service and operation
                    const serviceGroups = HashMap.empty<string, OperationTiming[]>();

                    for (const timing of timings) {
                        const parts = timing.operationName.split('.');
                        const service = parts[0] || 'unknown';
                        const operation = parts.slice(1).join('.') || timing.operationName;
                        const key = `${service}.${operation}`;

                        const existing = HashMap.get(serviceGroups, key) || [];
                        HashMap.set(serviceGroups, key, [...existing, timing]);
                    }

                    const serviceMetrics: ServiceMetrics[] = [];

                    for (const [key, groupTimings] of HashMap.entries(serviceGroups)) {
                        const [serviceName, operationName] = key.split('.', 2);
                        const durations = groupTimings.map(t => t.duration);
                        const successCount = groupTimings.filter(t => t.success).length;
                        const errorCount = groupTimings.length - successCount;

                        if (durations.length > 0) {
                            serviceMetrics.push({
                                serviceName,
                                operationName,
                                requestCount: groupTimings.length,
                                errorCount,
                                averageLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
                                p95Latency: calculatePercentile(durations, 95),
                                p99Latency: calculatePercentile(durations, 99),
                                minLatency: Math.min(...durations),
                                maxLatency: Math.max(...durations),
                                throughput: groupTimings.length / (Math.max(...groupTimings.map(t => t.endTime)) - Math.min(...groupTimings.map(t => t.startTime))) * 1000,
                                errorRate: (errorCount / groupTimings.length) * 100,
                                timestamp: Date.now()
                            });
                        }
                    }

                    return serviceMetrics;
                }),

            getDashboardData: () =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    const systemMetrics = {
                        memory: getMemoryMetrics(),
                        cpu: getCPUMetrics()
                    };

                    const serviceMetrics = yield* Effect.succeed([]);

                    // Get recent alerts (last 24 hours)
                    const twentyFourHoursAgo = Date.now() - Duration.toMillis(Duration.hours(24));
                    const recentAlerts = currentState.alerts.filter(a => a.timestamp >= twentyFourHoursAgo);

                    // Get top slow operations
                    const timingsByOperation = HashMap.empty<string, number[]>();
                    for (const timing of currentState.timings) {
                        const existing = HashMap.get(timingsByOperation, timing.operationName) || [];
                        HashMap.set(timingsByOperation, timing.operationName, [...existing, timing.duration]);
                    }

                    const topSlowOperations = Array.from(HashMap.entries(timingsByOperation))
                        .map(([operationName, durations]) => ({
                            operationName,
                            averageLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
                            requestCount: durations.length
                        }))
                        .sort((a, b) => b.averageLatency - a.averageLatency)
                        .slice(0, 10);

                    // Calculate error rates by service
                    const errorRatesByService = Array.from(HashMap.entries(timingsByOperation))
                        .map(([operationName, durations]) => {
                            const serviceName = operationName.split('.')[0];
                            const serviceTimings = currentState.timings.filter(t => t.operationName.startsWith(serviceName));
                            const errorCount = serviceTimings.filter(t => !t.success).length;
                            return {
                                serviceName,
                                errorRate: serviceTimings.length > 0 ? (errorCount / serviceTimings.length) * 100 : 0,
                                requestCount: serviceTimings.length
                            };
                        })
                        .filter((v, i, arr) => arr.findIndex(x => x.serviceName === v.serviceName) === i) // Deduplicate
                        .sort((a, b) => b.errorRate - a.errorRate)
                        .slice(0, 10);

                    const dashboardData: DashboardData = {
                        timestamp: Date.now(),
                        systemMetrics,
                        serviceMetrics: [],
                        recentAlerts,
                        topSlowOperations,
                        errorRateByService: errorRatesByService
                    };

                    return dashboardData;
                }),

            runBenchmark: <A, E, R>(
                config: BenchmarkConfig,
                operation: Effect.Effect<A, E, R>
            ) =>
                Effect.gen(function* () {
                    const startTime = Date.now();
                    const results: { duration: number; success: boolean }[] = [];

                    // Warmup iterations
                    for (let i = 0; i < config.warmupIterations; i++) {
                        yield* Effect.either(operation.pipe(Effect.timeout(config.timeout)));
                    }

                    const memoryBefore = getMemoryMetrics();
                    const cpuBefore = getCPUMetrics();

                    // Actual benchmark iterations
                    const concurrentBatches = Math.ceil(config.iterations / config.concurrency);

                    for (let batch = 0; batch < concurrentBatches; batch++) {
                        const batchSize = Math.min(config.concurrency, config.iterations - (batch * config.concurrency));
                        const batchOperations = Array.from({ length: batchSize }, () =>
                            Effect.gen(function* () {
                                const opStartTime = Date.now();
                                const result = yield* Effect.either(operation.pipe(Effect.timeout(config.timeout)));
                                const duration = Date.now() - opStartTime;
                                return { duration, success: result._tag === "Right" };
                            })
                        );

                        const batchResults = yield* Effect.all(batchOperations, { concurrency: config.concurrency });
                        results.push(...batchResults);
                    }

                    const endTime = Date.now();
                    const memoryAfter = getMemoryMetrics();
                    const cpuAfter = getCPUMetrics();

                    const durations = results.map(r => r.duration);
                    const successfulResults = results.filter(r => r.success);
                    const failedResults = results.filter(r => !r.success);

                    const benchmarkResult: BenchmarkResult = {
                        name: config.name,
                        totalIterations: results.length,
                        successfulIterations: successfulResults.length,
                        failedIterations: failedResults.length,
                        averageLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
                        medianLatency: calculatePercentile(durations, 50),
                        p95Latency: calculatePercentile(durations, 95),
                        p99Latency: calculatePercentile(durations, 99),
                        minLatency: Math.min(...durations),
                        maxLatency: Math.max(...durations),
                        throughput: results.length / ((endTime - startTime) / 1000),
                        errorRate: (failedResults.length / results.length) * 100,
                        startTime,
                        endTime,
                        duration: endTime - startTime,
                        memoryUsage: {
                            heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
                            heapTotal: memoryAfter.heapTotal,
                            external: memoryAfter.external - memoryBefore.external,
                            rss: memoryAfter.rss - memoryBefore.rss,
                            heapUsedPercent: memoryAfter.heapUsedPercent,
                            timestamp: endTime
                        },
                        cpuUsage: {
                            user: cpuAfter.user - cpuBefore.user,
                            system: cpuAfter.system - cpuBefore.system,
                            total: cpuAfter.total - cpuBefore.total,
                            percent: 0,
                            timestamp: endTime
                        }
                    };

                    return benchmarkResult;
                }),

            getMetricHistory: (metricName: string, timeRange: Duration.Duration) =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    const cutoff = Date.now() - Duration.toMillis(timeRange);

                    return currentState.metrics.filter(m =>
                        m.name === metricName && m.timestamp >= cutoff
                    );
                }),

            setThreshold: (threshold: PerformanceThreshold) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => ({
                        ...s,
                        thresholds: [...s.thresholds.filter(t => t.metricName !== threshold.metricName), threshold]
                    }));
                }),

            getAlerts: (includeResolved = false) =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    return includeResolved
                        ? currentState.alerts
                        : currentState.alerts.filter(a => !a.resolved);
                }),

            resolveAlert: (alertId: string) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => ({
                        ...s,
                        alerts: s.alerts.map(a =>
                            a.id === alertId ? { ...a, resolved: true } : a
                        )
                    }));
                }),

            exportMetrics: (format: "JSON" | "CSV" | "PROMETHEUS") =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);

                    switch (format) {
                        case "JSON":
                            return JSON.stringify({
                                metrics: currentState.metrics,
                                timings: currentState.timings,
                                alerts: currentState.alerts,
                                exportTime: Date.now()
                            }, null, 2);

                        case "CSV":
                            const csvLines = [
                                "timestamp,name,type,value,unit,tags",
                                ...currentState.metrics.map(m =>
                                    `${m.timestamp},"${m.name}","${m.type}",${m.value},"${m.unit || ''}","${JSON.stringify(m.tags).replace(/"/g, '""')}"`
                                )
                            ];
                            return csvLines.join('\n');

                        case "PROMETHEUS":
                            const prometheusLines: string[] = [];
                            for (const metric of currentState.metrics) {
                                const labels = Object.entries(metric.tags)
                                    .map(([k, v]) => `${k}="${v}"`)
                                    .join(',');
                                prometheusLines.push(`${metric.name.replace(/[.-]/g, '_')}{${labels}} ${metric.value} ${metric.timestamp}`);
                            }
                            return prometheusLines.join('\n');

                        default:
                            return "Unsupported format";
                    }
                })
        };
    }),
    dependencies: []
}) { } 