/**
 * @file Defines globally shared schemas, including the BaseEntitySchema.
 */

import { Schema } from "@effect/schema";
import { EntityId, Timestamp } from "@/types.js"; // Import global types

/**
 * Base schema for entities that have a unique identifier and timestamps.
 * Specific entity definition schemas (e.g., SkillDefSchema, PromptDefSchema)
 * can extend this using `Schema.extend`.
 */
export const BaseEntitySchema = Schema.Struct({
    /**
     * The unique identifier for the entity.
     * Typically a UUID string.
     */
    id: Schema.String.pipe(Schema.annotations({ identifier: "EntityId" })), // Use annotation for clarity

    /**
     * The timestamp when the entity was created (milliseconds since epoch).
     */
    createdAt: Schema.Number.pipe(
        Schema.annotations({ identifier: "Timestamp" }),
    ),

    /**
     * The timestamp when the entity was last updated (milliseconds since epoch).
     */
    updatedAt: Schema.Number.pipe(
        Schema.annotations({ identifier: "Timestamp" }),
    ),
});

/**
 * Inferred TypeScript type from the BaseEntitySchema.
 */
export type BaseEntity = Schema.Schema.Type<typeof BaseEntitySchema>;

// Example of extending the base schema (for illustration):
/*
import { BaseEntitySchema } from "@services/schema";
import { Schema } from "@effect/schema";

export const ExampleEntitySchema = Schema.extend(
  BaseEntitySchema,
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
  })
);

export type ExampleEntity = Schema.Schema.Type<typeof ExampleEntitySchema>;
*/
