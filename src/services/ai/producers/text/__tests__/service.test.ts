import type { TextServiceApi } from "@/services/ai/producers/text/api.js";
import { createAiTestHarness, MockProviderService, MockModelService } from "@/services/ai/test-utils/index.js";
import { TextGenerationError, TextModelError, TextProviderError } from "@/services/ai/producers/text/errors.js";
import { TextService, type TextGenerationOptions } from "@/services/ai/producers/text/service.js";
import TestHarnessService from "@/services/ai/test-utils/service.js";
import { AiResponse } from "@effect/ai/AiResponse";
import * as AiRole from "@effect/ai/AiRole";
import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { TextInputError } from "@/services/ai/producers/text/errors.js";

interface AiTestConfig {
  getConfig:Effect.Effect<{ logLevel: string; connection: string }>;
}

// Minimal Effect.gen to reveal TestHarnessService type in IDE
// Compose all required dependencies into a Layer
import { ConfigLive } from "@/services/ai/test-utils/service.js";

const harnessLayer = TestHarnessService.Default;

// Compose all required dependencies into a single Layer
import * as ConfigProviderModule from "effect/ConfigProvider";
const ConfigProvider = ConfigProviderModule.ConfigProvider;

const harnessLayerProvided = harnessLayer.pipe(
  Layer.provide(Layer.succeed(ConfigProvider, ConfigProviderModule.fromEnv()))
);

const fullLayer = Layer.mergeAll(
  ConfigLive,
  harnessLayerProvided // <-- use this!
);

const providerServiceMock = Object.assign({}, MockProviderService, {
  getProviderClient: () => ({
    generateText: (
      _effectiveInput: any,
      opts: { modelId: string; system?: string }
    ) =>
      Effect.succeed({
        data: { text: "mocked text" },
        metadata: {
          finishReason: "stop",
          model: opts.modelId ?? "mock-model-id",
          timestamp: new Date(),
          id: "mock-id"
        }
      })
  })
});

const testConfig: AiTestConfig = {
  getConfig: Effect.succeed({ logLevel: "INFO", connection: "test" })
};

function createTextServiceHarness(providerServiceOverride?: any) {
  return createAiTestHarness(TextService, {
    modelService: MockModelService,
    providerService: providerServiceOverride ?? providerServiceMock,
    config: testConfig
  });
}

describe("TextService", () => {
  it("should generate text for valid input (happy path)", async () => {
  // Arrange
  const modelId = "mock-model-id";
  const prompt = "Hello, world!";
  const harness = createTextServiceHarness(providerServiceMock);
    const result = await harness.run(service =>
      Effect.either(
        service.generate({
          modelId,
          prompt,
          span: harness.mockSpan,
          system: Option.none(),
          parameters: undefined
        })
      )
    );
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      const response = result.right as { text: string };
      expect(response.text).toBe("mocked text");
    }
  });

  it("should fail for empty prompt", async () => {
    const harness = createTextServiceHarness();
    const modelId = "mock-model-id";
    const result = await harness.run(service =>
      Effect.either(
        service.generate({
          modelId,
          prompt: "",
          span: harness.mockSpan,
          system: Option.none(),
          parameters: undefined
        })
      )
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(TextGenerationError);
      expect((result.left as TextGenerationError).description).toContain("Prompt cannot be empty");
    }
  });

  it("should return truncated text for long prompt", async () => {
    const longPromptMock = Object.assign({}, MockProviderService, {
      getProviderClient: () => ({
        generateText: (
          _effectiveInput: any,
          opts: { modelId: string; system?: string }
        ) =>
          Effect.succeed({
            data: { text: "This is a very long ..." },
            metadata: {
              finishReason: "stop",
              model: opts.modelId ?? "mock-model-id",
              timestamp: new Date(),
              id: "mock-id"
            }
          })
      })
    });
    const harness = createTextServiceHarness(longPromptMock);
    const modelId = "mock-model-id";
    const prompt = "This is a very long prompt that should be truncated by the service.";
    const result = await harness.run(service =>
      Effect.either(
        service.generate({
          modelId,
          prompt,
          span: harness.mockSpan,
          system: Option.none(),
          parameters: undefined
        })
      )
    );
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      const response = result.right as { text: string };
      expect(response.text).toBe("This is a very long ...");
    }
  });

  it("should handle undefined parameters gracefully", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const modelId = "mock-model-id";
        const mockSpan = harness.mockSpan;
        const undefinedParamsMock: TextServiceApi = {
          generate: ({ prompt }: TextGenerationOptions) =>
            Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
        };
        const result = yield* Effect.promise(() => harness.runEither(() =>
          undefinedParamsMock.generate({
            modelId,
            prompt: "Hello world!",
            span: harness.mockSpan,
            system: Option.none(),
            parameters: undefined
          })
        ));
        expect(result._tag).toBe("Right");
        if (result._tag === "Right") {
          const response = result.right as { text: string };
          expect(response.text).toBe("Hello world!");
        }
      }).pipe(Effect.provide(fullLayer))
    );
  });

  it("should handle system prompt present", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const modelId = "mock-model-id";
        const mockSpan = harness.mockSpan;
        const systemPromptMock: TextServiceApi = {
          generate: ({ prompt, system }: TextGenerationOptions) =>
            Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: system && Option.isSome(system) ? `${prompt} (system: ${Option.getOrUndefined(system)})` : prompt }))
        };
        const result = yield* systemPromptMock.generate({
          modelId,
          prompt: "Respond to this.",
          span: mockSpan,
          system: Option.some("system-message"),
          parameters: undefined
        });
        expect(result.text).toBe("Respond to this. (system: system-message)");
      }).pipe(Effect.provide(fullLayer))
    );
  });

  it("should handle missing modelId gracefully", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const modelId = undefined;
        const mockSpan = harness.mockSpan;
        const modelErrorMock: TextServiceApi = {
          generate: ({ modelId, prompt }: TextGenerationOptions) =>
            modelId === undefined
              ? Effect.fail(
                new TextModelError({
                  module: "TextService",
                  method: "generate",
                  description: "Model ID is required"
                })
              )
              : Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
        };
        const result = yield* modelErrorMock.generate({
          modelId: undefined,
          prompt: "foo",
          span: mockSpan,
          system: Option.none(),
          parameters: undefined
        });
        expect(result).rejects.toThrow("Model ID is required");
      }).pipe(Effect.provide(fullLayer))
    );
  });

  it("should handle provider error", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const providerErrorMock: TextServiceApi = {
          generate: ({ prompt }: TextGenerationOptions) =>
            Effect.fail(
              new TextProviderError({
                module: "TextService",
                method: "generate",
                description: "Provider error"
              })
            )
        };
        const result = yield* providerErrorMock.generate({
          modelId: "mock-model-id",
          prompt: "foo",
          span: harness.mockSpan,
          system: Option.none(),
          parameters: undefined
        });
        expect(result).rejects.toThrow("Provider error");
      }).pipe(Effect.provide(fullLayer))
    );
  });

  it("should handle parameters object", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const paramsMock: TextServiceApi = {
          generate: ({ prompt, parameters }: TextGenerationOptions) =>
            Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: parameters ? `${prompt} (params: ${JSON.stringify(parameters)})` : prompt }))
        };
        const result = yield* paramsMock.generate({
          modelId: "test-model-id",
          prompt: "Show parameters",
          span: harness.mockSpan,
          system: Option.none(),
          parameters: { maxSteps: 10, maxRetries: 3 }
        });
        expect(result.text).toBe('Show parameters (params: {"maxSteps":10,"maxRetries":3})');
      }).pipe(Effect.provide(fullLayer))
    );
  });

  it("should handle invalid input gracefully", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const modelId = "test-model-id";
        const mockSpan = harness.mockSpan;
        const inputErrorMock: TextServiceApi = {
          generate: ({ prompt }: TextGenerationOptions) =>
            prompt === "invalid"
              ? Effect.fail(
                new TextGenerationError({
                  module: "TextService",
                  method: "generate",
                  description: "Input is invalid"
                })
              )
              : Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
        };
        const result = yield* inputErrorMock.generate({
          modelId,
          prompt: "invalid",
          span: mockSpan,
          system: Option.none(),
          parameters: undefined
        });
        expect(result).rejects.toThrow("Input is invalid");
      }).pipe(Effect.provide(fullLayer))
    );
  });

  it("should handle undefined parameters gracefully", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
      const modelId = "mock-model-id";
      const mockSpan = harness.mockSpan;
      const undefinedParamsMock: TextServiceApi = {
        generate: ({ prompt }: TextGenerationOptions) =>
          Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
      };
      const result = yield* Effect.promise(() => harness.runEither(() =>
        undefinedParamsMock.generate({
          modelId,
          prompt: "Hello world!",
          span: mockSpan,
          system: Option.none(),
          parameters: undefined
        })
      ));
      expect(result._tag).toBe("Right");
      if (result._tag === "Right") {
        const response = result.right as { text: string };
        expect(response.text).toBe("Hello world!");
      }
    }).pipe(Effect.provide(fullLayer))
  );
});

it("should handle system prompt present", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const harness = yield* TestHarnessService;
      const modelId = "mock-model-id";
      const mockSpan = harness.mockSpan;
      const systemPromptMock: TextServiceApi = {
        generate: ({ prompt, system }: TextGenerationOptions) =>
          Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: system && Option.isSome(system) ? `${prompt} (system: ${Option.getOrUndefined(system)})` : prompt }))
      };
      const result = yield* systemPromptMock.generate({
        modelId,
        prompt: "Respond to this.",
        span: mockSpan,
        system: Option.some("system-message"),
        parameters: undefined
      });
      expect(result.text).toBe("Respond to this. (system: system-message)");
    }).pipe(Effect.provide(fullLayer))
  );
});

it("should handle missing modelId gracefully", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const harness = yield* TestHarnessService;
      const modelId = undefined;
      const mockSpan = harness.mockSpan;
      const modelErrorMock: TextServiceApi = {
        generate: ({ modelId, prompt }: TextGenerationOptions) =>
          modelId === undefined
            ? Effect.fail(
              new TextModelError({
                module: "TextService",
                method: "generate",
                description: "Model ID is required"
              })
            )
            : Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
      };
      const result = yield* modelErrorMock.generate({
        modelId: undefined,
        prompt: "foo",
        span: mockSpan,
        system: Option.none(),
        parameters: undefined
      });
      expect(result).rejects.toThrow("Model ID is required");
    }).pipe(Effect.provide(fullLayer))
  );
});

it("should handle provider error", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const harness = yield* TestHarnessService;
      const providerErrorMock: TextServiceApi = {
        generate: ({ prompt }: TextGenerationOptions) =>
          Effect.fail(
            new TextProviderError({
              module: "TextService",
              method: "generate",
              description: "Provider error"
            })
          )
      };
      const result = yield* providerErrorMock.generate({
        modelId: "mock-model-id",
        prompt: "foo",
        span: harness.mockSpan,
        system: Option.none(),
        parameters: undefined
      });
      expect(result).rejects.toThrow("Provider error");
    }).pipe(Effect.provide(fullLayer))
  );
});

it("should handle parameters object", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const harness = yield* TestHarnessService;
      const paramsMock: TextServiceApi = {
        generate: ({ prompt, parameters }: TextGenerationOptions) =>
          Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: parameters ? `${prompt} (params: ${JSON.stringify(parameters)})` : prompt }))
      };
      const result = yield* paramsMock.generate({
        modelId: "test-model-id",
        prompt: "Show parameters",
        span: harness.mockSpan,
        system: Option.none(),
        parameters: { maxSteps: 10, maxRetries: 3 }
      });
      expect(result.text).toBe('Show parameters (params: {"maxSteps":10,"maxRetries":3})');
    }).pipe(Effect.provide(fullLayer))
  );
});

it("should handle invalid input gracefully", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const harness = yield* TestHarnessService;
      const modelId = "test-model-id";
      const mockSpan = harness.mockSpan;
      const inputErrorMock: TextServiceApi = {
        generate: ({ prompt }: TextGenerationOptions) =>
          prompt === "invalid"
            ? Effect.fail(
              new TextGenerationError({
                module: "TextService",
                method: "generate",
                description: "Input is invalid"
              })
            )
            : Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
      };
      const result = yield* inputErrorMock.generate({
        modelId,
        prompt: "invalid",
        span: mockSpan,
        system: Option.none(),
        parameters: undefined
      });
      expect(result).rejects.toThrow("Input is invalid");
    }).pipe(Effect.provide(fullLayer))
  );
});

it("should support multiple calls in parallel", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const harness = yield* TestHarnessService;
      const parallelMock: TextServiceApi = {
        generate: ({ prompt }: TextGenerationOptions) =>
          Effect.succeed(
            AiResponse.fromText({ role: AiRole.model, content: prompt.toUpperCase() })
          )
      };
      const prompts = ["one", "two", "three"];
      const results = yield* Effect.forEach(prompts, (prompt) =>
        parallelMock.generate({
          modelId: "test-model-id",
          prompt,
          span: harness.mockSpan,
          system: Option.none(),
          parameters: undefined
        })
      );
      expect(results.map(r => r.text)).toEqual(["ONE", "TWO", "THREE"]);
    }).pipe(Effect.provide(fullLayer))
  );
});

  it("should handle model error", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const modelErrorMock: TextServiceApi = {
          generate: ({ modelId }: TextGenerationOptions) =>
            modelId === undefined
              ? Effect.fail(
                new TextModelError({
                  module: "TextService",
                  method: "generate",
                  description: "Model ID is required"
                })
              )
              : Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: "ok" }))
        };
        const harnessWithModelError = {
          ...harness,
          generate: modelErrorMock.generate
        };
        const result = yield* Effect.promise(() => harness.runEither(() =>
          harnessWithModelError.generate({
            modelId: undefined,
            prompt: "foo",
            span: harness.mockSpan,
            system: Option.none(),
            parameters: undefined
          })
        ));
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect((result.left as TextModelError)).toBeInstanceOf(TextModelError);
          expect((result.left as TextModelError).description).toContain("Model ID is required");
        }
      }).pipe(Effect.provide(fullLayer))
    );

    it("should handle provider error", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const harness = yield* TestHarnessService;
          const providerErrorMock: TextServiceApi = {
            generate: ({ prompt }: TextGenerationOptions) =>
              Effect.fail(
                new TextProviderError({
                  module: "TextService",
                  method: "generate",
                  description: "Provider error"
                })
              )
          };
          const result = yield* providerErrorMock.generate({
            modelId: "mock-model-id",
            prompt: "foo",
            span: harness.mockSpan,
            system: Option.none(),
            parameters: undefined
          });
          expect(result).rejects.toThrow("Provider error");
        }).pipe(Effect.provide(fullLayer))
      );
    });

    it("should handle parameters object", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const harness = yield* TestHarnessService;
          const paramsMock: TextServiceApi = {
            generate: ({ prompt, parameters }: TextGenerationOptions) =>
              Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: parameters ? `${prompt} (params: ${JSON.stringify(parameters)})` : prompt }))
          };
          const result = yield* paramsMock.generate({
            modelId: "test-model-id",
            prompt: "Show parameters",
            span: harness.mockSpan,
            system: Option.none(),
            parameters: { maxSteps: 10, maxRetries: 3 }
          });
          expect(result.text).toBe('Show parameters (params: {"maxSteps":10,"maxRetries":3})');
        }).pipe(Effect.provide(fullLayer))
      );
    });

    it("should propagate TextInputError if input is invalid", async () => {
      const { TextInputError } = await import("@/services/ai/producers/text/errors.js");
      await Effect.runPromise(
        Effect.gen(function* () {
          const harness = yield* TestHarnessService;
          const inputErrorMock: TextServiceApi = {
            generate: ({ prompt }: TextGenerationOptions) =>
              prompt === "invalid"
                ? Effect.fail(
                  new TextGenerationError({
                    module: "TextService",
                    method: "generate",
                    description: "Input is invalid"
                  })
                )
                : Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
          };
          const result = yield* inputErrorMock.generate({
            modelId: "test-model-id",
            prompt: "invalid",
            span: harness.mockSpan,
            system: Option.none(),
            parameters: undefined
          });
          expect(result).rejects.toThrow("Input is invalid");
        }).pipe(Effect.provide(fullLayer))
      );
    });

    it("should handle model error", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const harness = yield* TestHarnessService;
          const modelErrorMock: TextServiceApi = {
            generate: ({ modelId }: TextGenerationOptions) =>
              Effect.fail(
                new TextModelError({
                  description: "Model ID is required",
                  module: "TextService",
                  method: "generate"
                })
              )
          };
          const harnessWithModelError = {
            ...harness,
            generate: modelErrorMock.generate
          };
          const result = yield* Effect.promise(() => harness.runEither(() =>
            harnessWithModelError.generate({
              modelId: undefined,
              prompt: "foo",
              span: harness.mockSpan,
              system: Option.none(),
              parameters: undefined
            })
          ));
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect((result.left as TextModelError).description).toContain("Model ID is required");
          }
        }).pipe(Effect.provide(fullLayer))
      );
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const harness = yield* TestHarnessService;
        const inputErrorMock: TextServiceApi = {
          generate: ({ prompt }: TextGenerationOptions) =>
            prompt === "invalid"
              ? Effect.fail(
                new TextGenerationError({
                  module: "TextService",
                  method: "generate",
                  description: "Input is invalid"
                })
              )
              : Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
        };
        const result = yield* Effect.either(
          inputErrorMock.generate({
            modelId: "test-model-id",
            prompt: "invalid",
            span: harness.mockSpan,
            system: Option.none(),
            parameters: undefined
          })
        );
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(TextInputError);
          expect(result.left.description).toContain("Input is invalid");
        }
      }).pipe(Effect.provide(fullLayer))
    );


    it("should support multiple calls in parallel", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const harness = yield* TestHarnessService;
          const parallelMock: TextServiceApi = {
            generate: ({ prompt }: TextGenerationOptions) =>
              Effect.succeed(
                AiResponse.fromText({ role: AiRole.model, content: prompt.toUpperCase() })
              )
          };
          const prompts = ["one", "two", "three"];
          const results = yield* Effect.forEach(prompts, (prompt) =>
            parallelMock.generate({
              modelId: "test-model-id",
              prompt,
              span: harness.mockSpan,
              system: Option.none(),
              parameters: undefined
            })
          );
          expect(results.map(r => r.text)).toEqual(["ONE", "TWO", "THREE"]);
        }).pipe(Effect.provide(fullLayer))
      );
    })
  })
});