/**
 * This module defines all test harness specific errors.
 * These errors are used to indicate issues during test setup, configuration,
 * or execution that are specific to the test harness functionality.
 */

import { Data } from "effect";
import type { ServiceError } from "@/services/core/errors.js";

/**
 * Base error class for all test harness related errors
 */
export class TestHarnessError extends Data.TaggedError("TestHarnessError")<{
  message: string;
}> implements ServiceError {}

/**
 * Error thrown when test harness configuration is invalid
 */
export class TestHarnessConfigError extends Data.TaggedError("TestHarnessConfigError")<{
  message: string;
  configKey?: string;
}> implements ServiceError {}

/**
 * Error thrown when a mock service is not properly configured
 */
export class MockServiceError extends Data.TaggedError("MockServiceError")<{
  message: string;
  serviceName: string;
}> implements ServiceError {}

/**
 * Error thrown when a test assertion fails in the test harness
 */
export class TestHarnessAssertionError extends Data.TaggedError("TestHarnessAssertionError")<{
  message: string;
  expected: unknown;
  actual: unknown;
}> implements ServiceError {}

/**
 * Error thrown when test setup fails
 */
export class TestSetupError extends Data.TaggedError("TestSetupError")<{
  message: string;
  phase: "beforeEach" | "afterEach" | "beforeAll" | "afterAll";
}> implements ServiceError {}
