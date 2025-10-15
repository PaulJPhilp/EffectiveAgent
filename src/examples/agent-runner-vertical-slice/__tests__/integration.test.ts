/**
 * @file Integration test for the first vertical slice of AgentRunner
 * @module examples/agent-runner-vertical-slice
 */

import { EffectLangGraphRunner } from "@effective-agent/langgraph";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { AgentRunInput } from "@/agent-runner.js";

describe("AgentRunner Vertical Slice Integration", () => {
    it("should run a simple agent using EffectLangGraphRunner", async () => {
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                // Create the runner
                const runner = new EffectLangGraphRunner();

                // Prepare input
                const input: AgentRunInput = {
                    prompt: "hello",
                    modelId: "gpt-4o",
                    context: { test: true }
                };

                // Run the agent
                const output = yield* runner.run(input);

                // Verify output
                expect(output.response).toBeDefined();
                expect(output.metadata).toBeDefined();
                expect(typeof output.response).toBe("string");
                expect(output.response.length).toBeGreaterThan(0);

                return output;
            })
        );

        expect(result).toBeDefined();
    });
});