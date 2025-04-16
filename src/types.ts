/**
 * @file Defines globally shared primitive types for the application services.
 */

/**
 * Represents a generic JSON object structure.
 * Useful for representing unstructured or semi-structured data payloads,
 * often used in logging context or API responses/requests before validation.
 *
 * Use specific, validated types derived from schemas whenever possible
 * instead of relying heavily on JsonObject.
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Represents any valid JSON value (primitive, array, or object).
 */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonObject
    | JsonArray;

/**
 * Represents a JSON array structure.
 */
export type JsonArray = JsonValue[];

/**
 * Represents a unique identifier, typically a string (like UUID).
 * Using a branded type can help prevent accidental misuse, although
 * simple `string` is often sufficient if strictness isn't paramount.
 * Example: type UserId = Brand<string, "UserId">;
 */
export type EntityId = string;

/**
 * Represents a timestamp, typically stored as the number of milliseconds
 * since the Unix epoch. Consistent with `Clock.currentTimeMillis`.
 */
export type Timestamp = number;

export type Tuple<T1, T2> = [T1, T2];
