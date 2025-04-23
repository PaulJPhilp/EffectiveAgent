/**
 * @file Provides the Effect Layer for the Deepseek AI provider client implementation.
 * @module services/ai/provider/implementations/deepseek
 */

import { createProviderLayer } from "../client.js";

/**
 * DeepseekProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the Deepseek provider.
 *
 * - Overrides setVercelProvider to initialize the Deepseek client when the provider is 'deepseek'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const DeepseekProviderClientLayer = createProviderLayer("deepseek");