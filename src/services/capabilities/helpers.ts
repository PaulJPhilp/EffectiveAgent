/**
 * @file Generic helpers for creating CapabilityService implementations.
 * @module services/capabilities/helpers
 */

import type { ParseResult } from "effect";
import { Effect, Schema } from "effect";
import type { CapabilityInput, CapabilityService } from "./types.js";

// Helper to create the 'make' function for a given schema and error wrapper
export const makeCapabilityMake =
	<Data, E>(
		schema: Schema.Schema<Data>,
		errorWrapper: (cause: ParseResult.ParseError) => E, // Receives the error wrapper
	): CapabilityService<Data, any, E>["make"] =>
		(definition: unknown) =>
			// Decode and THEN map the ParseError using the provided wrapper
			Schema.decodeUnknown(schema)(definition).pipe(
				Effect.mapError(errorWrapper), // Apply the error wrapper here
			);

// Helper to create the 'update' function
export const makeCapabilityUpdate =
	<Data, Input extends CapabilityInput, E>(
		schema: Schema.Schema<Data>, // Schema for the full Data object
		errorWrapper: (cause: ParseResult.ParseError) => E, // Receives the error wrapper
	): CapabilityService<Data, Input, E>["update"] =>
		(currentData: Data, updates: Partial<Input>) => {
			const potentialNewData = { ...currentData, ...updates };
			// Re-validate the merged result and map the ParseError
			return Schema.decodeUnknown(schema)(potentialNewData).pipe(
				Effect.mapError(errorWrapper), // Apply the error wrapper here
			);
		};
