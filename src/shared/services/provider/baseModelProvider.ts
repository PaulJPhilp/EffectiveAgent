import * as Effect from 'effect/Effect';
import type {
  ModelCapability,
  ProviderConfig,
  ProviderType
} from '../../config-master/types/provider-config.js';
import { ProviderConfigSchema } from '../../config-master/types/provider-config.js';
import { ProviderImplementationError } from './errors.js';
import type {
  GenerateEmbeddingOptions,
  GenerateEmbeddingResult,
  GenerateImageOptions,
  GenerateImageResult,
  GenerateObjectOptions,
  GenerateObjectResult,
  GenerateTextOptions,
  GenerateTextResult,
  IModelProvider,
  LLMCompletionResult,
  ModelCompletionOptions
} from './types.js';

/**
 * Base class for model providers like OpenAI, Anthropic, etc.
 * Provides a common interface for text generation, image generation, and embeddings.
 */
export abstract class BaseModelProvider implements IModelProvider {
  /** Provider ID */
  readonly providerId: ProviderType;
  /** Provider configuration */
  readonly config: ProviderConfig;

  constructor(providerId: ProviderType, config: ProviderConfig) {
    // Validate config against schema
    const parseResult = ProviderConfigSchema.safeParse(config);
    if (!parseResult.success) {
      throw new Error(`Invalid provider configuration: ${parseResult.error.message}`);
    }

    this.providerId = providerId;
    this.config = config;
  }

  /** Validates common arguments for model calls */
  protected validateCommonArgs(args: {
    modelId?: string;
  }): Effect.Effect<void, ProviderImplementationError> {
    const { modelId } = args;

    if (modelId && !this.config.models?.includes(modelId)) {
      return Effect.fail(
        new ProviderImplementationError({
          message: `Model ${modelId} is not supported by ${this.config.name}`,
          providerName: this.config.name
        })
      );
    }

    return Effect.succeed(void 0);
  }

  /** Checks if this provider supports a specific capability */
  public supportsCapability(
    capability: ModelCapability
  ): Effect.Effect<boolean, never> {
    return Effect.succeed(this.config.capabilities?.includes(capability) ?? false);
  }

  /** Generate text completion */
  abstract complete(
    prompt: string,
    options?: ModelCompletionOptions
  ): Effect.Effect<LLMCompletionResult, ProviderImplementationError>;

  /** Generate text */
  abstract generateText(
    options: GenerateTextOptions
  ): Effect.Effect<GenerateTextResult, ProviderImplementationError>;

  /** Generate image */
  abstract generateImage(
    options: GenerateImageOptions
  ): Effect.Effect<GenerateImageResult, ProviderImplementationError>;

  /** Generate embedding */
  abstract generateEmbedding(
    options: GenerateEmbeddingOptions
  ): Effect.Effect<GenerateEmbeddingResult, ProviderImplementationError>;

  /** Generate structured object */
  abstract generateObject<T>(
    options: GenerateObjectOptions<T>
  ): Effect.Effect<GenerateObjectResult<T>, ProviderImplementationError>;
}
