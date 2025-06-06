/**
 * @file Implementation and schemas for the Gmail Reply Message tool.
 * @module services/tools/implementations/gmail/reply
 */

import { Context, Effect, Schema } from "effect";
import type { OAuth2Client } from "google-auth-library";
import { google } from 'googleapis';
import { ToolExecutionError } from "../../errors.js";

// --- Schemas ---

export const gmailReplyMessageInputSchema = Schema.Struct({
	messageId: Schema.String, // ID of the message to reply to
	threadId: Schema.String, // Thread ID is usually required for replies
	body: Schema.String,
	// Use Schema.Array
	to: Schema.Array(Schema.String).pipe(Schema.optional),
	cc: Schema.Array(Schema.String).pipe(Schema.optional),
	bcc: Schema.Array(Schema.String).pipe(Schema.optional),
	subject: Schema.String.pipe(Schema.optional),
});
export type GmailReplyMessageInput = Schema.Schema.Type<typeof gmailReplyMessageInputSchema>;

// Output schema is the same as send
export const gmailReplyMessageOutputSchema = Schema.Struct({
	success: Schema.Boolean,
	messageId: Schema.String.pipe(Schema.optional),
	threadId: Schema.String.pipe(Schema.optional),
});
export type GmailReplyMessageOutput = Schema.Schema.Type<typeof gmailReplyMessageOutputSchema>;

// --- Placeholder Auth Tag ---
// TODO: Replace with actual import from core/auth service when implemented
const GoogleAuthTag = Context.GenericTag<OAuth2Client>("PLACEHOLDER/GoogleAuth");

// --- Implementation Logic ---

/**
 * Creates a base64url encoded email string for a reply.
 * Fetches original message headers to construct reply headers.
 */
const createReplyMail = (
	originalHeaders: { [key: string]: string },
	input: GmailReplyMessageInput
): string => {
	const originalSubject = originalHeaders['Subject'] || originalHeaders['subject'] || '';
	const replySubject = input.subject ?? (originalSubject.startsWith("Re: ") ? originalSubject : `Re: ${originalSubject}`);

	const replyToHeader = originalHeaders['Reply-To'] || originalHeaders['reply-to'] || originalHeaders['From'] || originalHeaders['from'];
	const originalTo = (originalHeaders['To'] || originalHeaders['to'] || '').split(',').map(s => s.trim()).filter(s => s);
	const originalCc = (originalHeaders['Cc'] || originalHeaders['cc'] || '').split(',').map(s => s.trim()).filter(s => s);

	// Ensure arrays before calling includes/join
	const to = input.to ?? (replyToHeader ? [replyToHeader] : []);
	const cc = input.cc ?? [...originalTo, ...originalCc].filter(email => !to.includes(email));
	const bcc = input.bcc ?? [];

	const messageIdHeader = originalHeaders['Message-ID'] || originalHeaders['message-id'];
	const referencesHeader = originalHeaders['References'] || originalHeaders['references'];

	// Use standard array join method
	const headers = [
		`To: ${to.join(", ")}\r\n`,
		cc.length > 0 ? `Cc: ${cc.join(", ")}\r\n` : "",
		bcc.length > 0 ? `Bcc: ${bcc.join(", ")}\r\n` : "",
		messageIdHeader ? `In-Reply-To: ${messageIdHeader}\r\n` : "",
		referencesHeader ? `References: ${referencesHeader}\r\n` : (messageIdHeader ? `References: ${messageIdHeader}\r\n` : ""),
		`Subject: ${replySubject}\r\n`,
		"Content-Type: text/plain; charset=utf-8\r\n",
		"\r\n",
		input.body
	].join('');

	return Buffer.from(headers).toString('base64url');
};

/**
 * Implementation Effect for replying to a Gmail message.
 * Requires GoogleAuthTag (providing OAuth2Client) in its context.
 */
export const gmailReplyMessageImpl = (
	input: GmailReplyMessageInput,
): Effect.Effect<GmailReplyMessageOutput, ToolExecutionError, OAuth2Client> =>
	Effect.gen(function* () {
		const auth = yield* GoogleAuthTag;
		const gmail = google.gmail({ version: 'v1', auth });

		// 1. Fetch original message headers to construct reply
		const originalMsg = yield* Effect.tryPromise({
			try: () => gmail.users.messages.get({
				userId: 'me',
				id: input.messageId,
				format: 'metadata',
				metadataHeaders: ["Subject", "From", "To", "Cc", "Reply-To", "Message-ID", "References"]
			}),
			catch: (error) => new ToolExecutionError({

				toolName: "gmailReplyMessage",
				input,
				module: "GmailReplyTool",
				method: "fetchOriginalMessage",
				cause: `Failed to fetch original message: ${error}`
			})
		});

		const headers: { [key: string]: string } = {};
		originalMsg.data.payload?.headers?.forEach(h => {
			if (h.name && h.value) headers[h.name] = h.value;
		});

		// 2. Create the raw reply message
		const rawMessage = createReplyMail(headers, input);

		// 3. Send the reply
		const response = yield* Effect.tryPromise({
			try: () => gmail.users.messages.send({
				userId: 'me',
				requestBody: {
					raw: rawMessage,
					threadId: input.threadId
				}
			}),
			catch: (error) => new ToolExecutionError({

				toolName: "gmailReplyMessage",
				input,
				module: "GmailReplyTool",
				method: "sendDraft",
				cause: error
			})
		});

		// 4. Check response
		if (response.status === 200 && response.data.id) {
			return {
				success: true,
				messageId: response.data.id ?? undefined,
				threadId: response.data.threadId ?? undefined,
			};
		}

		return yield* Effect.fail(new ToolExecutionError({
			toolName: "gmailReplyMessage",
			input,
			module: "GmailReplyTool",
			method: "sendDraft",
			cause: `Gmail API reply failed with status ${response.status}: ${JSON.stringify(response.data)}`
		}));
	}).pipe(
		Effect.catchAll((error) => Effect.fail(
			error instanceof ToolExecutionError ? error : new ToolExecutionError({
				toolName: "gmailReplyMessage",
				input,
				module: "GmailReplyTool",
				method: "sendDraft",
				cause: error
			})
		))
	);
