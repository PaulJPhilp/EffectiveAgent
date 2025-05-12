import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for OpenAI.
 */
export const makeOpenAIProviderClient = makeProvider("openai", [
  "chat", "text-generation", "function-calling"
]);

export default makeOpenAIProviderClient;