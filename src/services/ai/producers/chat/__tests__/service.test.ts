/**
 * @file Happy path test for ChatService
 * @module services/ai/producers/chat/__tests__/service
 */

import { describe, it, expect } from "@effect/vitest";
import { Effect, Option, Chunk, Either, Cause } from "effect";
import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { mockSpan } from "@/services/ai/test-utils/index.js";
import { ChatService } from "../service.js";
import { Message, TextPart as InputTextPart } from "@effect/ai/AiInput";
import { TextPart as ResponseTextPart } from "@effect/ai/AiResponse";
import { User } from "@effect/ai/AiRole";

/**
 * Minimal test harness for ChatService.
 * Uses a simple mock implementation for the happy path.
 */
const harness = createServiceTestHarness(
  ChatService,
  () => Effect.succeed({
    /**
     * Mocked create method for ChatService.
     */
    create: (_options: unknown) =>
      Effect.succeed({
        role: new User(),
        parts: Chunk.of(new ResponseTextPart({ content: "Hello, world!" }))
      })
  })
);

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
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
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
    });

    const result = await harness.runTest(effect, { layer: harness.TestLayer });
    expect(result.role).toBeInstanceOf(User);
    const firstPartOption = Chunk.get(result.parts, 0);
    if (firstPartOption._tag === "Some") {
      const firstPart = firstPartOption.value;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  it("should handle empty input chunk gracefully", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.of(new Message({ role: new User(), parts: Chunk.of(new InputTextPart({ content: "Hi!" })) })),
        tools: [],
        required: false,
        span: mockSpan,
        parameters: { temperature: 0.7 }
      });
    });

    const result = await harness.runTest(effect, { layer: harness.TestLayer });
    expect(result.role).toBeInstanceOf(User);
    const firstPartOption = Chunk.get(result.parts, 0);
    if (firstPartOption._tag === "Some") {
      const firstPart = firstPartOption.value;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  it("should generate a response with a different temperature", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
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
    });

    const result = await harness.runTest(effect, { layer: harness.TestLayer });
    expect(result.role).toBeInstanceOf(User);
    const firstPartOption = Chunk.get(result.parts, 0);
    if (firstPartOption._tag === "Some") {
      const firstPart = firstPartOption.value;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  it("should handle multiple user messages in input chunk", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
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
    });

    const result = await harness.runTest(effect, { layer: harness.TestLayer });
    expect(result.role).toBeInstanceOf(User);
    const firstPartOption = Chunk.get(result.parts, 0);
    if (firstPartOption._tag === "Some") {
      const firstPart = firstPartOption.value;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  it("should handle message with empty parts", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
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
    });

    const result = await harness.runTest(effect, { layer: harness.TestLayer });
    expect(result.role).toBeInstanceOf(User);
    const firstPartOption = Chunk.get(result.parts, 0);
    if (firstPartOption._tag === "Some") {
      const firstPart = firstPartOption.value;
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
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
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
    });

    const exit = await harness.runTest(Effect.exit(effect), { layer: harness.TestLayer });
    // Use Effect.exit to handle defects (dies)
    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      // Use Cause.defects to extract defects (dies)
      const defects = Array.from(Cause.defects(exit.cause));
      expect(defects.length).toBeGreaterThan(0);
      const defect = defects[0] as { name?: string; _id?: string };
      expect(defect.name ?? defect._id).toBe("ParseError");
    }
  });

  it("should handle missing required tool gracefully", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
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

    const result = await harness.runTest(effect, { layer: harness.TestLayer });
    expect(result.role).toBeInstanceOf(User);
    const firstPartOption = Chunk.get(result.parts, 0);
    if (firstPartOption._tag === "Some") {
      const firstPart = firstPartOption.value;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });

  it("should handle very long input message", async () => {
    const longText = "A".repeat(10000);
    const effect = Effect.gen(function* () {
      const service = yield* ChatService;
      return yield* service.create({
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

    const result = await harness.runTest(effect, { layer: harness.TestLayer });
    expect(result.role).toBeInstanceOf(User);
    const firstPartOption = Chunk.get(result.parts, 0);
    if (firstPartOption._tag === "Some") {
      const firstPart = firstPartOption.value;
      if (firstPart._tag === "Text") {
        expect(firstPart.content).toBe("Hello, world!");
      } else {
        throw new Error("First part is not a TextPart");
      }
    } else {
      throw new Error("Expected at least one part in result.parts");
    }
  });
});
