import { type Effect } from "effect"
import { type z } from "zod"
import { type ConfigurationService } from "../../configuration/types.js"; // Assuming path
import { type LoggingService } from "../../logging/types.js"; // Assuming path
import { type ToolError } from "../errors/tool-error.js"; // Path to base error

/**
 * Represents the execution context available to a tool when it runs.
 * Contains references to shared services that the tool might need.
 */
export interface ToolExecutionContext {
    readonly loggingService: LoggingService
    readonly configurationService: ConfigurationService
    // Potentially add other shared services like TaskService if tools need them
}

/**
 * Defines the structure for a tool that can be registered and invoked by the ToolService.
 * @template InputSchema - Zod schema for the tool's input.
 * @template OutputSchema - Zod schema for the tool's output.
 */
export interface Tool<
    InputSchema extends z.ZodTypeAny,
    OutputSchema extends z.ZodTypeAny
> {
    /** Unique identifier for the tool (e.g., "calculator", "web-search"). */
    readonly id: string
    /** Human-readable name for the tool (e.g., "Calculator", "Web Search"). */
    readonly name: string
    /** Description explaining the tool's purpose, suitable for display or LLM consumption. */
    readonly description: string
    /** Zod schema used to validate the input arguments provided to the tool. */
    readonly inputSchema: InputSchema
    /** Zod schema used to validate the output returned by the tool. */
    readonly outputSchema: OutputSchema
    /**
     * The core execution logic of the tool.
     * Takes validated input and the execution context.
     * Returns an Effect that resolves to the validated output or fails with a ToolError.
     */
    readonly execute: (
        input: z.infer<InputSchema>,
        context: ToolExecutionContext
    ) => Effect.Effect<z.infer<OutputSchema>, ToolError> // Consider specific ToolExecutionError
    /** Optional tags for categorizing or filtering tools (e.g., ["math", "external-api"]). */
    readonly tags?: readonly string[]
}

/**
 * Represents any tool, regardless of its specific input/output schemas.
 * Useful for collections or registries of diverse tools.
 */
export type AnyTool = Tool<z.ZodTypeAny, z.ZodTypeAny> 