import * as EffectVitest from "@effect/vitest";
import { Cause, Effect, Exit, Layer, LogLevel, ReadonlyArray, Tag } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// --- Import Service Definition, Errors, Schemas ---
import {
    ChatMemoryService, type ChatMessage,
    type ChatMessageEntityData, ConversationNotFoundError, 
    DataValidationError, GenericMemoryError,type IChatMemoryService, type MemoryManagementStrategy, // Import strategy tag/interface
    MemoryManagementStrategyTag, type SummarizationMetadataEntityData
} from "../src/memory/chat/chat-memory-service"; // Adjust path

import { RepositoryService } from "../src/repository/repository-service"; // Import Tag
// --- Import Mocks & Tags ---
// Mock LoggingService, RepositoryService (multi-type), SkillService (if testing strategy impl)
// Mock MemoryManagementStrategy
import {MockLoggingServiceLayer, 
    MockMemoryManagementStrategy, // Import strategy mock class
    MockMultiTypeRepositoryService, // Import class for reset
MockRepositoryLayer, // Use multi-type repo mock
    mockLogger, 
    // Define or import mock layers for SkillService, ThreadConfigRepo if needed by tests
} from "./testing/mocks"; // Adjust path

// --- Test Setup ---

// Layer providing the mock strategy instance via the Tag
const MockStrategyLayer = Layer.succeed(
    MemoryManagementStrategyTag,
    new MockMemoryManagementStrategy()
);

// Create the full layer stack for testing
const TestLayer = ChatMemoryServiceLiveLayer.pipe( // Assuming ChatMemoryServiceLiveLayer exists
    Layer.provide(MockLoggingServiceLayer),
    Layer.provide(MockRepositoryLayer), // Provide the multi-type repo mock
    Layer.provide(MockStrategyLayer) // Provide the mock strategy
    // Provide mock SkillService layer if testing SummarizationStrategy directly
);

// Use EffectVitest.provide for the test suite
const { it } = EffectVitest.provide(TestLayer);

// Helper to get service instance and mocks within tests
const getTestServiceAndMocks = Effect.all({
    svc: ChatMemoryService,
    mocks: Effect.all({
        logSvc: LoggingService,
        repoSvc: RepositoryService,
        strategy: MemoryManagementStrategyTag,
        // skillSvc: SkillService // If needed
    })
});

// Helper function to create ChatMessage objects
const createMsg = (role: ChatMessage["role"], content: string, timestamp?: Date): ChatMessage => ({
    role, content, timestamp: timestamp ?? new Date(),
});

// --- Test Suite Outline ---

describe("ChatMemoryServiceLive", () => {

    let mockRepoService: MockMultiTypeRepositoryService;
    let mockStrategy: MockMemoryManagementStrategy;

    EffectVitest.beforeEach(() =>
        Effect.gen(function* (_) {
            vi.clearAllMocks();
            // Get mock instances to reset state
            const { mocks } = yield* _(getTestServiceAndMocks);
            mockRepoService = mocks.repoSvc as MockMultiTypeRepositoryService;
            mockStrategy = mocks.strategy as MockMemoryManagementStrategy;
            mockRepoService.reset();
            mockStrategy.reset();
        })
    );

    describe("addMessages", () => {
        it("should save valid messages via repository");
        it("should call strategy.postAddMessagesHook with correct counts");
        it("should fail with DataValidationError for invalid input messages");
        it("should fail with GenericMemoryError if repository create fails");
        it("should succeed even if strategy hook fails (default behavior)");
        // it("should correctly add originatingThreadId if using denormalization");
    });

    describe("getMessages", () => {
        it("should return messages for a single thread in chronological order");
        it("should return empty array for existing thread with no messages");
        it("should fail with ConversationNotFoundError for non-existent threadId");
        it("should apply limit correctly (most recent N messages)");
        it("should apply 'before' filter correctly");

        // Branching Tests (assuming recursive fetch initially)
        it("should retrieve history from parent thread");
        it("should retrieve history from multiple ancestor threads");
        it("should combine messages from lineage in correct chronological order");
        it("should handle limit correctly across branched history");
        // it("should handle 'before' filter correctly across branched history");
        // it("should fail if parent thread lookup fails mid-recursion"); // Requires mocking thread config repo

        // Branching Tests (assuming denormalization later)
        // it("should retrieve history using originatingThreadId");
        // it("should apply limit/before correctly with originatingThreadId query");
    });

    describe("clearMessages", () => {
        it("should delete all ChatMessage entities for the conversationId");
        it("should delete all SummarizationMetadata entities for the conversationId");
        it("should fail with ConversationNotFoundError if no entities exist for conversationId");
        it("should succeed even if some entities were already deleted"); // Idempotency
        it("should fail with GenericMemoryError if repository delete fails");
    });

    // Tests for specific Strategy Implementations (e.g., SummarizationStrategy)
    // These might be in a separate file or require injecting mock SkillService etc.
    describe("SummarizationStrategy (Conceptual Tests)", () => {
        it("should trigger summarization when threshold reached");
        it("should fetch correct messages to summarize");
        it("should call SkillService with correct parameters");
        it("should create SummarizationMetadata entity");
        it("should create summary ChatMessage entity with link");
        it("should update metadata entity with summary message ID");
        it("should optionally delete original messages");
        it("should handle SkillService errors gracefully");
        it("should handle Repository errors gracefully during summarization steps");
    });

});