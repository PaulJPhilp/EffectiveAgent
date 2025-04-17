/**
 * @file Implements the live Layer for the Intelligence capability service.
 * @module services/capabilities/intelligence/live
 */

import { Layer } from "effect";
// Correct import path for ParseError
import type { ParseError } from "effect/ParseResult";
import {
	makeCapabilityMake,
	makeCapabilityUpdate,
} from "@/services/capabilities/helpers.js"; // Adjust path if needed
import {
	IntelligenceDefinitionSchema,
	// IntelligenceDefinitionInputSchema // Assuming InputSchema is same as DefinitionSchema for now
} from "./schema.js";
import { IntelligenceService, IntelligenceServiceTag } from "./types.js"; // Import interface and Tag
import { IntelligenceConfigError } from "./errors.js";

// Error wrapper specific to Intelligence configuration validation
const wrapIntelligenceError = (cause: ParseError): IntelligenceConfigError =>
	new IntelligenceConfigError({
		message: "Intelligence validation failed",
		cause,
	});

// Implementation of IntelligenceService using generic helpers
export const IntelligenceServiceLiveLayer = Layer.succeed(
	IntelligenceServiceTag,
	// Provide a plain object literal that implements the IntelligenceService interface
	{
		make: makeCapabilityMake(
			IntelligenceDefinitionSchema,
			wrapIntelligenceError,
		),
		update: makeCapabilityUpdate(
			IntelligenceDefinitionSchema,
			wrapIntelligenceError,
		),
		// Implement any other IntelligenceService specific methods here if needed in the future
	} satisfies IntelligenceService, // Use 'satisfies' for type checking
);
