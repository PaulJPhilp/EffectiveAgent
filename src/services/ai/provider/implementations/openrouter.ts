/**
 * @file Provides the Effect Layer for the OpenRouter AI provider client implementation.
 * @module services/ai/provider/implementations/openrouter
 */

import { createProviderLayer } from "../client.js";

/**
 * OpenRouterProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the OpenRouter provider.
 *
 * - Overrides setVercelProvider to initialize the OpenRouter client when the provider is 'openrouter'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const OpenRouterProviderClientLayer = createProviderLayer("openrouter");
