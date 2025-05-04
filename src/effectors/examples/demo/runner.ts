import { Effect } from "effect"
import { EffectorService } from "../../effector/service.js"

/**
 * Configuration for the demo runner
 */
export interface DemoRunnerConfig {
    readonly enableMetrics: boolean
    readonly logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR"
}

/**
 * Demo runner service interface
 */
export interface DemoRunner {
    readonly run: <R, E, A>(program: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | EffectorService>
}

/**
 * Demo runner service using Effect.Service pattern
 */
export class DemoRunnerService extends Effect.Service<DemoRunner>()("DemoRunnerService", {
    effect: Effect.succeed({
        run: <R, E, A>(program: Effect.Effect<A, E, R>) => program
    })
}) { } 