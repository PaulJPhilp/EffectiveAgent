/**
 * @file Implementation and schemas for the Hacker News reader tool.
 * @module services/tools/implementations/hackernews
 */

import * as HttpBody from "@effect/platform/HttpBody";
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import { Effect, Schema } from "effect";
// Import base ToolExecutionError
import { ToolExecutionError } from "../errors.js";

// --- Schemas ---

/** Valid story types for the Hacker News API. */
const HNStoryTypeSchema = Schema.Literal("top", "new", "best");

/** Input schema for the hackerNewsReader tool. */
export const hackerNewsInputSchema = Schema.Struct({
	/** The maximum number of stories to return. Defaults to 10, max 50. */
	limit: Schema.Number.pipe(
		Schema.int(),
		Schema.greaterThan(0), // Corrected from Schema.positive()
		Schema.lessThanOrEqualTo(50),
		Schema.optional,
		Schema.withDefaults({ constructor: () => 10, decoding: () => 10 }),
	),
	/** The type of stories to fetch ('top', 'new', 'best'). Defaults to 'top'. */
	storyType: HNStoryTypeSchema.pipe(
		Schema.optional,
		Schema.withDefaults({ constructor: () => "top" as const, decoding: () => "top" as const }),
	),
});
export type HackerNewsInput = Schema.Schema.Type<typeof hackerNewsInputSchema>;

/** Schema for a single story item retrieved from the HN API. */
const HNItemSchema = Schema.Struct({
	id: Schema.Number,
	title: Schema.String,
	url: Schema.String.pipe(Schema.optional),
	score: Schema.Number,
	by: Schema.String,
});
export type HNItem = Schema.Schema.Type<typeof HNItemSchema>;

/** Output schema for the hackerNewsReader tool. */
export const hackerNewsOutputSchema = Schema.Struct({
	/** An array of Hacker News story items. */
	stories: Schema.Array(HNItemSchema),
});
export type HackerNewsOutput = Schema.Schema.Type<typeof hackerNewsOutputSchema>;

// --- Implementation Logic ---

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

/**
 * Helper effect to fetch and decode a single Hacker News item by its ID.
 * Requires HttpClient in its context. (Using provided pattern)
 */
const fetchHNItem = (
	itemId: number,
): Effect.Effect<HNItem, ToolExecutionError, HttpClient | unknown> => {
	const itemUrl = `${HN_API_BASE}/item/${itemId}.json`;
	const request = HttpClientRequest.get(itemUrl);

	// Use Effect.gen for cleaner async/await style flow
	return Effect.gen(function* () {
		// Access HttpClient from the context
		const httpClient = yield* HttpClient;

		// Execute request and map HTTP/Platform errors
		const response = yield* httpClient.execute(request).pipe(
			Effect.mapError(
				(cause): ToolExecutionError =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input: { itemId }, module: "hackernews", method: "fetchHNItem", cause })
			)
		);

		// Decode the JSON response body and map body errors
		const json = yield* HttpBody.json(response).pipe(
			Effect.mapError(
				(cause): ToolExecutionError =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input: { itemId }, module: "hackernews", method: "fetchHNItem", cause })
			)
		);

		// Parse and validate the JSON and map schema errors
		const item = yield* Schema.decodeUnknown(HNItemSchema)(json).pipe(
			Effect.mapError(
				(cause): ToolExecutionError =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input: { itemId }, module: "hackernews", method: "fetchHNItem", cause })
			)
		);

		return item; // Return the validated item
	});
};

/**
 * The Effect function implementing the hackerNewsReader logic.
 * Takes validated input and returns an Effect yielding the output or a ToolExecutionError.
 * Requires HttpClient in its context.
 */
export const hackerNewsImpl = (
	input: HackerNewsInput,
): Effect.Effect<HackerNewsOutput, ToolExecutionError, HttpClient | unknown> => {
	const storyListUrl = `${HN_API_BASE}/${input.storyType}stories.json`;
	const listRequest = HttpClientRequest.get(storyListUrl);

	return Effect.gen(function* () {
		// 1. Get story IDs
		const httpClient = yield* HttpClient;
		const response = yield* httpClient.execute(listRequest).pipe(
			Effect.mapError(
				(cause): ToolExecutionError =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input, module: "hackernews", method: "getStoryIds", cause })
			)
		);
		const json = yield* HttpBody.json(response).pipe(
			Effect.mapError(
				(cause): ToolExecutionError =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input, module: "hackernews", method: "getStoryIds", cause })
			)
		);
		const storyIds = yield* Schema.decodeUnknown(Schema.Array(Schema.Number))(json).pipe(
			Effect.mapError(
				(cause): ToolExecutionError =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input, module: "hackernews", method: "getStoryIds", cause })
			)
		);

		// 2. Limit number of stories and fetch details in parallel
		const stories = yield* Effect.forEach(
			storyIds.slice(0, input.limit),
			(id: number) => fetchHNItem(id),
			{ concurrency: 5 }
		);

		// 3. Return the result
		return { stories };
	});
};
