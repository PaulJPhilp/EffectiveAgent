/**
 * @file Implements the live ToolExecutorService logic.
 * @module services/tools/live
 */

// Corrected Import Path:
import { CurrentExecutionPermissionsRef } from "@/services/execution/context.js"; // Adjust path if needed
import { PlatformError } from "@effect/platform/Error";
import * as HttpBody from "@effect/platform/HttpBody";
// Correct HttpClient imports
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import { Context, Effect, FiberRef, HashMap, Option, Schema } from "effect";
import type { ParseError } from "effect/ParseResult";
import {
    ToolExecutionError,
    ToolInputValidationError,
    ToolNotFoundError,
    ToolOutputValidationError,
} from "./errors.js";
import {
    type EffectImplementation, // Import specific types for assertions
    type EffectiveTool, // Import the main tool type
    type FullToolName,
    type HttpImplementation,
    type McpImplementation,
    ToolExecutorService, // Import the interface
    ToolRegistryData, // Import data type
    ToolRegistryDataTag, // Import the registry data Tag
} from "./types.js";
// Import other potential dependencies types if needed (e.g., OAuthService)
// import type { OAuthService } from "@/services/core/auth/oauth";
// import type { McpClient } from "@/services/core/mcp";

/** Interface for the dependencies required by the ToolExecutorService implementation logic. */
interface ToolExecutorDependencies {
    readonly registryData: ToolRegistryData;
    readonly httpClient: HttpClient;
    // readonly oauthService: OAuthService; // Add other dependencies if needed
    // readonly mcpClient: McpClient; // Add if needed
}

/**
 * Factory function or Effect that creates the live ToolExecutorService implementation object.
 * Takes resolved dependencies as input.
 */
export const ToolExecutorServiceLiveImplementationLogic = (
    deps: ToolExecutorDependencies // Receive dependencies
): Effect.Effect<ToolExecutorService> => Effect.sync(() => { // Use Effect.sync as construction is synchronous

    const { registryData, httpClient /*, oauthService, mcpClient */ } = deps;

    // --- Helper: Validate Input ---
    // This helper is generic and okay as is
    const validateInput = <I>(
        toolName: FullToolName,
        schema: Schema.Schema<I>,
        rawInput: unknown,
    ): Effect.Effect<I, ToolInputValidationError> =>
        Schema.decodeUnknown(schema)(rawInput).pipe(
            Effect.mapError(
                (cause: ParseError) => new ToolInputValidationError({ toolName, cause }),
            ),
        );

    // --- Helper: Validate Output ---
    // This helper is generic and okay as is
    const validateOutput = <O>(
        toolName: FullToolName,
        schema: Schema.Schema<O>,
        rawOutput: unknown,
    ): Effect.Effect<O, ToolOutputValidationError> =>
        Schema.decodeUnknown(schema)(rawOutput).pipe(
            Effect.mapError(
                (cause: ParseError) => new ToolOutputValidationError({ toolName, cause }),
            ),
        );

    // --- Helper: Check Permissions ---
    // This helper is okay as is
    const checkPermission = (
        toolName: FullToolName,
    ): Effect.Effect<void, ToolExecutionError> => Effect.gen(function* () {
        const permissions = yield* FiberRef.get(CurrentExecutionPermissionsRef);
        const allowedToolsSet = permissions?.allowedTools;
        if (allowedToolsSet === undefined) {
            yield* Effect.logWarning(`Permission check failed for "${toolName}": No allowedTools defined in current execution permissions.`);
            return yield* Effect.fail(new ToolExecutionError({ toolName, cause: "Permission denied: No tools allowed in current context." }));
        }
        if (allowedToolsSet.has(toolName)) { return; }
        // TODO: Add toolkit resolution logic
        yield* Effect.logWarning(`Permission check failed for "${toolName}": Tool not in allowedTools list.`);
        return yield* Effect.fail(new ToolExecutionError({ toolName, cause: `Permission denied for tool: ${toolName}` }));
    });


    // --- Implement the 'run' method ---
    const run = <Output = unknown>(
        toolName: FullToolName,
        rawInput: unknown,
    ): Effect.Effect<Output, ToolNotFoundError | ToolInputValidationError | 
        ToolOutputValidationError | ToolExecutionError> => {
        
        // 1. Lookup tool
        const lookupTool = Effect.gen(function* () {
            const effectiveToolOpt = HashMap.get(registryData.tools, toolName);
            if (Option.isNone(effectiveToolOpt)) {
                return yield* Effect.fail(new ToolNotFoundError({ toolName }));
            }
            return effectiveToolOpt.value;
        });
        
        // 2. Execute the tool based on its implementation type
        const executeTool = (effectiveTool: EffectiveTool) => {
            const impl = effectiveTool.implementation;
            
            // Check permissions first
            const permissionCheck = checkPermission(toolName);
            
            // Handle Effect implementation
            const handleEffectImpl = (impl: EffectImplementation) => 
                Effect.gen(function* () {
                    const validatedInput = yield* validateInput(
                        toolName, impl.inputSchema, rawInput
                    );
                    const rawOutput = yield* impl.execute(validatedInput);
                    const result = yield* validateOutput(
                        toolName, impl.outputSchema, rawOutput
                    );
                    return result as Output;
                });
            
            // Handle HTTP implementation
            const handleHttpImpl = (impl: HttpImplementation) => 
                Effect.gen(function* () {
                    const validatedInput = yield* validateInput(
                        toolName, impl.inputSchema, rawInput
                    );
                    
                    // Prepare request
                    let url = impl.url;
                    let body: HttpBody.HttpBody | undefined = undefined;
                    let query: Record<string, string> | undefined = undefined;
                    
                    if (impl.inputMapping) {
                        const mapped = impl.inputMapping(validatedInput as any);
                        query = mapped.query;
                        if (mapped.body !== undefined) {
                            body = HttpBody.unsafeJson(mapped.body);
                        }
                    } else if (impl.method === "POST" || 
                              impl.method === "PUT" || 
                              impl.method === "PATCH") {
                        body = HttpBody.unsafeJson(validatedInput);
                    } else {
                        query = validatedInput as Record<string, string>;
                    }
                    
                    // Build request
                    let request = HttpClientRequest.make(impl.method)(
                        url, { headers: impl.requestHeaders }
                    );
                    if (query) {
                        request = HttpClientRequest.setUrlParams(request, query);
                    }
                    if (body) {
                        // Use the correct method to set the body on the request
                        request = HttpClientRequest.setBody(body)(request);
                    }
                    
                    // Execute request
                    const response = yield* httpClient.execute(request);
                    const rawOutput = yield* HttpBody.json(response);
                    const result = yield* validateOutput(
                        toolName, impl.outputSchema, rawOutput
                    );
                    return result as Output;
                }).pipe(
                    Effect.mapError(error => {
                        // Convert any error to ToolExecutionError
                        if (error instanceof ToolInputValidationError || 
                            error instanceof ToolOutputValidationError) {
                            return error;
                        }
                        return new ToolExecutionError({
                            toolName,
                            input: rawInput,
                            cause: error instanceof Error ? error : 
                                   new Error(String(error))
                        });
                    })
                );
            
            // Handle MCP implementation
            const handleMcpImpl = () => 
                Effect.gen(function* () {
                    const validatedInput = yield* validateInput(
                        toolName, 
                        (impl as McpImplementation).inputSchema, 
                        rawInput
                    );
                    yield* Effect.logWarning("MCP tool execution not implemented.");
                    return yield* Effect.fail(new ToolExecutionError({
                        toolName,
                        input: validatedInput,
                        cause: "MCP not implemented"
                    }));
                });
            
            // Execute permission check first, then dispatch based on impl type
            return permissionCheck.pipe(
                Effect.flatMap(() => {
                    switch (impl._tag) {
                        case "EffectImplementation":
                            return handleEffectImpl(impl);
                        case "HttpImplementation":
                            return handleHttpImpl(impl);
                        case "McpImplementation":
                            return handleMcpImpl();
                        default: {
                            const exhaustiveCheck: never = impl;
                            return Effect.fail(new ToolExecutionError({
                                toolName,
                                cause: new Error(
                                    `Unsupported implementation: ${
                                        (exhaustiveCheck as any)._tag}`
                                )
                            }));
                        }
                    }
                })
            );
        };
        
        // Chain the operations and explicitly specify the return type
        return lookupTool.pipe(
            Effect.flatMap(executeTool),
            // Ensure the Effect has the correct error type and no requirements
            Effect.mapError(error => error as 
                ToolNotFoundError | 
                ToolInputValidationError | 
                ToolOutputValidationError | 
                ToolExecutionError
            )
            // Note: We don't need to provide the HttpClient service here
            // since we're already passing httpClient directly to the execute method
        ) as Effect.Effect<
            Output, 
            ToolNotFoundError | ToolInputValidationError | 
            ToolOutputValidationError | ToolExecutionError,
            never
        >;
    }; // End of run function definition

    // Return the service implementation object
    return { run };
}); // End of Effect.sync
