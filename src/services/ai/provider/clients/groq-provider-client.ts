import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for Groq.
 */
export const makeGroqProviderClient = makeProvider("groq", [
  "chat", "text-generation", "function-calling"
]);

export default makeGroqProviderClient;
