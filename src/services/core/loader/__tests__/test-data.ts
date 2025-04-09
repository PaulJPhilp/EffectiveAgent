/**
 * @file Test data for EntityLoader service tests.
 */

import { ParseResult, Schema } from "@effect/schema"; // Import ParseResult

// --- Test Data Definitions ---

// Define the core structure schema
const ValidEntityStruct = Schema.Struct({
    name: Schema.String,
    value: Schema.Number,
});
// Infer the type of the structure itself
type ValidEntityStructType = Schema.Schema.Type<typeof ValidEntityStruct>;

// Define the schema that explicitly decodes from unknown input
export const ValidEntitySchema: Schema.Schema<ValidEntityStructType, unknown> =
    Schema.transformOrFail(
        Schema.Unknown, // Input schema is unknown
        ValidEntityStruct, // Target schema is our struct
        {
            // Decode: Attempt to decode the unknown input using the struct schema
            // This is what Schema.decodeUnknown does internally
            decode: (input, options) =>
                Schema.decodeUnknown(ValidEntityStruct)(input, options),
            // Encode: How to turn the struct back into unknown (usually identity)
            encode: (output) => ParseResult.succeed(output),
        },
    );

// Infer the final output type (remains the same as ValidEntityStructType)
export type ValidEntity = Schema.Schema.Type<typeof ValidEntitySchema>;

// Valid data matching the schema
export const validEntityData: ValidEntity = {
    name: "Test Entity",
    value: 123,
};

// --- Filenames ---
export const validEntityFilename = "valid-entity.json";
export const invalidJsonFilename = "invalid-json.json";
export const validationErrorFilename = "validation-error.json";
export const nonExistentFilename = "non-existent.json";

// --- File Contents ---
export const validEntityFileContent = JSON.stringify(validEntityData);

// Invalid JSON content
export const invalidJsonContent = "{ name: 'Test Entity', value: 123 "; // Missing closing brace

// Content that will fail schema validation (e.g., 'name' is not a string)
export const validationErrorContent = JSON.stringify({
    name: 999, // Invalid type for name
    value: 456,
});
