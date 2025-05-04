/**
 * @file Wikipedia tool implementation
 * @module services/tools/implementations/wikipedia
 */

import { Effect, Schema as S } from "effect";

// --- Input Schema ---

export const WikiOperation = {
    SEARCH: "SEARCH",
    SUMMARY: "SUMMARY",
    RANDOM: "RANDOM"
} as const;

export const WikiInputSchema = S.Union(
    // SEARCH operation
    S.Struct({
        operation: S.Literal(WikiOperation.SEARCH),
        query: S.String,
        limit: S.optional(S.Number, { default: 5 })
    }),
    // SUMMARY operation
    S.Struct({
        operation: S.Literal(WikiOperation.SUMMARY),
        title: S.String,
        sentences: S.optional(S.Number, { default: 3 })
    }),
    // RANDOM operation
    S.Struct({
        operation: S.Literal(WikiOperation.RANDOM),
        count: S.optional(S.Number, { default: 1 })
    })
);

export type WikiInput = S.Schema.Type<typeof WikiInputSchema>;

// --- Output Schema ---

export const WikiSearchResultSchema = S.Struct({
    title: S.String,
    snippet: S.String,
    url: S.String
});

export const WikiOutputSchema = S.Struct({
    results: S.Array(WikiSearchResultSchema),
    query: S.optional(S.String),
    totalHits: S.optional(S.Number)
});

export type WikiOutput = S.Schema.Type<typeof WikiOutputSchema>;

// --- Helper Functions ---

function buildWikiApiUrl(params: Record<string, string>): string {
    const baseUrl = "https://en.wikipedia.org/w/api.php";
    const defaultParams = {
        format: "json",
        action: "query",
        origin: "*"
    };
    const searchParams = new URLSearchParams({ ...defaultParams, ...params });
    return `${baseUrl}?${searchParams.toString()}`;
}

async function fetchWikiApi(params: Record<string, string>): Promise<unknown> {
    const url = buildWikiApiUrl(params);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.statusText}`);
    }
    return response.json();
}

// --- Implementation ---

export const wikiImpl = (input: unknown): Effect.Effect<WikiOutput, Error> =>
    Effect.gen(function* () {
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(WikiInputSchema)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`))
        );

        switch (data.operation) {
            case WikiOperation.SEARCH: {
                const params = {
                    list: "search",
                    srsearch: data.query,
                    srlimit: String(data.limit),
                    srprop: "snippet",
                };

                const response = yield* Effect.tryPromise({
                    try: () => fetchWikiApi(params),
                    catch: error => new Error("Failed to fetch search results", { cause: error })
                });

                const results = ((response as any).query?.search || []).map((item: any) => ({
                    title: item.title,
                    snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""), // Remove HTML tags
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
                }));

                const result = {
                    results,
                    query: data.query,
                    totalHits: (response as any).query?.searchinfo?.totalhits
                };

                return yield* Effect.succeed(result);
            }

            case WikiOperation.SUMMARY: {
                const params = {
                    prop: "extracts",
                    exintro: "true",
                    titles: data.title,
                    exsentences: String(data.sentences),
                    explaintext: "true"
                };

                const response = yield* Effect.tryPromise({
                    try: () => fetchWikiApi(params),
                    catch: error => new Error("Failed to fetch article summary", { cause: error })
                });

                const page = Object.values((response as any).query?.pages || {})[0] as any;
                const result = {
                    results: [{
                        title: page.title,
                        snippet: page.extract || "No summary available",
                        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
                    }],
                    query: data.title
                };

                return yield* Effect.succeed(result);
            }

            case WikiOperation.RANDOM: {
                const params = {
                    list: "random",
                    rnlimit: String(data.count),
                    rnnamespace: "0" // Main namespace only
                };

                const response = yield* Effect.tryPromise({
                    try: () => fetchWikiApi(params),
                    catch: error => new Error("Failed to fetch random articles", { cause: error })
                });

                const results = ((response as any).query?.random || []).map((item: any) => ({
                    title: item.title,
                    snippet: "Random article",
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
                }));

                const result = {
                    results,
                    totalHits: results.length
                };

                return yield* Effect.succeed(result);
            }

            default: {
                const operation = (data as { operation: string }).operation;
                return yield* Effect.fail(new Error(`Unsupported operation: ${operation}`));
            }
        }
    }); 