/**
 * @file Test file for HttpClient implementation
 * This is a temporary file to work out the correct HttpClient implementation pattern
 */

import { Effect, Layer, pipe, Context } from "effect";
import { describe, it, expect } from "vitest";

// Import HttpClient and related types
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpBody from "@effect/platform/HttpBody";
import { HttpClientError } from "@effect/platform/HttpClientError";

// Define the TypeId symbol for our implementation
const HttpClientTypeId = Symbol.for("@effect/platform/HttpClient");

// Define a simplified test HttpClient
const makeTestHttpClient = (): HttpClient => {
  // Define test data
  const todoData = { userId: 1, id: 1, title: "Test Todo", completed: false };
  
  // Create a response factory for successful responses
  const makeSuccessResponse = <T>(data: T) => {
    const jsonString = JSON.stringify(data);
    const textBody = HttpBody.text(jsonString);
    const request = HttpClientRequest.get("https://test.com/todos/1");
    
    // Create a complete response that satisfies the HttpClientResponse interface
    const response = {
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: textBody,
      request,
      cookies: {},
      // Add required methods
      json: () => Effect.succeed(data),
      text: () => Effect.succeed(jsonString),
      formData: () => Effect.succeed(new FormData()),
      arrayBuffer: () => Effect.succeed(new ArrayBuffer(0)),
      // Add TypeId property
      [HttpClientTypeId]: HttpClientTypeId
    } as unknown as HttpClientResponse.HttpClientResponse;
    
    return response;
  };
  
  // Create an error response
  const makeErrorResponse = (message: string, status = 404) => {
    // Create a request to use in the error
    const request = HttpClientRequest.get("https://test.com/todos/404");
    
    // Create an error that matches the HttpClientError interface
    const error = Object.create(Error.prototype);
    Object.defineProperties(error, {
      message: { value: message, writable: false },
      _tag: { value: "HttpClientError", writable: false },
      request: { value: request, writable: false },
      status: { value: status, writable: false },
      [HttpClientTypeId]: { value: HttpClientTypeId, writable: false }
    });
    
    return error as unknown as HttpClientError;
  };
  
  // Main execute implementation
  const execute = (request: HttpClientRequest.HttpClientRequest) => {
    // Handle our test URL pattern
    if (request.url.toString().includes("test.com/todos")) {
      const id = parseInt(request.url.toString().split("/").pop() ?? "0");
      
      if (id === 1) {
        // Return successful response for ID 1 with explicit typing
        return Effect.succeed(makeSuccessResponse(todoData)) as Effect.Effect<HttpClientResponse.HttpClientResponse, never, never>;
      } else {
        // Return a 404 for any other ID with explicit typing
        return Effect.fail(makeErrorResponse(`Todo with ID ${id} not found`, 404)) as Effect.Effect<never, HttpClientError, never>;
      }
    }
    
    // Fail for any other URL with explicit typing
    return Effect.fail(makeErrorResponse(`Unexpected URL: ${request.url}`)) as Effect.Effect<never, HttpClientError, never>;
  };
  
  // Create HTTP method implementations that delegate to execute
  const get = (url: string | URL, options = {}) => {
    const request = HttpClientRequest.get(url.toString(), options);
    return execute(request);
  };
  
  const post = (url: string | URL, options = {}) => {
    const request = HttpClientRequest.post(url.toString(), options);
    return execute(request);
  };
  
  const put = (url: string | URL, options = {}) => {
    const request = HttpClientRequest.put(url.toString(), options);
    return execute(request);
  };
  
  const del = (url: string | URL, options = {}) => {
    const request = HttpClientRequest.del(url.toString(), options);
    return execute(request);
  };
  
  const patch = (url: string | URL, options = {}) => {
    const request = HttpClientRequest.patch(url.toString(), options);
    return execute(request);
  };
  
  const head = (url: string | URL, options = {}) => {
    const request = HttpClientRequest.head(url.toString(), options);
    return execute(request);
  };
  
  const options = (url: string | URL, opts = {}) => {
    const request = HttpClientRequest.options(url.toString(), opts);
    return execute(request);
  };
  
  // Return the HttpClient implementation with the TypeId property
  return {
    execute,
    get,
    post,
    put,
    delete: del, // Use 'del' variable since 'delete' is a reserved keyword
    patch,
    head,
    options,
    // Add required properties for the HttpClient interface
    [HttpClientTypeId]: HttpClientTypeId,
    // Add pipe method required by Pipeable interface
    pipe() {
      return this;
    },
    // Add toJSON method required by Inspectable interface
    toJSON() {
      return { _id: "HttpClient" };
    }
  } as unknown as HttpClient;
};

// Create a Layer with our test HttpClient
const testHttpClientLayer = Layer.succeed(HttpClient, makeTestHttpClient());

// Test the HttpClient implementation
describe("Test HttpClient", () => {
  it("should return data for a successful request", async () => {
    const program = Effect.gen(function* () {
      const client = yield* HttpClient;
      const response = yield* client.get("https://test.com/todos/1");
      // Yield the Effect returned by json() to get the actual data
      const data = yield* response.json() as Effect.Effect<any, never, never>;
      return data;
    });
    
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testHttpClientLayer))
    );
    
    expect(result).toEqual({ userId: 1, id: 1, title: "Test Todo", completed: false });
  });
  
  it("should handle errors for failed requests", async () => {
    const program = Effect.gen(function* () {
      const client = yield* HttpClient;
      // This should fail with an error
      return yield* client.get("https://test.com/todos/999");
    });
    
    try {
      await Effect.runPromise(
        program.pipe(Effect.provide(testHttpClientLayer))
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as Error).message).toContain("Todo with ID 999 not found");
    }
  });
});
