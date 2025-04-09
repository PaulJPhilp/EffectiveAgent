/**
 * @file Minimal test file to demonstrate Schema.nullable usage.
 */

import { Schema } from "effect"
import { Either } from "effect";

console.log("Testing @effect/schema capabilities...");

// 1. Using Schema.nullable directly on a primitive
const MaybeStringSchema = Schema.nullable(Schema.String);
type MaybeString = Schema.Schema.Type<typeof MaybeStringSchema>; // string | null

// Test parsing MaybeStringSchema
const parseMaybeString = Schema.decodeUnknownSync(MaybeStringSchema);
console.log("Parsing 'hello':", Either.getOrThrow(parseMaybeString("hello"))); // Should log 'hello'
console.log("Parsing null:", Either.getOrThrow(parseMaybeString(null))); // Should log null
try {
    parseMaybeString(123);
} catch (e) {
    console.log("Parsing 123 (expected failure):", e); // Should log error
}
console.log("---");

// 2. Using Schema.nullable inside a Struct
const StructWithNullable = Schema.Struct({
    id: Schema.Number,
    description: Schema.nullable(Schema.String), // string | null
});
type StructWithNullableType = Schema.Schema.Type<typeof StructWithNullable>;

// Test parsing StructWithNullable
const parseStructWithNullable = Schema.decodeUnknownSync(StructWithNullable);
console.log(
    "Parsing { id: 1, description: 'test' }:",
    Either.getOrThrow(parseStructWithNullable({ id: 1, description: "test" })),
);
console.log(
    "Parsing { id: 2, description: null }:",
    Either.getOrThrow(parseStructWithNullable({ id: 2, description: null })),
);
try {
    parseStructWithNullable({ id: 3 }); // description is required (can be null, but not absent)
} catch (e) {
    console.log("Parsing { id: 3 } (expected failure):", e);
}
console.log("---");

// 3. Using Schema.optional(Schema.nullable(...)) inside a Struct
const StructWithOptionalNullable = Schema.Struct({
    id: Schema.Number,
    notes: Schema.optional(Schema.nullable(Schema.String)), // string | null | undefined
});
type StructWithOptionalNullableType = Schema.Schema.Type<
    typeof StructWithOptionalNullable
>;

// Test parsing StructWithOptionalNullable
const parseStructOptNullable = Schema.decodeUnknownSync(
    StructWithOptionalNullable,
);
console.log(
    "Parsing { id: 10, notes: 'info' }:",
    Either.getOrThrow(parseStructOptNullable({ id: 10, notes: "info" })),
);
console.log(
    "Parsing { id: 11, notes: null }:",
    Either.getOrThrow(parseStructOptNullable({ id: 11, notes: null })),
);
console.log(
    "Parsing { id: 12 } (notes absent):",
    Either.getOrThrow(parseStructOptNullable({ id: 12 })),
);
console.log(
    "Parsing { id: 13, notes: undefined }:",
    Either.getOrThrow(parseStructOptNullable({ id: 13, notes: undefined })),
);
try {
    parseStructOptNullable({ id: 14, notes: 123 }); // notes must be string | null | undefined
} catch (e) {
    console.log("Parsing { id: 14, notes: 123 } (expected failure):", e);
}
console.log("---");

console.log("Schema definitions compiled successfully.");

// Add a simple type assertion to ensure types are inferred correctly
const testVar: MaybeString = null;
const testStruct1: StructWithNullableType = { id: 1, description: null };
const testStruct2: StructWithOptionalNullableType = { id: 2 }; // notes is optional

console.log("Type assertions passed.");
