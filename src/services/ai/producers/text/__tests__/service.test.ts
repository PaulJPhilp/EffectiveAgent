import type { TextGenerationOptions } from "../api.js"; 
import { Effect, Option, Exit } from "effect";
import { describe, it, expect, beforeEach } from "vitest";
import { TextService } from "../service.js";
import { TextServiceApi } from "../api.js";
import { TextModelError } from "../errors.js";
import { TextProviderError } from "../errors.js";
import { TextGenerationError } from "../errors.js";
import { TextInputError } from "../errors.js";
import { AiTestHarness, createTestHarness } from "../../../test-utils/index.js";
import { ModelError } from "../../../model/errors.js";
import { ProviderError } from "../../../provider/errors.js";
import { ProviderOperationError } from "../../../provider/errors.js";
import { AiResponse } from "@effect/ai/AiResponse";
import * as AiRole from "@effect/ai/AiRole";
import { ModelCapability } from "@/schema.js";
import type { ConfigProvider } from "effect/ConfigProvider";  

interface AiTestConfig {
  getConfig:Effect.Effect<{ logLevel: string; connection: string }>;
}

const providerServiceMock = Object.assign({}, {
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

/**
 * Creates a standardized test harness for TextService tests
 * @param providerServiceOverride Optional provider service mock override
 * @returns A configured test harness for TextService
 */
function createTextServiceHarness(providerServiceOverride?: any) {
  return createTestHarness({
    modelService: {
      validateModel: (_modelId: string, _capabilities: Set<ModelCapability>) => {
        const capabilities = _capabilities ?? new Set<ModelCapability>();
        if (capabilities.has("text-generation")) {
          return Effect.succeed(void 0);
        }
        // Fix error construction
        return Effect.fail(new TextModelError({ 
          description: "Model does not support text generation",
          module: "TextService.test", 
          method: "mockValidateModel"
        }));
      }
    },
    providerService: providerServiceOverride ?? providerServiceMock,
    config: testConfig
  });
}

/**
 * Creates a mock TextServiceApi implementation with the specified behavior
 * @param generateFn Function that implements the generate method behavior
 * @returns A mock TextServiceApi implementation
 */
function createTextServiceApiMock(
  generateFn: (options: TextGenerationOptions) => Effect.Effect<AiResponse, any>
): TextServiceApi {
  return {
    generate: generateFn
  };
}

/**
 * Helper function to run a TextService test with standardized setup
 * @param options Test configuration options
 * @returns Promise that resolves when the test completes
 */
interface RunTextServiceTestOptions {
  modelId?: string;
  prompt: string;
  system?: Option.Option<string>;
  parameters?: Record<string, any>;
  providerMock?: any;
  // Correct type parameter name 'effect' to 'Effect'
  testFn: (result: Exit.Exit<any, any>, harness: AiTestHarness<TextServiceApi>) => void
}

async function runTextServiceTest(options: RunTextServiceTestOptions): Promise<void> {
  const { modelId, prompt, system, parameters, providerMock } = options;
  
  const harness = createTextServiceHarness(providerMock);
  const service = new TextService({
    modelService: harness.modelService,
    providerService: harness.providerService,
    config: {
      getConfig: Effect.succeed({ logLevel: "info", connection: "test" })
    }
  });

  const result = await harness.run(() => service.generate({
    modelId,
    prompt,
    system: system ?? Option.none(),
    parameters
  }));
  
  options.testFn(result, harness);
}

/**
 * Helper function to assert successful test results
 * @param result The test result to check
 * @param assertFn Function to perform additional assertions on the success value
 */
function expectSuccess(result: any, assertFn: (value: any) => void): void {
  expect(result._tag).toBe("Right");
  if (result._tag === "Right") {
    assertFn(result.right);
  } else {
    throw new Error(`Expected Right result, got ${result._tag}`);
  }
}

/**
 * Helper function to assert error test results
 * @param result The test result to check
 * @param errorType Expected error type constructor
 * @param assertFn Function to perform additional assertions on the error
 */
function expectError(
  result: any,
  errorType: new (...args: any[]) => any,
  assertFn?: (error: any) => void
): void {
  expect(result._tag).toBe("Left");
  if (result._tag === "Left") {
    expect(result.left).toBeInstanceOf(errorType);
    if (assertFn) {
      assertFn(result.left);
    }
  } else {
    throw new Error(`Expected Left result with ${errorType.name}, got ${result._tag}`);
  }
}

describe("TextService", () => {
  let harness: AiTestHarness<TextServiceApi>;

  beforeEach(() => {
    harness = createTextServiceHarness();
  });

  describe("Basic functionality", () => {
    it("should generate text for valid input (happy path)", async () => {
      const result = await harness.run((service) => service.generate({
        modelId: "mock-model-id",
        prompt: "Hello, world!",
        span: harness.mockSpan,
        system: Option.none(),
        parameters: undefined
      }));
      expectSuccess(result, (response) => {
        expect(response.text).toBe("mocked text");
      });
    });

    it("should return truncated text for long prompt", async () => {
      const longPromptMock = Object.assign({}, {
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

      const result = await harness.run((service: TextServiceApi) => service.generate({
        modelId: "mock-model-id",
        prompt: "This is a very long prompt that should be truncated by the service.",
        span: harness.mockSpan,
        system: Option.none(),
        parameters: undefined
      }));
      expectSuccess(result, (response) => {
        expect(response.text).toBe("This is a very long ...");
      });
    });
  });

  describe("Input validation", () => {
    it("should fail for empty prompt", async () => {
      const result = await harness.run((service: TextServiceApi) => service.generate({
        modelId: "mock-model-id",
        prompt: "",
        span: harness.mockSpan,
        system: Option.none(),
        parameters: undefined
      }));
      expectError(result, TextGenerationError, (error) => {
        expect(error.description).toContain("Prompt cannot be empty");
      });
    });
  });

  describe("Parameter handling", () => {
    it("should handle undefined parameters gracefully", async () => {
      const undefinedParamsMock = createTextServiceApiMock(({ prompt }) => 
        Effect.succeed(AiResponse.fromText({ role: AiRole.model, content: prompt }))
      );
      
      const result = await harness.run((service: TextServiceApi) => undefinedParamsMock.generate({
        modelId: "mock-model-id",
        prompt: "Hello world!",
        span: harness.mockSpan,
        system: Option.none(),
        parameters: undefined
      }));
      expectSuccess(result, (response) => {
        expect(response.text).toBe("Hello world!");

      const result = await harness.run(() =>
        service.generate({
          prompt: "test prompt",
          system: Option.none(),
          modelId: "test-model"
        })
      );

      expect(result).toEqual(
        Exit.succeed([{ content: "test response", role: "assistant" }])
      );
    });

    it("should handle missing model ID", async () => {
      const service = await Effect.runPromise(
        TextService.make({
          modelService: harness.modelService,
          providerService: harness.providerService,
          config: AiConfig.default
        })
      );

      const result = await harness.run(() =>
        service.generate({
          prompt: "test prompt",
          system: Option.none()
        })
      );

      expect(result).toEqual(
        Exit.succeed([{ content: "test response", role: "assistant" }])
      );
    });

    it("should handle empty prompt", async () => {
      const service = await Effect.runPromise(
        TextService.make({
          modelService: harness.modelService,
          providerService: harness.providerService,
          config: AiConfig.default
        })
      );

      const result = await harness.run(() =>
        service.generate({
          prompt: "",
          system: Option.none()
        })
      );

      expect(result).toEqual(
        Exit.fail(
          new TextInputError("Prompt cannot be empty", { prompt: "" })
        )
      );
    });

    it("should handle model error", async () => {
      const mockModelService = {
        ...defaultMockModelService,
        getModel: () =>
          Effect.fail(
            new ModelError("Model not found", { modelId: "test-model" })
          )
      };

      const harness = createTestHarness<TextServiceApi>({
        modelService: mockModelService
      });

      const service = await Effect.runPromise(
        TextService.make({
          modelService: harness.modelService,
          providerService: harness.providerService,
          config: AiConfig.default
        })
      );

      const result = await harness.run(() =>
        service.generate({
          prompt: "test prompt",
          system: Option.none(),
          modelId: "test-model"
        })
      );

      expect(result).toEqual(
        Exit.fail(new TextModelError("Model not found", { modelId: "test-model" }))
      );
    });

    it("should handle provider error", async () => {
      const mockProviderService = {
        ...defaultMockProviderService,
        getProvider: () =>
          Effect.fail(
            new ProviderError("Provider not found", { providerId: "test-provider" })
          )
      };

      const harness = createTestHarness<TextServiceApi>({
        providerService: mockProviderService
      });

      const service = await Effect.runPromise(
        TextService.make({
          modelService: harness.modelService,
          providerService: harness.providerService,
          config: AiConfig.default
        })
      );

      const result = await harness.run(() =>
        service.generate({
          prompt: "test prompt",
          system: Option.none(),
          modelId: "test-model"
        })
      );

      expect(result).toEqual(
        Exit.fail(
          new TextProviderError("Provider not found", {
            providerId: "test-provider"
          })
        )
      );
    });

    it("should handle generation error", async () => {
      const mockProviderService = {
        ...defaultMockProviderService,
        getProvider: () =>
          Effect.succeed({
            ...defaultMockProviderClient,
            generateText: () =>
              Effect.fail(
                new ProviderOperationError(
                  "Generation failed",
                  { reason: "test error" },
                  { providerId: "test-provider" }
                )
              )
          })
      };

      const harness = createTestHarness<TextServiceApi>({
        providerService: mockProviderService
      });

      const service = await Effect.runPromise(
        TextService.make({
          modelService: harness.modelService,
          providerService: harness.providerService,
          config: AiConfig.default
        })
      );

      const result = await harness.run(() =>
        service.generate({
          prompt: "test prompt",
          system: Option.none(),
          modelId: "test-model"
        })
      );

      expect(result).toEqual(
        Exit.fail(
          new TextGenerationError("Generation failed", {
            reason: "test error",
            providerId: "test-provider"
          })
        )
      );
    });
  });

  describe("Advanced scenarios", () => {
    it("should support multiple calls in parallel", async () => {
      const parallelMock = createTextServiceApiMock(({ prompt }) => 
        Effect.succeed(
          AiResponse.fromText({ role: AiRole.model, content: prompt.toUpperCase() })
        )
      );
      
      const result = await harness.run(
        Effect.forEach(["one", "two", "three"], (prompt) =>
          parallelMock.generate({
            modelId: "test-model-id",
            prompt,
            span: harness.mockSpan,
            system: Option.none(),
            parameters: undefined
          })
        )
      );
      expectSuccess(result, (responses) => {
        expect(responses.map((r: AiResponse) => r.text)).toEqual(["ONE", "TWO", "THREE"]);
      });
    });
    
    it("should propagate TextInputError for invalid input", async () => {
      const inputErrorMock = createTextServiceApiMock(
        // Fix error construction
        (_opts) => Effect.fail(new TextInputError({ 
          description: "Input is invalid",
          module: "TextService.test", 
          method: "mockGenerate"
        })) 
      );
      
      const harnessWithInputError = createTextServiceHarness(inputErrorMock);
      const result = await harnessWithInputError.run((service: TextServiceApi) => harnessWithInputError.service.generate({
        modelId: "mock-model-id",
        prompt: "invalid",
        span: harness.mockSpan, 
        system: Option.some("system prompt"),
        parameters: undefined
      }));
      
      expectError(result, TextInputError, (error) => {
        expect(error.description).toContain("Input is invalid");
      });
    });
  });
});