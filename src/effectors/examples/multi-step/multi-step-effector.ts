import { Effect } from "effect"
import { EffectorService } from "../../effector/service.js"
import type { EffectorId } from "../../effector/types.js"
import { DEFAULT_CONFIG, type MultiStepConfig, type MultiStepState, makeMultiStepId } from "./types.js"

export function createMultiStepEffector(id: EffectorId, config: Partial<MultiStepConfig>) {
    return Effect.gen(function* () {
        const service = yield* EffectorService
        const fullConfig = { ...DEFAULT_CONFIG, ...config }

        const initialState: MultiStepState = {
            id: makeMultiStepId(id.toString()),
            config: fullConfig,
            currentStep: 0,
            steps: Array.from({ length: fullConfig.totalSteps }, (_, i) => ({
                status: "pending" as const,
                startedAt: undefined,
                completedAt: undefined
            })).reduce((acc, step, i) => {
                acc[i + 1] = step
                return acc
            }, {} as Record<number, { status: "pending", startedAt: undefined, completedAt: undefined }>)
        }

        return yield* service.create(id, initialState)
    })
} 