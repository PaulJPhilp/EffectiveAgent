/**
 * @file Error definitions for the WeatherPipeline
 * @module ea/pipelines/weather/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * Error specific to the WeatherPipeline when configuration is invalid
 */
export class WeatherConfigError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "WeatherPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the WeatherPipeline when location data is invalid
 */
export class WeatherLocationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "WeatherPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the WeatherPipeline when API calls fail
 */
export class WeatherApiError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "WeatherPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the WeatherPipeline when parsing weather data fails
 */
export class WeatherParsingError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "WeatherPipeline",
            cause: params.cause
        });
    }
}

/**
 * Union type of all WeatherPipeline error types
 */
export type WeatherPipelineError =
    | WeatherConfigError
    | WeatherLocationError
    | WeatherApiError
    | WeatherParsingError;