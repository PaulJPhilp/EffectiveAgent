/**
 * @file Unit tests for EffectLangGraphRunner
 * @module packages/effect-langgraph/__tests__/runner.test.ts
 */

import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks: declare mocks before importing the modules they affect.
vi.mock("@effective-agent/ai-sdk", () => ({
    generateTextWithModel: vi.fn(),
    getLanguageModel: vi.fn()
}));

vi.mock("../../../src/services/ai/tools/implementations/fetch-content.js", () => ({
    fetchContentImpl: vi.fn()
}));

import { generateTextWithModel, getLanguageModel } from "@effective-agent/ai-sdk";
// Import after declaring mocks so imports are transformed to use the mocked
// implementations by Vitest's hoisting.
import { fetchContentImpl } from "../../../src/services/ai/tools/implementations/fetch-content.js";
import { EffectLangGraphRunner } from "../src/runner.js";

describe("EffectLangGraphRunner", () => {
    let runner: EffectLangGraphRunner;

    beforeEach(() => {
        vi.clearAllMocks();
        runner = new EffectLangGraphRunner();

        // Setup default mocks that return Effect values
        (getLanguageModel as any).mockReturnValue(Effect.succeed({}));
        (generateTextWithModel as any).mockReturnValue(Effect.succeed({
            data: { text: "Mocked LLM response" }
        }));
        (fetchContentImpl as any).mockReturnValue(Effect.succeed({
            content: "Mocked fetched content",
            url: "https://example.com"
        }));
    });

    describe("routing logic", () => {
        it("should route to tool node when URL is present", async () => {
            const input = {
                prompt: "Please summarize this article: https://example.com/article",
                modelId: "gpt-4o",
                context: {}
            };

            // Mock the router to detect URL and the summarization to return specific text
            (generateTextWithModel as any).mockReturnValueOnce(Effect.succeed({
                data: { text: "Mocked summary of fetched content" }
            }));

            const result: any = await Effect.runPromise(runner.run(input));

            expect(fetchContentImpl).toHaveBeenCalledWith({ url: "https://example.com/article" });
            // Some runtimes or module resolution nuances may attach the mock to
            // the module export rather than the local imported binding. Check
            // both places and assert the observed total calls equals 1.
            const aiModule1 = await import("@effective-agent/ai-sdk");
            // Avoid double-counting if both references point to the same mock
            const refs = [generateTextWithModel, aiModule1.generateTextWithModel];
            const uniqueRefs = Array.from(new Set(refs));
            const totalCalls = uniqueRefs.reduce((sum, fn) => sum + ((fn as any)?.mock?.calls?.length ?? 0), 0);
            expect(totalCalls).toBe(1);
            expect(result.response).toContain("Mocked summary");
        });

        it("should route directly to summarize node when no URL is present", async () => {
            const input = {
                prompt: "Please summarize this text: This is some plain text content without URLs.",
                modelId: "gpt-4o",
                context: {}
            };

            const result: any = await Effect.runPromise(runner.run(input));

            expect(fetchContentImpl).not.toHaveBeenCalled();
            const aiModule2 = await import("@effective-agent/ai-sdk");
            const refs2 = [generateTextWithModel, aiModule2.generateTextWithModel];
            const uniqueRefs2 = Array.from(new Set(refs2));
            const totalCalls2 = uniqueRefs2.reduce((sum, fn) => sum + ((fn as any)?.mock?.calls?.length ?? 0), 0);
            expect(totalCalls2).toBe(1);
            expect(result.response).toContain("Mocked LLM response");
        });
    });

    describe("error handling", () => {
        it("should handle tool execution errors gracefully", async () => {
            const input = {
                prompt: "Please summarize this article: https://example.com/article",
                modelId: "gpt-4o",
                context: {}
            };

            (fetchContentImpl as any).mockReturnValue(Effect.fail(new Error("Network error")));

            await expect(Effect.runPromise(runner.run(input))).rejects.toThrow("Failed to run LangGraph agent");
        });
    });
});