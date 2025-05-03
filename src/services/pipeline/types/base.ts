import type { ProviderMetadata } from "@/services/ai/provider/types.js";
import type { FinishReason, Usage } from "@/types.js";

export interface EffectiveInput {
  /** The input text/prompt to process */
  text: string;
  /** Optional metadata for the request */
  metadata?: {
    /** Operation name for tracing */
    operationName?: string;
    /** Model parameters */
    parameters?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    };
    /** Provider-specific metadata */
    providerMetadata?: ProviderMetadata;
  };
}

export interface EffectiveResponse<T = unknown> {
  data: T;
  metadata: {
    id: string;
    timestamp: Date;
    usage?: Usage;
    finishReason?: FinishReason;
    providerMetadata?: ProviderMetadata;
  };
}

export interface GenerateBaseResult {
  usage?: Usage;
  finishReason?: FinishReason;
  providerMetadata?: ProviderMetadata;
}
