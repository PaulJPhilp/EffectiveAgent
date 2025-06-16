import { cpus, freemem, loadavg, totalmem, uptime } from "os";
import { EffectiveError } from "@/errors.js";
import { Duration, Effect, HashMap, Option, Ref } from "effect";
import {
    DegradationStrategy,
    HealthAlert,
    HealthCheckFunction,
    HealthCheckResult,
    HealthMonitoringConfig,
    HealthStatus,
    ServiceActivityMetrics,
    ServiceCapability,
    ServiceHealthMonitoringApi,
    ServiceHealthReport,
    SystemHealthReport
} from "./types.js";

interface HealthMonitoringState {
    readonly healthChecks: HashMap.HashMap<string, HashMap.HashMap<string, HealthCheckFunction>>;
    readonly serviceMetrics: HashMap.HashMap<string, ServiceActivityMetrics>;
    readonly serviceCapabilities: HashMap.HashMap<string, ReadonlyArray<ServiceCapability>>;
    readonly serviceDependencies: HashMap.HashMap<string, ReadonlyArray<{ serviceName: string; required: boolean }>>;
    readonly degradationStrategies: HashMap.HashMap<string, ReadonlyArray<DegradationStrategy>>;
    readonly activeStrategies: HashMap.HashMap<string, ReadonlyArray<{ strategyName: string; activatedAt: number }>>;
    readonly alerts: ReadonlyArray<HealthAlert>;
    readonly lastChecks: HashMap.HashMap<string, ReadonlyArray<HealthCheckResult>>;
    readonly monitoring: boolean;
    readonly config?: HealthMonitoringConfig;
}

/**
 * Service health monitoring implementation
 */
export class ServiceHealthMonitoringService extends Effect.Service<ServiceHealthMonitoringApi>()("ServiceHealthMonitoringService", {
    effect: Effect.gen(function* () {
        // Internal state management
        const state = yield* Ref.make<HealthMonitoringState>({
            healthChecks: HashMap.empty(),
            serviceMetrics: HashMap.empty(),
            serviceCapabilities: HashMap.empty(),
            serviceDependencies: HashMap.empty(),
            degradationStrategies: HashMap.empty(),
            activeStrategies: HashMap.empty(),
            alerts: [],
            lastChecks: HashMap.empty(),
            monitoring: false
        });

        // Helper function to generate alert ID
        const generateAlertId = (): string => {
            return `health_alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        };

        // Helper function to determine overall status from individual check results
        const calculateOverallStatus = (results: ReadonlyArray<HealthCheckResult>): HealthStatus => {
            if (results.length === 0) return "UNKNOWN";

            const statuses = results.map(r => r.status);

            if (statuses.some(s => s === "UNHEALTHY")) return "UNHEALTHY";
            if (statuses.some(s => s === "DEGRADED")) return "DEGRADED";
            if (statuses.every(s => s === "HEALTHY")) return "HEALTHY";

            return "UNKNOWN";
        };

        // Helper function to create or update health alert
        const createOrUpdateAlert = (
            serviceName: string,
            checkName: string,
            result: HealthCheckResult
        ) =>
            Effect.gen(function* () {
                if (result.status === "HEALTHY") return;

                const currentState = yield* Ref.get(state);
                const existingAlert = currentState.alerts.find(
                    a => !a.resolved && a.serviceName === serviceName && a.checkName === checkName
                );

                if (existingAlert) {
                    // Update existing alert
                    yield* Ref.update(state, s => ({
                        ...s,
                        alerts: s.alerts.map(a =>
                            a.id === existingAlert.id
                                ? {
                                    ...a,
                                    lastOccurrence: result.timestamp,
                                    count: a.count + 1,
                                    status: result.status,
                                    message: result.message
                                }
                                : a
                        )
                    }));
                } else {
                    // Create new alert
                    const newAlert: HealthAlert = {
                        id: generateAlertId(),
                        serviceName,
                        checkName,
                        severity: result.status === "UNHEALTHY" ? "HIGH" : "MEDIUM",
                        status: result.status,
                        message: result.message,
                        firstOccurrence: result.timestamp,
                        lastOccurrence: result.timestamp,
                        count: 1,
                        resolved: false,
                        tags: {}
                    };

                    yield* Ref.update(state, s => ({
                        ...s,
                        alerts: [...s.alerts, newAlert]
                    }));
                }
            });

        // Helper function to check degradation triggers
        const checkDegradationTriggersForService = (serviceName: string) =>
            Effect.gen(function* () {
                const currentState = yield* Ref.get(state);
                const strategies = Option.getOrElse(HashMap.get(currentState.degradationStrategies, serviceName), () => []);
                const serviceMetrics = HashMap.get(currentState.serviceMetrics, serviceName);
                const lastChecks = Option.getOrElse(HashMap.get(currentState.lastChecks, serviceName), () => []);

                if (Option.isNone(serviceMetrics)) return;

                const overallStatus = calculateOverallStatus(lastChecks);
                const errorRate = Option.match(serviceMetrics, {
                    onNone: () => 0,
                    onSome: (metrics) => metrics.requestCount > 0
                        ? (metrics.errorCount / metrics.requestCount) * 100
                        : 0
                });
                const avgResponseTime = Option.match(serviceMetrics, {
                    onNone: () => 0,
                    onSome: (metrics) => metrics.requestCount > 0
                        ? metrics.totalResponseTime / metrics.requestCount
                        : 0
                });

                for (const strategy of strategies) {
                    let shouldActivate = false;

                    for (const trigger of strategy.triggers) {
                        switch (trigger.condition) {
                            case "SERVICE_UNHEALTHY":
                                shouldActivate = overallStatus === "UNHEALTHY";
                                break;
                            case "HIGH_ERROR_RATE":
                                shouldActivate = trigger.threshold ? errorRate >= trigger.threshold : false;
                                break;
                            case "HIGH_LATENCY":
                                shouldActivate = trigger.threshold ? avgResponseTime >= trigger.threshold : false;
                                break;
                            case "DEPENDENCY_UNAVAILABLE": {
                                const dependencies = Option.getOrElse(HashMap.get(currentState.serviceDependencies, serviceName), () => []);
                                const requiredDeps = dependencies.filter(d => d.required);
                                shouldActivate = requiredDeps.some(dep => {
                                    const depChecks = Option.getOrElse(HashMap.get(currentState.lastChecks, dep.serviceName), () => []);
                                    return calculateOverallStatus(depChecks) === "UNHEALTHY";
                                });
                                break;
                            }
                        }

                        if (shouldActivate) break;
                    }

                    if (shouldActivate) {
                        const activeStrategies = Option.getOrElse(HashMap.get(currentState.activeStrategies, serviceName), () => []);
                        const alreadyActive = activeStrategies.some(as => as.strategyName === strategy.name);

                        if (!alreadyActive) {
                            yield* Ref.update(state, s => ({
                                ...s,
                                activeStrategies: HashMap.set(
                                    s.activeStrategies,
                                    serviceName,
                                    [...activeStrategies, { strategyName: strategy.name, activatedAt: Date.now() }]
                                )
                            }));

                            // Execute strategy actions (placeholder - would implement actual actions)
                            for (const action of strategy.actions) {
                                switch (action.type) {
                                    case "DISABLE_FEATURE":
                                        // Implementation would disable specific feature
                                        break;
                                    case "USE_CACHE":
                                        // Implementation would enable caching
                                        break;
                                    case "REDUCE_CONCURRENCY":
                                        // Implementation would reduce concurrent operations
                                        break;
                                    case "FALLBACK_SERVICE":
                                        // Implementation would switch to fallback service
                                        break;
                                }
                            }
                        }
                    }
                }
            });

        // Helper function to get system information
        const getSystemInfo = () => {
            const memTotal = totalmem();
            const memFree = freemem();
            const memUsed = memTotal - memFree;

            return {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                memory: {
                    total: memTotal,
                    used: memUsed,
                    available: memFree
                },
                cpu: {
                    cores: cpus().length,
                    load: loadavg()
                },
                uptime: uptime()
            };
        };

        // Background monitoring loop
        const monitoringLoop = (config: HealthMonitoringConfig) =>
            Effect.gen(function* () {
                while (true) {
                    const currentState = yield* Ref.get(state);
                    if (!currentState.monitoring) break;

                    // Run health checks for all registered services
                    for (const [serviceName, serviceChecks] of HashMap.entries(currentState.healthChecks)) {
                        for (const [checkName, checkFunc] of HashMap.entries(serviceChecks)) {
                            const result = yield* Effect.either(
                                checkFunc.pipe(Effect.timeout(Duration.seconds(30)))
                            );

                            const checkResult: HealthCheckResult = result._tag === "Right"
                                ? result.right
                                : {
                                    checkName,
                                    status: "UNHEALTHY",
                                    message: result.left instanceof Error ? result.left.message : "Health check failed",
                                    duration: 0,
                                    timestamp: Date.now(),
                                    error: result.left instanceof Error 
                                        ? new EffectiveError({
                                            description: result.left.message,
                                            module: "health-monitoring",
                                            method: "monitoringLoop",
                                            cause: result.left
                                          })
                                        : result.left
                                };

                            // Update last checks
                            const existingChecks = Option.getOrElse(HashMap.get(currentState.lastChecks, serviceName), () => []);
                            const updatedChecks = [
                                ...existingChecks.filter(c => c.checkName !== checkName),
                                checkResult
                            ];

                            yield* Ref.update(state, s => ({
                                ...s,
                                lastChecks: HashMap.set(s.lastChecks, serviceName, updatedChecks)
                            }));

                            // Create or update alerts
                            if (config.alertingEnabled) {
                                yield* createOrUpdateAlert(serviceName, checkName, checkResult);
                            }
                        }

                        // Check degradation triggers
                        if (config.degradationEnabled) {
                            yield* checkDegradationTriggersForService(serviceName);
                        }
                    }

                    // Clean up old data
                    const retentionCutoff = Date.now() - Duration.toMillis(config.retentionPeriod);
                    yield* Ref.update(state, s => ({
                        ...s,
                        alerts: s.alerts.filter(a => a.firstOccurrence >= retentionCutoff)
                    }));

                    yield* Effect.sleep(config.globalInterval);
                }
            });

        return {
            registerHealthCheck: (serviceName: string, checkName: string, check: HealthCheckFunction) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => {
                        const serviceChecks = Option.getOrElse(HashMap.get(s.healthChecks, serviceName), () => HashMap.empty<string, HealthCheckFunction>());
                        const updatedServiceChecks = HashMap.set(serviceChecks, checkName, check);
                        return {
                            ...s,
                            healthChecks: HashMap.set(s.healthChecks, serviceName, updatedServiceChecks)
                        };
                    });

                    // Initialize service metrics if not exists
                    const currentState = yield* Ref.get(state);
                    if (!HashMap.get(currentState.serviceMetrics, serviceName)) {
                        yield* Ref.update(state, s => ({
                            ...s,
                            serviceMetrics: HashMap.set(s.serviceMetrics, serviceName, {
                                serviceName,
                                requestCount: 0,
                                errorCount: 0,
                                totalResponseTime: 0,
                                lastActivity: Date.now(),
                                uptime: 0,
                                startTime: Date.now()
                            })
                        }));
                    }
                }),

            runHealthCheck: (serviceName: string, checkName: string) =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    const serviceChecks = HashMap.get(currentState.healthChecks, serviceName);

                    const serviceChecksMap = yield* Option.match(serviceChecks, {
                        onNone: () => Effect.fail(new EffectiveError({
                            description: `No health checks registered for service: ${serviceName}`,
                            module: "ServiceHealthMonitoring",
                            method: "runHealthCheck"
                        })),
                        onSome: (checks) => Effect.succeed(checks)
                    });

                    const check = HashMap.get(serviceChecksMap, checkName);
                    const checkFunction = yield* Option.match(check, {
                        onNone: () => Effect.fail(new EffectiveError({
                            description: `Health check '${checkName}' not found for service: ${serviceName}`,
                            module: "ServiceHealthMonitoring",
                            method: "runHealthCheck"
                        })),
                        onSome: (checkFn) => Effect.succeed(checkFn)
                    });

                    const startTime = Date.now();
                    const result = yield* Effect.either(checkFunction);
                    const endTime = Date.now();

                    if (result._tag === "Right") {
                        return result.right;
                    } else {
                        return {
                            checkName,
                            status: "UNHEALTHY" as HealthStatus,
                            message: result.left.description || "Health check failed",
                            duration: endTime - startTime,
                            timestamp: endTime,
                            error: result.left
                        };
                    }
                }),

            getServiceHealth: (serviceName: string) =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    const serviceMetrics = HashMap.get(currentState.serviceMetrics, serviceName);
                    const capabilities = Option.getOrElse(HashMap.get(currentState.serviceCapabilities, serviceName), () => []);
                    const dependencies = Option.getOrElse(HashMap.get(currentState.serviceDependencies, serviceName), () => []);
                    const lastChecks = Option.getOrElse(HashMap.get(currentState.lastChecks, serviceName), () => []);

                    if (Option.isNone(serviceMetrics)) {
                        return undefined;
                    }

                    const metrics = Option.getOrThrow(serviceMetrics);
                    const overallStatus = calculateOverallStatus(lastChecks);
                    const uptime = Date.now() - metrics.startTime;
                    const avgResponseTime = metrics.requestCount > 0
                        ? metrics.totalResponseTime / metrics.requestCount
                        : 0;

                    // Get dependency statuses
                    const dependencyStatuses = dependencies.map(dep => {
                        const depChecks = Option.getOrElse(HashMap.get(currentState.lastChecks, dep.serviceName), () => []);
                        return {
                            serviceName: dep.serviceName,
                            status: calculateOverallStatus(depChecks),
                            required: dep.required
                        };
                    });

                    const report: ServiceHealthReport = {
                        serviceName,
                        overallStatus,
                        uptime,
                        capabilities,
                        checks: lastChecks,
                        dependencies: dependencyStatuses,
                        metrics: {
                            requestCount: metrics.requestCount,
                            errorCount: metrics.errorCount,
                            averageResponseTime: avgResponseTime,
                            lastActivity: metrics.lastActivity
                        },
                        timestamp: Date.now()
                    };

                    return report;
                }),

            getSystemHealth: () =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    const serviceReports: ServiceHealthReport[] = [];

                    // Get all service health reports
                    for (const [serviceName] of HashMap.entries(currentState.serviceMetrics)) {
                        const report = yield* Effect.succeed(undefined); // Would call getServiceHealth but avoiding recursion
                        // Implementation would collect all service reports
                    }

                    const systemStatus = serviceReports.length > 0
                        ? serviceReports.some(s => s.overallStatus === "UNHEALTHY") ? "UNHEALTHY"
                            : serviceReports.some(s => s.overallStatus === "DEGRADED") ? "DEGRADED"
                                : "HEALTHY"
                        : "UNKNOWN";

                    const systemReport: SystemHealthReport = {
                        overallStatus: systemStatus,
                        services: serviceReports,
                        systemInfo: getSystemInfo(),
                        timestamp: Date.now()
                    };

                    return systemReport;
                }),

            enableDegradationStrategy: (serviceName: string, strategy: DegradationStrategy) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => {
                        const strategies = Option.getOrElse(HashMap.get(s.degradationStrategies, serviceName), () => []);
                        const updatedStrategies = [...strategies.filter(st => st.name !== strategy.name), strategy];
                        return {
                            ...s,
                            degradationStrategies: HashMap.set(s.degradationStrategies, serviceName, updatedStrategies)
                        };
                    });
                }),

            checkDegradationTriggers: (serviceName: string) =>
                checkDegradationTriggersForService(serviceName),

            getHealthAlerts: (serviceName?: string, includeResolved = false) =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    let alerts = currentState.alerts;

                    if (!includeResolved) {
                        alerts = alerts.filter(a => !a.resolved);
                    }

                    if (serviceName) {
                        alerts = alerts.filter(a => a.serviceName === serviceName);
                    }

                    return alerts;
                }),

            resolveAlert: (alertId: string) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => ({
                        ...s,
                        alerts: s.alerts.map(a =>
                            a.id === alertId
                                ? { ...a, resolved: true, resolvedAt: Date.now() }
                                : a
                        )
                    }));
                }),

            updateServiceCapability: (serviceName: string, capability: ServiceCapability) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => {
                        const capabilities = Option.getOrElse(HashMap.get(s.serviceCapabilities, serviceName), () => []);
                        const updatedCapabilities = [
                            ...capabilities.filter(c => c.name !== capability.name),
                            capability
                        ];
                        return {
                            ...s,
                            serviceCapabilities: HashMap.set(s.serviceCapabilities, serviceName, updatedCapabilities)
                        };
                    });
                }),

            recordServiceActivity: (serviceName: string, success: boolean, responseTime: number) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => {
                        const metrics = Option.getOrElse(
                            HashMap.get(s.serviceMetrics, serviceName),
                            () => ({
                                serviceName,
                                requestCount: 0,
                                errorCount: 0,
                                totalResponseTime: 0,
                                lastActivity: Date.now(),
                                uptime: 0,
                                startTime: Date.now()
                            })
                        );

                        const updatedMetrics: ServiceActivityMetrics = {
                            ...metrics,
                            requestCount: metrics.requestCount + 1,
                            errorCount: success ? metrics.errorCount : metrics.errorCount + 1,
                            totalResponseTime: metrics.totalResponseTime + responseTime,
                            lastActivity: Date.now()
                        };

                        return {
                            ...s,
                            serviceMetrics: HashMap.set(s.serviceMetrics, serviceName, updatedMetrics)
                        };
                    });
                }),

            setServiceDependency: (serviceName: string, dependencyName: string, required: boolean) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => {
                        const dependencies = Option.getOrElse(HashMap.get(s.serviceDependencies, serviceName), () => []);
                        const updatedDependencies = [
                            ...dependencies.filter(d => d.serviceName !== dependencyName),
                            { serviceName: dependencyName, required }
                        ];
                        return {
                            ...s,
                            serviceDependencies: HashMap.set(s.serviceDependencies, serviceName, updatedDependencies)
                        };
                    });
                }),

            startHealthMonitoring: (config: HealthMonitoringConfig) =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => ({
                        ...s,
                        monitoring: true,
                        config
                    }));

                    yield* Effect.fork(monitoringLoop(config));
                }),

            stopHealthMonitoring: () =>
                Effect.gen(function* () {
                    yield* Ref.update(state, s => ({
                        ...s,
                        monitoring: false
                    }));
                }),

            getHealthMetrics: (serviceName?: string, timeRange?: Duration.Duration) =>
                Effect.gen(function* () {
                    const currentState = yield* Ref.get(state);
                    const cutoff = timeRange ? Date.now() - Duration.toMillis(timeRange) : 0;

                    const metrics: Array<{
                        timestamp: number;
                        serviceName: string;
                        status: HealthStatus;
                        responseTime: number;
                        errorCount: number;
                    }> = [];

                    // This would typically come from a time-series database
                    // For now, return current snapshot
                    for (const [svcName, svcMetrics] of HashMap.entries(currentState.serviceMetrics)) {
                        if (serviceName && svcName !== serviceName) continue;

                        const checks = Option.getOrElse(HashMap.get(currentState.lastChecks, svcName), () => []);
                        const status = calculateOverallStatus(checks);
                        const avgResponseTime = svcMetrics.requestCount > 0
                            ? svcMetrics.totalResponseTime / svcMetrics.requestCount
                            : 0;

                        metrics.push({
                            timestamp: Date.now(),
                            serviceName: svcName,
                            status,
                            responseTime: avgResponseTime,
                            errorCount: svcMetrics.errorCount
                        });
                    }

                    return metrics.filter(m => m.timestamp >= cutoff);
                })
        };
    })
}) { } 