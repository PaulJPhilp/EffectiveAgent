import { Duration, Effect, HashMap, Option } from "effect";
import { describe, expect, it } from "vitest";
import { ServiceHealthMonitoringService } from "../service.js";
import type { HealthCheckFunction, HealthMonitoringConfig } from "../types.js";

describe("ServiceHealthMonitoringService", () => {

    it("should register and run health checks", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ServiceHealthMonitoringService;
            
            // Register a simple health check
            const healthCheck: HealthCheckFunction = Effect.succeed({
                checkName: "test-check",
                status: "HEALTHY" as const,
                message: "All systems operational",
                duration: 50,
                timestamp: Date.now()
            });

            yield* service.registerHealthCheck("test-service", "test-check", healthCheck);
            
            // Run the health check
            const result = yield* service.runHealthCheck("test-service", "test-check");
            
            expect(result.status).toBe("HEALTHY");
            expect(result.checkName).toBe("test-check");
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ServiceHealthMonitoringService.Default)
            )
        );
    });

    it("should fail when running non-existent health check", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ServiceHealthMonitoringService;
            
            // Try to run a non-existent health check
            const result = yield* Effect.either(
                service.runHealthCheck("non-existent-service", "non-existent-check")
            );
            
            expect(result._tag).toBe("Left");
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ServiceHealthMonitoringService.Default)
            )
        );
    });

    it("should get system health", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ServiceHealthMonitoringService;
            
            const systemHealth = yield* service.getSystemHealth();
            
            expect(systemHealth.overallStatus).toBeDefined();
            expect(systemHealth.systemInfo).toBeDefined();
            expect(systemHealth.systemInfo.nodeVersion).toBeDefined();
            expect(systemHealth.systemInfo.platform).toBeDefined();
            expect(systemHealth.systemInfo.memory).toBeDefined();
            expect(systemHealth.systemInfo.cpu).toBeDefined();
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ServiceHealthMonitoringService.Default)
            )
        );
    });
});
