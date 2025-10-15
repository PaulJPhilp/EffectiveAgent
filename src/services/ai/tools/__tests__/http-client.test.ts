/**
 * @file Test file for HttpClient implementation
 * This is a temporary file to work out the correct HttpClient implementation pattern
 */

// Import HttpClient and related types
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientError from "@effect/platform/HttpClientError";
import type * as HttpClientResponse from "@effect/platform/HttpClientResponse";

import { layer as NodeHttpClientLayer } from "@effect/platform-node/NodeHttpClient"; // Correct live layer provider
// ParseError import removed: use Effect Schema error types if needed
import { Effect, Schema as S } from "effect";
import type { ParseError } from "effect/ParseResult";
import { describe, expect, it } from "vitest";

// Use the live HttpClient layer for integration testing
const liveHttpClientLayer = NodeHttpClientLayer;

// Define a schema for the expected to-do item structure
const TodoSchema = S.Struct({
  userId: S.Number,
  id: S.Number,
  title: S.String,
  completed: S.Boolean
});
type Todo = S.Schema.Type<typeof TodoSchema>;

// Test the HttpClient implementation
describe("Test HttpClient", () => {
  it("should return data for a successful request", () =>
    Effect.gen(function* () {
      const client = yield* HttpClient;
      const response: HttpClientResponse.HttpClientResponse = yield* client.get("https://jsonplaceholder.typicode.com/todos/1");

      // Create an Effect that gets JSON and then decodes it
      const getTypedDataEffect: Effect.Effect<Todo, HttpClientError.ResponseError | ParseError, never> = Effect.flatMap(
        response.json, // Treat as a property that IS an Effect<unknown, ResponseError, never>
        (unknownData: unknown) => S.decodeUnknown(TodoSchema)(unknownData) // This is Effect<Todo, ParseError, never>
      );

      // Yield the composed effect
      const data = (yield* getTypedDataEffect) as Todo;

      // Perform assertions directly (data is now typed)
      expect(data.id).toEqual(1);
      expect(data.title).toBeDefined();
    }).pipe(Effect.provide(liveHttpClientLayer))
  );

  it("should handle errors for failed requests", () =>
    Effect.gen(function* () {
      const client = yield* HttpClient;
      // This should fail with a network error
      const effect = client.get("https://non-existent-domain-for-testing-cascade.com/somepath");

      // Use Effect.match to handle success/failure of the HTTP call
      return yield* Effect.match(effect, {
        onFailure: (error) => { // error here should be HttpClientError.RequestError
          expect(error).toBeInstanceOf(HttpClientError.RequestError);
          expect(error.request.url).toBe("https://non-existent-domain-for-testing-cascade.com/somepath");
        },
        onSuccess: (_response) => { // Should not happen
          throw new Error("Request unexpectedly succeeded");
        }
      });
    }).pipe(Effect.provide(liveHttpClientLayer))
  );
});
