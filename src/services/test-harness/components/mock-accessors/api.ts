import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { ProviderServiceApi } from "@/services/ai/provider/api.js";

/**
 * Defines the API for accessing standard mock objects provided by the test harness.
 */
export interface MockAccessorApi {
  /**
   * Provides access to a pre-configured mock LanguageModelV1 instance.
   * This mock can be used for testing components that interact directly
   * with the AI SDK's language model interface.
   */
  readonly mockLanguageModelV1: LanguageModelV1;

  /**
   * Provides access to the mock ModelService instance used by the harness.
   * Useful for asserting interactions or configuring the mock model service behavior.
   */
  readonly mockModelService: ModelServiceApi;

  /**
   * Provides access to the mock ProviderService instance used by the harness.
   * Useful for asserting interactions or configuring the mock provider service behavior.
   */
  readonly mockProviderService: ProviderServiceApi;
}
