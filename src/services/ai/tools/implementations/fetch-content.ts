/**
 * @file Fetch Content tool implementation
 * @module services/tools/implementations/fetch-content
 */

import { Effect, Schema as S } from "effect";

// --- Input Schema ---

export const FetchContentInputSchema = S.Struct({
    url: S.String.pipe(
        S.pattern(/^https?:\/\/.+/),
        S.annotations({ description: "The URL to fetch content from" })
    )
});

export type FetchContentInput = S.Schema.Type<typeof FetchContentInputSchema>;

// --- Output Schema ---

export const FetchContentOutputSchema = S.Struct({
    content: S.String,
    title: S.optional(S.String),
    url: S.String
});

export type FetchContentOutput = S.Schema.Type<typeof FetchContentOutputSchema>;

// --- Implementation ---

export const fetchContentImpl = (input: unknown): Effect.Effect<FetchContentOutput, Error> =>
    Effect.gen(function* () {
        // Validate input
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(FetchContentInputSchema)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`))
        );

        try {
            // Fetch the content from the URL
            const response = yield* Effect.tryPromise({
                try: () => fetch(data.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; EffectiveAgent/1.0)'
                    }
                }),
                catch: (error) => new Error(`Failed to fetch URL: ${String(error)}`)
            });

            if (!response.ok) {
                return yield* Effect.fail(new Error(`HTTP ${response.status}: ${response.statusText}`));
            }

            // Get the content type to determine how to parse
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('text/html')) {
                // For HTML content, extract text
                const html = yield* Effect.tryPromise({
                    try: () => response.text(),
                    catch: (error) => new Error(`Failed to read response: ${String(error)}`)
                });

                // Simple HTML text extraction (basic implementation)
                const textContent = extractTextFromHtml(html);

                return {
                    content: textContent,
                    url: data.url
                };
            }if (contentType.includes('text/')) {
                // For plain text content
                const text = yield* Effect.tryPromise({
                    try: () => response.text(),
                    catch: (error) => new Error(`Failed to read response: ${String(error)}`)
                });

                return {
                    content: text,
                    url: data.url
                };
            }
                return yield* Effect.fail(new Error(`Unsupported content type: ${contentType}`));

        } catch (error) {
            return yield* Effect.fail(new Error(`Failed to fetch content: ${String(error)}`));
        }
    });

/**
 * Simple HTML text extraction
 * This is a basic implementation - in production you'd want a more robust HTML parser
 */
function extractTextFromHtml(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities (basic)
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}