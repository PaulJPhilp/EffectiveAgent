/**
 * Simple test for demonstrating correct Effect v3.16 tag usage
 * @file Simple test for demonstrating current Effect.Service pattern
 * @description Tests using the Effect.Service class pattern (v3.16+)
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";

// Define a simple service interface
interface CounterServiceInterface {
    readonly increment: () => Effect.Effect<number>;
    readonly getCount: () => Effect.Effect<number>;
}

// Create a live implementation
const createCounterLive = () => {
    let count = 0;

    return {
        increment: () => Effect.sync(() => ++count),
        getCount: () => Effect.sync(() => count)
    } satisfies CounterServiceInterface;
};

// Define the service using Effect.Service pattern
class CounterService extends Effect.Service<CounterServiceInterface>()("CounterService", {
    effect: Effect.succeed(createCounterLive())
}) { }

// No need for separate layer - using .Default from Effect.Service

describe("Effect v3.16 Tag & Service pattern", () => {
    it("should access the service correctly", async () => {
        const program = Effect.gen(function* () {
            // Access service by directly yielding the Tag
            const counter = yield* CounterService;

            // Use the service
            const initialCount = yield* counter.getCount();
            expect(initialCount).toBe(0);

            const newCount = yield* counter.increment();
            expect(newCount).toBe(1);

            return newCount;
        });

        const result = await Effect.runPromise(
            program.pipe(
                Effect.provide(CounterService.Default)
            )
        );

        expect(result).toBe(1);
    });
}); 