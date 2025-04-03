// src/testing/mocks.ts (Extend or create this file)
import { Effect, Layer, LogLevel, Logger, Config, ConfigProvider } from "effect";
import { vi } from "vitest";

// --- Logging Mock (Reuse) ---
export const mockLogger = { /* ... */ };
export class MockLoggingService implements ILoggingService { /* ... */ }
export const MockLoggingServiceLayer = Layer.succeed(LoggingService, new MockLoggingService());

// --- Configuration Mock ---
// Use Effect's built-in ConfigProvider for more idiomatic testing
const mockConfigProvider = ConfigProvider.fromMap(
    new Map([
        // Default value, can be overridden in tests
        ["fiberManager.maxConcurrentFibers", "10"]
    ])
);

// Layer providing the mock config provider
export const MockConfigProviderLayer = Layer.setConfigProvider(mockConfigProvider);

// Helper to override config for specific tests
export const overrideConfig = (key: string, value: string) =>
    Layer.setConfigProvider(ConfigProvider.fromMap(new Map([[key, value]]), mockConfigProvider));


// Helper to get mocks
export const getFiberManagerTestMocks = Effect.all({
    logSvc: LoggingService,
    // Config is accessed via Effect.config internally, no service instance needed usually
});

import { Effect, Exit, Layer, LogLevel, ReadonlyArray, Cause, Tag, Queue, Hub, Ref, Fiber, TestClock, Duration, Semaphore, HashMap, Stream, ConfigProvider } from "effect";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as EffectVitest from "@effect/vitest";

// --- Import Service Definition, Errors ---
import {
    FiberManagerService, IFiberManagerService, FiberRuntimeStatus, FiberOutputEvent,
    ConcurrencyLimitReached, FiberNotFound, FiberPaused, FiberManagerError
} from "../src/fiber-manager/fiber-manager-service"; // Adjust path

// --- Import Live Layer & Mocks ---
import { FiberManagerServiceLiveLayer } from "../src/fiber-manager/fiber-manager-service-live"; // Adjust path
import { mockLogger, MockLoggingServiceLayer, MockConfigProviderLayer, overrideConfig } from "./testing/mocks"; // Adjust path

// --- Test Setup ---

// Create the base layer stack for testing
const BaseTestLayer = FiberManagerServiceLiveLayer.pipe(
    Layer.provide(MockLoggingServiceLayer),
    Layer.provide(MockConfigProviderLayer) // Provide default mock config
);

// Use EffectVitest.provide for the test suite
const { it } = EffectVitest.provide(BaseTestLayer);

// Helper to get service instance
const getTestService = FiberManagerService; // Access via Tag

// --- Test Suite Outline ---

describe("FiberManagerServiceLive", () => {

    // Reset mocks if needed (logging mock)
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("start", () => {
        it("should start a fiber successfully under concurrency limit", () =>
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                const testEffect = (q: Queue.Queue<string>, h: Hub.Hub<string>) => Effect.never; // Simple effect that never ends
                const onTerminate = vi.fn(() => Effect.void);

                yield* _(manager.start({ id: "fiber1", effectToRun: testEffect, onTerminate }));

                const count = yield* _(manager.getActiveFiberCount());
                expect(count).toBe(1);
                const status = yield* _(manager.getStatus({ id: "fiber1" }));
                // Status might be Running or Idle depending on timing/effect
                expect(["Idle", "Running"]).toContain(status);

                // Cleanup check (requires interrupting and advancing time)
                yield* _(manager.interrupt({ id: "fiber1" }));
                yield* _(TestClock.adjust(Duration.seconds(1))); // Allow cleanup effects
                const finalCount = yield* _(manager.getActiveFiberCount());
                expect(finalCount).toBe(0);
                expect(onTerminate).toHaveBeenCalledTimes(1);
                // Check semaphore release (hard to test directly without exposing semaphore)
            }));

        it("should fail with ConcurrencyLimitReached if limit exceeded (if configured to fail)", () =>
            // Requires overriding config to set limit=1 and trying to start two
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                const testEffect = () => Effect.never;

                yield* _(manager.start({ id: "fiber1", effectToRun: testEffect }));
                const result = yield* _(manager.start({ id: "fiber2", effectToRun: testEffect }), Effect.flip); // Try starting second

                expect(result).toBeInstanceOf(ConcurrencyLimitReached); // Assuming semaphore configured to fail, not wait
                const count = yield* _(manager.getActiveFiberCount());
                expect(count).toBe(1);
            }).pipe(Effect.provide(overrideConfig("fiberManager.maxConcurrentFibers", "1"))) // Override layer for this test
        );

        it("should wait if concurrency limit reached (if configured to wait)", () =>
            // Requires Semaphore.withPermits(1) which waits by default
            // Test involves starting limit+1 fibers, interrupting one, and checking if the last one starts
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                const testEffect = () => Effect.sleep(Duration.seconds(5)); // Effect that takes time
                const onTerminate1 = vi.fn(() => Effect.void);
                const onTerminate2 = vi.fn(() => Effect.void);

                // Start fiber 1 (takes permit 1)
                yield* _(manager.start({ id: "fiber1", effectToRun: testEffect, onTerminate: onTerminate1 }));
                // Fork start for fiber 2 (should wait for permit 1)
                const fiber2StartFiber = yield* _(Effect.fork(manager.start({ id: "fiber2", effectToRun: testEffect, onTerminate: onTerminate2 })));

                yield* _(TestClock.adjust(Duration.seconds(1))); // Let fiber 1 run a bit
                let count = yield* _(manager.getActiveFiberCount());
                expect(count).toBe(1); // Only fiber 1 running

                // Interrupt fiber 1, releasing permit 1
                yield* _(manager.interrupt({ id: "fiber1" }));
                yield* _(TestClock.adjust(Duration.seconds(1))); // Allow cleanup & fiber 2 to acquire permit

                // Check if fiber 2 started
                count = yield* _(manager.getActiveFiberCount());
                expect(count).toBe(1); // Now fiber 2 should be running
                const status2 = yield* _(manager.getStatus({ id: "fiber2" }));
                expect(["Idle", "Running"]).toContain(status2);

                // Check termination hooks
                expect(onTerminate1).toHaveBeenCalledTimes(1);
                expect(onTerminate2).not.toHaveBeenCalled();

                // Cleanup fiber 2
                yield* _(Fiber.join(fiber2StartFiber)); // Wait for the start effect itself to finish
                yield* _(manager.interrupt({ id: "fiber2" }));
                yield* _(TestClock.adjust(Duration.seconds(1)));
                expect(onTerminate2).toHaveBeenCalledTimes(1);

            }).pipe(Effect.provide(overrideConfig("fiberManager.maxConcurrentFibers", "1")))
        );

        it("should call onTerminate hook when fiber completes successfully");
        it("should call onTerminate hook when fiber fails");
        it("should call onTerminate hook when fiber is interrupted");
        it("should clean up resources (map entry, queue, hub, semaphore) on termination");
        // it("should fail if starting a fiber with an existing ID"); // Or be idempotent
    });

    describe("submit", () => {
        it("should queue input for an active fiber", () =>
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                const received: string[] = [];
                const testEffect = (q: Queue.Queue<string>, h: Hub.Hub<string>) =>
                    Queue.take(q).pipe(Effect.flatMap(item => Effect.sync(() => received.push(item))), Effect.forever);
                yield* _(manager.start({ id: "fiber1", effectToRun: testEffect }));
                yield* _(TestClock.adjust(Duration.millis(1))); // Allow fiber to start waiting on queue

                yield* _(manager.submit({ id: "fiber1", input: "message1" }));
                yield* _(TestClock.adjust(Duration.millis(1))); // Allow fiber to process

                expect(received).toEqual(["message1"]);
            }));

        it("should fail with FiberNotFound if ID does not exist");
        it("should fail with FiberPaused if status is Paused");
        // it("should fail with FiberManagerError if queue is shutdown"); // Requires interrupting then submitting
    });

    describe("getStatus", () => {
        it("should return the current status (Idle, Running, Paused)"); // Requires manipulating mock statusRef
        it("should fail with FiberNotFound if ID does not exist");
    });

    describe("pause / resume", () => {
        it("should set status to Paused", () =>
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                yield* _(manager.start({ id: "fiber1", effectToRun: () => Effect.never }));
                yield* _(manager.pause({ id: "fiber1" }));
                const status = yield* _(manager.getStatus({ id: "fiber1" }));
                expect(status).toBe("Paused");
            }));

        it("should set status back to Idle/Running after resume", () =>
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                yield* _(manager.start({ id: "fiber1", effectToRun: () => Effect.never }));
                yield* _(manager.pause({ id: "fiber1" }));
                yield* _(manager.resume({ id: "fiber1" }));
                const status = yield* _(manager.getStatus({ id: "fiber1" }));
                expect(status).toBe("Idle"); // Assuming it goes back to Idle
            }));

        it("should fail pause/resume with FiberNotFound if ID does not exist");
    });

    describe("interrupt", () => {
        it("should interrupt the target fiber", () =>
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                let interrupted = false;
                const testEffect = () => Effect.never.pipe(Effect.onInterrupt(() => Effect.sync(() => { interrupted = true; })));
                yield* _(manager.start({ id: "fiber1", effectToRun: testEffect }));
                yield* _(TestClock.adjust(Duration.millis(1))); // Let it start

                yield* _(manager.interrupt({ id: "fiber1" }));
                yield* _(TestClock.adjust(Duration.millis(1))); // Allow interruption signal

                expect(interrupted).toBe(true);
                // Check if removed from map (implementation detail)
            }));

        it("should trigger cleanup and onTerminate hook");
        it("should fail with FiberNotFound if ID does not exist");
    });

    describe("subscribe", () => {
        it("should return a stream connected to the output Hub", () =>
            Effect.gen(function* (_) {
                const manager = yield* _(getTestService);
                const testEffect = (q: Queue.Queue<string>, h: Hub.Hub<string>) =>
                    Hub.publish(h, "event1").pipe(Effect.delay(Duration.millis(10)));
                yield* _(manager.start({ id: "fiber1", effectToRun: testEffect }));

                const stream = yield* _(manager.subscribe<string>({ id: "fiber1" }));
                const fiber = yield* _(Stream.runCollect(stream), Effect.fork); // Collect events in background
                yield* _(TestClock.adjust(Duration.seconds(1))); // Allow time for event publication
                const events = yield* _(Fiber.join(fiber));

                expect(ReadonlyArray.isReadonlyArray(events)).toBe(true);
                expect(events.length).toBe(1);
                expect(events[0]).toBe("event1");
            }));

        it("should fail with FiberNotFound if ID does not exist");
    });

    describe("getActiveFiberCount", () => {
        it("should return the number of currently managed fibers");
    });

});

