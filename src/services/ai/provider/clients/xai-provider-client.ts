import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for xAI (Grok).
 */
export const makeXaiProviderClient = makeProvider("xai", [
  "chat", "text-generation", "function-calling"
]);

export default makeXaiProviderClient;
