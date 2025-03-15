import { anthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import type { GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { openai, type OpenAIProvider } from "@ai-sdk/openai";

const ProviderName = ["openai", "anthropic", "google"] as const;

type ProviderName = (typeof ProviderName)[number];

const ModelNames = {
    openai: [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
        "o1",
        "o1-mini",
        "o1-preview",
    ],
    anthropic: ["claude-3-7-sonnet", "claude-3-5-sonnet", "claude-3-5-haiku"],
    google: ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"],
} as const;

type ModelName = (typeof ModelNames)[keyof typeof ModelNames][number];

interface Model {
    providerName: ProviderName;
    modelName: ModelName;
    model: OpenAIProvider | AnthropicProvider | GoogleGenerativeAIProvider;
}

const ModelRegistry = new Map<string, Model>();

function getModelConstructor(provide: ProviderName) {
    switch (provide) {
        case "openai":
            return openai;
        case "anthropic":
            return anthropic;
        case "google":
            return openai;
    }
}

function buildProvider(provider: ProviderName) {
    const models = ModelNames[provider];
    for (const model of models) {
        ModelRegistry.set(model, {
            providerName: provider,
            modelName: model,
            model: getModelConstructor(provider),
        });
    }
}

let registryInitialized = false;

export function buildModelRegistry() {
    if (registryInitialized) return; // Only initialize once

    console.log("buildModelRegistry()");
    ModelRegistry.clear(); // Clear any previous entries

    try {
        for (const provider of ProviderName) buildProvider(provider);
        console.log(`Number of LLMs supported: ${ModelRegistry.size}`);
        registryInitialized = true;
    } catch (error) {
        console.error("Failed to initialize model registry:", error);
        throw error; // Re-throw to make failure visible
    }
}

export function getLLM(modelName: ModelName) {
    if (!registryInitialized) {
        console.log("Registry not initialized, initializing now...");
        buildModelRegistry();
    }

    const modelConstructor = ModelRegistry.get(modelName)?.model;
    if (!modelConstructor) {
        throw new Error(
            `Model "${modelName}" not found in registry. Available models: ${Array.from(ModelRegistry.keys()).join(", ")}`,
        );
    }

    return modelConstructor(modelName);
}
