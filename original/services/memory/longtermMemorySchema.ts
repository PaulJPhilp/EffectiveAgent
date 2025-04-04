import { z } from "zod";

/**
 * Zod schema for the flexible value stored in a long-term memory entry.
 * Using `z.unknown()` provides maximum flexibility but requires careful
 * handling and potential type casting/validation by the consumer of the `get` method,
 * possibly guided by the `valueType` field.
 *
 * Alternative for more type safety (if the set of allowed types is known):
 * const memoryValueSchema = z.union([
 *   z.string(),
 *   z.number(),
 *   z.boolean(),
 *   z.null(), // Explicitly allow null if needed
 *   z.record(z.unknown()), // For JSON objects
 *   z.array(z.unknown())   // For JSON arrays
 * ]);
 */
const memoryValueSchema = z.unknown();

/**
 * Zod schema defining the structure of data stored for each user-specific
 * long-term memory entry via the RepositoryService.
 *
 * Note: The actual primary key (`id`) and timestamps (`createdAt`, `updatedAt`)
 * are typically managed by the BaseEntity structure within the RepositoryService
 * and are not part of this specific data schema.
 */
export const UserMemoryEntryDataSchema = z.object({
    /** The unique identifier for the user this memory entry belongs to. */
    userId: z.string().min(1, { message: "userId cannot be empty" }),

    /** The key identifying this specific memory entry for the user. */
    key: z.string().min(1, { message: "key cannot be empty" }),

    /** The actual value being stored. */
    value: memoryValueSchema,

    /**
     * Optional string hint indicating the type of the stored value
     * (e.g., "string", "json", "number", "boolean"). Useful for consumers
     * interpreting the `value` field.
     */
    valueType: z.string().optional(),

    /** Optional metadata associated with the memory entry. */
    metadata: z.record(z.unknown()).optional(),
}).describe("Schema for a single user-specific long-term memory entry data");

// --- Type Inference ---

/**
 * Represents the inferred TypeScript type for the data part of a
 * user-specific long-term memory entry, validated by `UserMemoryEntryDataSchema`.
 */
export type UserMemoryEntryData = z.infer<typeof UserMemoryEntryDataSchema>;

// --- Example Usage ---
/*
const validEntryData: UserMemoryEntryData = {
    userId: "user-123",
    key: "preferred_theme",
    value: "dark",
    valueType: "string",
    metadata: { source: "user_settings_dialog" }
};

const validJsonEntryData: UserMemoryEntryData = {
    userId: "user-456",
    key: "project_alpha_config",
    value: { retries: 3, timeoutMs: 5000 },
    valueType: "json"
};

const validUnknownEntryData: UserMemoryEntryData = {
    userId: "user-789",
    key: "some_complex_state",
    // Value could be anything when using z.unknown()
    value: new Date(), // Or a custom class instance, etc.
    // valueType might be crucial here
};

// Validation example:
const result = UserMemoryEntryDataSchema.safeParse({
    userId: "user-abc",
    key: "test",
    value: 123
});

if (result.success) {
    console.log("Valid:", result.data);
} else {
    console.error("Invalid:", result.error.flatten());
}

const invalidResult = UserMemoryEntryDataSchema.safeParse({
    userId: "user-abc",
    // key is missing
    value: "hello"
});
// invalidResult.success would be false
*/
