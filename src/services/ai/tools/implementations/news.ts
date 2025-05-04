/**
 * @file News aggregation tool implementation
 * @module services/tools/implementations/news
 */

import { Effect, Schema as S } from "effect";

// --- Input Schema ---

export const NewsOperation = {
    SEARCH: "SEARCH",
    TOP_HEADLINES: "TOP_HEADLINES",
    BY_CATEGORY: "BY_CATEGORY"
} as const;

export const NewsCategory = {
    BUSINESS: "business",
    TECHNOLOGY: "technology",
    SCIENCE: "science",
    HEALTH: "health",
    ENTERTAINMENT: "entertainment",
    SPORTS: "sports",
    POLITICS: "politics"
} as const;

export const NewsSortBy = {
    RELEVANCY: "relevancy",
    POPULARITY: "popularity",
    PUBLISHED_AT: "publishedAt"
} as const;

export const NewsInputSchema = S.Union(
    // SEARCH operation
    S.Struct({
        operation: S.Literal(NewsOperation.SEARCH),
        query: S.String,
        sortBy: S.optional(S.Enums(NewsSortBy), { default: NewsSortBy.PUBLISHED_AT }),
        limit: S.optional(S.Number, { default: 10 }),
        language: S.optional(S.String, { default: "en" })
    }),
    // TOP_HEADLINES operation
    S.Struct({
        operation: S.Literal(NewsOperation.TOP_HEADLINES),
        country: S.optional(S.String, { default: "us" }),
        limit: S.optional(S.Number, { default: 10 })
    }),
    // BY_CATEGORY operation
    S.Struct({
        operation: S.Literal(NewsOperation.BY_CATEGORY),
        category: S.Enums(NewsCategory),
        country: S.optional(S.String, { default: "us" }),
        limit: S.optional(S.Number, { default: 10 })
    })
);

export type NewsInput = S.Schema.Type<typeof NewsInputSchema>;

// --- Output Schema ---

export const NewsSourceSchema = S.Struct({
    id: S.optional(S.String),
    name: S.String,
    url: S.String
});

export const NewsArticleSchema = S.Struct({
    title: S.String,
    description: S.optional(S.String),
    content: S.optional(S.String),
    url: S.String,
    imageUrl: S.optional(S.String),
    publishedAt: S.String,
    source: NewsSourceSchema
});

export const NewsOutputSchema = S.Struct({
    articles: S.Array(NewsArticleSchema),
    totalResults: S.Number,
    query: S.optional(S.String),
    category: S.optional(S.String)
});

export type NewsOutput = S.Schema.Type<typeof NewsOutputSchema>;

// --- Helper Functions ---

function buildNewsApiUrl(endpoint: string, params: Record<string, string>): string {
    const baseUrl = "https://newsapi.org/v2";
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
        throw new Error("NEWS_API_KEY environment variable is not set");
    }

    const searchParams = new URLSearchParams({ ...params, apiKey });
    return `${baseUrl}${endpoint}?${searchParams.toString()}`;
}

async function fetchNewsApi(endpoint: string, params: Record<string, string>): Promise<unknown> {
    const url = buildNewsApiUrl(endpoint, params);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`News API error: ${response.statusText}`);
    }
    return response.json();
}

function mapArticle(article: any): S.Schema.Type<typeof NewsArticleSchema> {
    return {
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        imageUrl: article.urlToImage,
        publishedAt: article.publishedAt,
        source: {
            id: article.source?.id,
            name: article.source?.name || "Unknown",
            url: article.url
        }
    };
}

// --- Implementation ---

export const newsImpl = (input: unknown): Effect.Effect<NewsOutput, Error> =>
    Effect.gen(function* () {
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(NewsInputSchema)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`))
        );

        switch (data.operation) {
            case NewsOperation.SEARCH: {
                const params = {
                    q: data.query,
                    sortBy: data.sortBy,
                    pageSize: String(data.limit),
                    language: data.language
                };

                const response = yield* Effect.tryPromise({
                    try: () => fetchNewsApi("/everything", params),
                    catch: error => new Error("Failed to fetch news", { cause: error })
                });

                const articles = ((response as any).articles || []).map(mapArticle);
                const result = {
                    articles,
                    totalResults: (response as any).totalResults || articles.length,
                    query: data.query
                };

                return yield* Effect.succeed(result);
            }

            case NewsOperation.TOP_HEADLINES: {
                const params = {
                    country: data.country,
                    pageSize: String(data.limit)
                };

                const response = yield* Effect.tryPromise({
                    try: () => fetchNewsApi("/top-headlines", params),
                    catch: error => new Error("Failed to fetch top headlines", { cause: error })
                });

                const articles = ((response as any).articles || []).map(mapArticle);
                const result = {
                    articles,
                    totalResults: (response as any).totalResults || articles.length
                };

                return yield* Effect.succeed(result);
            }

            case NewsOperation.BY_CATEGORY: {
                const params = {
                    category: data.category,
                    country: data.country,
                    pageSize: String(data.limit)
                };

                const response = yield* Effect.tryPromise({
                    try: () => fetchNewsApi("/top-headlines", params),
                    catch: error => new Error("Failed to fetch category news", { cause: error })
                });

                const articles = ((response as any).articles || []).map(mapArticle);
                const result = {
                    articles,
                    totalResults: (response as any).totalResults || articles.length,
                    category: data.category
                };

                return yield* Effect.succeed(result);
            }

            default: {
                const operation = (data as { operation: string }).operation;
                return yield* Effect.fail(new Error(`Unsupported operation: ${operation}`));
            }
        }
    }); 