import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Effect, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorService } from "../../../effector/service.js"
import { AgentRecord, EffectorId, makeEffectorId } from "../../../effector/types.js"
import { program } from "../counter.js"

describe("Counter Demo Program", () => {
    it("should execute the complete demo workflow", async () => {
        const events: AgentRecord[] = []
        const harness = createServiceTestHarness(EffectorService, () => Effect.succeed({
            create: <S>(id: EffectorId, initialState: S) => Effect.succeed({
                id,
                send: () => Effect.succeed(void 0),
                getState: () => Effect.succeed({ id, state: initialState, status: "IDLE" as const, lastUpdated: Date.now() }),
                subscribe: () => Stream.fromIterable([])
            }),
            terminate: () => Effect.succeed(void 0),
            send: () => Effect.succeed(void 0),
            getState: <S>() => Effect.succeed({ id: makeEffectorId("test"), state: {} as S, status: "IDLE" as const, lastUpdated: Date.now() }),
            subscribe: () => Stream.fromIterable([])
        }))

        await Effect.runPromise(
            program.pipe(
                Effect.provide(harness.TestLayer)
            )
        )
        expect(events).toHaveLength(0)
    })
}) 