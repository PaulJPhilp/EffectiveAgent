import { Effect } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ProviderConfig, ProviderType } from "../../../config-master/types/provider-config.js";
import { BaseModelProvider } from "../baseModelProvider.js";
import { ProviderAuthError, ProviderError, ProviderImplementationError, ProviderRateLimitError } from "../errors.js";
import type {
  GenerateEmbeddingOptions,
  GenerateEmbeddingResult,
  GenerateImageOptions,
  GenerateImageResult,
  GenerateObjectOptions,
  GenerateObjectResult,
  GenerateTextOptions,
  GenerateTextResult,
  LLMCompletionResult,
  ModelCompletionOptions
} from "../types.js";

type ProviderErrorUnion = ProviderImplementationError | ProviderRateLimitError | ProviderAuthError;

class TestModelProvider extends BaseModelProvider {
  // Track rate limit state
  private rateLimitHit = false;
  private authErrorTriggered = false;
  private networkErrorTriggered = false;

  // Method to trigger errors for testing
  setErrorState(options: { rateLimit?: boolean; auth?: boolean; network?: boolean }) {
    this.rateLimitHit = !!options.rateLimit;
    this.authErrorTriggered = !!options.auth;
    this.networkErrorTriggered = !!options.network;
  }

  private checkErrors(): Effect.Effect<never, ProviderError, never> | null {
    if (this.authErrorTriggered) {
      return Effect.fail(
        new ProviderAuthError({
          message: "Authentication failed for API key",
          providerName: this.providerId
        })
      ) as Effect.Effect<never, ProviderError, never>;
    }

    if (this.rateLimitHit) {
      return Effect.fail(
        new ProviderRateLimitError({
          message: "Rate limit exceeded",
          retryAfterMs: 1000,
          providerName: this.providerId
        })
      ) as unknown as Effect.Effect<never, ProviderError, never>;
    }

    if (this.networkErrorTriggered) {
      return Effect.fail(
        new ProviderImplementationError({
          message: "Network error occurred",
          providerName: this.providerId,
          cause: new Error("Failed to connect to API")
        })
      ) as Effect.Effect<never, ProviderError, never>;
    }

    return null;
  }

  generateText(
    options: GenerateTextOptions
  ): Effect.Effect<GenerateTextResult, ProviderError> {
    // Check for model ID
    if (options.modelId !== "gpt-4") {
      return Effect.fail(
        new ProviderImplementationError({
          message: `Model ${options.modelId} is not supported by test-provider`,
          providerName: "test-provider"
        })
      );
    }

    // Check for errors
    const errorEffect = this.checkErrors();
    if (errorEffect) {
      return errorEffect;
    }

    return Effect.succeed({
      text: "Test response",
      model: "gpt-4",
      raw: { choices: [{ text: "Test response" }] },
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
    });
  }

  complete(
    prompt: string,
    options?: ModelCompletionOptions
  ): Effect.Effect<LLMCompletionResult, ProviderError> {
    // Check for model ID
    if (options?.modelId && options.modelId !== "gpt-4") {
      return Effect.fail(
        new ProviderImplementationError({
          message: `Model ${options.modelId} is not supported by test-provider`,
          providerName: "test-provider"
        })
      );
    }

    // Check for errors
    const errorEffect = this.checkErrors();
    if (errorEffect) {
      return errorEffect;
    }

    return Effect.succeed({
      content: "Test completion",
      model: "gpt-4",
      tokens: {
        prompt: 10,
        completion: 5,
        total: 15
      },
      raw: { choices: [{ text: "Test completion" }] }
    });
  }

  generateImage(
    options: GenerateImageOptions
  ): Effect.Effect<GenerateImageResult, ProviderError> {
    // Only stable diffusion supports image generation
    if (options.modelId !== "stable-diffusion") {
      return Effect.fail(
        new ProviderImplementationError({
          message: `Model ${options.modelId} does not support image generation`,
          providerName: this.providerId
        })
      );
    }

    // Check for errors
    const errorEffect = this.checkErrors();
    if (errorEffect) {
      return errorEffect;
    }

    return Effect.succeed({
      urls: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."],
      model: "stable-diffusion",
      raw: { images: [{ url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." }] }
    });
  }

  generateEmbedding(
    options: GenerateEmbeddingOptions
  ): Effect.Effect<GenerateEmbeddingResult, ProviderError> {
    // Only embedding models support this
    if (options.modelId !== "text-embedding-3-large") {
      return Effect.fail(
        new ProviderImplementationError({
          message: `Model ${options.modelId} does not support embeddings`,
          providerName: this.providerId
        })
      );
    }

    // Check for errors
    const errorEffect = this.checkErrors();
    if (errorEffect) {
      return errorEffect;
    }

    return Effect.succeed({
      embeddings: [0.1, 0.2, 0.3, 0.4, 0.5],
      model: "text-embedding-3-large",
      usage: {
        promptTokens: 5,
        totalTokens: 5
      },
      raw: { data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5], index: 0 }] }
    });
  }

  generateObject<T>(
    options: GenerateObjectOptions<T>
  ): Effect.Effect<GenerateObjectResult<T>, ProviderError> {
    // Only structured output models support this
    if (options.modelId !== "gpt-4") {
      return Effect.fail(
        new ProviderImplementationError({
          message: `Model ${options.modelId} does not support structured output`,
          providerName: this.providerId
        })
      );
    }

    // Check for errors
    const errorEffect = this.checkErrors();
    if (errorEffect) {
      return errorEffect;
    }

    // Sample data for test
    const sampleData = { name: "Test User", email: "test@example.com", age: 30 };

    const schema = z.object({
      name: z.string(),
      email: z.string(),
      age: z.number()
    });

    return Effect.succeed({
      object: sampleData as T,
      model: "gpt-4",
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      },
      raw: { choices: [{ message: { content: JSON.stringify(sampleData) } }] }
    });
  }
}

describe("BaseModelProvider", () => {
  const testConfig: ProviderConfig = {
    name: "test-provider",
    displayName: "Test Provider",
    type: ProviderType.LOCAL,
    baseUrl: "https://api.test.com",
    rateLimit: {
      requestsPerMinute: 60
    }
  };

  let provider: TestModelProvider;

  beforeEach(() => {
    provider = new TestModelProvider(ProviderType.LOCAL, testConfig);
    // Reset error state between tests
    provider.setErrorState({ rateLimit: false, auth: false, network: false });
  });

  it("should initialize with valid config", () => {
    expect(provider.providerId).toBe("test-provider");
    expect(provider.config).toEqual(testConfig);
  });

  it("should throw error when initialized without config", () => {
    expect(() => {
      new TestModelProvider(ProviderType.LOCAL, (undefined as unknown) as ProviderConfig);
    }).toThrow();
  });

  it("should validate model ID successfully", async () => {
    const program = provider["validateCommonArgs"]({ modelId: "gpt-4" });

    await expect(
      Effect.runPromise(program)
    ).resolves.toBeUndefined();
  });

  it("should fail validation for unsupported model", async () => {
    const program = provider["validateCommonArgs"]({
      modelId: "unsupported-model"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Model unsupported-model is not supported by test-provider");
    }
  });

  it("should generate text successfully", async () => {
    const program = provider.generateText({
      modelId: "gpt-4",
      prompt: "Test prompt"
    });

    const result = await Effect.runPromise(program);

    expect(result).toEqual({
      text: "Test response",
      model: "gpt-4",
      raw: { choices: [{ text: "Test response" }] },
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
    });
  });

  it("should fail text generation with unsupported model", async () => {
    const program = provider.generateText({
      modelId: "unsupported-model",
      prompt: "Test prompt"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Model unsupported-model is not supported by test-provider");
    }
  });

  // NEW TESTS

  it("should complete text successfully", async () => {
    const program = provider.complete("What is the capital of France?", {
      modelId: "gpt-4",
      prompt: "What is the capital of France?"
    });

    const result = await Effect.runPromise(program);

    expect(result).toEqual({
      content: "Test completion",
      model: "gpt-4",
      tokens: {
        prompt: 10,
        completion: 5,
        total: 15
      },
      raw: { choices: [{ text: "Test completion" }] }
    });
  });

  it("should generate images successfully", async () => {
    const program = provider.generateImage({
      modelId: "stable-diffusion",
      prompt: "A beautiful sunset over mountains"
    });

    const result = await Effect.runPromise(program);

    expect(result).toHaveProperty("urls");
    expect(result.urls).toHaveLength(1);
    expect(result.urls[0]).toContain("data:image/png;base64");
    expect(result.model).toBe("stable-diffusion");
  });

  it("should fail image generation with unsupported model", async () => {
    const program = provider.generateImage({
      modelId: "gpt-4",
      prompt: "A beautiful sunset over mountains"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("does not support image generation");
    }
  });

  it("should generate embeddings successfully", async () => {
    const program = provider.generateEmbedding({
      modelId: "text-embedding-3-large",
      text: "Sample text for embedding"
    });

    const result = await Effect.runPromise(program);

    expect(result).toHaveProperty("embeddings");
    expect(result.embeddings).toHaveLength(1);
    expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(result.model).toBe("text-embedding-3-large");
  });

  it("should generate structured objects successfully", async () => {
    interface UserProfile {
      name: string;
      email: string;
      age: number;
    }

    const program = provider.generateObject<UserProfile>({
      modelId: "gpt-4",
      prompt: "Generate a user profile",
      schema: z.object({
        name: z.string(),
        email: z.string(),
        age: z.number()
      })
    });

    const result = await Effect.runPromise(program);

    expect(result.object).toEqual({
      name: "Test User",
      email: "test@example.com",
      age: 30
    });
    expect(result.model).toBe("gpt-4");
  });

  it("should handle rate limit errors", async () => {
    // Set rate limit error state
    provider.setErrorState({ rateLimit: true });

    const program = provider.generateText({
      modelId: "gpt-4",
      prompt: "Test prompt"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Rate limit exceeded");
    }
  });

  it("should handle authentication errors", async () => {
    // Set auth error state
    provider.setErrorState({ auth: true });

    const program = provider.generateText({
      modelId: "gpt-4",
      prompt: "Test prompt"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Authentication failed");
    }
  });

  it("should handle network errors", async () => {
    // Set network error state
    provider.setErrorState({ network: true });

    const program = provider.generateText({
      modelId: "gpt-4",
      prompt: "Test prompt"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Network error occurred");
    }
  });

  it("should handle missing required parameters", async () => {
    // @ts-expect-error - Testing validation error
    const program = provider.generateText({
      modelId: "gpt-4"
      // Missing prompt parameter
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      // Implementation-specific, but we should get some kind of error
      expect(error).toBeDefined();
    }
  });

  it("should handle image generation rate limits", async () => {
    // Set rate limit error state
    provider.setErrorState({ rateLimit: true });

    const program = provider.generateImage({
      modelId: "stable-diffusion",
      prompt: "A beautiful sunset over mountains"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Rate limit exceeded");
    }
  });

  it("should handle image generation auth errors", async () => {
    // Set auth error state
    provider.setErrorState({ auth: true });

    const program = provider.generateImage({
      modelId: "stable-diffusion",
      prompt: "A beautiful sunset over mountains"
    });

    try {
      await Effect.runPromise(program);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Authentication failed");
    }
  });
});
