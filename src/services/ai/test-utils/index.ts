/**
 * Common test harness and mocks for AI service tests.
 *
 * This module provides a generic test harness and all mocks needed for AI service tests.
 * Start simple: only ModelService, ProviderService, and LanguageModelV1 mocks are provided.
 * Extend as needed for error mocks, spans, test data, and helpers.
 */

import { Exit } from "effect/Exit";
import { MockModelService } from "../model/__mocks__/model-service.mock.js";
import { MockProviderService } from "../provider/__mocks__/provider-service.mock.js";
import type { LanguageModelV1 } from "ai";
import type { Span, SpanLink } from "effect/Tracer";
import { Context, Option } from "effect";

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
interface AiServiceDeps {
  modelService: unknown;
  providerService: unknown;
}

type ServiceCtor<T> = new (deps: AiServiceDeps) => T;

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
  run<R>(effect: (service: T) => Promise<R>): Promise<R>;
}

export function createAiTestHarness<T>(
  ServiceClass: ServiceCtor<T>,
  overrides: AiTestHarnessOverrides = {}
): AiTestHarness<T> {
  const modelService = overrides.modelService ?? MockModelService;
  const providerService = overrides.providerService ?? MockProviderService;

  const service = new ServiceClass({ modelService, providerService });

  return {
    service,
    modelService,
    providerService,
    mockSpan,
    async run<R>(effect: (service: T) => Promise<R>): Promise<R> {
      return await effect(service);
    }
  };
}


export { MockModelService, MockProviderService };