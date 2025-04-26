/**
 * Canonical list of all providers supported by the ProviderService.
 *
 * This is the single source of truth for provider metadata, configuration, and capabilities.
 *
 * To add a new provider, add a new entry to this array and update ProviderMetadata if needed.
 * This file is private to the ProviderService and not exported elsewhere.
 */
import type { ProviderMetadata } from "./types.js";

export const PROVIDER_UNIVERSE: readonly ProviderMetadata[] = [
  {
    name: "openai",
    displayName: "OpenAI",
    logoUrl: "https://cdn.openai.com/logo.svg",
    docsUrl: "https://platform.openai.com/docs",
    capabilities: [
      "text-generation",
      "chat",
      "embeddings",
      "vision",
      "audio",
      "function-calling"
    ],
    configSchema: {
      apiKeyEnvVar: "OPENAI_API_KEY",
      baseUrl: "https://api.openai.com"
    }
  },
  {
    name: "anthropic",
    displayName: "Anthropic",
    logoUrl: "https://cdn.anthropic.com/logo.svg",
    docsUrl: "https://docs.anthropic.com/claude",
    capabilities: ["chat", "function-calling"],
    configSchema: {
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
      baseUrl: "https://api.anthropic.com"
    }
  },
  {
    name: "google",
    displayName: "Google",
    logoUrl: "https://ai.google.dev/static/images/favicon.png",
    docsUrl: "https://ai.google.dev/docs",
    capabilities: ["text-generation", "chat", "vision"],
    configSchema: {
      apiKeyEnvVar: "GOOGLE_API_KEY",
      baseUrl: "https://generativelanguage.googleapis.com"
    }
  },
  {
    name: "xai",
    displayName: "xAI (Grok)",
    logoUrl: "https://x.ai/favicon.ico",
    docsUrl: "https://docs.x.ai/",
    capabilities: ["chat"],
    configSchema: {
      apiKeyEnvVar: "XAI_API_KEY",
      baseUrl: "https://api.grok.x.ai"
    }
  },
  {
    name: "perplexity",
    displayName: "Perplexity AI",
    logoUrl: "https://www.perplexity.ai/favicon.ico",
    docsUrl: "https://docs.perplexity.ai/",
    capabilities: ["chat"],
    configSchema: {
      apiKeyEnvVar: "PERPLEXITY_API_KEY",
      baseUrl: "https://api.perplexity.ai"
    }
  },
  {
    name: "groq",
    displayName: "Groq",
    logoUrl: "https://groq.com/favicon.ico",
    docsUrl: "https://console.groq.com/docs",
    capabilities: ["text-generation", "chat"],
    configSchema: {
      apiKeyEnvVar: "GROQ_API_KEY",
      baseUrl: "https://api.groq.com"
    }
  },
  {
    name: "deepseek",
    displayName: "DeepSeek",
    logoUrl: "https://deepseek.com/favicon.ico",
    docsUrl: "https://platform.deepseek.com/docs",
    capabilities: ["text-generation", "chat", "code-generation"],
    configSchema: {
      apiKeyEnvVar: "DEEPSEEK_API_KEY",
      baseUrl: "https://api.deepseek.com"
    }
  }
] as const;

/**
 * Canonical tuple of provider names derived from the universe.
 * Used for type-safe schema and literal union elsewhere.
 */
export const PROVIDER_NAMES = PROVIDER_UNIVERSE.map(p => p.name) as unknown as readonly (typeof PROVIDER_UNIVERSE)[number]["name"][];
