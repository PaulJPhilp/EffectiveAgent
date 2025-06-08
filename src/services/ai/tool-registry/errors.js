import { EffectiveError } from "@/errors.js";
/**
 * Base error for the ToolRegistryService.
 */
export class ToolRegistryError extends EffectiveError {
    constructor(params) {
        super({ ...params, module: "ToolRegistryService" });
    }
}
/**
 * Error thrown when a tool is not found in the registry.
 */
export class ToolNotFoundErrorInRegistry extends ToolRegistryError {
    constructor(params) {
        super({
            ...params,
            description: `Tool '${params.toolName}' not found in registry.`,
        });
    }
}
/**
 * Error thrown when a toolkit is not found in the registry.
 */
export class ToolkitNotFoundErrorInRegistry extends ToolRegistryError {
    constructor(params) {
        super({
            ...params,
            description: `Toolkit '${params.toolkitName}' not found in registry.`,
        });
    }
}
/**
 * Error thrown if there's a conflict registering a tool.
 */
export class ToolRegistrationConflictError extends ToolRegistryError {
    constructor(params) {
        super({
            ...params,
            description: `Conflict registering tool '${params.toolName}'. It already exists or overrides a lower-precedence tool.`,
        });
    }
}
//# sourceMappingURL=errors.js.map