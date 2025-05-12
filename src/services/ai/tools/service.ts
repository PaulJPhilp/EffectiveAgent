/**
 * @file Implements the Tool Service using Effect.Service pattern.
 */

import { Effect, Schema } from "effect";
import { ToolRegistryService } from "../tool-registry/service.js";
import type { ToolServiceApi } from "./api.js";
import {
    AppToolParseError,
    ToolExecutionError,
    ToolInputValidationError,
    ToolNotFoundError,
    ToolOutputValidationError
} from "./errors.js";
import { type ToolImplementation } from "./schema.js";
import type { FullToolName, IEffectImplementation } from "./types.js";

/**
 * Implementation of the Tool Service.
 * 
 * @remarks
 * This service provides the core implementation for executing tools with validation
 * and error handling. It depends on the ToolRegistryService to look up tools.
 */
export class ToolService extends Effect.Service<ToolServiceApi>()("ToolService", {
    effect: Effect.gen(function* () {
        // Get dependencies
        const registry = yield* ToolRegistryService;

        // Return implementation
        return {
            run: <Output = unknown>(
                toolName: FullToolName,
                rawInput: unknown
            ): Effect.Effect<
                Output,
                | ToolNotFoundError
                | ToolInputValidationError
                | ToolOutputValidationError
                | ToolExecutionError,
                any // Allow any dependencies required by tool implementations
            > => Effect.gen(function* () {
                // Look up the tool in the registry
                const tool = yield* Effect.mapError(
                    registry.getTool(toolName),
                    (error) => new ToolNotFoundError({
                        toolName,
                        module: "ToolService",
                        method: "run"
                    })
                );

                // Get the implementation
                const impl = tool.implementation as ToolImplementation;
                if (impl._tag !== "EffectImplementation") {
                    return yield* Effect.fail(new ToolExecutionError({
                        toolName,
                        module: "ToolService",
                        method: "run",
                        cause: `Unsupported implementation type: ${impl._tag}`
                    }));
                }

                // Cast to EffectImplementation to get proper typing
                const effectImpl = impl as IEffectImplementation<unknown, Output, any, any>;

                // Validate input using the tool's schema
                const validatedInput = yield* Effect.mapError(
                    Schema.decode(effectImpl.inputSchema)(rawInput),
                    (error) => new ToolInputValidationError({
                        toolName,
                        module: "ToolService",
                        method: "run",
                        cause: new AppToolParseError({
                            module: "ToolService",
                            method: "validateInput",
                            description: `Failed to validate input for tool ${toolName}`,
                            parseError: error,
                            context: rawInput
                        })
                    })
                );

                // Execute the tool with validated input
                const rawOutput = yield* Effect.mapError(
                    effectImpl.execute(validatedInput),
                    (error) => new ToolExecutionError({
                        toolName,
                        module: "ToolService",
                        method: "run",
                        cause: error
                    })
                );

                // Validate output using the tool's schema
                const validatedOutput = yield* Effect.mapError(
                    Schema.decode(effectImpl.outputSchema)(rawOutput),
                    (error) => new ToolOutputValidationError({
                        toolName,
                        module: "ToolService",
                        method: "run",
                        cause: new AppToolParseError({
                            module: "ToolService",
                            method: "validateOutput",
                            description: `Failed to validate output for tool ${toolName}`,
                            parseError: error,
                            context: rawOutput
                        })
                    })
                );

                return validatedOutput as Output;
            })
        };
    }),
    dependencies: [ToolRegistryService.Default]
}) { }
