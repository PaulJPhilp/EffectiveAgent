import { Layer } from "effect";
import { ModelService } from "@/services/ai/model/service";
import { ProviderService } from "@/services/ai/provider/service";

/**
 * The AiModuleLayer provides all services related to AI functionality.
 * It wires internal dependencies together and exposes a unified layer
 * for the AI domain.
 *
 * It requires the `BaseLayer` for its own infrastructure needs (e.g., config).
 */
export const AiModuleLayer = Layer.mergeAll(
  ProviderService.Default,
  ModelService.Default
);

/**
 * The context type provided by the AiModuleLayer.
 */
export type AiModuleContext = Layer.Layer.Context<typeof AiModuleLayer>;
