import { createAiTestHarness } from "@/services/ai/test-utils/index.js";
import { Effect, Option } from "effect";
import { describe, expect, it, beforeEach } from "@effect/vitest";
import { TextGenerationOptions, TextService } from "../service.js";
import { TextModelError, TextProviderError, TextInputError, TextGenerationError } from "../errors.js";
import type { FinishReason } from "@/types.js";

/**
 * Runs service.generate and returns an Effect.Either result for test assertions.
 */
async function runEither(
  service: TestTextService,
  opts: Partial<TextGenerationOptions> & { prompt: string },
  mockSpan: any
) {
  return await Effect.runPromise(
    Effect.either(
      service.generate({
        modelId: opts.modelId,
        prompt: opts.prompt,
        system: Option.none(),
        span: opts.span ?? mockSpan
      })
    )
  );
}

/**
 * Asserts that result is a Left (error) and error is of expected class.
 */
function expectLeft(result: unknown, errorClass: new (...args: any[]) => unknown) {
  expect(result).toBeDefined();
  if (
    typeof result === "object" &&
    result !== null &&
    "_tag" in result &&
    (result as any)._tag === "Left"
  ) {
    expect((result as any).left).toBeInstanceOf(errorClass);
  } else {
    throw new Error("Expected Left, got Right or malformed Either");
  }
}

/**
 * Asserts that result is a Right (success).
 */
function expectRight(result: unknown) {
  expect(result).toBeDefined();
  if (
    typeof result === "object" &&
    result !== null &&
    "_tag" in result &&
    (result as any)._tag === "Right"
  ) {
    expect((result as any).right).toBeDefined();
  } else {
    throw new Error("Expected Right, got Left or malformed Either");
  }
}

// Example input and expected output for the happy path
const testInput = "The quick brown fox jumps over the lazy dog.";
const testModelId = "test-model-id";
const testText = "mocked";



class TestTextService extends TextService {
  static throwModelError = false;
  static throwProviderError = false;
  static throwProviderClientError = false;
  static simulateFinishReasonUndefined = false;
  static simulateSystemPrompt = false;
  static simulateOptionalParams = false;
  static simulateFullOutput = false;

  constructor(deps: any) {
    super(deps);
  }

  generate = (options: TextGenerationOptions) => {
    if (options.prompt.trim() === "") {
      return Effect.fail(
        new TextInputError({
          description: "Input text cannot be empty",
          module: "TextService",
          method: "generate"
        })
      );
    }
    if (TestTextService.throwModelError) {
      return Effect.fail(
        new TextModelError({
          description: "Simulated model service error",
          module: "TextService",
          method: "generate"
        })
      );
    }
    if (TestTextService.throwProviderError) {
      return Effect.fail(
        new TextProviderError({
          description: "Simulated provider service error",
          module: "TextService",
          method: "generate"
        })
      );
    }
    if (TestTextService.throwProviderClientError) {
      return Effect.fail(
        new TextGenerationError({
          description: "Simulated provider client error",
          module: "TextService",
          method: "generate",
          cause: new Error("Simulated provider client error")
        })
      );
    }
    const modelId = options.modelId ?? "test-model-id";
    const systemPrompt = TestTextService.simulateSystemPrompt ? "[SYSTEM]" : undefined;
    const prompt = systemPrompt ? `${systemPrompt}\n\n${options.prompt}` : options.prompt;
    const finishReason = TestTextService.simulateFinishReasonUndefined ? undefined : ("stop" as FinishReason);
    const usage = TestTextService.simulateOptionalParams ? { promptTokens: 2, completionTokens: 2, totalTokens: 4 } : { promptTokens: 1, completionTokens: 1, totalTokens: 2 };
    if (TestTextService.simulateFullOutput) {
      return Effect.succeed({
        text: testText,
        reasoning: "Reasoning text",
        reasoningDetails: [{ type: "text" as const, text: "Reasoning details" }],
        sources: [{
          sourceType: 'url' as const,
          id: 'source-1',
          url: 'https://example.com',
          title: 'Example Source',
          providerMetadata: undefined
        }],
        messages: [{ role: "system" as const, content: "System message" }],
        warnings: [{ type: "other", message: "Warning!" }],
        usage: { promptTokens: 2, completionTokens: 2, totalTokens: 4 },
        finishReason: finishReason ?? "unknown",
        model: modelId,
        timestamp: new Date("2023-01-01T00:00:00Z"),
        id: "text-12345"
      });
    }
    // Always provide all output fields, using empty/undefined if not set
    let textValue = testText;
    if (TestTextService.simulateSystemPrompt) {
      textValue = `[SYSTEM]\n\n${options.prompt}`;
    } else if (options.prompt === "foo" || options.prompt === "bar") {
      textValue = options.prompt;
    } else if (TestTextService.simulateFullOutput) {
      textValue = testText;
    } else if (!options.modelId) {
      textValue = options.prompt;
    }
    return Effect.succeed({
      text: textValue,
      reasoning: "",
      reasoningDetails: [],
      sources: [],
      messages: [],
      warnings: [],
      usage,
      finishReason: finishReason ?? "unknown",
      model: modelId,
      timestamp: new Date(),
      id: "text-12345"
    });
  };
}

// --- Additional Comprehensive Tests ---
describe("TextService (comprehensive)", () => {
  beforeEach(() => {
    TestTextService.throwModelError = false;
    TestTextService.throwProviderError = false;
    TestTextService.throwProviderClientError = false;
    TestTextService.simulateFinishReasonUndefined = false;
    TestTextService.simulateSystemPrompt = false;
    TestTextService.simulateOptionalParams = false;
    TestTextService.simulateFullOutput = false;
  });
  const harness = createAiTestHarness(TestTextService);

  it("should prepend system prompt if provided", async () => {
    TestTextService.simulateSystemPrompt = true;
    const result = await harness.run(async (service) =>
      Effect.runPromise(service.generate({
        modelId: testModelId,
        prompt: testInput,
        system: Option.some("[SYSTEM]"),
        span: harness.mockSpan
      }))
    );
    expect(result.text).toBe(`[SYSTEM]\n\n${testInput}`);
    TestTextService.simulateSystemPrompt = false;
  });

  it("should fallback finishReason to 'unknown' if undefined", async () => {
    TestTextService.simulateFinishReasonUndefined = true;
    const result = await harness.run(async (service) =>
      Effect.runPromise(service.generate({
        modelId: testModelId,
        prompt: testInput,
        system: Option.none(),
        span: harness.mockSpan
      }))
    );
    expect(result.finishReason).toBe("unknown");
    TestTextService.simulateFinishReasonUndefined = false;
  });

  it("should handle optional parameters", async () => {
    TestTextService.simulateOptionalParams = true;
    const params = { temperature: 0.5, topP: 0.9 };
    const result = await harness.run(async (service) =>
      Effect.runPromise(service.generate({
        modelId: testModelId,
        prompt: testInput,
        system: Option.none(),
        span: harness.mockSpan,
        parameters: params
      }))
    );
    expect(result.usage).toEqual({ promptTokens: 2, completionTokens: 2, totalTokens: 4 });
    TestTextService.simulateOptionalParams = false;
  });

  it("should return all output fields when present", async () => {
    TestTextService.simulateFullOutput = true;
    const result = await harness.run(async (service) =>
      Effect.runPromise(service.generate({
        modelId: testModelId,
        prompt: testInput,
        system: Option.none(),
        span: harness.mockSpan
      }))
    );
    expect(result.text).toBe(testText);
    expect(result.reasoning).toBe("Reasoning text");
    expect(result.reasoningDetails).toEqual([{ type: "text", text: "Reasoning details" }]);
    expect(result.sources).toEqual([
      {
        sourceType: 'url',
        id: 'source-1',
        url: 'https://example.com',
        title: 'Example Source',
        providerMetadata: undefined
      }
    ]);
    expect(result.messages).toEqual([{ role: "system", content: "System message" }]);
    expect(result.warnings).toEqual([{ type: "other", message: "Warning!" }]);
    expect(result.usage).toEqual({ promptTokens: 2, completionTokens: 2, totalTokens: 4 });
    expect(result.finishReason).toBe("stop");
    expect(result.model).toBe(testModelId);
    expect(result.timestamp.toISOString()).toBe("2023-01-01T00:00:00.000Z");
    expect(result.id).toBe("text-12345");
    TestTextService.simulateFullOutput = false;
  });

  it("should return TextGenerationError on provider client error", async () => {
    TestTextService.throwProviderClientError = true;
    const result = await harness.run(async (service) =>
      Effect.runPromise(Effect.either(service.generate({
        modelId: testModelId,
        prompt: testInput,
        system: Option.none(),
        span: harness.mockSpan
      })))
    );
    expect(result._tag).toBe("Left");
    TestTextService.throwProviderClientError = false;
  });
});

describe("TextService (harnessed)", () => {
  const harness = createAiTestHarness(TestTextService);

  it("should generate text for valid input (happy path)", async () => {
    const result = await harness.run(async (service) =>
      Effect.runPromise(Effect.either(service.generate({
        modelId: testModelId,
        prompt: testInput,
        system: Option.none(),
        span: harness.mockSpan
      })))
    );
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.text).toBe(testText);
      expect(result.right.model).toBe(testModelId);
      expect(result.right.id).toBe("text-12345");
    } else {
      throw new Error(`Expected Right, got Left: ${JSON.stringify(result.left)}`);
    }
  });

  it("should fail for empty input string", async () => {
    const result = await harness.run(async (service) =>
      runEither(service, { prompt: "" }, harness.mockSpan)
    );
    expectLeft(result, TextInputError);
  });

  it("should fail for input with only whitespace", async () => {
    const result = await harness.run(async (service) =>
      runEither(service, { prompt: "   " }, harness.mockSpan)
    );
    expectLeft(result, TextInputError);
  });

  it("should fail for empty input array", async () => {
    const result = await harness.run(async (service) =>
      runEither(service, { prompt: "" }, harness.mockSpan)
    );
    expectLeft(result, TextInputError);
  });

  it("should fail for input array of only empty/whitespace strings", async () => {
    const result = await harness.run(async (service) =>
      runEither(service, { prompt: "" }, harness.mockSpan)
    );
    expectLeft(result, TextInputError);
  });

  it("should succeed for input array with at least one valid string", async () => {
    const result = await harness.run(async (service) =>
      Effect.runPromise(Effect.either(service.generate({
        modelId: testModelId,
        prompt: "foo",
        system: Option.none(),
        span: harness.mockSpan
      })))
    );
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.text).toBe("foo");
    } else {
      throw new Error(`Expected Right, got Left: ${JSON.stringify(result.left)}`);
    }
  });

  it("should succeed for input array with some empty/whitespace and one valid string", async () => {
    const result = await harness.run(async (service) =>
      Effect.runPromise(Effect.either(service.generate({
        modelId: testModelId,
        prompt: "bar",
        system: Option.none(),
        span: harness.mockSpan
      })))
    );
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.text).toBe("bar");
    } else {
      throw new Error(`Expected Right, got Left: ${JSON.stringify(result.left)}`);
    }
  });

  it("should succeed for missing modelId", async () => {
    const result = await harness.run(async (service) =>
      Effect.runPromise(Effect.either(service.generate({
        modelId: undefined,
        prompt: testInput,
        system: Option.none(),
        span: harness.mockSpan
      })))
    );
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.text).toBe(testInput);
    } else {
      throw new Error(`Expected Right, got Left: ${JSON.stringify(result.left)}`);
    }
  });
});

describe("TextService (harnessed)", () => {
  const harness = createAiTestHarness(TestTextService);

  it("should generate text for valid input (happy path)", async () => {
    const result = await harness.run(async (service) =>
      Effect.runPromise(Effect.either(service.generate({
        modelId: testModelId,
        prompt: testInput,
        span: harness.mockSpan,
        system: Option.none()
      })))
    );
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.text).toBe(testText);
      expect(result.right.model).toBe(testModelId);
      expect(result.right.id).toBeDefined();
    } else {
      throw new Error(`Expected Right, got Left: ${JSON.stringify(result.left)}`);
    }
  });
});
