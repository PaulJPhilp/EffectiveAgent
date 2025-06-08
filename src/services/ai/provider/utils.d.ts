import { ModelCapability } from "@/schema.js";
import { ConfigurationServiceApi } from "@/services/core/configuration/api.js";
import { EffectiveResponse, GenerateBaseResult } from "@/types.js";
import { Effect } from "effect";
import { ModelServiceApi } from "../model/api.js";
import { ProviderMissingCapabilityError, ProviderOperationError, ProviderServiceConfigError } from "./errors.js";
import { ProvidersType } from "./schema.js";
/**
 * Loads the provider configuration string from the provided ConfigurationService
 * @param configService - The configuration service instance
 * @param method - The method name for error context
 * @returns An Effect containing the config string or a ProviderConfigError
 */
export declare const loadConfigString: (configService: ConfigurationServiceApi, method: string) => Effect.Effect<string, ProviderServiceConfigError>;
/**
 * Parses a raw configuration string into a JSON object
 * @param rawConfig - The raw configuration string
 * @param method - The method name for error context
 * @returns An Effect containing the parsed JSON or a ProviderConfigError
 */
export declare const parseConfigJson: (rawConfig: string, method: string) => Effect.Effect<any, ProviderServiceConfigError>;
/**
 * Wraps a provider's result in a standardized response object with metadata.
 * @template T
 * @param result - The provider result to wrap
 * @returns Effect<EffectiveResponse<T>, never>
 */
export declare const createResponse: <T extends GenerateBaseResult>(result: T) => Effect.Effect<EffectiveResponse<T>, never>;
/**
 * Helper function for logging debug messages with consistent formatting
 * @param method - The method name for context
 * @param message - The message to log
 * @param data - Optional data to include in the log
 * @returns Effect<void, never>
 */
/**
 * Looks up the provider name for a given modelId, logs and maps errors.
 * @param params - Object with modelService, modelId, logger, and method
 * @returns Effect<string, ProviderConfigError>
 */
export declare function getProviderName(params: {
    modelService: ModelServiceApi;
    modelId: string;
    method: string;
}): Effect.Effect<string, ProviderServiceConfigError>;
/**
 * Validates that a modelId is present in options. Returns an error if missing.
 * Logging is handled at the service layer.
 * @param params - Object with options and method
 * @returns Effect<string, ProviderConfigError>
 */
export declare const validateModelId: ({ options, method }: {
    options: {
        modelId?: string;
    };
    method: string;
}) => Effect.Effect<string, ProviderServiceConfigError, ModelServiceApi>;
/**
 * Converts an unknown error to a ProviderOperationError or ProviderServiceConfigError.
 * @param operation - The operation being performed (e.g., 'generateText')
 * @param err - The unknown error thrown
 * @param providerName - Optional provider name for context
 * @returns ProviderOperationError | ProviderServiceConfigError
 */
/**
 * Converts an unknown error to a ProviderOperationError or ProviderServiceConfigError (RO-RO style).
 * @param params - Object containing operation, err, and providerName
 * @returns ProviderOperationError | ProviderServiceConfigError
 */
/**
 * Converts an unknown error to a ProviderOperationError or ProviderServiceConfigError (RO-RO style).
 * @param params - Object containing operation, err, providerName, module, and method
 * @returns ProviderOperationError | ProviderServiceConfigError
 */
export declare function handleProviderError(params: {
    operation: string;
    err: unknown;
    providerName?: string;
    module: string;
    method: string;
}): ProviderOperationError | ProviderServiceConfigError;
/**
 * Validates that the provider supports the required capabilities.
 * @param params - Object with providerName, required, actual, logger, and method
 * @returns Effect<void, ProviderMissingCapabilityError>
 */
/**
 * Validates that the provider supports the required capabilities. Returns an error if missing.
 * Logging is handled at the service layer.
 */
export declare function validateCapabilities(params: {
    providerName: ProvidersType;
    required: ModelCapability | ModelCapability[];
    actual: Set<ModelCapability>;
    method: string;
}): Effect.Effect<void, ProviderMissingCapabilityError>;
//# sourceMappingURL=utils.d.ts.map