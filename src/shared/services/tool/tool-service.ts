import { Effect } from "effect";
import { type ZodIssue } from "zod";
import { ConfigurationService } from "../configuration/configuration-service.js";
import { type ILoggingService } from "../logging/types/index.js";
import { type Logger } from "../logging/types/logger.js";
import {
    ToolExecutionError,
    ToolInvocationError,
    ToolNotFoundError,
    ToolRegistrationError,
    ToolValidationError
} from "./errors/index.js";
import { type AnyTool, type IToolService, type ToolExecutionContext } from "./types/index.js";

/**
 * Live implementation of the ToolService.
 * Manages tool registration and invocation.
 */
export class ToolServiceLive implements IToolService {
    private readonly toolRegistry = new Map<string, AnyTool>()

    constructor(
        private readonly loggingService: ILoggingService,
        private readonly configurationService: ConfigurationService
    ) { }

    registerTool(tool: AnyTool): Effect.Effect<void, ToolRegistrationError> {
        return this.loggingService.getLogger("ToolService").pipe(
            Effect.flatMap((log: Logger) => {
                if (this.toolRegistry.has(tool.id)) {
                    const error = new ToolRegistrationError(
                        `Tool with ID '${tool.id}' is already registered.`,
                        { toolId: tool.id }
                    )
                    return log.error("Tool registration failed", { annotations: { toolId: tool.id, error } }).pipe(
                        Effect.flatMap(() => Effect.fail(error))
                    )
                }
                this.toolRegistry.set(tool.id, tool)
                return log.info("Tool registered successfully", {
                    annotations: {
                        toolId: tool.id,
                        toolName: tool.name
                    }
                })
            }),
            Effect.annotateLogs({ service: "ToolService", method: "registerTool" })
        )
    }

    getTool(toolId: string): Effect.Effect<AnyTool, ToolNotFoundError> {
        const tool = this.toolRegistry.get(toolId)
        if (!tool) {
            return Effect.fail(
                new ToolNotFoundError(`Tool with ID '${toolId}' not found.`, {
                    toolId
                })
            )
        }
        return Effect.succeed(tool)
    }

    listTools(
        options?: { readonly tags?: readonly string[] }
    ): Effect.Effect<AnyTool[], never> {
        return Effect.sync(() => {
            const allTools = Array.from(this.toolRegistry.values())
            if (!options?.tags || options.tags.length === 0) {
                return allTools
            }
            const requiredTags = new Set(options.tags)
            return allTools.filter(
                tool =>
                    tool.tags && tool.tags.every(tag => requiredTags.has(tag))
            )
        })
    }

    invokeTool<Input, Output>(
        toolId: string,
        input: Input
    ): Effect.Effect<Output, ToolInvocationError> {
        const startTime = performance.now()
        let log: Logger
        let toolRef: AnyTool

        return this.loggingService.getLogger("ToolService").pipe(
            Effect.tap((logger: Logger) => { log = logger }),
            Effect.tap(() => log.debug("Attempting to invoke tool", { annotations: { toolId, input } })),
            Effect.flatMap(() => this.getTool(toolId)),
            Effect.flatMap((foundTool: AnyTool) => {
                toolRef = foundTool;
                return Effect.succeed(foundTool);
            }),
            Effect.mapError((cause: ToolNotFoundError) => new ToolInvocationError(`Failed to find tool '${toolId}'`, { toolId, cause })),
            Effect.map(toolInstance => ({
                toolInstance,
                executionContext: {
                    loggingService: this.loggingService,
                    configurationService: this.configurationService
                } as ToolExecutionContext
            })),
            Effect.flatMap(({ toolInstance, executionContext }) =>
                Effect.try({
                    try: () => toolInstance.inputSchema.safeParse(input),
                    catch: error => new ToolInvocationError("Input schema parsing failed unexpectedly.", {
                        toolId,
                        cause: error instanceof Error ? error : new Error(String(error))
                    })
                }).pipe(
                    Effect.flatMap(validationResult => {
                        if (!validationResult.success) {
                            const validationError = new ToolValidationError(
                                `Input validation failed for tool '${toolId}'.`,
                                { toolId, validationErrors: validationResult.error, validationType: "input" }
                            )
                            const invocationError = new ToolInvocationError(
                                `Tool invocation failed due to input validation.`, { toolId, cause: validationError }
                            )
                            const formattedIssues = validationResult.error.issues.map((i: ZodIssue) => `${i.path.join(".")}: ${i.message}`).join("; ")
                            return log.warn("Tool input validation failed", { annotations: { toolId, issues: formattedIssues } }).pipe(
                                Effect.flatMap(() => Effect.fail(invocationError))
                            )
                        }
                        return Effect.succeed({
                            validatedInput: validationResult.data,
                            executionContext
                        })
                    })
                )
            ),
            Effect.tap(() => log.debug("Tool input validated successfully", { annotations: { toolId } })),
            Effect.flatMap(({ validatedInput, executionContext }) =>
                toolRef.execute(validatedInput, executionContext).pipe(
                    Effect.mapError(cause => {
                        const executionError = cause instanceof ToolExecutionError ? cause :
                            new ToolExecutionError(`Execution failed unexpectedly for '${toolId}'.`, {
                                toolId,
                                cause: cause instanceof Error ? cause : new Error(String(cause))
                            })
                        return new ToolInvocationError(`Tool execution failed for '${toolId}'.`, { toolId, cause: executionError })
                    })
                )
            ),
            Effect.tap(executionResult => log.debug("Tool executed successfully", { annotations: { toolId, executionResult } })),
            Effect.flatMap(executionResult =>
                Effect.try({
                    try: () => toolRef.outputSchema.safeParse(executionResult),
                    catch: error => new ToolInvocationError("Output schema parsing failed unexpectedly.", {
                        toolId,
                        cause: error instanceof Error ? error : new Error(String(error))
                    })
                }).pipe(
                    Effect.flatMap(validationResult => {
                        if (!validationResult.success) {
                            const validationError = new ToolValidationError(
                                `Output validation failed for tool '${toolId}'.`,
                                { toolId, validationErrors: validationResult.error, validationType: "output" }
                            )
                            const invocationError = new ToolInvocationError(
                                `Tool invocation failed due to output validation.`, { toolId, cause: validationError }
                            )
                            const formattedIssues = validationResult.error.issues.map((i: ZodIssue) => `${i.path.join(".")}: ${i.message}`).join("; ")
                            return log.warn("Tool output validation failed", { annotations: { toolId, issues: formattedIssues, executionResult } }).pipe(
                                Effect.flatMap(() => Effect.fail(invocationError))
                            )
                        }
                        return Effect.succeed(validationResult.data as Output)
                    })
                )
            ),
            Effect.tap(validatedOutput => {
                const durationMs = performance.now() - startTime
                log.info("Tool invoked successfully", { annotations: { toolId, durationMs } })
            }),
            Effect.catchAll(error => {
                const causeIsError = typeof error === 'object' && error !== null && error instanceof Error;
                if (error instanceof ToolInvocationError) return Effect.fail(error)
                return Effect.fail(new ToolInvocationError("Unexpected error during tool invocation pipeline.", {
                    toolId,
                    cause: causeIsError ? error as Error : new Error(String(error))
                }))
            }),
            Effect.annotateLogs({ service: "ToolService", method: "invokeTool", toolId })
        )
    }
}

/* Commenting out problematic Layer definition
export const ToolServiceLiveLayer = Layer.effect(
    ToolService,
    // Use Effect.gen to access dependencies from context
    Effect.gen(function* (_) {
        const loggingService = yield* _(LoggingService);
        const configurationService = yield* _(ConfigurationService);
        // Construct and return the service, potentially using Tag.of if needed
        // @ts-expect-error - Suppressing persistent Layer/Tag mismatch error
        return ToolService.of(new ToolServiceLive(loggingService, configurationService)); 
    })
);
*/ 