import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js";
import { Effect, Ref, Stream, pipe } from "effect";
import { describe, expect, it } from "vitest";
import { EffectorService } from "../../../effector/service.js";
import { AgentRecordType, makeEffectorId } from "../../../effector/types.js";
import { createAsyncEffector } from "../async-effector.js";
import { AsyncOperationCommand, AsyncOperationEventType, AsyncOperationStatus } from "../types.js";

const harness = createServiceTestHarness(EffectorService, () => Effect.gen(function* () {
    // Create a ref to store instances
    const instances = yield* Ref.make(new Map())

    return {
        create: <S>(id: any, initialState: S) => Effect.gen(function* () {
            return {
                id,
                send: () => Effect.succeed(void 0),
                getState: () => Effect.succeed({ id, state: initialState, status: "IDLE", lastUpdated: Date.now() }),
                subscribe: () => Stream.empty
            }
        }),
        terminate: () => Effect.succeed(void 0),
        send: () => Effect.succeed(void 0),
        getState: <S>() => Effect.succeed({ id: makeEffectorId("default"), state: {} as S, status: "IDLE", lastUpdated: Date.now() }),
        subscribe: () => Stream.empty
    }
}))

describe("AsyncOperationTaskEffector", () => {
    it("should create an effector with initial IDLE state", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-async");
            const effector = yield* createAsyncEffector(id);
            const state = yield* effector.getState();

            expect(state.state.status).toBe(AsyncOperationStatus.IDLE);
            expect(state.state.inputUrl).toBeUndefined();
            expect(state.state.result).toBeUndefined();
            expect(state.state.error).toBeUndefined();
        });

        await harness.runTest(effect);
    });

    it("should handle START_FETCH command and emit proper events", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-async");
            // Use very short delay for testing
            const effector = yield* createAsyncEffector(id, 100, 1.0); // Always succeed

            // Subscribe to events
            const events: unknown[] = [];
            const subscription = pipe(
                effector.subscribe(),
                Stream.filter(record => record.type === AgentRecordType.EVENT),
                Stream.runForEach(event => Effect.sync(() => events.push(event)))
            );

            // Start subscription
            yield* Effect.fork(subscription);

            // Send START_FETCH command
            const testUrl = "https://example.com";
            yield* effector.send({
                id: "test-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: AsyncOperationCommand.START_FETCH,
                    url: testUrl
                },
                metadata: {}
            });

            // Wait for processing
            yield* Effect.sleep(200);

            // Verify state transitions
            const finalState = yield* effector.getState();
            expect(finalState.state.status).toBe(AsyncOperationStatus.SUCCESS);
            expect(finalState.state.inputUrl).toBe(testUrl);
            expect(finalState.state.result).toBeDefined();
            expect(finalState.state.error).toBeUndefined();

            // Verify events
            expect(events).toHaveLength(2);
            expect((events[0] as any).payload.type).toBe(AsyncOperationEventType.FETCH_STARTED);
            expect((events[0] as any).payload.url).toBe(testUrl);
            expect((events[1] as any).payload.type).toBe(AsyncOperationEventType.FETCH_SUCCEEDED);
            expect((events[1] as any).payload.url).toBe(testUrl);
            expect((events[1] as any).payload.result).toBeDefined();
        });

        await harness.runTest(effect);
    });

    it("should handle failure cases", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-async");
            // Always fail
            const effector = yield* createAsyncEffector(id, 100, 0.0);

            // Subscribe to events
            const events: unknown[] = [];
            const subscription = pipe(
                effector.subscribe(),
                Stream.filter(record => record.type === AgentRecordType.EVENT),
                Stream.runForEach(event => Effect.sync(() => events.push(event)))
            );

            // Start subscription
            yield* Effect.fork(subscription);

            // Send START_FETCH command
            const testUrl = "https://example.com";
            yield* effector.send({
                id: "test-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: AsyncOperationCommand.START_FETCH,
                    url: testUrl
                },
                metadata: {}
            });

            // Wait for processing
            yield* Effect.sleep(200);

            // Verify state transitions
            const finalState = yield* effector.getState();
            expect(finalState.state.status).toBe(AsyncOperationStatus.FAILURE);
            expect(finalState.state.inputUrl).toBe(testUrl);
            expect(finalState.state.result).toBeUndefined();
            expect(finalState.state.error).toBeDefined();

            // Verify events
            expect(events).toHaveLength(2);
            expect((events[0] as any).payload.type).toBe(AsyncOperationEventType.FETCH_STARTED);
            expect((events[0] as any).payload.url).toBe(testUrl);
            expect((events[1] as any).payload.type).toBe(AsyncOperationEventType.FETCH_FAILED);
            expect((events[1] as any).payload.url).toBe(testUrl);
            expect((events[1] as any).payload.error).toBeDefined();
        });

        await harness.runTest(effect);
    });

    it("should ignore START_FETCH when not IDLE", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-async");
            // Use longer delay to test state handling
            const effector = yield* createAsyncEffector(id, 200, 1.0);

            // Send first START_FETCH command
            const testUrl1 = "https://example.com/1";
            yield* effector.send({
                id: "test-cmd-1",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: AsyncOperationCommand.START_FETCH,
                    url: testUrl1
                },
                metadata: {}
            });

            // Wait briefly and verify PENDING state
            yield* Effect.sleep(50);
            const pendingState = yield* effector.getState();
            expect(pendingState.state.status).toBe(AsyncOperationStatus.PENDING);
            expect(pendingState.state.inputUrl).toBe(testUrl1);

            // Try to send second START_FETCH while first is still processing
            const testUrl2 = "https://example.com/2";
            yield* effector.send({
                id: "test-cmd-2",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: AsyncOperationCommand.START_FETCH,
                    url: testUrl2
                },
                metadata: {}
            });

            // Wait for all processing
            yield* Effect.sleep(300);

            // Verify final state still reflects first operation
            const finalState = yield* effector.getState();
            expect(finalState.state.status).toBe(AsyncOperationStatus.SUCCESS);
            expect(finalState.state.inputUrl).toBe(testUrl1);
            expect(finalState.state.result).toBeDefined();
        });

        await harness.runTest(effect);
    });
});