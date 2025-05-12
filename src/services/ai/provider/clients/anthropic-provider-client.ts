import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for Anthropic.
 */
export const makeAnthropicProviderClient = makeProvider("anthropic", [
  "chat", "text-generation", "function-calling"
]);

export default makeAnthropicProviderClient;
