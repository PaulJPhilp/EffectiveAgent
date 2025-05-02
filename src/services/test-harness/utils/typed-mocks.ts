/**
 * Utilities for creating type-safe mocks for testing.
 * 
 * These utilities help ensure that mock objects conform to their expected
 * interfaces while allowing for flexible customization.
 */

import { Effect, Option, Chunk } from "effect";
import type { AiResponse } from "@effect/ai/AiResponse";
import { Model } from "@effect/ai/AiRole";

/**
 * Creates a strongly typed mock object that conforms to the specified interface.
 * 
 * @template T The interface that the mock should implement
 * @param defaultImpl Default implementation of the interface (can be partial)
 * @param overrides Optional overrides for specific properties
 * @returns A fully typed object implementing the interface T
 */
export const createTypedMock = <T extends object>(
  defaultImpl: Partial<T>,
  overrides?: Partial<T>
): T => {
  return { ...defaultImpl, ...overrides } as T;
};

/**
 * Creates a mock Effect that succeeds with the provided value.
 * 
 * @template A The success type
 * @template E The error type (defaults to never)
 * @template R The environment type (defaults to never)
 * @param value The value to succeed with
 * @returns An Effect that succeeds with the provided value
 */
export const mockSuccess = <A, E = never, R = never>(
  value: A
): Effect.Effect<A, E, R> => {
  return Effect.succeed(value);
};

/**
 * Creates a mock Effect that fails with the provided error.
 * 
 * @template E The error type
 * @template A The success type (defaults to never)
 * @template R The environment type (defaults to never)
 * @param error The error to fail with
 * @returns An Effect that fails with the provided error
 */
export const mockFailure = <E, A = never, R = never>(
  error: E
): Effect.Effect<A, E, R> => {
  return Effect.fail(error);
};

/**
 * Creates a type-safe error instance.
 * 
 * @template T The error class type
 * @param ErrorClass The error class constructor
 * @param args The arguments to pass to the constructor
 * @returns An instance of the error class
 */
export const createServiceError = <
  T extends Error,
  Args extends any[]
>(
  ErrorClass: new (...args: Args) => T,
  ...args: Args
): T => {
  return new ErrorClass(...args);
};

/**
 * Type guard to check if an object matches the expected structure.
 * 
 * @template T The expected type
 * @param value The value to check
 * @param properties Array of required property names
 * @returns Boolean indicating if the value matches the expected structure
 */
export const hasRequiredProperties = <T>(
  value: unknown,
  properties: Array<keyof T>
): value is T => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  
  return properties.every(prop => prop in value);
};

/**
 * Creates a mock object with the minimum required properties.
 * 
 * @template T The type to mock
 * @param properties The properties to include in the mock
 * @returns A mock object with the specified properties
 */
export const createMinimalMock = <T extends object>(
  properties: Partial<T>
): T => {
  return properties as T;
};

/**
 * Creates a mock AiResponse with proper type safety.
 * 
 * @param text The response text
 * @returns A mock AiResponse
 */
export const createMockAiResponse = (text: string): AiResponse => {
  let response: AiResponse;
  response = createTypedMock<AiResponse>({
    text,
    imageUrl: Option.none(),
    withToolCallsJson: () => mockSuccess(response),
    withToolCallsUnknown: () => response,
    concat: (that: AiResponse) => that,
    role: Model.make(),
    parts: Chunk.empty(),
    [Symbol.for("TypeId")]: "AiResponse"
  });
  return response;
};
