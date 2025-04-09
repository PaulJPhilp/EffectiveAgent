// Potentially in a shared location like src/services/capabilities/types.ts

import { Effect, Schema } from "effect";
import type { ParseError } from "@effect/schema/ParseResult"; // Or a custom ValidationError type

// Generic Input type (often derived from Data schema)
export type CapabilityInput = Record<string, any>; // Placeholder, refine as needed

/**
 * Generic interface for services that manage the validation and
 * update logic for a specific capability data type.
 *
 * @template Data The validated capability data structure (e.g., PersonaDefinition).
 * @template Input The partial input structure used for updates.
 * @template E The specific validation/configuration error type for this capability.
 */
export interface CapabilityService<Data, Input extends CapabilityInput, E> {
	/**
	 * Validates raw input data against the capability's schema.
	 * Returns an Effect that yields the validated data structure or fails
	 * with a capability-specific validation error.
	 */
	readonly make: (definition: unknown) => Effect.Effect<Data, E>;

	/**
	 * Takes existing validated data and partial updates, merges them,
	 * re-validates the result, and returns an Effect yielding the new
	 * validated data structure or failing with a validation error.
	 */
	readonly update: (
		currentData: Data,
		updates: Partial<Input>,
	) => Effect.Effect<Data, E>;
}
