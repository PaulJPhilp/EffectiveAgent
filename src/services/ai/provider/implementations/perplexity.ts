/**
 * @file Provides the Effect Layer for the Perplexity AI provider client implementation.
 * @module services/ai/provider/implementations/perplexity
 */

import { createProviderLayer } from "../client.js";

/**
 * PerplexityProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the Perplexity provider.
 *
 * - Overrides setVercelProvider to initialize the Perplexity client when the provider is 'perplexity'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const PerplexityProviderClientLayer = createProviderLayer("perplexity");
