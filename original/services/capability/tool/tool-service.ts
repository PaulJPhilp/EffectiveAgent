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
} from "./errors/index.ts";
import { type AnyTool, type IToolService, type ToolExecutionContext } from "./types/index.ts";

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
        const self = this
        return Effect.gen(function* (_) {
            const log: Logger = yield* _(self.loggingService.getLogger("ToolService"))

            if (self.toolRegistry.has(tool.id)) {
                const error = new ToolRegistrationError(
                    `Tool with ID '${tool.id}' is already registered.`,
                    { toolId: tool.id }
                )
                yield* _(log.error("Tool registration failed", { annotations: { toolId: tool.id, error } }))
                return yield* _(Effect.fail<ToolRegistrationError>(error))
            }

            yield* _(Effect.sync(() => self.toolRegistry.set(tool.id, tool)))
            yield* _(log.info("Tool registered successfully", {
                annotations: {
                    toolId: tool.id,
                    toolName: tool.name
                }
            }))
        }).pipe(
            Effect.annotateLogs({ service: "ToolService", method: "registerTool" })
        )
    }

    getTool(toolId: string): Effect.Effect<AnyTool, ToolNotFoundError> {
        return Effect.sync(() => {
            const tool = this.toolRegistry.get(toolId)
            if (!tool) {
                return Effect.fail(
                    new ToolNotFoundError(`Tool with ID '${toolId}' not found.`, {
                        toolId
                    })
                )
            }
            return Effect.succeed(tool)
        }).pipe(Effect.flatten)
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
                    tool.tags && tool.tags.some(tag => requiredTags.has(tag))
            )
        })
    }

    invokeTool<Input, Output>(
        toolId: string,
        input: Input
    ): Effect.Effect<Output, ToolInvocationError> {
        const self = this
        return Effect.gen(function* (_) {
            const startTime = performance.now()
            const log: Logger = yield* _(self.loggingService.getLogger("ToolService"))

            yield* _(log.debug("Attempting to invoke tool", { annotations: { toolId, input } }))

            const tool = yield* _(self.getTool(toolId).pipe(
                Effect.mapError(cause => new ToolInvocationError(`Failed to find tool '${toolId}'`, { toolId, cause }))
            ))

            const executionContext = {
                loggingService: self.loggingService,
                configurationService: self.configurationService
            } as ToolExecutionContext

            const validationResult = yield* _(Effect.try({
                try: () => tool.inputSchema.safeParse(input),
                catch: error => new ToolInvocationError("Input schema parsing failed unexpectedly.", {
                    toolId,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }))

            if (!validationResult.success) {
                const validationError = new ToolValidationError(
                    `Input validation failed for tool '${toolId}'.`,
                    { toolId, validationErrors: validationResult.error, validationType: "input" }
                )
                const invocationError = new ToolInvocationError(
                    `Tool invocation failed due to input validation.`, { toolId, cause: validationError }
                )
                const formattedIssues = validationResult.error.issues.map((i: ZodIssue) => `${i.path.join(".")}: ${i.message}`).join("; ")
                yield* _(log.warn("Tool input validation failed", { annotations: { toolId, issues: formattedIssues } }))
                return yield* _(Effect.fail<ToolInvocationError>(invocationError))
            }

            yield* _(log.debug("Tool input validated successfully", { annotations: { toolId } }))

            const executionResult = yield* _(tool.execute(validationResult.data, executionContext).pipe(
                Effect.mapError(cause => {
                    const executionError = cause instanceof ToolExecutionError ? cause :
                        new ToolExecutionError(`Execution failed unexpectedly for '${toolId}'.`, {
                            toolId,
                            cause: cause instanceof Error ? cause : new Error(String(cause))
                        })
                    return new ToolInvocationError(`Tool execution failed for '${toolId}'.`, { toolId, cause: executionError })
                })
            ))

            yield* _(log.debug("Tool executed successfully", { annotations: { toolId, executionResult } }))

            const outputValidationResult = yield* _(Effect.try({
                try: () => tool.outputSchema.safeParse(executionResult),
                catch: error => new ToolInvocationError("Output schema parsing failed unexpectedly.", {
                    toolId,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }))

            if (!outputValidationResult.success) {
                const validationError = new ToolValidationError(
                    `Output validation failed for tool '${toolId}'.`,
                    { toolId, validationErrors: outputValidationResult.error, validationType: "output" }
                )
                const invocationError = new ToolInvocationError(
                    `Tool invocation failed due to output validation.`, { toolId, cause: validationError }
                )
                const formattedIssues = outputValidationResult.error.issues.map((i: ZodIssue) => `${i.path.join(".")}: ${i.message}`).join("; ")
                yield* _(log.warn("Tool output validation failed", { annotations: { toolId, issues: formattedIssues, executionResult } }))
                return yield* _(Effect.fail<ToolInvocationError>(invocationError))
            }

            const validatedOutput = outputValidationResult.data as Output
            const durationMs = performance.now() - startTime
            yield* _(log.info("Tool invoked successfully", { annotations: { toolId, durationMs } }))

            return validatedOutput
        }).pipe(
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