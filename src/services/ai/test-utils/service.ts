import { Effect, Layer, TestConfig } from "effect";

/**
 * Configuration shape for TextService used in tests.
 */
export interface AiTestConfig {
  getConfig: Effect.Effect<{ logLevel: string; connection: string }>;
}

import * as Context from "effect/Context";
import type { Either } from "effect/Either";
import type { Exit } from "effect/Exit";

/**
 * Interface for test configuration.
 */
export interface TestConfig {
  readonly getConfig: Effect.Effect<{
    readonly logLevel: string;
    readonly connection: string;
  }>;
}

/**
 * Tag for test configuration.
 */
export const TestConfigTag = Context.GenericTag<TestConfig>("TestConfig");

/**
 * Provides a static configuration for testing.
 */
export const ConfigLive = Layer.succeed(
  TestConfigTag,
  {
    getConfig: Effect.succeed({
      logLevel: "INFO",
      connection: "mysql://username:password@hostname:port/database_name"
    })
  } as const
);

import { expect } from "vitest";
import ModelService from "@/services/ai/model/service.js";
import ProviderService from "@/services/ai/provider/service.js";
import type { TestHarnessService as TestHarnessServiceApi } from "@/services/ai/test-utils/api.js";

/**
 * Converts Either<A, E> to Either<E, A> for type safety.
 */
function swapEither<A, E>(either: Either<A, E>): Either<E, A> {
  return either._tag === "Left"
    ? { _tag: "Left", left: either.left } as unknown as Either<E, A>
    : { _tag: "Right", right: either.right } as unknown as Either<E, A>;
}

/**
 * Converts Exit<A, E> to Exit<E, A> for type safety.
 * Note: Uses a double cast for test harness only.
 */
function swapExit<A, E>(exit: Exit<A, E>): Exit<E, A> {
  return exit as unknown as Exit<E, A>;
}

class TestHarnessService extends Effect.Service<TestHarnessServiceApi>()("TestHarnessService", {
  /**
   * All helpers and mocks are provided as part of the harness service.
   * Real ModelService and ProviderService are yielded from Effect and included in the service object.
   */
  effect: Effect.gen(function* () {
    // Ensure ModelService and ProviderService are available in the Effect context for test harness consumers
    yield* ModelService;
    yield* ProviderService;
    return {
      /**
       * A minimal mock LanguageModelV1 for use in tests.
       */
      mockLanguageModelV1: {
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
        })
      } as import("ai").LanguageModelV1,
      /**
       * A mock Span for use in tests.
       */
      mockSpan: {
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
        parent: undefined,
        context: undefined,
        sampled: false,
        kind: "internal",
        end: function (endTime: bigint, exit: unknown): void {
          throw new Error("Function not implemented.");
        },
        event: function (name: string, startTime: bigint, attributes?: Record<string, unknown>): void {
          throw new Error("Function not implemented.");
        },
        addLinks: function (links: ReadonlyArray<unknown>): void {
          throw new Error("Function not implemented.");
        }
      },
      /**
       * Helper for asserting failure in Effect-based tests.
       */
      expectFailure(_?: unknown): never {
        throw new Error("Expected failure, got success");
      },
      /**
       * Helper for asserting error messages contain a substring.
       */
      expectErrorContains(error: unknown, substring: string): void {
        expect(error?.toString()).toContain(substring);
      },
      /**
       * Helper to extract and assert the first text part from a chat response.
       */
      expectFirstTextPart(response: { role: unknown; parts: any }, expectedContent: string): void {
        expect(response.role).toBeDefined();
        const firstPartOption = Array.isArray(response.parts)
          ? response.parts[0]
          : response.parts?.get?.(0) ?? response.parts?.[0];
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
      },
      /**
       * Runs an Effect and returns the Effect itself (for advanced composition).
       *
       * The effect must have all dependencies provided (i.e., environment is never).
       *
       * @template E Error type
       * @template A Value type
       * @param effect Effect to run (must be Effect<A, E, never>)
       * @returns Effect<A, E, never>
       */
      runEffect<E, A>(effect: Effect.Effect<A, E, never>): Effect.Effect<A, E, never> {
        return effect;
      },

      /**
       * Runs an Effect and returns an Either result for test assertions.
       *
       * The effect must have all dependencies provided (i.e., environment is never).
       *
       * @template E Error type (Left)
       * @template A Value type (Right)
       * @param effect Effect to run (must be Effect<A, E, never>)
       * @returns Promise<Either<E, A>>
       */
      runEither<E, A>(effect: Effect.Effect<A, E, never>): Promise<Either<E, A>> {
        return Effect.runPromise(Effect.either(effect)).then(swapEither);
      },

      /**
       * Runs an Effect and returns an Exit result for advanced test assertions.
       *
       * The effect must have all dependencies provided (i.e., environment is never).
       *
       * @template E Error type
       * @template A Value type
       * @param effect Effect to run (must be Effect<A, E, never>)
       * @returns Promise<Exit<E, A>>
       */
      runExit<E, A>(effect: Effect.Effect<A, E, never>): Promise<Exit<E, A>> {
        return Effect.runPromiseExit(effect).then(swapExit);
      }
    };

  }),
  /**
   * Real ModelService and ProviderService are required dependencies for the harness.
   */
  dependencies: [
    ConfigLive,
    ModelService.Default,
    ProviderService.Default
  ] as const,

}) {}

export default TestHarnessService;
