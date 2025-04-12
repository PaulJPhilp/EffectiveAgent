/**
 * @file Unit tests for the Tool Registry layers (registry.ts).
 * @module services/tools/__tests__/registry.test
 */

import { Effect, Exit, Layer, Scope, Cause, Option, Context, HashMap, Schema } from "effect";
import { describe, it, expect } from "vitest";

// Layers and Tags under test
import { InternalToolboxLayer, FinalToolRegistryLayer } from "../registry.js";
import {
	InternalToolboxTag,
	ProjectWorkspaceTag,
	ToolRegistryDataTag,
	type EffectiveTool,
	type EffectiveToolbox, // Import the TYPE
	type EffectiveWorkspace,
	type ToolRegistryData, // Import the TYPE
	type NamespaceName,
} from "../types.js";

// --- Test Tool Definitions (Minimal examples needed for testing merge) ---

// Mock StdLib Calculator (Metadata should match registry.ts)
const stdlibCalculator: EffectiveTool = {
	definition: { name: "calculator", description: "Calculates the result of a simple arithmetic expression. Input: { expression: string }. Output: { result: number }." },
	implementation: { _tag: "EffectImplementation", inputSchema: Schema.Any, outputSchema: Schema.Any, execute: (_) => Effect.succeed(1) }
};

// Mock Project Scientific Calculator
const projectSciCalc: EffectiveTool = {
	definition: { name: "calculator", description: "Project SciCalc" }, // Simple name
	implementation: { _tag: "EffectImplementation", inputSchema: Schema.Any, outputSchema: Schema.Any, execute: (_) => Effect.succeed(2) }
};

// Mock Project Unique Tool
const projectUniqueTool: EffectiveTool = {
	definition: { name: "projectLogger", description: "Project Logger" },
	implementation: { _tag: "EffectImplementation", inputSchema: Schema.Any, outputSchema: Schema.Any, execute: (_) => Effect.succeed(3) }
};

// --- Test Helpers ---

// Helper to run an effect and get the value provided for a specific Tag
const runAndGet = <T, E = unknown>( // Default E to unknown
	tag: Context.Tag<T, T>,
	layer: Layer.Layer<any, any, any> // Layer providing T and potentially others
): Promise<T> => {
	const effect: Effect.Effect<T, never, T> = tag; // Tag is Effect<T, never, T>
	const runnable = Effect.provide(effect, layer);
	// Use assertion as layer might have E=any, R=any
	return Effect.runPromise(runnable as Effect.Effect<T, E, never>);
};

// --- Test Suite ---

describe("Tool Registry Layers (registry.ts)", () => {

	// --- Tests for InternalToolboxLayer ---

	it("InternalToolboxLayer should provide stdlib tools via InternalToolboxTag", async () => {
		// Arrange: InternalToolboxLayer already builds the map
		const testLayer = InternalToolboxLayer;

		// Act: Get the provided toolbox map using the helper
		const toolboxMap = await runAndGet(InternalToolboxTag, testLayer);

		// Assert: Check if the calculator tool is present and has correct description
		expect(HashMap.size(toolboxMap)).toBe(1); // Should only contain calculator now
		expect(HashMap.has(toolboxMap, "calculator")).toBe(true);
		const calcTool = Option.getOrThrow(HashMap.get(toolboxMap, "calculator"));
		// Corrected Assertion: Expect the REAL description from registry.ts
		expect(calcTool.definition.description).toBe("Calculates the result of a simple arithmetic expression. Input: { expression: string }. Output: { result: number }.");
	});

	// --- Tests for FinalToolRegistryLayer ---

	it("FinalToolRegistryLayer should merge internal and project tools", async () => {
		// Arrange: Create project workspace data and layer
		const projectWorkspaceData: EffectiveWorkspace = new Map<NamespaceName, EffectiveToolbox>([
			["science", HashMap.make(["calculator", projectSciCalc] as const)], // project 'science/calculator'
			["utils", HashMap.make(["projectLogger", projectUniqueTool] as const)] // project 'utils/projectLogger'
		]);
		const projectWorkspaceLayer = Layer.succeed(ProjectWorkspaceTag, projectWorkspaceData);

		// Combine layers needed by FinalToolRegistryLayer
		const sourceLayer = Layer.merge(InternalToolboxLayer, projectWorkspaceLayer);
		const testLayer = Layer.provide(FinalToolRegistryLayer, sourceLayer);

		// Act: Get the final merged ToolRegistryData using the helper
		const registryData = await runAndGet(ToolRegistryDataTag, testLayer);
		const finalToolsMap = registryData.tools;

		// Assert: Check the merged map content and precedence
		// Corrected Assertion: 1 stdlib (calculator) + 2 project tools = 3
		expect(HashMap.size(finalToolsMap)).toBe(3);

		expect(HashMap.has(finalToolsMap, "calculator")).toBe(true); // Stdlib
		expect(Option.getOrThrow(HashMap.get(finalToolsMap, "calculator")).definition.description).toContain("Calculates the result"); // Check real description

		expect(HashMap.has(finalToolsMap, "science/calculator")).toBe(true); // Project
		expect(Option.getOrThrow(HashMap.get(finalToolsMap, "science/calculator")).definition.description).toBe("Project SciCalc");

		expect(HashMap.has(finalToolsMap, "utils/projectLogger")).toBe(true); // Project
		expect(Option.getOrThrow(HashMap.get(finalToolsMap, "utils/projectLogger")).definition.description).toBe("Project Logger");
	});

	it("FinalToolRegistryLayer should prioritize project tools over internal tools with same full name", async () => {
		// Arrange: Project tool 'app/calculator' vs stdlib 'calculator'
		const projectOverrideCalc: EffectiveTool = {
			definition: { name: "calculator", description: "Project Calc Override" }, // Simple name 'calculator'
			implementation: { _tag: "EffectImplementation", inputSchema: Schema.Any, outputSchema: Schema.Any, execute: (_) => Effect.succeed(99) }
		};
		// Project tools are always namespaced in this setup
		const projectWorkspaceData: EffectiveWorkspace = new Map<NamespaceName, EffectiveToolbox>([
			["app", HashMap.make(["calculator", projectOverrideCalc] as const)], // project 'app/calculator'
		]);
		const projectWorkspaceLayer = Layer.succeed(ProjectWorkspaceTag, projectWorkspaceData);

		const sourceLayer = Layer.merge(InternalToolboxLayer, projectWorkspaceLayer);
		const testLayer = Layer.provide(FinalToolRegistryLayer, sourceLayer);

		// Act
		const registryData = await runAndGet(ToolRegistryDataTag, testLayer);
		const finalToolsMap = registryData.tools;

		// Assert
		// Corrected Assertion: 1 stdlib (calculator) + 1 project tool (app/calculator) = 2
		expect(HashMap.size(finalToolsMap)).toBe(2);

		// Check stdlib calculator still exists with simple name
		expect(HashMap.has(finalToolsMap, "calculator")).toBe(true);
		expect(Option.getOrThrow(HashMap.get(finalToolsMap, "calculator")).definition.description).toContain("Calculates the result");

		// Check project calculator exists with namespaced name
		expect(HashMap.has(finalToolsMap, "app/calculator")).toBe(true);
		expect(Option.getOrThrow(HashMap.get(finalToolsMap, "app/calculator")).definition.description).toBe("Project Calc Override");
	});

	// TODO: Add tests for Org layer precedence if implemented
	// TODO: Add tests for Toolkit merging if implemented
});
