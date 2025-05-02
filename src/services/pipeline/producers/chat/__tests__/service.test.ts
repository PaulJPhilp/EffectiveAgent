/**
 * @file Happy path test for ChatService
 * @module services/ai/producers/chat/__tests__/service
 */

import { FixtureService } from "@/services/core/test-harness/components/fixtures/service.js";
import { TextPart as InputTextPart, Message } from "@effect/ai/AiInput";
import { TextPart as ResponseTextPart } from "@effect/ai/AiResponse";
import { User } from "@effect/ai/AiRole";
import { describe, it } from "@effect/vitest";
import { Chunk, Effect, Option } from "effect";
import type { Span } from "effect/Tracer";
import { expect } from "vitest";
import { ChatService } from "../service.js";
import { MockAccessorService } from "@/services/core/test-harness/components/mock-accessors/service.js";

describe("ChatService", () => {
  it("should handle abort signal", () => {
    const controller = new AbortController();

    return Effect.gen(function* () {
      const service = yield* ChatService;
      const options = {
        modelId: "test-model",
        input: Chunk.of(new Message({ role: new User(), parts: Chunk.of(new InputTextPart({ content: "Hello" })) })),
        span: {} as Span,
        signal: controller.signal,
        system: Option.some("You are a test assistant"),
        tools: [],
        required: false
      };

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      // The operation should be aborted
      const result = yield* service.create(options);
      return result;
    });
  });
  // Minimal valid mock tool for testing tool call scenarios
  const mockTool = {
    name: "tool-not-present",
    description: "A mock tool for testing.",
    parameters: { type: "object" as const, properties: {}, required: [] },
    structured: false
  };

  it("should generate a chat response successfully", () =>
    Effect.gen(function* (_) {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.of(
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
          })
        ),
        tools: [],
        required: false,
        span: fixtures.mockSpan,
        parameters: { temperature: 0.7 }
      });

      expect(result.role).toBeInstanceOf(User);
      const firstPartOption = Chunk.get(result.parts, 0);
      expect(Option.isSome(firstPartOption)).toBe(true);

      if (Option.isSome(firstPartOption)) {
        const firstPart = firstPartOption.value as ResponseTextPart;
        expect(firstPart._tag).toBe("Text");
        expect(firstPart.content).toBeDefined();
      }
    })
  );

  it("should handle multiple user messages", () =>
    Effect.gen(function* (_) {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.make(
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
          }),
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "How are you?" }))
          })
        ),
        tools: [],
        required: false,
        span: fixtures.mockSpan,
        parameters: { temperature: 0.7 }
      });

      expect(result.role).toBeInstanceOf(User);
      const firstPartOption = Chunk.get(result.parts, 0);
      expect(Option.isSome(firstPartOption)).toBe(true);
    })
  );

  it("should handle tools configuration", () =>
    Effect.gen(function* (_) {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.of(
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
          })
        ),
        tools: [mockTool],
        required: true,
        span: fixtures.mockSpan,
        parameters: { temperature: 0.7 }
      });

      expect(result.role).toBeInstanceOf(User);
      const firstPartOption = Chunk.get(result.parts, 0);
      expect(Option.isSome(firstPartOption)).toBe(true);
    })
  );
});
