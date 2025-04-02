import { FileSystem } from "@effect/platform/FileSystem"
import { Context, Effect, Layer } from "effect"
import { ConfigLoader, ConfigValidationError } from "../configuration/types.js"
import { ToolConfigurationError } from "./errors.js"
import { type AgentToolConfig, AgentToolConfigSchema } from "./schema.js"

// --- Service Interface ---

/**
 * Service responsible for loading and validating tool configurations
 */
export interface ToolConfigurationService {
    /**
     * Loads a configuration from a specified path
     */
    readonly loadConfig: (
        configPath: string,
        schema: typeof AgentToolConfigSchema
    ) => Effect.Effect<AgentToolConfig, ToolConfigurationError, FileSystem>

    /**
     * Validates a given tool configuration
     */
    readonly validateConfig: <T extends AgentToolConfig>(
        config: T
    ) => Effect.Effect<void, ToolConfigurationError, FileSystem>
}

// --- Service Implementation ---

/**
 * Creates a ToolConfigurationService instance
 */
const makeToolConfigurationService = (configLoader: ConfigLoader): ToolConfigurationService => ({
    loadConfig: (configPath: string, schema: typeof AgentToolConfigSchema) =>
        Effect.gen(function* () {
            yield* Effect.logDebug(`Loading tool config from: ${configPath}`)
            const result = yield* configLoader.loadConfig<AgentToolConfig>(configPath, { schema }).pipe(
                Effect.mapError(error => {
                    if (error instanceof ConfigValidationError) {
                        return new ToolConfigurationError(
                            `Failed to load config: ${error.message}`,
                            { cause: error }
                        )
                    }
                    return new ToolConfigurationError(
                        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
                        { cause: error }
                    )
                })
            )
            return result as AgentToolConfig
        }),

    validateConfig: <T extends AgentToolConfig>(config: T) =>
        Effect.gen(function* () {
            const fs = yield* FileSystem

            // Helper to check path existence
            const checkPath = (path: string, context: string) =>
                Effect.gen(function* () {
                    const exists = yield* fs.exists(path)
                    if (!exists) {
                        return yield* Effect.fail(
                            new ToolConfigurationError(`${context} path does not exist: ${path}`)
                        )
                    }
                })

            // Check both standard library and agent library paths
            yield* Effect.all([
                checkPath(config.standardLibrary.path, 'Standard library'),
                config.agentLibrary
                    ? checkPath(config.agentLibrary.path, 'Agent library')
                    : Effect.succeed(undefined)
            ], { concurrency: 'unbounded' })

            return yield* Effect.succeed(undefined)
        }).pipe(
            Effect.mapError((error): ToolConfigurationError =>
                error instanceof ToolConfigurationError ? error :
                    new ToolConfigurationError(`Failed to validate config: ${error}`)
            )
        )
})

// --- Service Tag ---

/**
 * Tag for the ToolConfigurationService
 */
export const ToolConfigurationService = Context.GenericTag<ToolConfigurationService>(
    "@services/tool/ToolConfigurationService"
)

// --- Service Layer ---

/**
 * Live implementation of the ToolConfigurationService
 */
export const ToolConfigurationServiceLive = Layer.effect(
    ToolConfigurationService,
    Effect.gen(function* () {
        const configLoader = yield* ConfigLoader
        return makeToolConfigurationService(configLoader)
    })
) 