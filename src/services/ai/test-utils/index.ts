/**
 * Common test harness and mocks for AI service tests.
 *
 * This module provides a generic test harness and all mocks needed for AI service tests.
 * Start simple: only ModelService, ProviderService, and LanguageModelV1 mocks are provided.
 * Extend as needed for error mocks, spans, test data, and helpers.
 */


import { expect } from "vitest";
import type { LanguageModelV1 } from "ai";
import { ConfigProvider, Context, Effect, Option } from "effect";
import { Exit } from "effect/Exit";
import type { Span, SpanLink } from "effect/Tracer";
import { MockModelService } from "@/services/ai/model/__mocks__/model-service.mock.js";
import type { EmbeddingGenerationOptions, EmbeddingService } from "@/services/ai/producers/embedding/service.js";
import { MockProviderService } from "@/services/ai/provider/__mocks__/provider-service.mock.js";
import { ModelServiceApi } from "../model/service.js";
import TextService from "../producers/text/service.js";

// Minimal valid LanguageModelV1 mock
export const MockLanguageModelV1: LanguageModelV1 = {
  specificationVersion: 'v1',
  provider: 'test-provider',
  modelId: 'test-model-id',
  defaultObjectGenerationMode: 'json',
  doGenerate: async () => ({
    text: "mocked",
    finishReason: "stop" as any,
    usage: { promptTokens: 1, completionTokens: 1 },
    rawCall: { rawPrompt: "", rawSettings: {} }
  }),
  doStream: async () => ({
    stream: new ReadableStream(),
    rawCall: { rawPrompt: "", rawSettings: {} }
  }),
};

/**
 * Creates a minimal test harness for any AI service.
 * Accepts the service constructor and a factory function that returns an Effect producing the service instance.
 * Provides ModelService and ProviderService mocks by default.
 * Extend as needed for more advanced scenarios.
 */
export interface AiTestHarnessOverrides {
  modelService?: any;
  providerService?: any;
}

/**
 * Creates a minimal test harness for any AI service.
 * By default, injects the canonical ModelService and ProviderService mocks.
 * Accepts optional overrides for either mock.
 * Extend as needed for spans, context, error mocks, etc.
 */
import type { TextServiceDeps } from "../producers/text/service.js";
import { AiTestConfig } from "./service.js";

type ServiceCtor<T> = new (deps: TextServiceDeps) => T;

export const mockSpan: Span = {
  _tag: "Span",
  name: "mock-span",
  spanId: "mock-span-id",
  traceId: "mock-trace-id",
  attributes: {
    forEach: function (callbackfn: (value: unknown, key: string, map: ReadonlyMap<string, unknown>) => void, thisArg?: any): void {
      throw new Error("Function not implemented.");
    },
    get: function (key: string): unknown {
      throw new Error("Function not implemented.");
    },
    has: function (key: string): boolean {
      throw new Error("Function not implemented.");
    },
    size: 0,
    entries: function (): MapIterator<[string, unknown]> {
      throw new Error("Function not implemented.");
    },
    keys: function (): MapIterator<string> {
      throw new Error("Function not implemented.");
    },
    values: function (): MapIterator<unknown> {
      throw new Error("Function not implemented.");
    },
    [Symbol.iterator]: function (): MapIterator<[string, unknown]> {
      throw new Error("Function not implemented.");
    }
  },
  status: {
    _tag: "Started",
    startTime: BigInt(Date.now())
  } as const,
  links: [],
  attribute: () => { },
  parent: Option.none(),
  context: Context.empty(),
  sampled: false,
  kind: "internal",
  end: function (endTime: bigint, exit: Exit<unknown, unknown>): void {
    throw new Error("Function not implemented.");
  },
  event: function (name: string, startTime: bigint, attributes?: Record<string, unknown>): void {
    throw new Error("Function not implemented.");
  },
  addLinks: function (links: ReadonlyArray<SpanLink>): void {
    throw new Error("Function not implemented.");
  }
};



export interface AiTestHarness<T> {
  service: T;
  modelService: unknown;
  providerService: unknown;
  mockSpan: Span;
  configProvider: ConfigProvider.ConfigProvider;
  run<R>(effect: (service: T) => Effect.Effect<R, unknown, ConfigProvider.ConfigProvider>): Promise<R>
}

export function createAiTestHarness<TServiceApi>(
  ServiceClass: ServiceCtor<TServiceApi>,
  overrides: { modelService: any; providerService: any; config: AiTestConfig }
): AiTestHarness<TServiceApi> {
  const { modelService, providerService, config } = overrides;
  const configProvider: ConfigProvider.ConfigProvider = ConfigProvider.fromMap(new Map());
  // Pass all required deps including config
  const service = new ServiceClass({ modelService, providerService, config });
  return {
    service,
    modelService,
    providerService,
    mockSpan,
    configProvider,
    async run<R>(effect: (service: TServiceApi) => Effect.Effect<R, unknown, ConfigProvider.ConfigProvider>): Promise<R> {
      return await Effect.runPromise(
        Effect.provideService(effect(service), ConfigProvider.ConfigProvider, configProvider)
      );
    }
  };
}


/**
 * Runs service.generate and returns an Effect.Either result for test assertions.
 */
export async function runEither(
  service: EmbeddingService,
  opts: Partial<EmbeddingGenerationOptions> & { input: string },
  mockSpan: Span
): Promise<unknown>;

export async function runEither(
  service: EmbeddingService,
  opts: Partial<EmbeddingGenerationOptions> & { input: string[] },
  mockSpan: Span
): Promise<unknown>;

export async function runEither(
  service: EmbeddingService,
  opts: Partial<EmbeddingGenerationOptions> & { input: string | string[] },
  mockSpan: Span
): Promise<unknown> {
  return await Effect.runPromise(
    Effect.either(
      service.generate({
        modelId: opts.modelId,
        input: opts.input,
        span: opts.span ?? mockSpan
      })
    )
  );
}


/**
 * Asserts that result is a Left (error) and error is of expected class.
 */
export const expectLeft = (
  result: unknown,
  errorClass: new (...args: any[]) => unknown,
  expect: (value: unknown) => any
) => {
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
};

/**
 * Asserts that result is a Right (success).
 */
export const expectRight = (
  result: unknown,
  expect: (value: unknown) => any
) => {
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
};

export { MockModelService, MockProviderService };

// --- Producer Test Helper Functions ---

/**
 * Helper for use with Exit.match in Effect-based tests.
 * Throws if called (for use as onSuccess in failure-expected tests).
 *
 * @param _ - The value (ignored)
 * @throws Always throws an error indicating unexpected success.
 */
export function expectFailure(_?: unknown): never {
  throw new Error("Expected failure, got success");
}

/**
 * Helper for use with Exit.match in Effect-based tests.
 * Asserts that the error message contains the given substring.
 *
 * @param error - The error value
 * @param substring - Substring to expect in error message
 */
export function expectErrorContains(error: unknown, substring: string): void {
  expect(error?.toString()).toContain(substring);
}

/**
 * Helper to extract and assert the first text part from a chat response.
 * Throws a descriptive error if the structure is not as expected.
 *
 * @param response - The chat response object
 * @param expectedContent - The expected text content
 */
export function expectFirstTextPart(response: { role: unknown; parts: any }, expectedContent: string): void {
  expect(response.role).toBeDefined();
  const firstPartOption = Array.isArray(response.parts) ? response.parts[0] : response.parts?.get?.(0) ?? response.parts?.[0];
  if (firstPartOption && (firstPartOption._tag === "Text" || firstPartOption._tag === "Some")) {
    const textPart = firstPartOption._tag === "Some" ? firstPartOption.value : firstPartOption;
    if (textPart._tag === "Text") {
      expect(textPart.content).toBe(expectedContent);
    } else {
      throw new Error("First part is not a TextPart");
    }
  } else {
    throw new Error("Expected at least one part in result.parts");
  }
}
