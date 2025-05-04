// src/effector/errors.ts

import type { Queue } from "effect";
import { Data } from "effect";
import type { EffectorId } from "./types.js";

/**
 * Base error class for all Effector-related errors.
 */
export class EffectorError extends Data.TaggedError("EffectorError")<{
	/** The ID of the Effector where the error occurred */
	readonly effectorId: EffectorId;
	/** Optional underlying cause of the error */
	readonly cause?: unknown;
	/** Human-readable error message */
	readonly message: string;
}> { }

/**
 * Error thrown when attempting to interact with a non-existent Effector.
 */
export class EffectorNotFoundError extends Data.TaggedError("EffectorNotFoundError")<{
	/** The ID of the Effector that wasn't found */
	readonly effectorId: EffectorId;
	/** Human-readable error message */
	readonly message: string;
}> { }

/**
 * Error thrown when attempting to interact with a terminated Effector.
 */
export class EffectorTerminatedError extends Data.TaggedError("EffectorTerminatedError")<{
	/** The ID of the terminated Effector */
	readonly effectorId: EffectorId;
	/** When the Effector was terminated */
	readonly terminatedAt: number;
	/** Human-readable error message */
	readonly message: string;
}> { }

/**
 * Error thrown when failing to send a message to an Effector's mailbox.
 */
export class EffectorSendError extends Data.TaggedError("EffectorSendError")<{
	/** The ID of the Effector the message was intended for */
	readonly effectorId: EffectorId;
	/** The underlying error that caused the failure */
	readonly cause: Error;
	/** Human-readable error message */
	readonly message: string;
}> {
	override toString(): string {
		return `EffectorSendError: Failed to send message to Effector [${this.effectorId}]. ${this.message}`;
	}
}

/**
 * Error thrown when an Effector encounters an error during message processing.
 */
export class EffectorProcessingError extends Data.TaggedError("EffectorProcessingError")<{
	/** The ID of the Effector where processing failed */
	readonly effectorId: EffectorId;
	/** The ID of the record that was being processed */
	readonly recordId: string;
	/** The underlying error that occurred during processing */
	readonly cause: unknown;
	/** Human-readable error message */
	readonly message: string;
}> { }

// Add other Effector-specific, operation-level errors here if they arise.
// Errors originating *within* the user-provided ProcessingLogic are of type 'E'
// and handled separately by the processing loop or the user's logic.
// Errors during Effector creation are typically propagated directly.
