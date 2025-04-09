/**
 * Example test using the Effect test harness
 * 
 * This file demonstrates how to use the test harness to test an Effect service
 * with proper type inference.
 */

import { Context, Effect, Ref } from "effect";
import { describe, expect, it } from "vitest";

import { createServiceTestHarness } from "../effect-test-harness.js";

// --- Define Example Service & Errors ---

// Domain error
class CounterError extends Error {
    readonly _tag = "CounterError";
    constructor(message: string) {
        super(message);
        this.name = "CounterError";
    }
}

// Service interface
interface CounterServiceInterface {
    readonly increment: () => Effect.Effect<number, never>;
    readonly decrement: () => Effect.Effect<number, CounterError>;
    readonly getCount: () => Effect.Effect<number, never>;
    readonly reset: () => Effect.Effect<void, never>;
}

// Service tag
class CounterService extends Context.Tag("CounterExample/CounterService")<
    CounterService,
    CounterServiceInterface
>() { }

// --- Test Setup ---

// Create simple test implementation
const createTestCounter = () => {
    return Effect.gen(function* () {
        // Internal state
        const counterRef = yield* Ref.make(0);

        // Service methods
        const increment = (): Effect.Effect<number, never> => {
            return Ref.updateAndGet(counterRef, count => count + 1);
        };

        const decrement = (): Effect.Effect<number, CounterError> => {
            return Ref.get(counterRef).pipe(
                Effect.flatMap(count => {
                    if (count <= 0) {
                        return Effect.fail(new CounterError("Cannot decrement below zero"));
                    }
                    return Ref.updateAndGet(counterRef, c => c - 1);
                })
            );
        };

        const getCount = (): Effect.Effect<number, never> => {
            return Ref.get(counterRef);
        };

        const reset = (): Effect.Effect<void, never> => {
            return Ref.set(counterRef, 0);
        };

        return {
            increment,
            decrement,
            getCount,
            reset
        };
    });
};

// Create test harness for the counter service
const counterHarness = createServiceTestHarness(
    CounterService,
    createTestCounter
);

// --- Tests ---

describe("Counter Service with Test Harness", () => {
    // Reset counter before each test
    it("should increment counter", async () => {
        const effect = Effect.gen(function* () {
            const counter = yield* CounterService;

            // Initial value should be 0
            const initial = yield* counter.getCount();
            expect(initial).toBe(0);

            // Increment should work
            const value = yield* counter.increment();
            expect(value).toBe(1);

            return value;
        });

        await expect(counterHarness.runTest(effect)).resolves.toBe(1);
    });

    it("should support multiple operations", async () => {
        const effect = Effect.gen(function* () {
            const counter = yield* CounterService;

            // Reset counter
            yield* counter.reset();

            // Increment twice
            yield* counter.increment();
            yield* counter.increment();

            // Get count
            const count = yield* counter.getCount();
            expect(count).toBe(2);

            return count;
        });

        await counterHarness.runTest(effect);
    });

    it("should fail when decrementing at zero", async () => {
        const effect = Effect.gen(function* () {
            const counter = yield* CounterService;

            // Reset counter
            yield* counter.reset();

            // Try to decrement at zero
            return yield* counter.decrement();
        });

        // Using the expectError helper
        await counterHarness.expectError(effect, "CounterError");

        // Or manually checking with runFailTest
        const exit = await counterHarness.runFailTest(effect);
        expect(exit._tag).toBe("Failure");
    });
}); 