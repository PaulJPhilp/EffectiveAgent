/**
 * @file ChatHistoryService Agent Tests
 * @description Tests for the ChatHistoryService, focusing on agent activity tracking,
 * conversation history management, and error handling.
 */

import { PolicyService } from "@/services/ai/policy/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ChatHistory, ChatMessage } from "@/services/pipeline/chat/schema.js";
import { ChatHistoryService } from "@/services/pipeline/chat/service.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("ChatHistoryService", () => {
  const testDir = join(process.cwd(), "test-policy-configs", "chat");
  const validPolicyConfig = join(testDir, "valid-policy.json");
  const modelsConfigPath = join(testDir, "models.json");
  const providersConfigPath = join(testDir, "providers.json");
  const masterConfigPath = join(testDir, "master-config.json");

  const validPolicyConfigData = {
    name: "Test Policy Config",
    version: "1.0.0",
    description: "Test policy configuration",
    policies: [
      {
        id: "default-allow",
        name: "Default Allow Rule",
        description: "Default rule to allow all operations",
        type: "allow",
        resource: "*",
        priority: 100,
        enabled: true,
        rateLimit: {
          limit: 100,
          window: 60
        }
      }
    ]
  };

  const validModelsConfig = {
    name: "Test Models Config",
    version: "1.0.0",
    description: "Test models configuration",
    models: [
      {
        id: "gpt-4",
        provider: "openai",
        capabilities: ["chat", "completion"],
        maxTokens: 8192,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      }
    ]
  };

  const validProvidersConfig = {
    name: "Test Providers Config",
    version: "1.0.0",
    description: "Test providers configuration",
    providers: [
      {
        id: "openai",
        name: "OpenAI",
        apiKeyEnvVar: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1",
        capabilities: ["chat", "completion"]
      }
    ]
  };

  const validMasterConfig = {
    name: "Test Master Config",
    version: "1.0.0",
    description: "Test master configuration",
    runtimeSettings: {
      fileSystemImplementation: "node" as const
    },
    logging: {
      level: "info" as const,
      filePath: "./logs/test.log",
      enableConsole: true
    },
    configPaths: {
      policy: validPolicyConfig,
      models: modelsConfigPath,
      providers: providersConfigPath
    }
  };

  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        // Create test directory and files
        yield* fs.makeDirectory(testDir, { recursive: true });
        yield* fs.writeFileString(validPolicyConfig, JSON.stringify(validPolicyConfigData, null, 2));
        yield* fs.writeFileString(modelsConfigPath, JSON.stringify(validModelsConfig, null, 2));
        yield* fs.writeFileString(providersConfigPath, JSON.stringify(validProvidersConfig, null, 2));
        yield* fs.writeFileString(masterConfigPath, JSON.stringify(validMasterConfig, null, 2));

        // Set up environment with test config paths
        process.env.MASTER_CONFIG_PATH = masterConfigPath;
        process.env.OPENAI_API_KEY = "test-key";
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });

  afterEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        // Clean up test files
        try {
          yield* fs.remove(validPolicyConfig);
          yield* fs.remove(modelsConfigPath);
          yield* fs.remove(providersConfigPath);
          yield* fs.remove(masterConfigPath);
          yield* fs.remove(testDir, { recursive: true });
        } catch (error) {
          // Ignore cleanup errors
        }

        // Reset environment
        process.env = { ...originalEnv };
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });

  // Helper function to provide common layers
  const withLayers = <T, E, R>(effect: Effect.Effect<T, E, R>) =>
    effect.pipe(
      Effect.provide(Layer.mergeAll(
        ChatHistoryService.Default,
        PolicyService.Default,
        ConfigurationService.Default,
        NodeFileSystem.layer
      ))
    ) as Effect.Effect<T, E, never>;

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
      await withLayers(Effect.gen(function* () {
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
      await withLayers(Effect.gen(function* () {
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
      await withLayers(Effect.gen(function* () {
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
      await withLayers(Effect.gen(function* () {
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
      await withLayers(Effect.gen(function* () {
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
      await withLayers(Effect.gen(function* () {
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
      await withLayers(Effect.gen(function* () {
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
      await withLayers(Effect.gen(function* () {
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

        // Check that agent state shows failed activity
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(1);
        expect(state.activityHistory[0]?.action).toBe("SAVE");
        expect(state.activityHistory[0]?.success).toBe(false);
      }));
    });

    it("should update existing history", async () => {
      await withLayers(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        yield* service.saveHistory(validHistoryId, validHistory);

        const updatedMessage: ChatMessage = {
          role: "assistant",
          content: "response message",
        };
        const updatedHistory: ChatHistory = {
          messages: [validMessage, updatedMessage],
        };

        // Act
        yield* service.saveHistory(validHistoryId, updatedHistory);
        const saved = yield* service.loadHistory(validHistoryId);

        // Assert
        expect(saved).toEqual(updatedHistory);
        expect(saved?.messages).toHaveLength(2);

        // Check that agent state was updated
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(1); // Still one history, just updated
        expect(state.activityHistory.length).toBe(3); // Save + Save + Load

        const updateActivity = state.activityHistory[1]!;
        expect(updateActivity.action).toBe("SAVE");
        expect(updateActivity.success).toBe(true);
        expect(updateActivity.messageCount).toBe(2);
      }));
    });
  });

  describe("loadAndAppendMessage", () => {
    it("should append message to new conversation", async () => {
      await withLayers(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const newConversationId = "new-conversation";
        const message = "Hello, new conversation!";

        // Act
        const result = yield* service.loadAndAppendMessage(
          newConversationId,
          message
        );

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]?.role).toBe("user");
        expect(result[0]?.content).toBe(message);

        // Check agent state
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(0); // loadAndAppendMessage doesn't save automatically
        expect(state.activityHistory.length).toBe(1);
        expect(state.activityHistory[0]?.action).toBe("APPEND_MESSAGE");
        expect(state.activityHistory[0]?.success).toBe(true);
      }));
    });

    it("should append message to existing conversation", async () => {
      await withLayers(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        yield* service.saveHistory(validHistoryId, validHistory);
        const newMessage = "Another message";

        // Act
        const result = yield* service.loadAndAppendMessage(
          validHistoryId,
          newMessage
        );

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(validMessage);
        expect(result[1]?.role).toBe("user");
        expect(result[1]?.content).toBe(newMessage);

        // Check agent state
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(2); // Save + AppendMessage
        expect(state.activityHistory[1]?.action).toBe("APPEND_MESSAGE");
        expect(state.activityHistory[1]?.success).toBe(true);
      }));
    });
  });

  describe("appendAndSaveResponse", () => {
    it("should handle missing historyId gracefully", async () => {
      await withLayers(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        const messages = [validMessage];
        const response = "AI response";

        // Act (should succeed without error when historyId is undefined)
        yield* service.appendAndSaveResponse(
          undefined,
          messages,
          response
        );

        // Assert - should complete successfully (returns void)
        const state = yield* service.getAgentState();
        expect(state.historyCount).toBe(0); // No history saved when historyId is undefined
      }));
    });

    it("should append response and save to history", async () => {
      await withLayers(Effect.gen(function* () {
        // Arrange
        const service = yield* ChatHistoryService;
        yield* service.saveHistory(validHistoryId, validHistory);
        const messages = [validMessage];
        const response = "AI response to the user";

        // Act
        yield* service.appendAndSaveResponse(
          validHistoryId,
          messages,
          response
        );

        // Assert - appendAndSaveResponse returns void, so check the saved history
        const saved = yield* service.loadHistory(validHistoryId);
        expect(saved?.messages).toHaveLength(2);
        expect(saved?.messages[0]).toEqual(validMessage);
        expect(saved?.messages[1]?.role).toBe("assistant");
        expect(saved?.messages[1]?.content).toBe(response);

        // Check agent state
        const state = yield* service.getAgentState();
        expect(state.activityHistory.length).toBe(3); // Save + AppendResponse + Load
        const responseActivity = state.activityHistory[1];
        expect(responseActivity?.action).toBe("APPEND_RESPONSE");
        expect(responseActivity?.success).toBe(true);
      }));
    });
  });
});
