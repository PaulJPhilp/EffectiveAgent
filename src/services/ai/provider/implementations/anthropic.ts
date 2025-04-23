/**
 * @file Provides the Effect Layer for the Anthropic AI provider client implementation.
 * @module services/ai/provider/implementations/anthropic
 */

import { createProviderLayer } from "../client.js";

/**
 * AnthropicProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the Anthropic provider.
 *
 * - Overrides setVercelProvider to initialize the Anthropic client when the provider is 'anthropic'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const AnthropicProviderClientLayer = createProviderLayer("anthropic");