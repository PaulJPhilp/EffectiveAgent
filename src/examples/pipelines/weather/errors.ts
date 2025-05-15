/**
 * @file Error definitions for Weather Pipelines
 * @module ea/pipelines/weather/errors
 */

import { Data } from "effect";

/**
 * Error specific to Weather Pipelines operations.
 * This is the primary error type used by WeatherService.
 */
export class WeatherPipelineError extends Data.TaggedError("WeatherPipelineError")<{
    readonly message: string;
    readonly cause?: unknown;
}> { } 