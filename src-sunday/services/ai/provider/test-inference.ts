// test-inference.ts
import { Context, Effect, Layer, Option } from "effect";
import * as Record from "effect/Record";
import { describe, expect, it } from "vitest"; // Using standard vitest

// --- Simple Mock Service and Data ---
interface MockConfigData {
    readonly providers: Readonly<Record<string, { name: string; url: string }>>;
    readonly defaultName: string;
}

// Mock implementation - NO CACHING
const mockLoadConfigEffect: Effect.Effect<MockConfigData, Error, never> = Effect.succeed({
    providers: Record.fromEntries([
        ["p1", { name: "p1", url: "url1" }],
        ["p2", { name: "p2", url: "url2" }],
    ]),
    defaultName: "p1",
});
// Note: Explicit type annotation Effect<MockConfigData, Error, never> added for clarity

// --- Test Case ---

describe("Inference Test (No Cache)", () => {

    it("Step 1a: should access non-cached config directly", async () => {
        const program = Effect.gen(function* () {
            // Access the non-cached config directly
            const config = yield* mockLoadConfigEffect; // Should resolve to MockConfigData
            expect(config.defaultName).toBe("p1");
            expect(Record.has(config.providers, "p2")).toBe(true);
            return config; // Return the config itself
        });

        // Run without extra layers
        const result = await Effect.runPromise(program);
        // Basic check that it ran and returned the expected structure
        expect(result.defaultName).toBe("p1");
    });

});
