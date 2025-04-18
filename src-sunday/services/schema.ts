/**
 * @file Defines globally shared Zod schemas used across multiple services.
 * Service-specific schemas should reside within their respective service directories.
 */

import { z } from "zod";

/**
 * Defines the known LLM provider names.
 * Extend this enum as more providers are supported.
 */
export const ProviderNameSchema = z.enum([
    "openai",
    "anthropic",
    "google",
    "perplexity",
    "groq",
    "deepseek",
    "grok", // xAI
    "local", // Represents generic local/Ollama endpoint
    // Add other providers like Cohere, Mistral, etc. here
]);

// src/services/schema.ts
export const ProviderNameValues = { // <--- Export this object
    OpenAI: "openai",
    Anthropic: "anthropic",
    Google: "google",
    Groq: "groq",
    DeepSeek: "deepseek",
    Grok: "grok",
    Local: "local",
} as const;

export type ProviderName = (typeof ProviderNameValues)[keyof typeof ProviderNameValues];



/** Defines the known core capability types within the framework. */
export const CapabilitySchema = z.enum([
    "mcp",
    "tool",
    "skill",
]);
export type Capability = z.infer<typeof CapabilitySchema>;

// Add other truly global schemas here, e.g., maybe a base pagination schema?
// Keep this file focused on widely shared, simple schemas, especially enums.

