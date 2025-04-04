import { NodeContext } from "@effect/platform-node"
import { FileSystem } from "@effect/platform/FileSystem"
import { Cause, Effect, Exit, Option } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { ConfigParseError, ConfigReadError, ConfigSchemaMissingError, ConfigValidationError } from "../../configuration/errors.js"
import { ConfigLoader } from "../../configuration/types.js"
import { ToolConfigurationError } from "../errors.js"
import { AgentToolConfigSchema, type AgentToolConfig } from "../schema.js"
import { ToolConfigurationService } from "../tool-configuration-service.js"

const validAgentConfig: AgentToolConfig = {
    name: "agent-config",
    version: "1.0.0",
    description: "Agent configuration",
    tags: ["test"],
    standardLibrary: {
        name: "standard-lib",
        version: "1.0.0",
        description: "Standard library for tools",
        path: "./test-standard",
        tools: ["tool-one"],
        tags: ["test"]
    }
}

type ConfigError = ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError

const makeToolConfigurationService = (configLoader: ConfigLoader): ToolConfigurationService => ({
    loadConfig: (configPath: string, schema: typeof AgentToolConfigSchema) =>
        configLoader.loadConfig<AgentToolConfig>(configPath, { schema }).pipe(
            Effect.mapError(error => new ToolConfigurationError(`Failed to load config: ${error}`))
        ) as Effect.Effect<AgentToolConfig, ToolConfigurationError, FileSystem>,
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

const mockConfigLoader = (config: unknown): ConfigLoader => ({
    loadConfig: <T>(_: string, options?: { schema?: z.ZodType<T> }) => {
        if (!options?.schema) {
            return Effect.fail(new ConfigSchemaMissingError({ filePath: "test" }))
        }
        const result = options.schema.safeParse(config)
        if (!result.success) {
            const zodError = result.error
            const formattedErrors = zodError.errors.map(e => `[${e.path.join('.')}] ${e.message}`).join('; ')
            return Effect.fail(new ConfigValidationError({
                filePath: "test",
                zodError,
                message: formattedErrors
            }))
        }
        return Effect.succeed(result.data)
    }
})

describe("ToolConfigurationService", () => {
    beforeEach(async () => {
        const program = Effect.gen(function* (_) {
            const fs = yield* FileSystem
            yield* Effect.all([
                fs.makeDirectory("./test-library", { recursive: true }),
                fs.makeDirectory("./test-standard", { recursive: true })
            ])
        })
        await Effect.runPromise(program.pipe(Effect.provide(NodeContext.layer)))
    })

    afterEach(async () => {
        const program = Effect.gen(function* (_) {
            const fs = yield* FileSystem
            yield* Effect.all([
                fs.remove("./test-library", { recursive: true }),
                fs.remove("./test-standard", { recursive: true })
            ])
        })
        await Effect.runPromise(program.pipe(Effect.provide(NodeContext.layer)))
    })

    describe("loadConfig", () => {
        it("should successfully load a valid tool library config", async () => {
            const service = makeToolConfigurationService({
                loadConfig: () => Effect.succeed(validAgentConfig)
            } as ConfigLoader)
            const program = service.loadConfig("valid.json", AgentToolConfigSchema)
            const result = await Effect.runPromise(program.pipe(Effect.provide(NodeContext.layer)))
            expect(result).toEqual(validAgentConfig)
        })

        it("should successfully load a valid agent config", async () => {
            const service = makeToolConfigurationService(mockConfigLoader(validAgentConfig))
            const program = service.loadConfig("valid.json", AgentToolConfigSchema)
            const result = await Effect.runPromise(program.pipe(Effect.provide(NodeContext.layer)))
            expect(result).toEqual(validAgentConfig)
        })

        it("should fail with ToolConfigurationError when tool name is too short", async () => {
            const invalidConfig = {
                name: "test-config",
                version: "1.0.0",
                description: "Test config",
                tags: ["test"],
                standardLibrary: {
                    name: "test-lib",
                    version: "1.0.0",
                    description: "Test library",
                    path: "./test-path",
                    tools: ["ab"], // Too short
                    tags: ["test"]
                }
            }
            const service = makeToolConfigurationService(mockConfigLoader(invalidConfig))
            const program = service.loadConfig("invalid.json", AgentToolConfigSchema)
            const result = await Effect.runPromiseExit(program.pipe(Effect.provide(NodeContext.layer)))
            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Option.getOrNull(Cause.failureOption(result.cause))
                expect(error).toBeInstanceOf(ToolConfigurationError)
                expect(error?.message).toContain("Tool name must be at least 3 characters long")
            }
        })

        it("should fail with ToolConfigurationError when path is too short", async () => {
            const invalidConfig = {
                name: "test-config",
                version: "1.0.0",
                description: "Test config",
                tags: ["test"],
                standardLibrary: {
                    name: "test-lib",
                    version: "1.0.0",
                    description: "Test library",
                    path: "a", // Too short (no ./ prefix)
                    tools: ["tool-one"],
                    tags: ["test"]
                }
            }
            const service = makeToolConfigurationService(mockConfigLoader(invalidConfig))
            const program = service.loadConfig("invalid.json", AgentToolConfigSchema)
            const result = await Effect.runPromiseExit(program.pipe(Effect.provide(NodeContext.layer)))
            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Option.getOrNull(Cause.failureOption(result.cause))
                expect(error).toBeInstanceOf(ToolConfigurationError)
                expect(error?.message).toContain("Path must be at least 3 characters long")
            }
        })
    })

    describe("validateConfig", () => {
        it("should validate a correct agent config", async () => {
            const service = makeToolConfigurationService({} as ConfigLoader)
            const program = service.validateConfig(validAgentConfig)
            const result = await Effect.runPromise(program.pipe(Effect.provide(NodeContext.layer)))
            expect(result).toBeUndefined()
        })

        it("should fail when standard library path does not exist", async () => {
            const service = makeToolConfigurationService({} as ConfigLoader)
            const program = service.validateConfig({
                ...validAgentConfig,
                standardLibrary: {
                    ...validAgentConfig.standardLibrary,
                    path: "./non-existent-path"
                }
            })
            const result = await Effect.runPromiseExit(program.pipe(Effect.provide(NodeContext.layer)))
            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Option.getOrNull(Cause.failureOption(result.cause))
                expect(error).toBeInstanceOf(ToolConfigurationError)
                expect(error?.message).toContain("Standard library path does not exist")
            }
        })

        it("should fail when agent library path does not exist", async () => {
            const service = makeToolConfigurationService({} as ConfigLoader)
            const program = service.validateConfig({
                ...validAgentConfig,
                agentLibrary: {
                    name: "agent-lib",
                    version: "1.0.0",
                    description: "Agent library for tools",
                    path: "./non-existent-path",
                    tools: ["tool-one"],
                    tags: ["test"]
                }
            })
            const result = await Effect.runPromiseExit(program.pipe(Effect.provide(NodeContext.layer)))
            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Option.getOrNull(Cause.failureOption(result.cause))
                expect(error).toBeInstanceOf(ToolConfigurationError)
                expect(error?.message).toContain("Agent library path does not exist")
            }
        })
    })
}) 