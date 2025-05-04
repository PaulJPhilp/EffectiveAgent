import { Effect } from "effect"

/**
 * Configuration for the EffectorService
 */
export interface EffectorServiceConfig {
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
 * Default configuration for the EffectorService
 */
export const defaultConfig: EffectorServiceConfig = {
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
 * Configuration provider for the EffectorService
 */
export const EffectorServiceConfig = Effect.succeed(defaultConfig)
