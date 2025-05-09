/**
 * @file Implementation and schemas for the Google Docs Get Content tool.
 * @module services/tools/implementations/googledocs/getContent
 */

import { Effect, Schema } from "effect";
import { OAuth2Client } from "google-auth-library";
// Import the Google APIs
import { google } from 'googleapis';
import { ToolExecutionError } from "../../errors.js";

// --- Schemas ---
export const googleDocsGetContentInputSchema = Schema.Struct({
	documentId: Schema.String.pipe(Schema.minLength(1)),
});
export type GoogleDocsGetContentInput = Schema.Schema.Type<
	typeof googleDocsGetContentInputSchema
>;
export const googleDocsGetContentOutputSchema = Schema.Struct({
	content: Schema.String,
});
export type GoogleDocsGetContentOutput = Schema.Schema.Type<
	typeof googleDocsGetContentOutputSchema
>;

// --- Implementation Logic ---
/**
 * The Effect function implementing the googleDocsGetContent logic.
 * Takes validated input and returns an Effect yielding the output or a ToolExecutionError.
 * NOTE: Assumes authentication is handled implicitly by the SDK/environment or client constructor.
 * If explicit auth/config is needed per call, inject an authenticated client instance via Context.
 */
export const googleDocsGetContentImpl = (
	input: GoogleDocsGetContentInput,
): Effect.Effect<GoogleDocsGetContentOutput, ToolExecutionError /*, Requires Auth/Client? */> =>
	Effect.tryPromise({
		try: async () => {
			console.log(`Calling external SDK for doc ID: ${input.documentId}`);

			// Create an OAuth2 client - in a real app, this would be configured with proper credentials
			// and likely injected via dependency injection rather than created here
			const auth = new OAuth2Client({
				clientId: process.env["GOOGLE_CLIENT_ID"],
				clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
				redirectUri: process.env["GOOGLE_REDIRECT_URI"]
			});
			
			// Set credentials - in a real app, these would be obtained through OAuth flow
			// This is just a placeholder - actual implementation would handle token refresh, etc.
			auth.setCredentials({
				access_token: process.env["GOOGLE_ACCESS_TOKEN"],
				refresh_token: process.env["GOOGLE_REFRESH_TOKEN"]
			});
			
			// Create the docs client
			const docsClient = google.docs({ version: 'v1', auth });
			
			// Get the document
			const response = await docsClient.documents.get({
				documentId: input.documentId
			});
			
			// Extract text content from the document
			const contentString = extractTextFromGoogleDocsResponse(response.data);

			if (typeof contentString !== 'string') {
				throw new Error("Failed to retrieve valid content string from Google Docs API.");
			}
			return contentString;
		},
		catch: (error) =>
			new ToolExecutionError({
				toolName: "googleDocsGetContent",
				input: input,
				cause: error instanceof Error ? error : new Error(String(error)),
			}),
	}).pipe(
		Effect.map(contentString => ({ content: contentString }))
	);

/**
 * Helper function to extract text content from a Google Docs API response
 * @param doc The document data from the Google Docs API
 * @returns A string containing the document's text content
 */
function extractTextFromGoogleDocsResponse(doc: any): string {
	let text = '';
	
	// Process the document content if it exists
	if (doc.body?.content) {
		doc.body.content.forEach((element: any) => {
			if (element.paragraph) {
				element.paragraph.elements?.forEach((inlineElement: any) => {
					if (inlineElement.textRun && inlineElement.textRun.content) {
						text += inlineElement.textRun.content;
					}
				});
			}
		});
	}
	
	return text;
}
