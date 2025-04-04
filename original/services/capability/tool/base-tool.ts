import { Effect } from "effect"
import { z } from "zod"
import { ToolExecutionError } from "./errors/index.ts"
import { type ToolExecutionContext } from "./types/index.ts"

/**
 * Base class for all tools. Provides common functionality and type safety.
 */
export abstract class BaseTool<
    TInputSchema extends z.ZodType,
    TOutput
> {
    /**
     * Unique identifier for this tool
     */
    abstract readonly id: string

    /**
     * Display name for this tool
     */
    abstract readonly name: string

    /**
     * Description of what this tool does
     */
    abstract readonly description: string

    /**
     * Tags for categorizing and searching tools
     */
    abstract readonly tags: readonly string[]

    /**
     * Schema for validating tool input
     */
    abstract readonly inputSchema: TInputSchema

    /**
     * Schema for validating tool output
     */
    abstract readonly outputSchema: z.ZodType<TOutput>

    /**
     * Execute the tool with the given input and context
     */
    abstract execute(
        input: z.infer<TInputSchema>,
        context: ToolExecutionContext
    ): Effect.Effect<TOutput, ToolExecutionError>
} 