/**
 * @file Provides the Effect Layer for the xAI provider client implementation.
 * @module services/ai/provider/implementations/xai
 */
import { createProviderLayer } from "../client.js";

/**
 * xAiProviderClientLayerAi is an Effect Layer that provides a ProviderClient implementation for the xAI provider.
 *
 * - Overrides setVercelProvider to initialize the xAI client when the provider is 'xai'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const xAiProviderClientLayerAi = createProviderLayer("xai");