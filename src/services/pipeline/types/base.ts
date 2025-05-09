
/**
 * Base result type for all pipeline operations
 */
export interface GenerateBaseResult {
  /** The generated output */
  output: string;
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Reason for completion */
  finishReason?: "stop" | "length" | "content_filter" | "tool_calls" | "function_call";
  /** Provider-specific metadata */
  providerMetadata?: Record<string, unknown>;
}

/**
 * Base options type for all pipeline operations
 */
export interface GenerateBaseOptions {
  /** The model ID to use */
  modelId: string;
  /** The input text */
  text: string;
  /** Optional system message */
  system?: string;
  /** Optional abort signal */
  signal?: AbortSignal;
  /** Optional parameters */
  parameters?: {
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Temperature (0-2) */
    temperature?: number;
    /** Top-p sampling */
    topP?: number;
    /** Top-k sampling */
    topK?: number;
    /** Presence penalty */
    presencePenalty?: number;
    /** Frequency penalty */
    frequencyPenalty?: number;
    /** Random seed */
    seed?: number;
    /** Stop sequences */
    stop?: string[];
  };
}
