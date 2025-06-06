/**
 * @file Types for ReAct pipeline
 * @module examples/pipelines/react/types
 */

import { Effect } from "effect";

export interface Tool {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
    readonly execute: (params: Record<string, unknown>) => Effect.Effect<unknown, Error>;
} 