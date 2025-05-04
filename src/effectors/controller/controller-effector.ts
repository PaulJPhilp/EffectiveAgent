import { Effect, pipe } from "effect"
import { makeEffectorId, type AgentRecord } from "../effector/types.js"
import { ControllerCommand, type ControllerState, ControllerStatus } from "./types.js"
import { EffectorInstance } from "../effector/instance.js"
import { EffectorService } from "../effector/service.js"
import type { ProcessingLogic } from "../effector/types.js"

/**
 * Initial state for a new ControllerEffector
 */
const initialState: ControllerState = {
    status: ControllerStatus.IDLE,
    totalPausedTime: 0,
    history: []
}

/**
 * Processing logic for ControllerEffector
 */
const processControllerCommand: ProcessingLogic<ControllerState, never, never> = (record: AgentRecord, state: ControllerState): Effect.Effect<ControllerState, never, never> => {
    if (!record.payload || !(record.payload instanceof ControllerCommand.Start || 
        record.payload instanceof ControllerCommand.Stop || 
        record.payload instanceof ControllerCommand.Pause || 
        record.payload instanceof ControllerCommand.Resume || 
        record.payload instanceof ControllerCommand.Reset)) {
        return Effect.succeed(state)
    }

    const command = record.payload as ControllerCommand
    const previousStatus = state.status
    let newStatus = state.status
    let startTime = state.startTime
    let pausedAt = state.pausedAt
    let totalPausedTime = state.totalPausedTime

    if (command instanceof ControllerCommand.Start) {
        if (state.status === ControllerStatus.IDLE || state.status === ControllerStatus.STOPPED) {
            newStatus = ControllerStatus.RUNNING
            startTime = Date.now()
            pausedAt = undefined
            totalPausedTime = 0
        }
    } else if (command instanceof ControllerCommand.Stop) {
        if (state.status === ControllerStatus.RUNNING || state.status === ControllerStatus.PAUSED) {
            newStatus = ControllerStatus.STOPPED
            startTime = undefined
            pausedAt = undefined
        }
    } else if (command instanceof ControllerCommand.Pause) {
        if (state.status === ControllerStatus.RUNNING) {
            newStatus = ControllerStatus.PAUSED
            pausedAt = Date.now()
        }
    } else if (command instanceof ControllerCommand.Resume) {
        if (state.status === ControllerStatus.PAUSED) {
            newStatus = ControllerStatus.RUNNING
            if (pausedAt) {
                totalPausedTime += Date.now() - pausedAt
            }
            pausedAt = undefined
        }
    } else if (command instanceof ControllerCommand.Reset) {
        newStatus = ControllerStatus.IDLE
        startTime = undefined
        pausedAt = undefined
        totalPausedTime = 0
    }

    return Effect.succeed({
        status: newStatus,
        startTime,
        pausedAt,
        totalPausedTime,
        history: [
            ...state.history,
            {
                command,
                timestamp: Date.now(),
                previousStatus,
                newStatus
            }
        ]
    })
}

/**
 * Creates a new ControllerEffector instance
 */
export const createControllerEffector = (id: string) => {
    const effectorId = makeEffectorId(id)
    return pipe(
        Effect.succeed(effectorId),
        Effect.tap(effectorId => Effect.log(`Creating controller effector with id ${effectorId}`)),
        Effect.flatMap(effectorId => EffectorInstance.create<ControllerState>(
            effectorId,
            initialState,
            processControllerCommand,
            {
                size: 1000,
                enablePrioritization: true,
                priorityQueueSize: 100,
                backpressureTimeout: 5000
            }
        )),
        Effect.tap(instance => Effect.log('Created instance:', instance)),
        Effect.map(instance => ({
            id: effectorId,
            send: instance.send,
            getState: instance.getState,
            subscribe: instance.subscribe
        })),
        Effect.tap(effector => Effect.log('Created effector:', effector)),
        Effect.provide(EffectorService.Default),
        Effect.tap(() => Effect.log('Provided service layer')),
        Effect.flatMap(effector => pipe(
            effector.getState(),
            Effect.map(state => {
                console.log('Initial state:', state)
                return effector
            })
        ))
    )
}
