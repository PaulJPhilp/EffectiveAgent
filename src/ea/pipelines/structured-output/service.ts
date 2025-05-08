/**
 * @file Service implementation for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/service
 */

import { Effect, Either } from "effect";
import {
    StructuredOutputPipeline,
    StructuredOutputPipelineError,
    type StructuredOutputPipelineInput
} from "./contract.js";

/**
 * Service for schema validation
 */
export interface SchemaValidatorToolApi {
    readonly _tag: "SchemaValidatorTool"
    readonly validate: <T>(data: unknown, schema: unknown) => Effect.Effect<T, never>
}

/**
 * Implementation of the SchemaValidatorTool service using Effect.Service pattern
 */
export class SchemaValidatorTool extends Effect.Service<SchemaValidatorToolApi>()("SchemaValidatorTool", {
    effect: Effect.succeed({
        _tag: "SchemaValidatorTool" as const,
        validate: <T>(data: unknown, schema: unknown): Effect.Effect<T, never> => {
            // Mock implementation - replace with real schema validation
            return Effect.succeed(data as T);
        }
    }),
    dependencies: []
}) { }

// Factory function for the StructuredOutputPipeline service implementation
const makeStructuredOutputPipeline = Effect.gen(function* () {
    // Yield dependencies
    const schemaValidator = yield* SchemaValidatorTool;

    // Helper to convert schema to a human-readable format for prompting
    const schemaToDescription = <S>(schema: S): string => {
        // In a real implementation, this would intelligently convert schema to description
        // For now, we'll implement a simple version that works for basic objects

        if (typeof schema !== 'object' || schema === null) {
            return String(schema);
        }

        // Handle arrays
        if (Array.isArray(schema)) {
            const itemType = schema.length > 0 ?
                typeof schema[0] === 'object' ? 'object' : typeof schema[0] :
                'any';
            return `An array of ${itemType} items`;
        }

        // Handle objects by describing their properties
        const properties = Object.entries(schema).map(([key, value]) => {
            let typeDesc = '';

            if (value === null) {
                typeDesc = 'null';
            } else if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    typeDesc = 'array';
                } else {
                    typeDesc = 'object';
                }
            } else {
                typeDesc = typeof value;
            }

            // Add more specific description for special types
            if (value === Number) typeDesc = 'number';
            if (value === String) typeDesc = 'string';
            if (value === Boolean) typeDesc = 'boolean';
            if (value === Date) typeDesc = 'ISO date string';

            return `${key}: ${typeDesc}`;
        });

        return `An object with the following properties:\n${properties.join('\n')}`;
    };

    // Helper to validate output against schema
    const validateAgainstSchema = <T, S>(output: unknown, schema: S): Effect.Effect<T, string> => {
        return Effect.try({
            try: () => {
                // Basic validation
                if (schema === Number && typeof output !== 'number') {
                    throw 'Expected a number';
                }

                if (schema === String && typeof output !== 'string') {
                    throw 'Expected a string';
                }

                if (schema === Boolean && typeof output !== 'boolean') {
                    throw 'Expected a boolean';
                }

                // Object validation
                if (typeof schema === 'object' && schema !== null && !Array.isArray(schema)) {
                    if (typeof output !== 'object' || output === null || Array.isArray(output)) {
                        throw 'Expected an object';
                    }

                    // Check required fields
                    for (const key of Object.keys(schema)) {
                        if (!(key in (output as object))) {
                            throw `Missing required field: ${key}`;
                        }
                    }
                }

                // Array validation
                if (Array.isArray(schema)) {
                    if (!Array.isArray(output)) {
                        throw 'Expected an array';
                    }

                    // Validate array items if we have a schema item
                    if (schema.length > 0 && output.length > 0) {
                        const itemSchema = schema[0];
                        for (let i = 0; i < output.length; i++) {
                            // This is simplified and would be more robust in a real implementation
                            if (typeof itemSchema === 'object' && typeof output[i] !== 'object') {
                                throw `Array item ${i} should be an object`;
                            }
                        }
                    }
                }
                // If we reach this point, validation passed
                return output as T;
            },
            catch: (error) => `Validation error: ${error instanceof Error ? error.message : String(error)}`
        });
    };

    // Method implementations
    const generateStructuredOutput = <T, S = unknown>(
        input: StructuredOutputPipelineInput<S>,
        maxRetries: number = 3
    ): Effect.Effect<T, StructuredOutputPipelineError> =>
        Effect.gen(function* () {
            yield* Effect.logInfo(`Generating structured output for prompt: ${input.prompt.substring(0, 50)}...`);

            let currentTry = 0;
            let lastError: unknown;
            let formattedPrompt = input.prompt;

            while (currentTry < maxRetries) {
                currentTry++;

                try {
                    // TODO: Replace with actual Phoenix MCP server call
                    // For now, using mock data
                    const mockOutput = generateMockDataForSchema(input.schema);
                    const validationEffect = validateAgainstSchema<T, S>(mockOutput, input.schema);
                    const validationResult = yield* Effect.either(validationEffect);

                    if (Either.isRight(validationResult)) {
                        yield* Effect.logInfo(`Successfully generated structured output on try ${currentTry}`);
                        return validationResult.right;
                    } else {
                        lastError = validationResult.left;
                        yield* Effect.logWarning(`Validation failed on try ${currentTry}: ${lastError}`);
                        formattedPrompt += `\n\nThe previous attempt failed with this error: ${lastError}. Please fix the issues and try again.`;
                    }
                } catch (error) {
                    lastError = error;
                    yield* Effect.logWarning(`Error on try ${currentTry}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            return yield* Effect.fail(
                new StructuredOutputPipelineError({
                    message: `Failed to generate valid structured output after ${maxRetries} attempts. Last error: ${lastError}`,
                })
            );
        }).pipe(
            Effect.catchAll((error: unknown) => {
                if (error instanceof StructuredOutputPipelineError) return Effect.fail(error);
                return Effect.fail(new StructuredOutputPipelineError({
                    message: `Failed to generate structured output: ${error instanceof Error ? error.message : String(error)}`,
                    cause: error instanceof Error ? error : undefined
                }));
            })
        );

    const extractStructured = <T, S = unknown>(
        text: string,
        schema: S
    ): Effect.Effect<T, StructuredOutputPipelineError> =>
        Effect.gen(function* () {
            yield* Effect.logInfo(`Extracting structured data from text using schema`);

            try {
                // TODO: Replace with actual Phoenix MCP server call
                // For now, using mock data
                const mockOutput = generateMockDataForSchema(schema);
                const validationEffect = validateAgainstSchema<T, S>(mockOutput, schema);
                const validationResult = yield* Effect.either(validationEffect);

                if (Either.isRight(validationResult)) {
                    return validationResult.right;
                } else {
                    return yield* Effect.fail(
                        new StructuredOutputPipelineError({
                            message: `Failed to extract valid structured data: ${validationResult.left}`,
                        })
                    );
                }
            } catch (error) {
                return yield* Effect.fail(
                    new StructuredOutputPipelineError({
                        message: `Failed to extract structured data: ${error instanceof Error ? error.message : String(error)}`,
                        cause: error instanceof Error ? error : undefined
                    })
                );
            }
        });

    // Return implementation of the API
    return {
        generateStructuredOutput,
        extractStructured
    };
});

// Helper function to generate mock data based on schema
function generateMockDataForSchema<S>(schema: S): unknown {
    if (schema === Number) return 42;
    if (schema === String) return "mock string";
    if (schema === Boolean) return true;
    if (schema === Date) return new Date().toISOString();

    if (Array.isArray(schema)) {
        return schema.length > 0 ?
            [generateMockDataForSchema(schema[0])] :
            [];
    }

    if (typeof schema === 'object' && schema !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(schema)) {
            result[key] = generateMockDataForSchema(value);
        }
        return result;
    }

    return null;
}

/**
 * Implementation of the StructuredOutputPipeline service
 */
export class StructuredOutputPipelineService extends Effect.Service<typeof StructuredOutputPipeline>()(
    StructuredOutputPipeline,
    {
        effect: makeStructuredOutputPipeline,
        dependencies: [SchemaValidatorTool]
    }
) { }

/**
 * Layer for the StructuredOutputPipeline service
 */
export const StructuredOutputPipelineLayer = StructuredOutputPipelineService; 