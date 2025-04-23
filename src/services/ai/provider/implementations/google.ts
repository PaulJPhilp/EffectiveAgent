/**
 * @file Provides the Effect Layer for the Google AI provider client implementation.
 * @module services/ai/provider/implementations/google
 */
import { createProviderLayer } from "../client.js";

/**
 * GoogleProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the Google provider.
 *
 * - Overrides setVercelProvider to initialize the Google client when the provider is 'google'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const GoogleProviderClientLayer = createProviderLayer("google");