import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for Google.
 */
export const makeGoogleProviderClient = makeProvider("google", [
  "chat", "text-generation", "function-calling", "image-generation",
  "embeddings"
]);

export default makeGoogleProviderClient;
