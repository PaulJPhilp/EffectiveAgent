export const PROVIDER_UNIVERSE = [
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
            "function-calling",
            "image-generation"
        ],
        configSchema: {
            apiKeyEnvVar: "OPENAI_API_KEY",
            baseUrl: "https://api.openai.com/v1"
        }
    },
    {
        name: "anthropic",
        displayName: "Anthropic",
        logoUrl: "https://cdn.anthropic.com/logo.svg",
        docsUrl: "https://docs.anthropic.com/claude",
        capabilities: [
            "chat",
            "text-generation",
            "function-calling",
            "vision"
        ],
        configSchema: {
            apiKeyEnvVar: "ANTHROPIC_API_KEY",
            baseUrl: "https://api.anthropic.com/v1"
        }
    },
    {
        name: "google",
        displayName: "Google",
        logoUrl: "https://ai.google.dev/static/images/favicon.png",
        docsUrl: "https://ai.google.dev/docs",
        capabilities: [
            "text-generation",
            "chat",
            "vision",
            "function-calling"
        ],
        configSchema: {
            apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
            baseUrl: "https://generativelanguage.googleapis.com/v1"
        }
    },
    {
        name: "xai",
        displayName: "xAI (Grok)",
        logoUrl: "https://x.ai/favicon.ico",
        docsUrl: "https://docs.x.ai/",
        capabilities: [
            "chat",
            "text-generation",
            "image-generation"
        ],
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
        capabilities: [
            "chat",
            "text-generation"
        ],
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
        capabilities: [
            "text-generation",
            "chat",
            "function-calling",
            "audio"
        ],
        configSchema: {
            apiKeyEnvVar: "GROQ_API_KEY",
            baseUrl: "https://api.groq.com/openai/v1"
        }
    },
    {
        name: "deepseek",
        displayName: "DeepSeek",
        logoUrl: "https://deepseek.com/favicon.ico",
        docsUrl: "https://platform.deepseek.com/docs",
        capabilities: [
            "text-generation",
            "chat",
            "function-calling",
            "tool-use"
        ],
        configSchema: {
            apiKeyEnvVar: "DEEPSEEK_API_KEY",
            baseUrl: "https://api.deepseek.com/v1"
        }
    },
    {
        name: "qwen",
        displayName: "Qwen (Alibaba Cloud)",
        logoUrl: "https://qianwen.aliyun.com/favicon.ico",
        docsUrl: "https://help.aliyun.com/zh/dashscope/",
        capabilities: [
            "text-generation",
            "chat",
            "function-calling",
            "vision"
        ],
        configSchema: {
            apiKeyEnvVar: "QWEN_API_KEY",
            baseUrl: "https://dashscope.aliyuncs.com/api/v1"
        }
    }
];
/**
 * Canonical tuple of provider names derived from the universe.
 * Used for type-safe schema and literal union elsewhere.
 */
export const PROVIDER_NAMES = PROVIDER_UNIVERSE.map(p => p.name);
//# sourceMappingURL=provider-universe.js.map