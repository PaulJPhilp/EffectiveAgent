import { Layer } from "effect";
import { ProviderService } from "./service.js"; // ProviderService class is the Tag and contains .effect
import { ConfigurationService } from "@/services/core/configuration/service.js";
// LoggingService might be implicitly needed if Effect.log in ProviderService.effect uses a Logger from context
// For now, we assume ConfigurationService is the primary explicit dependency for R.

/**
 * Live layer for {@link ProviderService}.
 * This layer provides the actual implementation of the ProviderService,
 * utilizing `ProviderService.effect` which encapsulates the service logic.
 *
 * @category layers
 * @since 1.0.0
 */
export const ProviderServiceLiveLayer: Layer.Layer<
  ProviderService,
  unknown, // Error type from ProviderService.effect (can be refined if known)
  ConfigurationService // Explicitly state dependencies based on ProviderService.effect's needs
  // Add LoggingService here if Effect.log in ProviderService.effect requires it via context
> = Layer.effect(ProviderService, ProviderService.effect);
