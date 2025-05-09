/**
 * @file Tool-specific error definitions
 */

import { EffectiveError } from "@/errors.js"

/**
 * Error thrown when a provider tool operation fails
 */
export class ProviderToolError extends EffectiveError {
    constructor(params: {
        description: string
        module?: string
        method?: string
        cause?: unknown
        provider?: string
    }) {
        super({
            ...params,
            module: params.module ?? `Provider:${params.provider ?? "Unknown"}`,
            method: params.method ?? "toolOperation"
        })
    }
}

/**
 * Error thrown when a tool execution fails
 */
export class ToolExecutionError extends EffectiveError {
    constructor(params: {
        description: string
        module?: string
        method?: string
        cause?: unknown
        toolName?: string
    }) {
        super({
            ...params,
            module: params.module ?? `Tool:${params.toolName ?? "Unknown"}`,
            method: params.method ?? "execute"
        })
    }
}

/**
 * Error thrown when tool validation fails
 */
export class ToolValidationError extends EffectiveError {
    constructor(params: {
        description: string
        module?: string
        method?: string
        cause?: unknown
        toolName?: string
    }) {
        super({
            ...params,
            module: params.module ?? `Tool:${params.toolName ?? "Unknown"}`,
            method: params.method ?? "validate"
        })
    }
}

/**
 * Error thrown when tool configuration is invalid
 */
export class ToolConfigurationError extends EffectiveError {
    constructor(params: {
        description: string
        module?: string
        method?: string
        cause?: unknown
        toolName?: string
    }) {
        super({
            ...params,
            module: params.module ?? `Tool:${params.toolName ?? "Unknown"}`,
            method: params.method ?? "configure"
        })
    }
} 