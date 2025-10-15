import { Data } from "effect";
import { EffectiveError } from "@/errors.js";

/**
 * Base error for the ToolRegistryService.
 */
export class ToolRegistryError extends EffectiveError {
  constructor(params: {
    description: string;
    method: string;
    cause?: unknown;
    [key: string]: unknown; // Allow additional properties
  }) {
    super({ ...params, module: "ToolRegistryService" });
  }
}

/**
 * Error thrown when a tool is not found in the registry.
 */
export class ToolNotFoundErrorInRegistry extends Data.TaggedError("ToolNotFoundErrorInRegistry")<{
    readonly toolName: string;
    readonly method: string;
}> { }

/**
 * Error thrown when a toolkit is not found in the registry.
 */
export class ToolkitNotFoundErrorInRegistry extends Data.TaggedError("ToolkitNotFoundErrorInRegistry")<{
    readonly toolkitName: string;
    readonly method: string;
}> { }

/**
 * Error thrown when a tool implementation is not found.
 */
export class ToolImplementationNotFoundError extends Data.TaggedError("ToolImplementationNotFoundError")<{
    readonly toolName: string;
    readonly method: string;
}> { }

/**
 * Error thrown if there's a conflict registering a tool.
 */
export class ToolRegistrationConflictError extends ToolRegistryError {
    constructor(params: {
        toolName: string;
        method: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            description: `Conflict registering tool '${params.toolName}'. It already exists or overrides a lower-precedence tool.`,
        });
    }
}
