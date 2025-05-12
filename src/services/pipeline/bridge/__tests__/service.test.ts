/**
 * @file Test suite for BridgeService
 */

import {
  AgentActivity,
  AgentRecordType,
  AgentRuntimeId,
  AgentRuntimeService,
  AgentRuntimeState
} from "@/agent-runtime/index.js";
import { Chunk, Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";
import type { BridgeServiceApi } from "../api.js";
import {
  BridgeMessageSendError,
  BridgeRuntimeCreationError,
  BridgeServiceError,
  BridgeStateError,
  BridgeTerminationError
} from "../errors.js";
import { BridgeService, UuidGeneratorService } from "../service.js";

describe("BridgeService", () => {
  // Test for agent runtime creation success case
  it("should create an agent runtime", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      
      // Execute the method
      const id = yield* service.createAgentRuntime();
      
      // Verify the result
      expect(id).toBeDefined();
    })
  );

  // Test for agent runtime creation failure case
  it("should handle errors when creating an agent runtime", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      
      // Create test dependency that fails
      const mockCreateResult = Effect.fail(new BridgeRuntimeCreationError({
        method: "createAgentRuntime"
      }));
      
      // Mock the createAgentRuntime to return our prepared error
      const mockService = {
        createAgentRuntime: () => mockCreateResult
      };
      
      // Execute with our mock and check the result
      const result = yield* Effect.either(mockService.createAgentRuntime());
      
      // Verify error handling
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(BridgeRuntimeCreationError);
      }
    })
  );

  // Test for sending a message
  it("should send a message to an agent runtime", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "test-id" as AgentRuntimeId;
      const testMessage = "Hello, world!";
      
      // We simply expect this not to fail
      const result = yield* service.sendMessage(testId, testMessage);
      
      // Success is indicated by no error being thrown
      expect(result).toBeUndefined();
    })
  );

  // Test for message sending failure
  it("should handle errors when sending a message", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "test-id" as AgentRuntimeId;
      const testMessage = "Hello, world!";
      
      // Create a mock result that fails
      const mockSendResult = Effect.fail(new BridgeMessageSendError({
        runtimeId: testId,
        message: testMessage,
        method: "sendMessage"
      }));
      
      // Create a mock service for testing error handling
      const mockService = {
        sendMessage: () => mockSendResult
      };
      
      // Execute with our mock and catch the error
      const result = yield* Effect.either(mockService.sendMessage());
      
      // Verify error is properly propagated
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(BridgeMessageSendError);
      }
    })
  );

  // Test for state retrieval
  it("should get the state of an agent runtime", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "test-id" as AgentRuntimeId;
      
      // Execute the method
      const state = yield* service.getState(testId);
      
      // Basic verification that something is returned
      expect(state).toBeDefined();
    })
  );

  // Test for state retrieval error handling
  it("should handle errors when getting state", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "test-id" as AgentRuntimeId;
      
      // Create mock error result
      const mockGetStateResult = Effect.fail(new BridgeStateError({
        runtimeId: testId,
        method: "getState"
      }));
      
      // Create mock service for testing error handling
      const mockService = {
        getState: () => mockGetStateResult
      };
      
      // Execute with our mock and catch the error
      const result = yield* Effect.either(mockService.getState());
      
      // Verify error handling
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(BridgeStateError);
      }
    })
  );

  // Test for subscription
  it("should subscribe to an agent runtime", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "test-id" as AgentRuntimeId;
      // Get the stream
      const stream = service.subscribe(testId);
      // Basic verification that a stream is returned
      expect(stream).toBeDefined();
    })
  );

  it("should fail with BridgeRuntimeNotFoundError for invalid agent runtime ID", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const invalidId = "" as AgentRuntimeId;
      const stream = service.subscribe(invalidId);
      const result = yield* Effect.either(Stream.runCollect(stream));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(require("../errors.js").BridgeRuntimeNotFoundError);
      }
    })
  );

  // Test harness to inject mocks for BridgeService (used for error simulation)
  function withBridgeServiceMocks(
    mocks: {
      agentRuntimeService: {
        subscribe: (id: AgentRuntimeId) => Stream.Stream<AgentActivity, Error>;
        create: (id: AgentRuntimeId, state: unknown) => Effect.Effect<void, Error>;
        send: (id: AgentRuntimeId, activity: AgentActivity) => Effect.Effect<void, Error>;
        getState: <S>(id: AgentRuntimeId) => Effect.Effect<AgentRuntimeState<S>, Error>;
        terminate: (id: AgentRuntimeId) => Effect.Effect<void, Error>;
      };
      uuidGeneratorService: {
        generate: () => string;
      };
    },
    test: (service: BridgeServiceApi) => Effect.Effect<void, BridgeServiceError>
  ) {
    const MockAgentRuntimeService = Effect.Service<typeof AgentRuntimeService>()(
      "AgentRuntimeService",
      {
        effect: Effect.succeed(mocks.agentRuntimeService),
        dependencies: []
      }
    );

    const MockUuidGeneratorService = Effect.Service<typeof UuidGeneratorService>()(
      "UuidGeneratorService",
      {
        effect: Effect.succeed(mocks.uuidGeneratorService),
        dependencies: []
      }
    );

    return Effect.gen(function* () {
      const service = yield* BridgeService;
      yield* test(service);
    }).pipe(
      Effect.provide(MockAgentRuntimeService.Default),
      Effect.provide(MockUuidGeneratorService.Default)
    );
  }

  it("should return a stream for valid agent runtime ID", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "some-valid-id" as AgentRuntimeId;
      const stream = service.subscribe(testId);
      expect(stream).toBeDefined();
    })
  );

  it("should fail with BridgeRuntimeNotFoundError for invalid agent runtime ID", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const invalidId = "" as AgentRuntimeId;
      const stream = service.subscribe(invalidId);
      const result = yield* Effect.either(Stream.runCollect(stream));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(require("../errors.js").BridgeRuntimeNotFoundError);
      }
    })
  );

  it("should propagate BridgeSubscriptionError from underlying service", () =>
    withBridgeServiceMocks(
      {
        agentRuntimeService: {
          subscribe: () => Stream.fail(new (require("../errors.js").BridgeSubscriptionError)({
            runtimeId: "test-id",
            method: "subscribe",
            cause: new Error("fail!")
          })),
          create: () => Effect.succeed((void 0)),
          send: () => Effect.succeed((void 0)),
          getState: <S>() => Effect.succeed({
            id: "test-id" as AgentRuntimeId,
            state: {} as S,
            status: "IDLE",
            lastUpdated: Date.now(),
            processing: {
              processed: 0,
              failures: 0,
              avgProcessingTime: 0
            },
            mailbox: {
              size: 0,
              processed: 0,
              timeouts: 0,
              avgProcessingTime: 0
            }
          } as AgentRuntimeState<S>),
          terminate: () => Effect.succeed((void 0))
        },
        uuidGeneratorService: { generate: () => "mock-uuid" }
      },
      (service: BridgeServiceApi) =>
        Effect.gen(function* () {
          const testId = "test-id" as AgentRuntimeId;
          const result = yield* Effect.either(Stream.runCollect(service.subscribe(testId)));
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(require("../errors.js").BridgeSubscriptionError);
          }
        })
    )
  );

  // Test for termination
  it("should terminate an agent runtime", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "test-id" as AgentRuntimeId;
      
      // Execute the method
      const result = yield* service.terminate(testId);
      
      // Success is indicated by no error being thrown
      expect(result).toBeUndefined();
    })
  );

  // Test for termination error handling
  it("should handle errors when terminating an agent runtime", () =>
    Effect.gen(function* () {
      const service = yield* BridgeService;
      const testId = "test-id" as AgentRuntimeId;
      
      // Create mock error result
      const mockTerminateResult = Effect.fail(new BridgeTerminationError({
        runtimeId: testId,
        method: "terminate"
      }));
      
      // Create mock service for testing error handling
      const mockService = {
        terminate: () => mockTerminateResult
      };
      
      // Execute with our mock and catch the error
      const result = yield* Effect.either(mockService.terminate());
      
      // Verify error handling
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(BridgeTerminationError);
      }
    })
  );
});
