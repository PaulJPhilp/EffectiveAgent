/**
 * @file Defines specific errors for the Skill capability service and execution.
 * @module services/capabilities/skill/errors
 */

// Import Tool errors if SkillExecutionError needs to wrap them
import type { ToolError } from "@/services/tools/errors"; // Adjust path
import { Data } from "effect";
// Import ParseError for schema validation issues
import type { ParseError } from "effect/ParseResult";

/**
 * Represents an error during the configuration, loading, or validation
 * of a Skill definition itself (not during execution).
 */
export class SkillConfigError extends Data.TaggedError("SkillConfigError")<{
	readonly message: string;
	readonly skillName?: string; // Optional: Skill name might not be known yet
	/** The underlying cause (e.g., ParseError from schema, file system error). */
	readonly cause?: unknown; // Use unknown for broader compatibility
}> { }

/**
 * Represents an error when a specific Skill definition cannot be found
 * in the loaded registry/data.
 */
export class SkillNotFoundError extends Data.TaggedError("SkillNotFoundError")<{
	readonly skillName: string;
}> {
	get message() {
		return `Skill definition not found: ${this.skillName}`;
	}
}

/**
 * Represents an error when the input provided to invokeSkill fails
 * validation against the Skill's registered inputSchema.
 */
export class SkillInputValidationError extends Data.TaggedError(
	"SkillInputValidationError",
)<{
	readonly skillName: string;
	/** The underlying ParseError from schema validation. */
	readonly cause: ParseError;
}> {
	get message() {
		return `Invalid input provided for skill: ${this.skillName}`;
	}
}

/**
 * Represents an error when the output produced by the skill's execution
 * (e.g., from LLM or tool) fails validation against the Skill's
 * registered outputSchema.
 */
export class SkillOutputValidationError extends Data.TaggedError(
	"SkillOutputValidationError",
)<{
	readonly skillName: string;
	/** The underlying ParseError from schema validation. */
	readonly cause: ParseError;
}> {
	get message() {
		return `Invalid output produced by skill: ${this.skillName}`;
	}
}

/**
 * Represents a generic error occurring during the execution phase of a Skill,
 * after input validation but before output validation. This could wrap errors
 * from LLM calls, Tool execution, prompt rendering, etc.
 */
export class SkillExecutionError extends Data.TaggedError("SkillExecutionError")<{
	readonly skillName: string;
	readonly message?: string; // Optional specific message
	/** The underlying error (e.g., from @effect/ai, ToolExecutorService, PromptApi). */
	readonly cause: unknown; // Use unknown for broad compatibility
}> {
	// Override message for better default reporting
	get message(): string {
		let detail = "Unknown execution error";
		const cause = this.cause;
		if (typeof this.message === 'string' && this.message.length > 0) {
			detail = this.message; // Use provided message if available
		} else if (cause instanceof Error) {
			detail = cause.message;
		} else if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
			detail = cause.message; // Try to extract message from cause object
		} else if (typeof cause === 'string') {
			detail = cause;
		}
		return `Error during execution of skill '${this.skillName}': ${detail}`;
	}
}
