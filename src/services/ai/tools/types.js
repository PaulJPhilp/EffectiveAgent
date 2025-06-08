/**
 * @file Types for EffectiveTool, Registry and Execution services.
 * @module services/tools/types
 */
import { Effect, HashMap, Schema } from "effect";
// Import error types that might be used in service signatures or implementation types
import { ToolNotFoundError } from "./errors.js"; // Changed from type import to value import
// Use Schema.Record for metadata values
export const MetadataRecord = Schema.Record({ key: Schema.String, value: Schema.Any });
/**
 * Service for tool execution operations
 */
export class ToolExecutorService extends Effect.Service()("ToolExecutorService", {
    effect: Effect.succeed({
        run: (toolName, rawInput) => Effect.fail(new ToolNotFoundError({ toolName, module: "ToolExecutorService", method: "run" }))
    })
}) {
}
export class ProjectWorkspace extends Effect.Service()("ProjectWorkspace", {
    effect: Effect.succeed({
        tools: HashMap.empty(),
        metadata: HashMap.empty()
    })
}) {
}
export class ToolRegistryData extends Effect.Service()("ToolRegistryData", {
    effect: Effect.succeed({
        tools: HashMap.empty(),
        metadata: HashMap.empty()
    })
}) {
}
export class ToolRegistry extends Effect.Service()("ToolRegistry", {
    effect: Effect.succeed({
        getTool: (toolName) => Effect.fail(new ToolNotFoundError({ toolName, module: "ToolRegistry", method: "getTool" })),
        getMetadata: (toolName) => Effect.fail(new ToolNotFoundError({ toolName, module: "ToolRegistry", method: "getMetadata" })),
        listTools: () => Effect.succeed([]),
        registerTool: (toolName, implementation, metadata) => Effect.succeed(void 0)
    })
}) {
}
//# sourceMappingURL=types.js.map