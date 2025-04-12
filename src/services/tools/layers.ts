/**
 * @file Provides the main composable Layer for the Tooling system.
 * @module services/tools/layers
 */

import { Layer, Context, Effect } from "effect";
import {
	// Source Tags (needed by FinalToolRegistryLayer)
	InternalToolboxTag,
	ProjectWorkspaceTag,
	// OrgWorkspaceTag, // Optional

	// Final Registry Tag (Output of FinalToolRegistryLayer, Input to ToolExecutorServiceLayer)
	ToolRegistryDataTag,

	// Executor Service Tag (Output of ToolExecutorServiceLayer)
	ToolExecutorServiceTag,

	// Data structure types (for context/layer requirements)
	type EffectiveWorkspace,
	type ToolExecutorService, // Interface for type checking
	type ToolRegistryData,
} from "./types.js";
// Import internal layers needed for composition
import { InternalToolboxLayer, FinalToolRegistryLayer } from "./registry.js";
import { ToolExecutorServiceLiveImplementationLogic } from "./live.js";
// Import common dependencies likely needed by executor or tool implementations
import { HttpClient } from "@effect/platform/HttpClient";
// Import other potential common dependencies
// import { OAuthServiceTag, type OAuthService } from "@/services/core/auth/oauth";
// import { McpClientTag, type McpClient } from "@/services/core/mcp";

// --- Layer providing the Executor Service ---
/** Builds the ToolExecutorService, requiring its dependencies. */
const ToolExecutorServiceLayer = Layer.effect(
	ToolExecutorServiceTag,
	// Use Effect.gen to get dependencies and call the implementation logic factory
	Effect.gen(function* () {
		// Get dependencies from the context provided to this layer
		const registryData = yield* ToolRegistryDataTag;
		const httpClient = yield* HttpClient;
		// const oauthService = yield* OAuthServiceTag; // Inject if needed
		// const mcpClient = yield* McpClientTag; // Inject if needed

		// Call the logic factory, passing the resolved dependencies
		const serviceImplementation = yield* ToolExecutorServiceLiveImplementationLogic({
			registryData,
			httpClient,
			// oauthService, // Pass other dependencies
			// mcpClient,
		});
		return serviceImplementation;
	})
);

// --- The Single User-Facing Tooling Layer ---
/**
 * Provides the core Tooling services (`ToolExecutorServiceTag`, `ToolRegistryDataTag`).
 *
 * This layer handles merging the internal standard library tools with
 * the user-provided project workspace and optional organization workspace.
 * It bundles all necessary internal tool system layers.
 *
 * **Requires (RIn):**
 * - `ProjectWorkspaceTag`: User must provide a Layer (e.g., `Layer.succeed(ProjectWorkspaceTag, MyProjectWorkspaceData)`)
 * - `HttpClient`: (Or other platform context providing it) Needed by the executor and potentially tool implementations.
 * - Potentially other services needed by specific tool implementations (e.g., `OAuthServiceTag`).
 * - (Optional) `OrgWorkspaceTag`: If organization-level tools are used.
 *
 * **Provides (ROut):**
 * - `ToolExecutorServiceTag`
 * - `ToolRegistryDataTag` (The final merged registry)
 */
// Define the ToolingLiveLayer without explicit type annotation
// Let TypeScript infer the correct types from the Layer composition
export const ToolingLiveLayer = Layer.provideMerge(
	// Target: Provide ToolExecutorServiceLayer
	ToolExecutorServiceLayer,
	// Dependencies for ToolExecutorServiceLayer: ToolRegistryDataTag, HttpClient, etc.
	Layer.provideMerge(
		// Target: Provide FinalToolRegistryLayer (provides ToolRegistryDataTag)
		FinalToolRegistryLayer,
		// Dependencies for FinalToolRegistryLayer: InternalToolboxTag, ProjectWorkspaceTag, etc.
		InternalToolboxLayer // Provides InternalToolboxTag
		// ProjectWorkspaceTag and OrgWorkspaceTag are requirements exposed to the user
		// HttpClient and other common deps are also requirements exposed to the user
	)
);

// Example of how a user might compose this in main.ts:
/*
import { ToolingLiveLayer } from "@/services/tools/layers";
import { ProjectWorkspaceTag } from "@/services/tools/types";
import { MyProjectWorkspace } from "@/tools/workspace"; // User's data
import { BunContext } from "@effect/platform-bun";
import { Layer } from "effect";

// 1. Layer providing user's workspace data
const UserWorkspaceLayer = Layer.succeed(ProjectWorkspaceTag, MyProjectWorkspace);

// 2. Compose final App Layer
const AppLayer = Layer.empty.pipe( // Start with empty or other app layers
	// Merge ToolingLiveLayer - it exposes ProjectWorkspaceTag and HttpClient as requirements
	Layer.merge(ToolingLiveLayer),
	// Merge other application layers
	// Layer.merge(OtherAppLayer),

	// Provide the requirements for ToolingLiveLayer and others
	Layer.provide(UserWorkspaceLayer), // Provides ProjectWorkspaceTag
	Layer.provide(BunContext.layer) // Provides HttpClient, etc.
);
*/
