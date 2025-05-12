import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for DeepSeek.
 */
export const makeDeepseekProviderClient = makeProvider("deepseek", [
  "chat", "text-generation", "function-calling"
]);

export default makeDeepseekProviderClient;
