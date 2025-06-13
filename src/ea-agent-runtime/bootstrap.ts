/**
 * @file Bootstrap function for loading master configuration
 * @module agent-runtime/bootstrap
 */

import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Schema } from 'effect';
import { AgentRuntimeInitializationError } from "./errors.js";
import { MasterConfigSchema } from "./schema.js";

/**
 * Bootstrap function: Pure TypeScript function that loads master config
 * This is the entry point for loading the master configuration
 */
export const bootstrap = (): Effect.Effect<MasterConfigSchema, AgentRuntimeInitializationError> => {
    return Effect.gen(function* (_) {
        // Step 1: Determine Master Configuration Path
        const path = yield* Path.Path;
        const projectRoot = process.env.PROJECT_ROOT || process.cwd();
        const masterConfigPath = process.env.MASTER_CONFIG_PATH ||
            process.env.EFFECTIVE_AGENT_MASTER_CONFIG ||
            path.join(projectRoot, "config/master-config.json");

        // Step 2: Load and Parse Master Configuration  
        const fs = yield* FileSystem.FileSystem;
        const masterConfigContent = yield* fs.readFileString(masterConfigPath, "utf8").pipe(
            Effect.mapError(error => new AgentRuntimeInitializationError({
                description: `Failed to read master config file at ${masterConfigPath}`,
                module: "AgentRuntime",
                method: "bootstrap",
                cause: error
            }))
        );

        const parsedConfig = yield* Effect.try({
            try: () => JSON.parse(masterConfigContent),
            catch: error => new AgentRuntimeInitializationError({
                description: "Failed to parse master config JSON",
                module: "AgentRuntime",
                method: "bootstrap",
                cause: error
            })
        });

        // Step 3: Schema validation using Schema.decode
        return yield* Schema.decode(MasterConfigSchema)(parsedConfig).pipe(
            Effect.mapError(error => new AgentRuntimeInitializationError({
                description: "Failed to validate master config schema",
                module: "AgentRuntime",
                method: "bootstrap",
                cause: error
            }))
        );
    }).pipe(
        Effect.provide(NodeContext.layer)
    );
}