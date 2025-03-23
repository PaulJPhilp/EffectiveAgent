/**
 * Configuration types for AI models
 */

/**
 * Base model parameters shared by different model types
 */
export interface ModelParameters {
  /** Maximum number of tokens to generate */
  readonly maxTokens?: number;
  /** Sampling temperature - higher means more creative, lower means more deterministic */
  readonly temperature?: number;
  /** Frequency penalty to discourage repetition */
  readonly frequencyPenalty?: number;
  /** Presence penalty to discourage topic repetition */
  readonly presencePenalty?: number;
}

/**
 * Text model configuration
 */
export interface TextModelConfig extends ModelParameters {
  /** Provider for the model (e.g., 'openai', 'anthropic') */
  readonly provider: string;
  /** Specific model identifier */
  readonly model: string;
}

/**
 * Embedding model configuration
 */
export interface EmbeddingModelConfig {
  /** Provider for the embedding model */
  readonly provider: string;
  /** Specific model identifier */
  readonly model: string;
  /** Vector dimensions for the embedding model */
  readonly dimensions: number;
}

/**
 * Complete models configuration structure
 */
export interface ModelsConfig {
  /** Text generation models grouped by purpose */
  readonly text: Record<string, TextModelConfig>;
  /** Embedding models grouped by purpose */
  readonly embedding: Record<string, EmbeddingModelConfig>;
}
