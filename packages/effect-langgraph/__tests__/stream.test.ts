/**
 * @file Streaming integration tests for EffectLangGraphRunner
 */

import { Effect, Stream } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@effective-agent/ai-sdk", () => ({
    generateTextWithModel: vi.fn(),
    getLanguageModel: vi.fn()
}));

vi.mock("../../../src/services/ai/tools/implementations/fetch-content.js", () => ({
    fetchContentImpl: vi.fn()
}));

import { generateTextWithModel, getLanguageModel } from "@effective-agent/ai-sdk";
import { fetchContentImpl } from "../../../src/services/ai/tools/implementations/fetch-content.js";
import { EffectLangGraphRunner } from "../src/runner.js";

describe("EffectLangGraphRunner stream", () => {
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

    it("should stream intermediate states including tool execution", async () => {
        const initialState = {
            messages: [{ content: "Please summarize this article: https://example.com/article" }],
            useTool: false,
            fetchedContent: undefined
        } as any;

        // Run the agent to get the expected final result, then stream and compare.
        const input = {
            prompt: "Please summarize this article: https://example.com/article",
            modelId: "gpt-4o",
            context: {}
        };

        const runResult: any = await Effect.runPromise(runner.run(input));

        const stream = runner.stream(undefined, initialState);
        const collected = await Effect.runPromise(Stream.runCollect(stream));
        const states = Array.from(collected as unknown as any[]);

        // First emitted state should be the initial state
        expect(states[0]).toEqual(initialState);

        // There should be at least one intermediate state where useTool is true or fetchedContent present
        const hasToolState = states.some((s) => s.useTool === true || s.fetchedContent !== undefined);
        expect(hasToolState).toBe(true);

        // Final state should match the run() final response
        const final = states[states.length - 1];
        expect(final.messages[final.messages.length - 1].content).toEqual(runResult.response);
    });

    it("stream should equal invoke final result", async () => {
        const input = {
            prompt: "Please summarize this text: This is some plain text content without URLs.",
            modelId: "gpt-4o",
            context: {}
        };

        // Use run to get final output
        const runResult: any = await Effect.runPromise(runner.run(input));

        // Build matching initial state for stream
        const initialState = {
            messages: [{ content: input.prompt }],
            useTool: false,
            fetchedContent: undefined
        } as any;

        const stream = runner.stream(undefined, initialState);
        const collected = await Effect.runPromise(Stream.runCollect(stream));
        const states = Array.from(collected as unknown as any[]);
        const final = states[states.length - 1];

        expect(final.messages[final.messages.length - 1].content).toEqual(runResult.response);
    });
});
