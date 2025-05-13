import { Context, Effect, Either } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  InputValidationError,
  OutputValidationError,
} from "../pipeline/errors.js";
// Pipeline components
import { TextCompletionPipeline } from "./text-completion.js";

import { ChatHistoryService } from "@/services/pipeline/chat/service.js";
// Service interfaces
import { ExecutiveService } from "../shared/service.js";

// Test harness utilities
import { createTypedMock } from "@/services/core/test-harness/utils/typed-mocks.js";

// Re-use Schemas defined in the actual TextCompletionPipeline file
import {
  TextCompletionInput,
  TextCompletionOutput,
} from "@/services/pipeline/producers/text/schema.js";

// Auth context
import { Auth } from "@/services/core/auth/context.js";
import { ChatHistory } from "../chat/api.js";

describe("TextCompletionPipeline", () => {
  it("should run successfully with valid input and mock responses", () =>
    Effect.gen(function* () {
      // --- Arrange ---
      const mockInput: TextCompletionInput = { prompt: "test prompt" };
      const mockOutput: TextCompletionOutput = { text: "Test completion", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } };
      const mockHistory = { messages: [] };

      // Mock dependencies
      const mockExecService = createTypedMock<ExecutiveService>({
        execute: () => Effect.succeed(mockOutput as any)
      });
      const mockHistoryService = createTypedMock<ChatHistoryService>({
        loadHistory: vi.fn().mockImplementation(() => Effect.succeed(mockHistory)),
        saveHistory: vi.fn().mockImplementation(() => Effect.succeed(void 0)),
      });
      const mockAuthContext = createTypedMock<Auth>({
        userId: "test-user",
        tenantId: "test-tenant",
      });

      // Instantiate the *actual* pipeline class
      const pipeline = new TextCompletionPipeline();

      // Create the context with mocked services
      const testContext = Context.empty()
        .pipe(Context.add(ExecutiveService, mockExecService))
        .pipe(Context.add(ChatHistoryService, mockHistoryService))
        .pipe(Context.add(Auth, mockAuthContext));

      // --- Act ---
      const result = yield* pipeline.run(mockInput).pipe(Effect.provide(testContext));

      // --- Assert ---
      expect(result).toEqual(mockOutput);
      expect(mockHistoryService.loadHistory).toHaveBeenCalledWith(mockInput.historyId);
      expect(mockHistoryService.saveHistory).toHaveBeenCalledWith(
        mockInput.historyId,
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: "user", content: mockInput.prompt },
            { role: "assistant", content: mockOutput.text }
          ])
        })
      );
    }));

  it("should fail with InputValidationError for invalid input", () =>
    Effect.gen(function* () {
      // --- Arrange ---
      const invalidInput = { wrongField: 123 }; // Invalid input

      // Mocks (can be simple if not used directly in this path)
      const mockExecService = createTypedMock<ExecutiveService>({});
      const mockHistoryService = createTypedMock<ChatHistoryService>({});
      const mockAuthContext = createTypedMock<Auth>({
        userId: "test-user",
        tenantId: "test-tenant",
      });

      // Instantiate the pipeline
      const pipeline = new TextCompletionPipeline();

      // Create context
      const testContext = Context.empty()
        .pipe(Context.add(ExecutiveService, mockExecService))
        .pipe(Context.add(ChatHistoryService, mockHistoryService))
        .pipe(Context.add(Auth, mockAuthContext));

      // --- Act ---
      // Run within the provided context
      const result = yield* pipeline.run(invalidInput as any).pipe(
        Effect.provide(testContext),
        Effect.either, // Capture error
      );

      // --- Assert ---
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(InputValidationError);
      }
    }));

  it("should fail with OutputValidationError for invalid executive response", () =>
    Effect.gen(function* () {
      // --- Arrange ---
      const mockInput: TextCompletionInput = { prompt: "valid prompt" };
      const invalidOutput = { wrongField: "some string" }; // Invalid output
      const mockHistory = { messages: [] };

      // Mock execute to return invalid output
      const mockExecService = createTypedMock<ExecutiveService>({
        execute: () => Effect.succeed(invalidOutput as any),
      });
      const mockHistoryService = createTypedMock<ChatHistoryService>({
        loadHistory: () => Effect.succeed(mockHistory),
        saveHistory: () => Effect.succeed(void 0),
      });
      const mockAuthContext = createTypedMock<Auth>({
        userId: "test-user",
        tenantId: "test-tenant",
      });

      // Instantiate pipeline
      const pipeline = new TextCompletionPipeline();

      // Create context
      const testContext = Context.empty()
        .pipe(Context.add(ExecutiveService, mockExecService))
        .pipe(Context.add(ChatHistoryService, mockHistoryService))
        .pipe(Context.add(Auth, mockAuthContext));

      // --- Act ---
      const result = yield* pipeline.run(mockInput).pipe(
        Effect.provide(testContext),
        Effect.either, // Capture error
      );

      // --- Assert ---
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(OutputValidationError);
      }
    }));

  it("should handle chat history when historyId is provided", () =>
    Effect.gen(function* () {
      // --- Arrange ---
      const mockInput: TextCompletionInput = {
        prompt: "test prompt",
        historyId: "test-history-id"
      };
      const mockOutput: TextCompletionOutput = {
        text: "Test completion",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
      };
      const mockHistory: ChatHistory = {
        messages: [
          { role: "user", content: "previous message" },
          { role: "assistant", content: "previous response" }
        ]
      };

      // Mock dependencies
      const mockExecService = createTypedMock<ExecutiveService>({
        execute: () => Effect.succeed(mockOutput as any),
      });
      const mockHistoryService = createTypedMock<ChatHistoryService>({
        loadHistory: () => Effect.succeed(mockHistory),
        saveHistory: () => Effect.succeed(void 0),
      });
      const mockAuthContext = createTypedMock<Auth>({
        userId: "test-user",
        tenantId: "test-tenant",
      });

      // Instantiate pipeline
      const pipeline = new TextCompletionPipeline();

      // Create context
      const testContext = Context.empty()
        .pipe(Context.add(ExecutiveService, mockExecService))
        .pipe(Context.add(ChatHistoryService, mockHistoryService))
        .pipe(Context.add(Auth, mockAuthContext));

      // --- Act ---
      const result = yield* pipeline.run(mockInput).pipe(Effect.provide(testContext));

      // --- Assert ---
      expect(result).toEqual(mockOutput);

      // Verify chat history was loaded
      expect(mockHistoryService.loadHistory).toHaveBeenCalledTimes(1);
      expect(mockHistoryService.loadHistory).toHaveBeenCalledWith("test-history-id");

      // Verify chat history was saved with new message
      expect(mockHistoryService.saveHistory).toHaveBeenCalledTimes(1);
      expect(mockHistoryService.saveHistory).toHaveBeenCalledWith(
        "test-history-id",
        expect.objectContaining({
          messages: expect.arrayContaining([
            ...mockHistory.messages,
            { role: "user", content: mockInput.prompt },
            { role: "assistant", content: mockOutput.text }
          ])
        })
      );
    }));
});
