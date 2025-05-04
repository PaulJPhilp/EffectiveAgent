import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WikiOperation, wikiImpl } from "../wikipedia.js";

describe("Wikipedia Tool", () => {
    describe("SEARCH operation", () => {
        it("should search Wikipedia articles", () => Effect.gen(function* () {
            const result = yield* wikiImpl({
                operation: WikiOperation.SEARCH,
                query: "TypeScript programming language",
                limit: 3
            });

            expect(result.results.length).toBeLessThanOrEqual(3);
            expect(result.query).toBe("TypeScript programming language");
            expect(result.totalHits).toBeGreaterThan(0);

            const firstResult = result.results[0];
            expect(firstResult.title).toBeDefined();
            expect(firstResult.snippet).toBeDefined();
            expect(firstResult.url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
        }));

        it("should handle empty search results", () => Effect.gen(function* () {
            const result = yield* wikiImpl({
                operation: WikiOperation.SEARCH,
                query: "xyznonexistentarticlexyz123456789",
                limit: 1
            });

            expect(result.results).toHaveLength(0);
            expect(result.totalHits).toBe(0);
        }));
    });

    describe("SUMMARY operation", () => {
        it("should get article summary", () => Effect.gen(function* () {
            const result = yield* wikiImpl({
                operation: WikiOperation.SUMMARY,
                title: "TypeScript",
                sentences: 2
            });

            expect(result.results).toHaveLength(1);
            const summary = result.results[0];
            expect(summary.title).toBe("TypeScript");
            expect(summary.snippet).toBeDefined();
            expect(summary.snippet.length).toBeGreaterThan(0);
            expect(summary.url).toBe("https://en.wikipedia.org/wiki/TypeScript");
        }));

        it("should handle non-existent articles", () => Effect.gen(function* () {
            const result = yield* wikiImpl({
                operation: WikiOperation.SUMMARY,
                title: "NonExistentArticleXYZ123456789"
            });

            expect(result.results).toHaveLength(1);
            expect(result.results[0].snippet).toBe("No summary available");
        }));
    });

    describe("RANDOM operation", () => {
        it("should get random articles", () => Effect.gen(function* () {
            const result = yield* wikiImpl({
                operation: WikiOperation.RANDOM,
                count: 3
            });

            expect(result.results).toHaveLength(3);
            result.results.forEach(article => {
                expect(article.title).toBeDefined();
                expect(article.url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
            });
        }));

        it("should handle single random article request", () => Effect.gen(function* () {
            const result = yield* wikiImpl({
                operation: WikiOperation.RANDOM
            });

            expect(result.results).toHaveLength(1);
            expect(result.totalHits).toBe(1);
        }));
    });

    describe("Error handling", () => {
        it("should handle invalid input schema", () => Effect.gen(function* () {
            const result = yield* Effect.either(wikiImpl({
                operation: "INVALID" as any,
                query: "test"
            }));

            expect(Effect.isFailure(result)).toBe(true);
            if (Effect.isFailure(result)) {
                expect(result.cause).toBeInstanceOf(Error);
                expect(result.cause.message).toContain("Invalid input");
            }
        }));

        it("should handle missing required fields", () => Effect.gen(function* () {
            const result = yield* Effect.either(wikiImpl({
                operation: WikiOperation.SEARCH
            } as any));

            expect(Effect.isFailure(result)).toBe(true);
            if (Effect.isFailure(result)) {
                expect(result.cause).toBeInstanceOf(Error);
                expect(result.cause.message).toContain("Invalid input");
            }
        }));
    });
}); 