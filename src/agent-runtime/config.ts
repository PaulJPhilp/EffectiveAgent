import { Effect } from "effect"
import type { AgentRuntimeConfig } from "./types.js"

/**
 * Default configuration for AgentRuntime instances
 */
export const defaultAgentRuntimeConfig: AgentRuntimeConfig = {
    mailbox: {
        size: 1000,
        priorityQueueSize: 100,
        enablePrioritization: true
    },
    processing: {
        maxConcurrent: 5,
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
    }
}

/**
 * Default configuration for all AgentRuntime instances.
 */
export const defaultAgentRuntimeConfig: AgentRuntimeConfig = {
    mailbox: {
        size: 1000,
        enablePrioritization: true,
        priorityQueueSize: 100,
        backpressureTimeout: 5000
    }
}

/**
 * Configuration for the AgentRuntimeService
 */
export interface AgentRuntimeServiceConfig {
    readonly mailbox: {
        readonly size: number
        readonly priorityQueueSize: number
        readonly backpressureTimeout: number
        readonly enablePrioritization: boolean
    }
    readonly enableMetrics: boolean
    readonly logLevel: string
}

/**
 * Default configuration for the AgentRuntimeService
 */
export const defaultConfig: AgentRuntimeServiceConfig = {
    mailbox: {
        size: 1000,
        priorityQueueSize: 100,
        backpressureTimeout: 5000,
        enablePrioritization: true
    },
    enableMetrics: true,
    logLevel: "info"
}

/**
 * Configuration provider for the AgentRuntimeService
 */
export const AgentRuntimeServiceConfig = Effect.succeed(defaultConfig)

/**
 * Creates a custom configuration by merging with defaults
 */
export const createConfig = (
    customConfig: Partial<AgentRuntimeConfig>
): AgentRuntimeConfig => ({
    ...defaultAgentRuntimeConfig,
    ...customConfig,
    mailbox: {
        ...defaultAgentRuntimeConfig.mailbox,
        ...customConfig.mailbox
    },
    processing: {
        ...defaultAgentRuntimeConfig.processing,
        ...customConfig.processing
    }
})