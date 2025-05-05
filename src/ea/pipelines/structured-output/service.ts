/**
 * @file Service implementation for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/service
 */

import { Context, Effect } from "effect";
import {
    StructuredOutputPipeline,
    type StructuredOutputPipelineApi,
    StructuredOutputPipelineError,
    type StructuredOutputPipelineInput
} from "./contract.js";

// Dependencies
class EaLlmProvider extends Context.Tag("EaLlmProvider")<EaLlmProvider, any>() { }
class SchemaValidatorTool extends Context.Tag("SchemaValidatorTool")<SchemaValidatorTool, any>() { }

/**
 * Implementation of the StructuredOutputPipeline service
 */
export class StructuredOutputPipelineService extends Effect.Service<StructuredOutputPipelineApi>()(
    StructuredOutputPipeline,
    {
        effect: Effect.gen(function* (_) {
            // Yield dependencies
            const llm = yield* _(EaLlmProvider);
            const schemaValidator = yield* _(SchemaValidatorTool);

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
                // In a real implementation, this would use the SchemaValidatorTool
                // For now, we'll do some simple validation

                try {
                    // Basic validation
                    if (schema === Number && typeof output !== 'number') {
                        return Effect.fail('Expected a number');
                    }

                    if (schema === String && typeof output !== 'string') {
                        return Effect.fail('Expected a string');
                    }

                    if (schema === Boolean && typeof output !== 'boolean') {
                        return Effect.fail('Expected a boolean');
                    }

                    // Object validation
                    if (typeof schema === 'object' && schema !== null && !Array.isArray(schema)) {
                        if (typeof output !== 'object' || output === null || Array.isArray(output)) {
                            return Effect.fail('Expected an object');
                        }

                        // Check required fields
                        for (const key of Object.keys(schema)) {
                            if (!(key in (output as object))) {
                                return Effect.fail(`Missing required field: ${key}`);
                            }
                        }
                    }

                    // Array validation
                    if (Array.isArray(schema)) {
                        if (!Array.isArray(output)) {
                            return Effect.fail('Expected an array');
                        }

                        // Validate array items if we have a schema item
                        if (schema.length > 0 && output.length > 0) {
                            const itemSchema = schema[0];
                            for (let i = 0; i < output.length; i++) {
                                // This is simplified and would be more robust in a real implementation
                                if (typeof itemSchema === 'object' && typeof output[i] !== 'object') {
                                    return Effect.fail(`Array item ${i} should be an object`);
                                }
                            }
                        }
                    }

                    // If we reach this point, validation passed
                    return Effect.succeed(output as T);
                } catch (error) {
                    return Effect.fail(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
                }
            };

            // Method implementations
            const generateStructuredOutput = <T, S = unknown>(
                input: StructuredOutputPipelineInput<S>
            ): Effect.Effect<T, StructuredOutputPipelineError> =>
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Generating structured output for prompt: ${input.prompt.substring(0, 50)}...`));

                    try {
                        // Format a prompt for the LLM that includes the schema and examples
                        let formattedPrompt = input.prompt + "\n\n";
                        formattedPrompt += "Please structure your response according to this schema:\n";
                        formattedPrompt += schemaToDescription(input.schema) + "\n\n";

                        // Add examples if provided
                        if (input.examples && input.examples.length > 0) {
                            formattedPrompt += "Here are some examples of the expected format:\n";

                            for (const example of input.examples) {
                                formattedPrompt += `Input: ${example.input}\n`;
                                formattedPrompt += `Output: ${JSON.stringify(example.output, null, 2)}\n\n`;
                            }
                        }

                        formattedPrompt += "Your response should be valid JSON.";

                        // Track retries
                        const maxRetries = input.maxRetries || 3;
                        let currentTry = 0;
                        let lastError = "";

                        // Try to generate and validate output, with retries for validation failures
                        while (currentTry < maxRetries) {
                            currentTry++;

                            // In a real implementation, this would call the LLM
                            // For now, we'll mock the result based on schema

                            // Generate mock data based on schema
                            const mockOutput = generateMockDataForSchema(input.schema);

                            // Validate the output
                            const validationResult = yield* _(validateAgainstSchema<T, S>(mockOutput, input.schema));

                            if (Effect.isSuccess(validationResult)) {
                                // If validation succeeds, return the result
                                yield* _(Effect.logInfo(`Successfully generated structured output on try ${currentTry}`));
                                return validationResult.value;
                            } else {
                                // If validation fails, record the error and retry
                                lastError = validationResult.cause.message;
                                yield* _(Effect.logWarning(`Validation failed on try ${currentTry}: ${lastError}`));

                                // In a real implementation, we would include the error in the next prompt
                                formattedPrompt += `\n\nThe previous attempt failed with this error: ${lastError}. Please fix the issues and try again.`;
                            }
                        }

                        // If we've exhausted retries, fail with the last error
                        return yield* _(
                            Effect.fail(
                                new StructuredOutputPipelineError({
                                    message: `Failed to generate valid structured output after ${maxRetries} attempts. Last error: ${lastError}`,
                                })
                            )
                        );
                    } catch (error) {
                        return yield* _(
                            Effect.fail(
                                new StructuredOutputPipelineError({
                                    message: `Failed to generate structured output: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error
                                })
                            )
                        );
                    }
                });

            const extractStructured = <T, S = unknown>(
                text: string,
                schema: S
            ): Effect.Effect<T, StructuredOutputPipelineError> =>
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Extracting structured data from text: ${text.substring(0, 50)}...`));

                    try {
                        // Create a more specific prompt for extraction
                        const extractionPrompt = `
                            Extract the relevant information from the following text and format it according to the specified schema.
                            Do not include any information that is not present in the text.
                            If a required field is not found in the text, use null or an appropriate default value.
                            
                            Text to extract from:
                            ${text}
                        `;

                        // Create input for the general method and reuse it
                        const input: StructuredOutputPipelineInput<S> = {
                            prompt: extractionPrompt,
                            schema,
                            maxRetries: 2
                        };

                        return yield* _(generateStructuredOutput<T, S>(input));
                    } catch (error) {
                        return yield* _(
                            Effect.fail(
                                new StructuredOutputPipelineError({
                                    message: `Failed to extract structured data: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error
                                })
                            )
                        );
                    }
                });

            // Helper to generate mock data for testing
            function generateMockDataForSchema<S>(schema: S): unknown {
                if (schema === String) return "example string";
                if (schema === Number) return 42;
                if (schema === Boolean) return true;
                if (schema === Date) return new Date().toISOString();

                if (Array.isArray(schema)) {
                    // Generate a mock array with 2 items
                    const itemSchema = schema.length > 0 ? schema[0] : String;
                    return [generateMockDataForSchema(itemSchema), generateMockDataForSchema(itemSchema)];
                }

                if (typeof schema === 'object' && schema !== null) {
                    // Generate a mock object with all fields
                    const result: Record<string, unknown> = {};

                    for (const [key, value] of Object.entries(schema)) {
                        result[key] = generateMockDataForSchema(value);
                    }

                    return result;
                }

                // Default fallback
                return "mock data";
            }

            // Return implementation of the API
            return {
                generateStructuredOutput,
                extractStructured
            };
        }),

        // List dependencies required by the 'effect' factory
        dependencies: [EaLlmProvider, SchemaValidatorTool]
    }
) { }

/**
 * Layer for the StructuredOutputPipeline service
 */
export const StructuredOutputPipelineLayer = StructuredOutputPipelineService; 