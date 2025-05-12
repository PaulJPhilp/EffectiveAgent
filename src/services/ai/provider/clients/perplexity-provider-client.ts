import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for Perplexity AI.
 */
export const makePerplexityProviderClient = makeProvider("perplexity", [
  "chat", "text-generation", "function-calling"
]);

export default makePerplexityProviderClient;
