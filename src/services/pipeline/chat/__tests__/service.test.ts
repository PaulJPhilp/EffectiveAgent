// src/services/pipeline/chat/service.test.ts
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { ChatHistory, ChatHistoryError, ChatMessage } from "@/services/pipeline/chat/api.js";
import { ChatHistoryService } from "@/services/pipeline/chat/service.js";

describe("ChatHistoryService", () => {
  // Test data
  const validHistoryId = "test-history-id";
  const validMessage: ChatMessage = {
    role: "user",
    content: "test message",
  };
  const validHistory: ChatHistory = {
    messages: [validMessage],
  };

  describe("loadHistory", () => {
    it("should return null for non-existent history", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;

        // Act
        const result = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(result).toBeNull();
      }));

    it("should fail with invalid history ID", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidId = "";

        // Act & Assert
        const result = yield* Effect.either(service.loadHistory(invalidId));
        expect(result._tag).toBe("Left");
        expect(result).toEqual(
          Effect.fail(ChatHistoryError.invalidHistoryId(invalidId))
        );
      }));

    it("should successfully load existing history", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        yield* service.saveHistory(validHistoryId, validHistory);

        // Act
        const result = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(result).toEqual(validHistory);
      }));
  });

  describe("saveHistory", () => {
    it("should successfully save valid history", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;

        // Act
        yield* service.saveHistory(validHistoryId, validHistory);
        const saved = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(saved).toEqual(validHistory);
      }));

    it("should fail with invalid history ID", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidId = "";

        // Act & Assert
        const result = yield* Effect.either(
          service.saveHistory(invalidId, validHistory)
        );
        expect(result._tag).toBe("Left");
        expect(result).toEqual(
          Effect.fail(ChatHistoryError.invalidHistoryId(invalidId))
        );
      }));

    it("should fail with invalid history format", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidHistory = { messages: null } as unknown as ChatHistory;

        // Act & Assert
        const result = yield* Effect.either(
          service.saveHistory(validHistoryId, invalidHistory)
        );
        expect(result._tag).toBe("Left");
        expect(result).toEqual(
          Effect.fail(ChatHistoryError.invalidHistory("missing or invalid messages array"))
        );
      }));

    it("should fail with invalid message role", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidMessage = {
          role: "invalid" as "user",
          content: "test",
        };
        const invalidHistory = {
          messages: [invalidMessage],
        } as unknown as ChatHistory;

        // Act & Assert
        const result = yield* Effect.either(
          service.saveHistory(validHistoryId, invalidHistory)
        );
        expect(result._tag).toBe("Left");
        expect(result).toEqual(
          Effect.fail(ChatHistoryError.invalidHistory("invalid role: invalid"))
        );
      }));

    it("should fail with invalid message content", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidMessage = {
          role: "user",
          content: null,
        };
        const invalidHistory = {
          messages: [invalidMessage],
        } as unknown as ChatHistory;

        // Act & Assert
        const result = yield* Effect.either(
          service.saveHistory(validHistoryId, invalidHistory)
        );
        expect(result._tag).toBe("Left");
        expect(result).toEqual(
          Effect.fail(ChatHistoryError.invalidHistory("invalid message format"))
        );
      }));

    it("should update existing history", () =>
      Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const updatedHistory: ChatHistory = {
          messages: [
            validMessage,
            { role: "assistant", content: "response" },
          ],
        };

        // Act
        yield* service.saveHistory(validHistoryId, validHistory);
        yield* service.saveHistory(validHistoryId, updatedHistory);
        const result = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(result).toEqual(updatedHistory);
      }));
  });
});
