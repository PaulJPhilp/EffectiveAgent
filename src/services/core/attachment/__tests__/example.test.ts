/**
 * Simple test for demonstrating correct Effect v3.16 tag usage
 * @file Simple test for demonstrating current Effect.Service pattern
 * @description Tests using the Effect.Service class pattern (v3.16+)
 */

import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

// Define a simple service interface
interface CounterServiceInterface {
    readonly increment: () => Effect.Effect<number>;
    readonly getCount: () => Effect.Effect<number>;
}

// Define the service tag using the class-based approach
class CounterService extends Context.Tag("CounterService")<
    CounterService,
    CounterServiceInterface
>() { }

// Create a live implementation
const createCounterLive = () => {
    let count = 0;

    return {
        increment: () => Effect.sync(() => ++count),
        getCount: () => Effect.sync(() => count)
    } satisfies CounterServiceInterface;
};

// Create a layer for the service
const CounterServiceLive = Layer.succeed(
    CounterService,
    createCounterLive()
);

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
            Effect.provide(program, CounterServiceLive)
        );

        expect(result).toBe(1);
    });
}); 