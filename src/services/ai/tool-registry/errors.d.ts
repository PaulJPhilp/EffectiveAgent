import { EffectiveError } from "@/errors.js";
/**
 * Base error for the ToolRegistryService.
 */
export declare class ToolRegistryError extends EffectiveError {
    constructor(params: {
        description: string;
        method: string;
        cause?: unknown;
        [key: string]: unknown;
    });
}
/**
 * Error thrown when a tool is not found in the registry.
 */
export declare class ToolNotFoundErrorInRegistry extends ToolRegistryError {
    constructor(params: {
        toolName: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when a toolkit is not found in the registry.
 */
export declare class ToolkitNotFoundErrorInRegistry extends ToolRegistryError {
    constructor(params: {
        toolkitName: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown if there's a conflict registering a tool.
 */
export declare class ToolRegistrationConflictError extends ToolRegistryError {
    constructor(params: {
        toolName: string;
        method: string;
        cause?: unknown;
    });
}
//# sourceMappingURL=errors.d.ts.map