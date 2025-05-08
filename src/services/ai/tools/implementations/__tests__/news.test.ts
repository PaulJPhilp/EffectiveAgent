import { Effect, Either } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewsCategory, NewsOperation, NewsSortBy, newsImpl } from "../news.js";

describe("News Tool", () => {
    const mockApiKey = "test-api-key";
    const mockArticle = {
        title: "Test Article",
        description: "Test Description",
        content: "Test Content",
        url: "https://example.com/article",
        urlToImage: "https://example.com/image.jpg",
        publishedAt: "2024-03-20T12:00:00Z",
        source: {
            id: "test-source",
            name: "Test Source"
        }
    };

    beforeEach(() => {
        process.env['NEWS_API_KEY'] = mockApiKey;
        global.fetch = vi.fn() as unknown as typeof fetch;
    });

    afterEach(() => {
        process.env['NEWS_API_KEY'] = undefined;
        vi.restoreAllMocks();
    });

    describe("SEARCH operation", () => {
        it("should search news articles", () => Effect.gen(function* () {
            const mockResponse = {
                status: "ok",
                totalResults: 1,
                articles: [mockArticle]
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = yield* newsImpl({
                operation: NewsOperation.SEARCH,
                query: "test query",
                sortBy: NewsSortBy.RELEVANCY,
                limit: 1
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/v2/everything?q=test+query")
            );
            expect(result.articles).toHaveLength(1);
            expect(result.totalResults).toBe(1);
            expect(result.query).toBe("test query");

            const article = result.articles[0];
            expect(article.title).toBe(mockArticle.title);
            expect(article.url).toBe(mockArticle.url);
            expect(article.source.name).toBe(mockArticle.source.name);
        }));

        it("should handle empty search results", () => Effect.gen(function* () {
            const mockResponse = {
                status: "ok",
                totalResults: 0,
                articles: []
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = yield* newsImpl({
                operation: NewsOperation.SEARCH,
                query: "nonexistent"
            });

            expect(result.articles).toHaveLength(0);
            expect(result.totalResults).toBe(0);
        }));
    });

    describe("TOP_HEADLINES operation", () => {
        it("should fetch top headlines", () => Effect.gen(function* () {
            const mockResponse = {
                status: "ok",
                totalResults: 1,
                articles: [mockArticle]
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = yield* newsImpl({
                operation: NewsOperation.TOP_HEADLINES,
                country: "us",
                limit: 1
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/v2/top-headlines?country=us")
            );
            expect(result.articles).toHaveLength(1);
            expect(result.totalResults).toBe(1);
        }));
    });

    describe("BY_CATEGORY operation", () => {
        it("should fetch news by category", () => Effect.gen(function* () {
            const mockResponse = {
                status: "ok",
                totalResults: 1,
                articles: [mockArticle]
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = yield* newsImpl({
                operation: NewsOperation.BY_CATEGORY,
                category: NewsCategory.TECHNOLOGY,
                country: "us",
                limit: 1
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/v2/top-headlines?category=technology")
            );
            expect(result.articles).toHaveLength(1);
            expect(result.totalResults).toBe(1);
            expect(result.category).toBe(NewsCategory.TECHNOLOGY);
        }));
    });

    describe("Error handling", () => {
        it("should handle missing API key", () => Effect.gen(function* () {
            process.env['NEWS_API_KEY'] = undefined;

            const result = yield* Effect.either(newsImpl({
                operation: NewsOperation.SEARCH,
                query: "test"
            }));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("NEWS_API_KEY environment variable is not set");
            }
        }));

        it("should handle API errors", () => Effect.gen(function* () {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                statusText: "Bad Request"
            });

            const result = yield* Effect.either(newsImpl({
                operation: NewsOperation.SEARCH,
                query: "test"
            }));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("News API error");
            }
        }));

        it("should handle invalid input schema", () => Effect.gen(function* () {
            const result = yield* Effect.either(newsImpl({
                operation: "INVALID" as any,
                query: "test"
            }));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("Invalid input");
            }
        }));

        it("should handle missing required fields", () => Effect.gen(function* () {
            const result = yield* Effect.either(newsImpl({
                operation: NewsOperation.SEARCH
            } as any));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("Invalid input");
            }
        }));
    });
});