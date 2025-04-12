/**
 * @file Defines context elements for agent execution.
 * @module services/execution/context
 */
import { FiberRef } from "effect";
// Use FullToolName from the tools service
import type { FullToolName } from "@/services/tools/types.js"; // Adjust path if needed

/** Defines permissions active during an agent execution context. */
export interface ExecutionPermissions {
	/** The set of tool names explicitly allowed for execution. */
	readonly allowedTools: ReadonlySet<FullToolName>;
	// Add other permissions if needed (e.g., allowedSkills)
}

/**
 * FiberRef holding the ExecutionPermissions applicable to the current
 * agent execution context. Undefined if no specific permissions are active,
 * which typically means deny all unless otherwise configured.
 */
export const CurrentExecutionPermissionsRef = FiberRef.unsafeMake<
	ExecutionPermissions | undefined
>(undefined); // Default to undefined (no permissions set)
