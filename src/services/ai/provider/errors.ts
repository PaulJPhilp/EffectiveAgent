/**
 * @file Defines specific errors for the AI Provider configuration loading process.
 * @module services/ai/provider/errors
 */

import type { EntityLoadError, EntityParseError } from "@/services/core/errors.js";
import type { ParseError } from "@effect/schema/ParseResult";
import { Data } from "effect";

/**
 * Base error type for provider-related errors
 */
export class ProviderError extends Data.TaggedError("ProviderError")<{
    readonly providerName: string;
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * Error class for failures related to loading, parsing, or validating
 * the provider configuration.
 */
export class ProviderConfigError extends Data.TaggedError("ProviderConfigError")<{
    readonly message: string;
    readonly cause?: EntityLoadError | EntityParseError | ParseError | Error;
}> { }

/**
 * Error thrown when a provider is not found
 */
export class ProviderNotFoundError extends Data.TaggedError("ProviderNotFoundError")<{
    readonly providerName: string;
    readonly message: string;
}> {
    constructor(providerName: string) {
        super({
            providerName,
            message: `Provider not found: ${providerName}`
        });
    }
}

/**
 * Error thrown when an API key is missing for a provider
 */
export class ProviderMissingApiKeyError extends Data.TaggedError("ProviderMissingApiKeyError")<{
    readonly providerName: string;
    readonly message: string;
}> {
    constructor(providerName: string) {
        super({
            providerName,
            message: `API key is missing for provider: ${providerName}`
        });
    }
}

/**
 * Error thrown when an API key is invalid for a provider
 */
export class ProviderInvalidApiKeyError extends Data.TaggedError("ProviderInvalidApiKeyError")<{
    readonly providerName: string;
    readonly message: string;
    readonly cause?: Error;
}> {
    constructor(providerName: string, cause?: Error) {
        super({
            providerName,
            message: `API key is invalid for provider: ${providerName}`,
            cause
        });
    }
}

/**
 * Error thrown when a provider is missing a required capability
 */
export class ProviderMissingCapabilityError extends Data.TaggedError("ProviderMissingCapabilityError")<{
    readonly providerName: string;
    readonly capability: string;
    readonly message: string;
}> {
    constructor(params: { providerName: string; capability: string }) {
        super({
            providerName: params.providerName,
            capability: params.capability,
            message: `Provider ${params.providerName} is missing capability: ${params.capability}`
        });
    }
}

/**
 * Error thrown when a provider operation fails
 */
export class ProviderOperationError extends Data.TaggedError("ProviderOperationError")<{
    readonly providerName: string;
    readonly operation: string;
    readonly message: string;
    readonly cause?: Error;
}> { }