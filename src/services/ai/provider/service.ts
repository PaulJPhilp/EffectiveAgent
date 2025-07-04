import { ConfigurationService } from "@/services/core/configuration/service";

import { Effect, Ref } from "effect";
import { ProviderServiceApi } from "./api.js";
import { makeAnthropicClient } from "./clients/anthropic-provider-client.js";
import { makeDeepseekClient } from "./clients/deepseek-provider-client.js";
import { makeGoogleClient } from "./clients/google-provider-client.js";
import { makeOpenAIClient } from "./clients/openai-provider-client.js";
import { makePerplexityClient } from "./clients/perplexity-provider-client.js";
import { makeQwenClient } from "./clients/qwen-provider-client.js";
import { makeXaiClient } from "./clients/xai-provider-client.js";
import { ProviderNotFoundError, ProviderServiceConfigError } from "./errors.js";
import { ProviderFile } from "./schema.js";

// Then define the implementation
const makeProviderService = Effect.gen(function* () {
    const configService = yield* ConfigurationService;
    const configRef = yield* Ref.make<ProviderFile | null>(null);

    // Load configuration during service initialization
    const masterConfig = yield* configService.getMasterConfig();
    const providerConfigPath = masterConfig.configPaths?.providers || "./config/providers.json";
    const providerFile = yield* configService.loadProviderConfig(providerConfigPath).pipe(
        Effect.tapError((error) => Effect.logError("Failed to load provider configuration", { error }))
    );

    yield* Ref.set(configRef, providerFile);
    yield* Effect.logInfo("Provider configuration loaded", { providers: providerFile.providers.map(p => p.name) });

    return {
        getProviderClient: (providerName: string) => Effect.gen(function* () {
            yield* Effect.logInfo("Getting provider client", { providerName });

            const config = yield* Ref.get(configRef);
            if (!config) {
                yield* Effect.logError("Provider config not loaded");
                return yield* Effect.fail(new ProviderServiceConfigError({
                    description: "Provider configuration not loaded. Call load() first.",
                    module: "ProviderService",
                    method: "getProviderClient"
                }));
            }

            const providerInfo = config.providers.find((p: { name: string }) => p.name === providerName);
            yield* Effect.logInfo("Provider info", { providerInfo });
            if (!providerInfo) {
                yield* Effect.logError("Provider not found", { providerName });
                return yield* Effect.fail(new ProviderNotFoundError({
                    providerName,
                    module: "ProviderService",
                    method: "getProviderClient"
                }));
            }

            const apiKeyEnvVar = providerInfo.apiKeyEnvVar;
            if (!apiKeyEnvVar) {
                yield* Effect.logError("API key environment variable not configured", { providerName });
                return yield* Effect.fail(new ProviderServiceConfigError({
                    description: `API key environment variable not configured for provider: ${providerName}`,
                    module: "ProviderService",
                    method: "getProviderClient"
                }));
            }

            const apiKey = process.env[apiKeyEnvVar];
            if (!apiKey) {
                yield* Effect.logError("API key not found in environment", { providerName, apiKeyEnvVar });
                return yield* Effect.fail(new ProviderServiceConfigError({
                    description: `API key not found in environment for provider: ${providerName} (${apiKeyEnvVar})`,
                    module: "ProviderService",
                    method: "getProviderClient"
                }));
            }

            // Create provider-specific client based on provider type
            switch (providerInfo.name) {
                case "openai":
                    return yield* makeOpenAIClient(apiKey);
                case "anthropic":
                    return yield* makeAnthropicClient(apiKey);
                case "google":
                    return yield* makeGoogleClient(apiKey);
                case "deepseek":
                    return yield* makeDeepseekClient(apiKey);
                case "perplexity":
                    return yield* makePerplexityClient(apiKey);
                case "qwen":
                    return yield* makeQwenClient(apiKey);
                case "xai":
                    return yield* makeXaiClient(apiKey);
                default:
                    return yield* Effect.fail(new ProviderNotFoundError({
                        providerName,
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
            }
        })
    };
});

export class ProviderService extends Effect.Service<ProviderServiceApi>()(
    "ProviderService",
    {
        effect: makeProviderService,
        dependencies: [ConfigurationService.Default]
    }
) { }