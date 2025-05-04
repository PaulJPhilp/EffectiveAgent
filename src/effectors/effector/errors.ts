// src/effector/errors.ts

import { Data } from "effect";
import type * as Queue from "effect/Queue";
import type { EffectorId } from "./effector.types"; // Adjust path as needed

/**
 * Represents an error that occurs when attempting to send a message
 * to an Effector, typically because its mailbox (Queue) is shut down
 * (e.g., the Effector has been terminated).
 */
export class EffectorSendError extends Data.TaggedError("EffectorSendError")<{
	/** The ID of the Effector the message was intended for. */
	readonly effectorId: EffectorId;
	/** The underlying reason for the failure (from the Queue). */
	readonly cause: Queue.EnqueueError;
	/** An optional descriptive message. */
	readonly message?: string;
}> {
	// Optional: Override toString for potentially clearer logging
	override toString(): string {
		const base = `EffectorSendError: Failed to send message to Effector [${this.effectorId}]. Cause: ${this.cause}`;
		return this.message ? `${base} - ${this.message}` : base;
	}
}

// Add other Effector-specific, operation-level errors here if they arise.
// Errors originating *within* the user-provided ProcessingLogic are of type 'E'
// and handled separately by the processing loop or the user's logic.
// Errors during Effector creation are typically propagated directly.
