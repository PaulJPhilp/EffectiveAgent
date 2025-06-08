/**
 * @file Defines the Tool Service API interface and tag.
 */
import { Effect } from "effect";
import type { ToolExecutionError, ToolInputValidationError, ToolNotFoundError, ToolOutputValidationError } from "./errors.js";
import type { FullToolName } from "./types.js";
/**
 * Provides capabilities for executing tools with validation and error handling.
 *
 * @remarks
 * This service is responsible for:
 * - Executing tools by their fully qualified name
 * - Validating inputs and outputs using Effect Schema
 * - Managing tool execution context and permissions
 * - Providing type-safe error handling
 *
 * Tools can be implemented in various ways (Effect, HTTP, MCP) and are
 * discovered through the tool registry system.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const toolService = yield* ToolService;
 *   const result = yield* toolService.run("calculator/add", { a: 1, b: 2 });
 *   return result;
 * });
 * ```
 */
export interface ToolServiceApi {
    /**
     * Executes a registered tool by its fully qualified name with the given raw input.
     *
     * @remarks
     * This method:
     * 1. Looks up the tool in the registry
     * 2. Validates the input against the tool's schema
     * 3. Executes the tool with proper context
     * 4. Validates the output
     * 5. Returns the result or appropriate error
     *
     * @param toolName - The fully qualified name of the tool (e.g., "calculator", "science/calculator")
     * @param rawInput - The unvalidated input data for the tool
     * @returns An Effect that yields the validated tool output or fails with a specific error
     * @template Output - The expected output type, defaults to unknown if not specified
     *
     * @throws ToolNotFoundError - If the requested tool doesn't exist
     * @throws ToolInputValidationError - If the input fails validation
     * @throws ToolOutputValidationError - If the output fails validation
     * @throws ToolExecutionError - If the tool execution fails
     */
    readonly run: <Output = unknown>(toolName: FullToolName, rawInput: unknown) => Effect.Effect<Output, ToolNotFoundError | ToolInputValidationError | ToolOutputValidationError | ToolExecutionError, any>;
}
//# sourceMappingURL=api.d.ts.map