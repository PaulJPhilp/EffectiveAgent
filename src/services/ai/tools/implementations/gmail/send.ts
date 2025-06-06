/**
 * @file Implementation and schemas for the Gmail Send Message tool.
 * @module services/tools/implementations/gmail/send
 */

import { Context, Effect, Schema } from "effect";
import type { OAuth2Client } from "google-auth-library";
import { google } from 'googleapis';
import { ToolExecutionError } from "../../errors.js";

// --- Schemas ---

export const gmailSendMessageInputSchema = Schema.Struct({
	// Use Schema.Array
	to: Schema.Array(Schema.String).pipe(Schema.minItems(1)),
	subject: Schema.String,
	body: Schema.String, // Assuming plain text body for simplicity
	cc: Schema.Array(Schema.String).pipe(Schema.optional),
	bcc: Schema.Array(Schema.String).pipe(Schema.optional),
});
export type GmailSendMessageInput = Schema.Schema.Type<typeof gmailSendMessageInputSchema>;

export const gmailSendMessageOutputSchema = Schema.Struct({
	success: Schema.Boolean,
	messageId: Schema.String.pipe(Schema.optional), // ID of the sent message
	threadId: Schema.String.pipe(Schema.optional),
});
export type GmailSendMessageOutput = Schema.Schema.Type<typeof gmailSendMessageOutputSchema>;

// --- Placeholder Auth Tag ---
// TODO: Replace with actual import from core/auth service when implemented
const GoogleAuthTag = Context.GenericTag<OAuth2Client>("PLACEHOLDER/GoogleAuth");

// --- Implementation Logic ---

/**
 * Creates a base64url encoded email string.
 */
const createMail = (input: GmailSendMessageInput): string => {
	// Use standard array join method
	const to = input.to.join(", ");
	const cc = input.cc ? `Cc: ${input.cc.join(", ")}\r\n` : "";
	const bcc = input.bcc ? `Bcc: ${input.bcc.join(", ")}\r\n` : "";
	const subject = input.subject;
	const messageBody = input.body;

	const email = [
		`To: ${to}\r\n`,
		cc,
		bcc,
		`Subject: ${subject}\r\n`,
		"Content-Type: text/plain; charset=utf-8\r\n",
		"\r\n", // Empty line separates headers from body
		messageBody
	].join('');

	// Base64url encode
	return Buffer.from(email).toString('base64url');
};

/**
 * Implementation Effect for sending a Gmail message.
 * Requires GoogleAuthTag (providing OAuth2Client) in its context.
 */
export const gmailSendMessageImpl = (
	input: GmailSendMessageInput,
): Effect.Effect<GmailSendMessageOutput, ToolExecutionError, OAuth2Client> =>
	Effect.gen(function* () {
		const auth = yield* GoogleAuthTag;
		const gmail = google.gmail({ version: 'v1', auth });
		const rawMessage = createMail(input);

		const response = yield* Effect.tryPromise({
			try: () => gmail.users.messages.send({
				userId: 'me',
				requestBody: {
					raw: rawMessage
				}
			}),
			catch: (error) => new ToolExecutionError({
				module: "GmailSendTool",
				method: "sendMessage",
				toolName: "gmailSendMessage", input, cause: error
			})
		});

		if (response.status === 200 && response.data.id) {
			return {
				success: true,
				messageId: response.data.id,
				threadId: response.data.threadId ?? undefined,
			};
		}

		return yield* Effect.fail(new ToolExecutionError({
			toolName: "gmailSendMessage",
			input,
			module: "GmailSendTool",
			method: "sendMessage",
			cause: `Gmail API send failed with status ${response.status}: ${JSON.stringify(response.data)}`
		}));
	});
