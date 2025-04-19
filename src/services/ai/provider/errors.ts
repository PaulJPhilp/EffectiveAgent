/**
 * @file Defines specific errors for the AI Provider configuration loading process.
 * @module services/ai/provider/errors
 */

import type { ParseError } from "@effect/schema/ParseResult";
import { Data } from "effect";

/**
 * Represents an error occurring during the loading or validation of the
 * provider configuration.
 *
 * @class ProviderConfigError
 * @extends {Data.TaggedError}
 * @property {string} message - Description of the error.
 * @property {ParseError | Error} [cause] - The underlying cause of the error, if available.
 */
export class ProviderConfigError extends Data.TaggedError("ProviderConfigError")<{
    readonly message: string;
    readonly cause?: ParseError | Error;
}> { }

/**
 * Error thrown when the provider configuration file is not found.
 *
 * @class ProviderNotFoundError
 * @extends {Error}
 * @param {string} filePath - The path to the missing provider file.
 */
export class ProviderNotFoundError extends Error {
    constructor(filePath: string) {
        super(`Provider file not found: ${filePath}`);
        this.name = "ProviderNotFoundError";
    }
}

/**
 * Error thrown when an API key is missing for a provider.
 *
 * @class ProviderMissingApiKeyError
 * @extends {Error}
 * @param {string} providerName - The name of the provider missing an API key.
 */
export class ProviderMissingApiKeyError extends Error {
    constructor(providerName: string) {
        super(`API key is missing for provider: ${providerName}`);
        this.name = "ProviderMissingApiKeyError";
    }
}

/**
 * Error thrown when an API key is invalid for a provider.
 *
 * @class ProviderInvalidApiKeyError
 * @extends {Error}
 * @param {string} providerName - The name of the provider with an invalid API key.
 */
export class ProviderInvalidApiKeyError extends Error {
    constructor(providerName: string) {
        super(`API key is invalid for provider: ${providerName}`);
        this.name = "ProviderInvalidApiKeyError";
    }
}

/**
 * Error thrown when a provider is missing a required capability.
 *
 * @class ProviderMissingCapability
 * @extends {Error}
 * @param {string} providerName - The name of the provider missing the capability.
 */
export class ProviderMissingCapability extends Error {
    constructor(providerName: string) {
        super(`Missing capability for provider: ${providerName}`);
        this.name = "ProviderMissingCapability";
    }
}