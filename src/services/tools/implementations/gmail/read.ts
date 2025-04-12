/**
 * @file Implementation and schemas for the Gmail Read Messages tool.
 * @module services/tools/implementations/gmail/read
 */

import { Effect, Schema, Context } from "effect";
import { ToolExecutionError } from "../../errors.js";
import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

// --- Schemas ---

export const gmailReadMessagesInputSchema = Schema.Struct({
	/** Max number of messages to return. Defaults to 5, max 50. */
	limit: Schema.Number.pipe(
		Schema.int(),
		Schema.greaterThan(0), // Assuming positive() was corrected
		Schema.lessThanOrEqualTo(50),
		Schema.optional,
		Schema.withDefaults({ constructor: () => 5, decoding: () => 5 }),
	),
	// Add other filters like labels, query string etc. if needed
});
export type GmailReadMessagesInput = Schema.Schema.Type<typeof gmailReadMessagesInputSchema>;

// Simplified output schema for a message summary
const GmailMessageSummarySchema = Schema.Struct({
	id: Schema.String,
	threadId: Schema.String,
	snippet: Schema.String,
	// Add more fields extracted from headers if needed (From, To, Subject, Date)
});
export type GmailMessageSummary = Schema.Schema.Type<typeof GmailMessageSummarySchema>;

export const gmailReadMessagesOutputSchema = Schema.Struct({
	// Use Schema.Array for mutable array output
	messages: Schema.Array(GmailMessageSummarySchema),
});
export type GmailReadMessagesOutput = Schema.Schema.Type<typeof gmailReadMessagesOutputSchema>;

// --- Placeholder Auth Tag ---
// TODO: Replace with actual import from core/auth service when implemented
const GoogleAuthTag = Context.GenericTag<OAuth2Client>("PLACEHOLDER/GoogleAuth");

// --- Implementation Logic ---

/**
 * Extracts relevant summary info from a Gmail message resource.
 */
const extractSummary = (message: gmail_v1.Schema$Message): GmailMessageSummary => {
	// Placeholder: Add logic to parse headers for From, To, Subject, Date if needed
	return {
		id: message.id ?? 'unknown-id',
		threadId: message.threadId ?? 'unknown-thread',
		snippet: message.snippet ?? '',
	};
};

/**
 * Implementation Effect for reading Gmail messages.
 * Requires GoogleAuthTag (providing OAuth2Client) in its context.
 */
export const gmailReadMessagesImpl = (
	input: GmailReadMessagesInput,
): Effect.Effect<GmailReadMessagesOutput, ToolExecutionError, OAuth2Client> =>// Depends on placeholder Tag
	Effect.gen(function* () {
		const auth = yield* GoogleAuthTag; // Use placeholder Tag
		const gmail = google.gmail({ version: 'v1', auth });

		try {
			// 1. List messages
			const listResponse = yield* Effect.tryPromise({
				try: () => gmail.users.messages.list({
					userId: 'me', // Use 'me' for the authenticated user
					maxResults: input.limit,
					// Add labelIds: ['INBOX'] or q: '...' for filtering if needed
				}),
				catch: (error) => new ToolExecutionError({
					toolName: "gmailReadMessages", input, cause: error
				})
			});

			const messageIds = listResponse.data.messages?.map(m => m.id ?? '')?.filter(id => id) ?? [];
			if (messageIds.length === 0) {
				return { messages: [] }; // Return empty mutable array
			}

			// 2. Fetch summary for each message (minimal format)
			// Use standard Array slice
			const limitedIds = messageIds.slice(0, input.limit);

			// Note: Fetching full message content is much heavier.
			// Using batch requests would be more efficient for many messages.
			const messageSummaries = yield* Effect.forEach(limitedIds, (id) =>
				Effect.tryPromise({
					try: () => gmail.users.messages.get({
						userId: 'me',
						id: id,
						format: 'metadata', // Fetch minimal data (headers/snippet)
						metadataHeaders: ["Subject", "From", "To", "Date"] // Specify needed headers
					}),
					catch: (error) => new ToolExecutionError({
						toolName: "gmailReadMessages", input: { messageId: id }, cause: error
					})
				}).pipe(
					// Extract summary from the response data
					Effect.map(res => extractSummary(res.data))
				),
				{ concurrency: 5 } // Limit concurrency
			);

			// Effect.forEach returns ReadonlyArray, convert to mutable array for output schema
			return { messages: Array.from(messageSummaries) };

		} catch (error) {
			// Catch any unexpected errors during the process
			return yield* Effect.fail(new ToolExecutionError({
				toolName: "gmailReadMessages", input, cause: error
			}));
		}
	});
