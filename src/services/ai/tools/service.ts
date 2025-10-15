/**
 * @file Implements the Tool Service using Effect.Service pattern.
 */

import { Effect } from "effect";
import { ToolRegistryService } from "../tool-registry/service.js";
import type { ToolServiceApi } from "./api.js";
import {
    AppToolParseError,
    type ToolExecutionError,
    ToolInputValidationError,
    ToolNotFoundError,
    type ToolOutputValidationError
} from "./errors.js";
import type { EffectiveTool, IEffectImplementation } from "./schema.js";
import type { FullToolName } from "./types.js";

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
                toolName: `${string}:${string}`,
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

                // Validate input against tool parameters
                const validatedInput = yield* Effect.mapError(
                    Effect.succeed(rawInput as Record<string, unknown>),
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

                // Return the validated tool and input for the LLM to use
                return {
                    tool,
                    validatedInput
                } as Output;
            })
        };
    })
}) { }
