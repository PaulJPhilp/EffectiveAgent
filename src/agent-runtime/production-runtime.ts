/**
 * @file Main AgentRuntime singleton that handles automatic initialization
 * @module agent-runtime/runtime
 */

import { NodeFileSystem } from "@effect/platform-node";
import { Effect, LogLevel, Logger, Runtime } from "effect";
import { readFileSync } from "fs";
import { AgentRuntimeInitializationError } from "./errors.js";
import { MasterConfig } from "./schema.js";
import InitializationService from "./test-runtime.js";

/**
 * Bootstrap function: Pure TypeScript function that loads master config and starts AgentRuntime
 * This is the entry point for initializing the entire system
 */
export function bootstrap(): MasterConfig {
    try {
        // Step 1: Determine Master Configuration Path
        const masterConfigPath = process.env.MASTER_CONFIG_PATH ||
            process.env.EFFECTIVE_AGENT_MASTER_CONFIG ||
            "./config/master-config.json";

        // Step 2: Load and Parse Master Configuration  
        const masterConfigContent = readFileSync(masterConfigPath, "utf8");
        const masterConfig = JSON.parse(masterConfigContent) as MasterConfig;

        // Step 3: Basic validation
        if (!masterConfig.runtimeSettings) {
            throw new Error("Master config missing runtimeSettings");
        }

        return masterConfig;
    } catch (error) {
        throw new AgentRuntimeInitializationError({
            description: "Failed to load master configuration during bootstrap",
            module: "AgentRuntime",
            method: "bootstrap",
            cause: error
        });
    }
}

/**
 * Main AgentRuntime class that provides automatic initialization and configuration
 * Acts as a singleton that initializes all services when first accessed
 */
export class AgentRuntime {
    private static _instance: AgentRuntime | undefined;
    private static _runtime: Runtime.Runtime<any> | undefined;
    private static _initializationPromise: Promise<Runtime.Runtime<any>> | undefined;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor(private readonly runtime: Runtime.Runtime<any>) { }

    /**
     * Get the singleton AgentRuntime instance
     * Automatically initializes if not already done
     */
    static async getInstance(): Promise<AgentRuntime> {
        if (AgentRuntime._instance && AgentRuntime._runtime) {
            return AgentRuntime._instance;
        }

        // Prevent multiple initialization attempts
        if (!AgentRuntime._initializationPromise) {
            AgentRuntime._initializationPromise = AgentRuntime.initialize();
        }

        const runtime = await AgentRuntime._initializationPromise;

        if (!AgentRuntime._instance) {
            AgentRuntime._instance = new AgentRuntime(runtime);
            AgentRuntime._runtime = runtime;
        }

        return AgentRuntime._instance;
    }

    /**
 * Initialize the AgentRuntime with a provided master config
 * Takes a validated config and creates the Effect runtime
 */
    private static async initialize(): Promise<Runtime.Runtime<any>> {
        // Use bootstrap function to get master config
        const masterConfig = bootstrap();

        // Create Effect runtime from validated config
        return await AgentRuntime.createRuntimeFromConfig(masterConfig);
    }

    /**
     * Create Effect runtime from validated master config using InitializationService
     * This delegates to InitializationService to avoid code duplication
     */
    private static async createRuntimeFromConfig(masterConfig: MasterConfig): Promise<Runtime.Runtime<any>> {
        const effect = Effect.gen(function* () {
            const initService = yield* InitializationService;
            const runtime = yield* initService.initialize(masterConfig);

            // Log successful initialization
            yield* Effect.log("AgentRuntime initialized successfully", {
                runtimeSettings: masterConfig.runtimeSettings
            });

            return runtime;
        }).pipe(
            Effect.provide(InitializationService.Default),
            Effect.provide(NodeFileSystem.layer),
            Effect.provide(Logger.minimumLogLevel(LogLevel.Info)),
            Effect.tapError(error => Effect.logError("AgentRuntime initialization failed", { error }))
        );

        return await Effect.runPromise(effect as Effect.Effect<Runtime.Runtime<any>, unknown, never>);
    }

    /**
     * Run an Effect with the initialized runtime context
     * This is the main interface for executing agent logic
     */
    async runEffect<A, E>(effect: Effect.Effect<A, E, any>): Promise<A> {
        return await Effect.runPromise(
            effect.pipe(
                Effect.provide(this.runtime)
            )
        );
    }

    /**
     * Get the underlying Effect runtime
     * Use this for advanced scenarios where you need direct runtime access
     */
    getRuntime(): Runtime.Runtime<any> {
        return this.runtime;
    }

    /**
     * Shutdown the AgentRuntime
     * Should be called during application shutdown
     */
    static async shutdown(): Promise<void> {
        AgentRuntime._instance = undefined;
        AgentRuntime._runtime = undefined;
        AgentRuntime._initializationPromise = undefined;
    }
}

/**
 * Convenience function to run an effect with automatic AgentRuntime initialization
 * This is the recommended way for agents to execute effects
 */
export async function runWithAgentRuntime<A, E>(
    effect: Effect.Effect<A, E, any>
): Promise<A> {
    const runtime = await AgentRuntime.getInstance();
    return await runtime.runEffect(effect);
}

/**
 * Convenience function to get a properly initialized AgentRuntime
 * Use this when you need direct access to the runtime
 */
export async function getAgentRuntime(): Promise<AgentRuntime> {
    return await AgentRuntime.getInstance();
} 