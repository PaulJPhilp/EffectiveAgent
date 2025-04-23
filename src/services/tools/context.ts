import type { FullToolName } from "@services/tools/types.js"; // Use FullToolName
/**
 * @file Defines context elements for agent execution.
 * @module services/execution/context
 */
import { FiberRef } from "effect";

export interface ExecutionPermissions {
	readonly allowedTools: ReadonlySet<FullToolName>;
	// Add other permissions if needed (e.g., allowedSkills)
}

/**
 * FiberRef holding the ExecutionPermissions applicable to the current
 * agent execution context. Undefined if no specific permissions are active.
 */
export const CurrentExecutionPermissionsRef = FiberRef.unsafeMake<
	ExecutionPermissions | undefined
>(undefined);
