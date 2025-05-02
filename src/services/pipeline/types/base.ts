import type { Usage, FinishReason } from "@/types.js";
import type { ProviderMetadata } from "@/services/ai/provider/types.js";

export interface EffectiveInput {
  // TODO: Define structure for EffectiveInput
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
