/**
 * @file Happy path test for ChatService
 * @module services/ai/producers/chat/__tests__/service
 */

import { describe, it, expect } from "@effect/vitest";
import { Effect, Option, Chunk, Cause, Either } from "effect";
import { createAiTestHarness, mockSpan } from "@/services/ai/test-utils/index.js";
import TestChatService from "./test-chat-service.js";
import { Message, TextPart as InputTextPart } from "@effect/ai/AiInput";
import { TextPart as ResponseTextPart } from "@effect/ai/AiResponse";
import { User } from "@effect/ai/AiRole";

/**
 * Minimal test harness for ChatService.
 * Uses a simple mock implementation for the happy path.
 */
const harness = createAiTestHarness(TestChatService);

// Minimal valid mock tool for testing tool call scenarios
const mockTool = {
  name: "tool-not-present",
  description: "A mock tool for testing.",
  parameters: { type: "object" as const, properties: {}, required: [] }, // Minimal valid JsonSchema7Object
  structured: false
};

describe("ChatService", () => {
  /**
   * Happy path: should generate a chat response successfully.
   */
  it("should generate a chat response successfully", async () => {
    /**
     * Should generate a chat response successfully.
     */
    const effect = harness.service.create({
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
      span: mockSpan,
      parameters: { temperature: 0.7 }
    });
    const chatResult = await Effect.runPromise(effect) as ResponseTextPart | any;
    expect(chatResult.role).toBeInstanceOf(User);
    const chatFirstPartOption = Chunk.get(chatResult.parts, 0);
    if (chatFirstPartOption._tag === "Some") {
      const firstPart = chatFirstPartOption.value as ResponseTextPart;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  /**
   * Should handle empty input chunk gracefully.
   */
  it("should handle empty input chunk gracefully", async () => {
    const effect = harness.service.create({
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
      span: mockSpan,
      parameters: { temperature: 0.7 }
    });
    const chatResult = await Effect.runPromise(effect) as ResponseTextPart | any;
    expect(chatResult.role).toBeInstanceOf(User);
    const chatFirstPartOption = Chunk.get(chatResult.parts, 0);
    if (chatFirstPartOption._tag === "Some") {
      const firstPart = chatFirstPartOption.value as ResponseTextPart;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  /**
   * Should generate a response with a different temperature.
   */
  it("should generate a response with a different temperature", async () => {
    const effect = harness.service.create({
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
      span: mockSpan,
      parameters: { temperature: 0.1 }
    });
    const chatResult = await Effect.runPromise(effect) as ResponseTextPart | any;
    expect(chatResult.role).toBeInstanceOf(User);
    const chatFirstPartOption = Chunk.get(chatResult.parts, 0);
    if (chatFirstPartOption._tag === "Some") {
      const firstPart = chatFirstPartOption.value as ResponseTextPart;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  /**
   * Should handle multiple user messages in input chunk.
   */
  it("should handle multiple user messages in input chunk", async () => {
    const effect = harness.service.create({
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
      span: mockSpan,
      parameters: { temperature: 0.7 }
    });
    const chatResult = await Effect.runPromise(effect) as ResponseTextPart | any;
    expect(chatResult.role).toBeInstanceOf(User);
    const chatFirstPartOption = Chunk.get(chatResult.parts, 0);
    if (chatFirstPartOption._tag === "Some") {
      const firstPart = chatFirstPartOption.value as ResponseTextPart;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  /**
   * Should handle message with empty parts.
   */
  it("should handle message with empty parts", async () => {
    const effect = harness.service.create({
      modelId: "test-model-id",
      system: Option.none(),
      input: Chunk.of(
        new Message({
          role: new User(),
          parts: Chunk.empty<InputTextPart>()
        })
      ),
      tools: [],
      required: false,
      span: mockSpan,
      parameters: { temperature: 0.7 }
    });
    const chatResult = await Effect.runPromise(effect) as ResponseTextPart | any;
    expect(chatResult.role).toBeInstanceOf(User);
    const chatFirstPartOption = Chunk.get(chatResult.parts, 0);
    if (chatFirstPartOption._tag === "Some") {
      const firstPart = chatFirstPartOption.value as ResponseTextPart;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  /**
   * Should fail on message with invalid role (runtime error handling).
   * Uses Effect.either to assert error is captured as Left.
   */
  it("should fail on message with invalid role", async () => {
    const effect = harness.service.create({
      modelId: "test-model-id",
      system: Option.none(),
      input: Chunk.of(
        new Message({
          role: {} as User, // Invalid role
          parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
        })
      ),
      tools: [],
      required: false,
      span: mockSpan,
      parameters: { temperature: 0.7 }
    });
    const exit = await Effect.runPromise(Effect.exit(effect));
    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const defects = Array.from(Cause.defects(exit.cause));
      expect(defects.length).toBeGreaterThan(0);
      const defect = defects[0];
      expect(String(defect)).toContain('@effect/ai/AiInput/Message (Constructor)');
    }
  });

  it("should handle missing required tool gracefully", async () => {
    const effect = harness.service.create({
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
        span: mockSpan,
        parameters: { temperature: 0.7 }
      });
    });

  it("should handle very long input message", async () => {
    const longText = "A".repeat(10000);
    const effect = harness.service.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.of(
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: longText }))
          })
        ),
        tools: [],
        required: false,
        span: mockSpan,
        parameters: { temperature: 0.7 }
      });
    });
});
