/**
 * @file Implements the Tool Service using Effect.Service pattern.
 * @module services/ai/tools/service
 */

import { ToolService, type ToolServiceApi } from "@/services/ai/tools/api.js";
import {
    ToolExecutionError,
    ToolInputValidationError,
    ToolNotFoundError,
    ToolOutputValidationError
} from "@/services/ai/tools/errors.js";
import { type HttpImplementation, type McpImplementation, type ToolImplementation, type ToolRegistryData, ToolRegistryDataTag } from "@/services/ai/tools/types.js";
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import { Effect, Layer } from "effect";
import { mcp_mcp_search_getMcpServer } from "./mcp.js";

/**
 * Live implementation of the Tool Service.
 */
export class ToolServiceLive extends Effect.Service<ToolServiceApi>() {
    constructor(
        private readonly registryData: ToolRegistryData,
        private readonly httpClient: HttpClient.Client
    ) {
        super();
    }

    readonly run = <Output = unknown>(
        toolName: string,
        rawInput: unknown
    ) => Effect.gen(function* () {
        // Get the tool from registry
        const tool = yield* Effect.fromNullable(
            this.registryData.tools.get(toolName)
        ).pipe(
            Effect.mapError(
                () => new ToolNotFoundError({
                    toolName,
                    module: "ToolService",
                    method: "run"
                })
            )
        );

        // Validate input
        const validatedInput = yield* Effect.try({
            try: () => tool.implementation.inputSchema.parse(rawInput),
            catch: (cause) => new ToolInputValidationError({
                toolName,
                module: "ToolService",
                method: "run",
                cause
            })
        });

        // Execute based on implementation type
        const result = yield* this.executeImplementation(
            tool.implementation,
            validatedInput,
            toolName
        );

        // Validate output
        return yield* Effect.try({
            try: () => tool.implementation.outputSchema.parse(result),
            catch: (cause) => new ToolOutputValidationError({
                toolName,
                module: "ToolService",
                method: "run",
                cause
            })
        }) as Output;
    });

    private executeImplementation = (
        implementation: ToolImplementation,
        input: unknown,
        toolName: string
    ): Effect.Effect<unknown, ToolExecutionError> => {
        switch (implementation._tag) {
            case "EffectImplementation":
                return implementation.execute(input).pipe(
                    Effect.mapError((cause) => new ToolExecutionError({
                        toolName,
                        input,
                        module: "ToolService",
                        method: "executeImplementation",
                        cause
                    }))
                );
            case "HttpImplementation":
                return this.executeHttpImplementation(
                    implementation,
                    input,
                    toolName
                );
            case "McpImplementation":
                return this.executeMcpImplementation(
                    implementation,
                    input,
                    toolName
                );
        }
    };

    private executeHttpImplementation = (
        implementation: HttpImplementation,
        input: unknown,
        toolName: string
    ): Effect.Effect<unknown, ToolExecutionError> => {
        return Effect.gen(function* () {
            // Build request URL with input parameters
            const url = implementation.url.replace(/\{([^}]+)\}/g, (_, key) => {
                return input[key] ?? "";
            });

            // Build request
            const request = HttpClientRequest.make(url)
                .pipe(HttpClientRequest.setMethod(implementation.method));

            // Add headers if specified
            if (implementation.headers) {
                Object.entries(implementation.headers).forEach(([key, value]) => {
                    request.pipe(HttpClientRequest.setHeader(key, value));
                });
            }

            // Add body for POST/PUT/PATCH
            if (["POST", "PUT", "PATCH"].includes(implementation.method)) {
                request.pipe(HttpClientRequest.setBody(JSON.stringify(input)));
            }

            // Add timeout if specified
            const requestWithTimeout = implementation.timeout
                ? request.pipe(HttpClientRequest.setTimeout(implementation.timeout))
                : request;

            // Execute request
            const response = yield* this.httpClient.request(requestWithTimeout);

            // Parse response
            const responseData = yield* Effect.tryPromise({
                try: () => response.json() as Promise<unknown>,
                catch: (cause) => new ToolExecutionError({
                    toolName,
                    input,
                    module: "ToolService",
                    method: "executeHttpImplementation",
                    cause
                })
            });

            return responseData;
        }).pipe(
            Effect.mapError((cause) => new ToolExecutionError({
                toolName,
                input,
                module: "ToolService",
                method: "executeHttpImplementation",
                cause
            }))
        );
    };

    private executeMcpImplementation = (
        implementation: McpImplementation,
        input: unknown,
        toolName: string
    ): Effect.Effect<unknown, ToolExecutionError> => {
        return Effect.gen(function* () {
            // Get MCP server info
            const server = yield* mcp_mcp_search_getMcpServer({
                slug: implementation.slug
            }).pipe(
                Effect.mapError((cause) => new ToolExecutionError({
                    toolName,
                    input,
                    module: "ToolService",
                    method: "executeMcpImplementation",
                    cause
                }))
            );

            // Execute MCP tool
            const result = yield* server.execute(input).pipe(
                Effect.mapError((cause) => new ToolExecutionError({
                    toolName,
                    input,
                    module: "ToolService",
                    method: "executeMcpImplementation",
                    cause
                }))
            );

            return result;
        });
    };

    /**
     * Creates the live Layer for the Tool Service.
     */
    static readonly Live = Layer.effect(
        ToolService,
        Effect.gen(function* () {
            const registryData = yield* ToolRegistryDataTag;
            const httpClient = yield* HttpClient;
            return new ToolServiceLive(registryData, httpClient);
        })
    );
}