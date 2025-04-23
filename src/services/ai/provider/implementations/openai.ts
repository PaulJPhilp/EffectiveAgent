/**
 * @file Provides the Effect Layer for the OpenAI provider client implementation.
 * @module services/ai/provider/implementations/openai
 */

import { createProviderLayer } from "../client.js";

/**
 * OpenAIProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the OpenAI provider.
 *
 * - Overrides setVercelProvider to initialize the OpenAI client when the provider is 'openai'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const OpenAIProviderClientLayer = createProviderLayer("openai");