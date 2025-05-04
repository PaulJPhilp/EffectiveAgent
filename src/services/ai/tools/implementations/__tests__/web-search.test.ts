import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { WebSearchFilter, WebSearchOperation, webSearchImpl } from "../web-search.js";

describe("Web Search Tool", () => {
    describe("SEARCH operation", () => {
        it("should perform basic search", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.SEARCH,
                query: "test query"
            });
            const data = JSON.parse(result.result);
            expect(data.query).toBe("test query");
            expect(data.results).toHaveLength(10); // Default maxResults
            expect(data.results[0].filter).toBe(WebSearchFilter.RELEVANT); // Default filter
        }));

        it("should respect maxResults parameter", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.SEARCH,
                query: "test query",
                maxResults: 5
            });
            const data = JSON.parse(result.result);
            expect(data.results).toHaveLength(5);
        }));

        it("should apply filter", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.SEARCH,
                query: "test query",
                filter: WebSearchFilter.RECENT
            });
            const data = JSON.parse(result.result);
            expect(data.results[0].filter).toBe(WebSearchFilter.RECENT);
        }));
    });

    describe("NEWS operation", () => {
        it("should search news", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.NEWS,
                query: "test news"
            });
            const data = JSON.parse(result.result);
            expect(data.query).toBe("test news");
            expect(data.results).toHaveLength(10);
            expect(data.daysAgo).toBe(7); // Default daysAgo
        }));

        it("should respect daysAgo parameter", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.NEWS,
                query: "test news",
                daysAgo: 3
            });
            const data = JSON.parse(result.result);
            expect(data.daysAgo).toBe(3);
        }));

        it("should include article metadata", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.NEWS,
                query: "test news"
            });
            const data = JSON.parse(result.result);
            expect(data.results[0]).toHaveProperty("title");
            expect(data.results[0]).toHaveProperty("url");
            expect(data.results[0]).toHaveProperty("source");
            expect(data.results[0]).toHaveProperty("publishedAt");
            expect(data.results[0]).toHaveProperty("snippet");
        }));
    });

    describe("IMAGES operation", () => {
        it("should search images", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.IMAGES,
                query: "test images"
            });
            const data = JSON.parse(result.result);
            expect(data.query).toBe("test images");
            expect(data.results).toHaveLength(10);
        }));

        it("should include image metadata", () => Effect.gen(function* () {
            const result = yield* webSearchImpl({
                operation: WebSearchOperation.IMAGES,
                query: "test images"
            });
            const data = JSON.parse(result.result);
            expect(data.results[0]).toHaveProperty("title");
            expect(data.results[0]).toHaveProperty("url");
            expect(data.results[0]).toHaveProperty("thumbnailUrl");
            expect(data.results[0]).toHaveProperty("width");
            expect(data.results[0]).toHaveProperty("height");
            expect(data.results[0]).toHaveProperty("source");
        }));
    });

    describe("Error handling", () => {
        it("should handle invalid operation", () => Effect.gen(function* () {
            const result = yield* Effect.either(webSearchImpl({
                operation: "INVALID" as any,
                query: "test"
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));

        it("should handle invalid maxResults", () => Effect.gen(function* () {
            const result = yield* Effect.either(webSearchImpl({
                operation: WebSearchOperation.SEARCH,
                query: "test",
                maxResults: 51 // Above maximum
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));

        it("should handle invalid daysAgo", () => Effect.gen(function* () {
            const result = yield* Effect.either(webSearchImpl({
                operation: WebSearchOperation.NEWS,
                query: "test",
                daysAgo: 31 // Above maximum
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));
    });
}); 