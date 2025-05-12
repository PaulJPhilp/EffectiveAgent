/**
 * @file Implementation and schemas for the Gmail Read Messages tool.
 * @module services/tools/implementations/gmail/read
 */

import { Context, Effect, Schema } from "effect";
import type { OAuth2Client } from "google-auth-library.js";
import { google } from 'googleapis';
import { ToolExecutionError } from "../../errors.js";

// --- Schemas ---

export const gmailReadMessagesInputSchema = Schema.Struct({
	/** Max number of messages to return. Defaults to 5, max 50. */
	limit: Schema.Number.pipe(
		Schema.int(),
		Schema.greaterThan(0), // Assuming positive() was corrected
		Schema.lessThanOrEqualTo(50),
		S.optional,
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
): Effect.Effect<GmailReadMessagesOutput, ToolExecutionError, OAuth2Client> =>
	Effect.gen(function* () {
		const auth = yield* GoogleAuthTag;
		const gmail = google.gmail({ version: 'v1', auth });

		// 1. List messages
		const listResponse = yield* Effect.tryPromise({
			try: () => gmail.users.messages.list({
				userId: 'me',
				maxResults: input.limit,
			}),
			catch: (error) => new ToolExecutionError({
				toolName: "gmailReadMessages", input, cause: error
			})
		});

		const messageIds = listResponse.data.messages?.map(m => m.id ?? '')?.filter(id => id) ?? [];
		if (messageIds.length === 0) {
			return { messages: [] };
		}

		// 2. Fetch summary for each message (minimal format)
		const limitedIds = messageIds.slice(0, input.limit);

		const messageSummaries = yield* Effect.forEach(limitedIds, (id) =>
			Effect.tryPromise({
				try: () => gmail.users.messages.get({
					userId: 'me',
					id: id,
					format: 'metadata',
					metadataHeaders: ["Subject", "From", "To", "Date"]
				}),
				catch: (error) => new ToolExecutionError({
					toolName: "gmailReadMessages", input: { messageId: id }, cause: error
				})
			}).pipe(
				Effect.map(res => extractSummary(res.data))
			),
			{ concurrency: 5 }
		);

		return { messages: Array.from(messageSummaries) };
	});
