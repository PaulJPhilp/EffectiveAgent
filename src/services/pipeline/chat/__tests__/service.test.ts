/**
 * @file ChatHistoryService Agent Tests
 * @module services/pipeline/chat/tests
 */

import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";

import { runPipelineTest } from "@/services/core/test-utils/index.js";
import { ChatHistory, ChatMessage } from "@/services/pipeline/chat/api.js";
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
    it("should return null for non-existent history", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;

        // Act
        const result = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(result).toBeNull();

        // Check that agent state was updated
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(0);
        expect(state.activityHistory.length).toBe(1);
        expect(state.activityHistory[0]?.action).toBe("LOAD");
        expect(state.activityHistory[0]?.success).toBe(true);
      }));
    });

    it("should fail with invalid history ID", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidId = "";

        // Act & Assert
        const result = yield* Effect.either(service.loadHistory(invalidId));
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left.name).toBe("ChatHistoryError");
          expect(result.left.description).toContain("Invalid history ID");
        }

        // Check that agent state shows failed activity
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(1);
        expect(state.activityHistory[0]?.action).toBe("LOAD");
        expect(state.activityHistory[0]?.success).toBe(false);
      }));
    });

    it("should successfully load existing history", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        yield* service.saveHistory(validHistoryId, validHistory);

        // Act
        const result = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(result).toEqual(validHistory);

        // Check that agent state was updated correctly
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(1);
        expect(state.activeHistories).toContain(validHistoryId);
        expect(state.activityHistory.length).toBe(2); // Save + Load

        const loadActivity = state.activityHistory[1]!;
        expect(loadActivity.action).toBe("LOAD");
        expect(loadActivity.success).toBe(true);
        expect(loadActivity.historyId).toBe(validHistoryId);
      }));
    });
  });

  describe("saveHistory", () => {
    it("should successfully save valid history", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;

        // Act
        yield* service.saveHistory(validHistoryId, validHistory);
        const saved = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(saved).toEqual(validHistory);

        // Check that agent state was updated
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(1);
        expect(state.activeHistories).toContain(validHistoryId);
        expect(state.activityHistory.length).toBe(2); // Save + Load

        const saveActivity = state.activityHistory[0]!;
        expect(saveActivity.action).toBe("SAVE");
        expect(saveActivity.success).toBe(true);
        expect(saveActivity.messageCount).toBe(1);
      }));
    });

    it("should fail with invalid history ID", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidId = "";

        // Act & Assert
        const result = yield* Effect.either(
          service.saveHistory(invalidId, validHistory)
        );
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left.name).toBe("ChatHistoryError");
          expect(result.left.description).toContain("Invalid history ID");
        }

        // Check that agent state shows failed activity
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(1);
        expect(state.activityHistory[0]?.action).toBe("SAVE");
        expect(state.activityHistory[0]?.success).toBe(false);
      }));
    });

    it("should fail with invalid history format", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const invalidHistory = { messages: null } as unknown as ChatHistory;

        // Act & Assert
        const result = yield* Effect.either(
          service.saveHistory(validHistoryId, invalidHistory)
        );
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left.name).toBe("ChatHistoryError");
          expect(result.left.description).toContain("missing or invalid messages array");
        }

        // Check that agent state shows failed activity
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(1);
        expect(state.activityHistory[0]?.action).toBe("SAVE");
        expect(state.activityHistory[0]?.success).toBe(false);
      }));
    });

    it("should fail with invalid message role", async () => {
      await runPipelineTest(Effect.gen(function* () {
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
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left.name).toBe("ChatHistoryError");
          expect(result.left.description).toContain("invalid role: invalid");
        }
      }));
    });

    it("should fail with invalid message content", async () => {
      await runPipelineTest(Effect.gen(function* () {
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
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left.name).toBe("ChatHistoryError");
          expect(result.left.description).toContain("invalid message format");
        }
      }));
    });

    it("should update existing history", async () => {
      await runPipelineTest(Effect.gen(function* () {
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

        // Check that agent state reflects the update
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(1); // Still only 1 history, but updated
        expect(state.activityHistory.length).toBe(3); // Save + Save + Load

        const updateActivity = state.activityHistory[1]!;
        expect(updateActivity.action).toBe("SAVE");
        expect(updateActivity.success).toBe(true);
        expect(updateActivity.messageCount).toBe(2); // Updated with 2 messages
      }));
    });
  });

  describe("loadAndAppendMessage", () => {
    it("should append message to new conversation", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const userMessage = "Hello there!";

        // Act
        const result = yield* service.loadAndAppendMessage(undefined, userMessage);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]?.role).toBe("user");
        expect(result[0]?.content).toBe(userMessage);

        // Check that agent state was updated
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(1);
        expect(state.activityHistory[0]?.action).toBe("APPEND_MESSAGE");
        expect(state.activityHistory[0]?.success).toBe(true);
      }));
    });

    it("should append message to existing conversation", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const userMessage = "How are you?";
        yield* service.saveHistory(validHistoryId, validHistory);

        // Act
        const result = yield* service.loadAndAppendMessage(validHistoryId, userMessage);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(validMessage);
        expect(result[1]?.role).toBe("user");
        expect(result[1]?.content).toBe(userMessage);

        // Check that agent state was updated
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(2); // Save + Append

        const appendActivity = state.activityHistory[1]!;
        expect(appendActivity.action).toBe("APPEND_MESSAGE");
        expect(appendActivity.success).toBe(true);
        expect(appendActivity.messageCount).toBe(2);
      }));
    });
  });

  describe("appendAndSaveResponse", () => {
    it("should handle missing historyId gracefully", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const messages = [validMessage];
        const response = "I'm doing well, thank you!";

        // Act
        yield* service.appendAndSaveResponse(undefined, messages, response);

        // Assert - no error should occur, operation should be a no-op
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(0);
      }));
    });

    it("should append response and save to history", async () => {
      await runPipelineTest(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const messages = [validMessage];
        const response = "I'm doing well, thank you!";

        // Act
        yield* service.appendAndSaveResponse(validHistoryId, messages, response);
        const savedHistory = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(savedHistory?.messages).toHaveLength(2);
        expect(savedHistory?.messages[0]).toEqual(validMessage);
        expect(savedHistory?.messages[1]?.role).toBe("assistant");
        expect(savedHistory?.messages[1]?.content).toBe(response);

        // Check that agent state was updated
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(1);
        expect(state.activityHistory.length).toBe(2); // Append + Load

        const appendActivity = state.activityHistory[0]!;
        expect(appendActivity.action).toBe("APPEND_RESPONSE");
        expect(appendActivity.success).toBe(true);
        expect(appendActivity.messageCount).toBe(2);
      }));
    });
  });
});
