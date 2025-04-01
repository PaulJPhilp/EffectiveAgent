import { Context, Effect } from "effect"
import { ToolInvocationError, ToolNotFoundError, ToolRegistrationError } from "../errors/index.js"
import { type AnyTool } from "./tool.js"

/**
 * Defines the contract for the ToolService.
 * Responsible for registering, discovering, and invoking tools.
 */
export interface IToolService {
    /**
     * Registers a tool definition with the service.
     * @param tool - The tool definition object to register.
     * @returns An Effect that completes successfully if registration is successful,
     * or fails with a ToolRegistrationError (e.g., if the tool ID already exists).
     */
    registerTool(tool: AnyTool): Effect.Effect<void, ToolRegistrationError>

    /**
     * Retrieves a tool definition by its unique ID.
     * @param toolId - The unique identifier of the tool to retrieve.
     * @returns An Effect that resolves with the tool definition if found,
     * or fails with a ToolNotFoundError if no tool with the given ID exists.
     */
    getTool(toolId: string): Effect.Effect<AnyTool, ToolNotFoundError>

    /**
     * Lists all registered tools, optionally filtering by tags.
     * @param options - Optional filtering criteria.
     * @param options.tags - An array of tags; only tools matching all provided tags will be returned.
     * @returns An Effect that resolves with an array of matching tool definitions.
     * This effect never fails.
     */
    listTools(options?: { readonly tags?: readonly string[] }): Effect.Effect<AnyTool[], never>

    /**
     * Invokes a tool by its ID with the given input.
     * Handles input validation, execution, and output validation.
     * @template Input - The expected type of the input data.
     * @template Output - The expected type of the output data.
     * @param toolId - The unique identifier of the tool to invoke.
     * @param input - The input data for the tool.
     * @returns An Effect that resolves with the tool's output if successful,
     * or fails with a ToolInvocationError wrapping the underlying cause
     * (e.g., ToolNotFoundError, ToolValidationError, ToolExecutionError).
     */
    invokeTool<Input, Output>(toolId: string, input: Input): Effect.Effect<Output, ToolInvocationError>
}

/**
 * The Effect Context Tag for the ToolService.
 * Used for dependency injection within the Effect ecosystem.
 */
export class ToolService extends Context.Tag("ToolService")<IToolService, IToolService>() { } 