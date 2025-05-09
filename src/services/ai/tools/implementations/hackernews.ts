/**
 * @file Implementation and schemas for the Hacker News reader tool.
 * @module services/tools/implementations/hackernews
 */

import { PlatformError } from "@effect/platform/Error.js"; // Keep for potential broader errors
import * as HttpBody from "@effect/platform/HttpBody.js";
// Import HttpClient related modules from @effect/platform
import { HttpClient } from "@effect/platform/HttpClient.js";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest.js";
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
): Effect.Effect<HNItem, ToolExecutionError, HttpClient> => {
	const itemUrl = `${HN_API_BASE}/item/${itemId}.json`;
	const request = HttpClientRequest.get(itemUrl);

	// Use Effect.gen for cleaner async/await style flow
	return Effect.gen(function* () {
		// Access HttpClient from the context
		const httpClient = yield* HttpClient;

		// Execute request and map HTTP/Platform errors
		const response = yield* Effect.mapError(
			httpClient.execute(request), // Use httpClient.execute
			(cause: HttpClientError | PlatformError) => // Catch relevant errors
				new ToolExecutionError({ toolName: "hackerNewsReader", input: { itemId }, cause }),
		);

		// Decode the JSON response body and map body errors
		const json = yield* Effect.mapError(
			HttpBody.json(response), // Use HttpBody.json(response)
			(cause: HttpBody.HttpBodyError) => // Catch body errors
				new ToolExecutionError({ toolName: "hackerNewsReader", input: { itemId }, cause }),
		);

		// Parse and validate the JSON and map schema errors
		const item = yield* Effect.mapError(
			Schema.decodeUnknown(HNItemSchema)(json), // Use Schema.decodeUnknown(schema)(data)
			(cause: ParseError) => // Catch ParseError
				new ToolExecutionError({ toolName: "hackerNewsReader", input: { itemId }, cause }),
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
): Effect.Effect<HackerNewsOutput, ToolExecutionError, HttpClient> => { // Ensure return type annotation is correct

	const storyListUrl = `${HN_API_BASE}/${input.storyType}stories.json`;
	const listRequest = HttpClientRequest.get(storyListUrl);

	// Define the effect chain for fetching IDs separately with explicit type annotation
	const storyIdsEffect: Effect.Effect<ReadonlyArray<number>, ToolExecutionError, HttpClient> =
		HttpClient.pipe( // Corrected: Start the pipe directly from the HttpClient Tag
			Effect.flatMap(httpClient => Effect.mapError(
				httpClient.execute(listRequest),
				(cause: HttpClientError | PlatformError) =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input, cause })
			)),
			Effect.flatMap(response => Effect.mapError(
				HttpBody.json(response),
				(cause: HttpBody.HttpBodyError) =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input, cause })
			)),
			Effect.flatMap(json => Effect.mapError(
				Schema.decodeUnknown(Schema.Array(Schema.Number))(json),
				(cause: ParseError) =>
					new ToolExecutionError({ toolName: "hackerNewsReader", input, cause })
			)),
		);

	// Main logic using Effect.gen
	return Effect.gen(function* () {
		// 1. Execute the effect to fetch story IDs
		// Yielding this effect brings HttpClient and ToolExecutionError into the Gen context
		const storyIds = yield* storyIdsEffect;

		// 2. Slice the array
		const limitedIds = Array.from(storyIds).slice(0, input.limit);

		// 3. Fetch details for each ID in parallel
		// Yielding this also brings HttpClient and ToolExecutionError into the Gen context
		const storiesResult = yield* Effect.forEach(limitedIds, (id) => fetchHNItem(id), {
			concurrency: 5,
		});

		// 4. Return the result matching the output schema
		// The overall Effect's R and E types are now correctly inferred from the yielded effects
		const output: HackerNewsOutput = { stories: storiesResult };
		return output;
	});
};
