/**
 * @file Defines mock tools and test layers for ToolExecutorService tests.
 * @module services/tools/__tests__/test.mocks
 */

import { Effect, Layer, HashMap, Schema, Context } from "effect";
import {
	ToolRegistryData,
	ToolRegistryDataTag,
	type EffectiveTool,
	type FullToolName,
} from "../types.js"; // Import types from parent directory
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import type * as HttpClientResponse from "@effect/platform/HttpClientResponse"; // Import type only
import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpHeaders from "@effect/platform/Headers";
import { PlatformError } from "@effect/platform/Error";
import * as HttpClientError from "@effect/platform/HttpClientError"; // Import namespace for error types

// --- Test Tools Definitions ---

// 1. Simple Adder (EffectImplementation)
export const adderInputSchema = Schema.Struct({ a: Schema.Number, b: Schema.Number });
export const adderOutputSchema = Schema.Struct({ sum: Schema.Number });
export const adderTool: EffectiveTool = {
	definition: { name: "adder", description: "Adds two numbers" },
	implementation: {
		_tag: "EffectImplementation",
		inputSchema: adderInputSchema,
		outputSchema: adderOutputSchema,
		execute: (input: { a: number, b: number }) => Effect.succeed({ sum: input.a + input.b }),
	},
};

// 2. Test HTTP GET Tool (HttpImplementation)
export const httpGetInputSchema = Schema.Struct({ id: Schema.Number });
export const httpGetOutputSchema = Schema.Struct({ userId: Schema.Number, id: Schema.Number, title: Schema.String, completed: Schema.Boolean });
export const httpGetTool: EffectiveTool = {
	definition: { name: "getTodo", description: "Gets a todo item via HTTP" },
	implementation: {
		_tag: "HttpImplementation",
		inputSchema: httpGetInputSchema,
		outputSchema: httpGetOutputSchema,
		url: "https://test.com/todos/{id}", // Test URL
		method: "GET",
	},
};

// 3. Tool that fails output validation
export const badOutputInputSchema = Schema.Struct({});
export const badOutputOutputSchema = Schema.Struct({ value: Schema.String }); // Expects string
export const badOutputTool: EffectiveTool = {
	definition: { name: "badOutput", description: "Returns wrong output type" },
	implementation: {
		_tag: "EffectImplementation",
		inputSchema: badOutputInputSchema,
		outputSchema: badOutputOutputSchema,
		execute: (_) => Effect.succeed({ value: 123 }), // Returns number
	},
};

// --- Test Registry ---

export const testRegistryMap = HashMap.make(
	["adder", adderTool] as const,
	["http/getTodo", httpGetTool] as const,
	["badOutput", badOutputTool] as const,
);
export const testRegistryData = new ToolRegistryData({ tools: testRegistryMap });
export const testRegistryLayer = Layer.succeed(ToolRegistryDataTag, testRegistryData);

// --- Test HttpClient Implementations ---


// --- Combined Dependencies Layer ---
// Provides the test registry and a functioning (success/fail) HttpClient
export const testDependenciesLayer = testRegistryLayer