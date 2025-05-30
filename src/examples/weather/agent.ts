/**
 * @file Weather Agent implementation using AgentRuntime
 * @module examples/weather/agent
 */

import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import type { JsonObject } from "@/types.js";
import { Effect, Option } from "effect";
import { WeatherPipelineError } from "./errors.js";
import { WeatherCondition, WeatherData, WeatherPipelineInput, defaultConfig } from "./types.js";

export interface WeatherAgentState {
    readonly currentWeather: Option.Option<WeatherData>
    readonly requestCount: number
    readonly lastUpdate: Option.Option<number>
}

interface WeatherCommand {
    readonly type: "GET_WEATHER"
    readonly input: WeatherPipelineInput
}

interface WeatherStateChange {
    readonly type: "SET_WEATHER"
    readonly weather: WeatherData
}

type WeatherActivityPayload = WeatherCommand | WeatherStateChange

/**
 * Weather Agent implementation using AgentRuntime
 */
export class WeatherAgent extends Effect.Service<WeatherAgent>()(
    "WeatherAgent",
    {
        effect: Effect.gen(function* () {
            const agentRuntimeService = yield* AgentRuntimeService;
            const textService = yield* TextService;

            const agentId = makeAgentRuntimeId("weather-agent");

            const initialState: WeatherAgentState = {
                currentWeather: Option.none(),
                requestCount: 0,
                lastUpdate: Option.none()
            };

            // Create the agent runtime
            const runtime = yield* agentRuntimeService.create(agentId, initialState);

            yield* Effect.log("Weather agent initialized", {
                config: defaultConfig
            } as JsonObject);

            const getWeather = (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.log("Getting weather data", {
                        location: input.location.toString()
                    } as JsonObject);

                    // Send weather request command to agent
                    const activity: AgentActivity = {
                        id: `weather-request-${Date.now()}`,
                        agentRuntimeId: agentId,
                        timestamp: Date.now(),
                        type: AgentActivityType.COMMAND,
                        payload: { type: "GET_WEATHER", input } satisfies WeatherCommand,
                        metadata: {},
                        sequence: 0
                    };

                    yield* runtime.send(activity);

                    // Get weather data from text service
                    const response = yield* textService.generate({
                        prompt: `Get the weather for ${input.location}. Return a JSON object with the current weather data.`,
                        modelId: "gpt-4o",
                        system: Option.some("You are a weather service API. Return valid JSON with: location (name, country), temperature, temperatureFeelsLike, humidity, windSpeed, windDirection, conditions, timestamp."),
                        parameters: {
                            temperature: 0.1
                        }
                    });

                    yield* Effect.log("Raw text service response", {
                        output: response.data.output
                    } as JsonObject);

                    const parsed = JSON.parse(response.data.output) as {
                        location: { name: string; country: string };
                        temperature: number;
                        temperatureFeelsLike: number;
                        humidity: number;
                        windSpeed: number;
                        windDirection: number;
                        conditions: { condition: string; description: string; icon: string };
                        timestamp: string;
                    };

                    yield* Effect.log("Parsed weather data", parsed as JsonObject);

                    const weatherData: WeatherData = {
                        location: {
                            name: parsed.location.name,
                            country: parsed.location.country
                        },
                        temperature: parsed.temperature,
                        temperatureFeelsLike: parsed.temperatureFeelsLike,
                        humidity: parsed.humidity,
                        windSpeed: parsed.windSpeed,
                        windDirection: parsed.windDirection,
                        conditions: [parsed.conditions] as ReadonlyArray<WeatherCondition>,
                        timestamp: parsed.timestamp,
                        units: input.units || defaultConfig.defaultUnits
                    };

                    yield* Effect.log("Weather data transformed", {
                        location: { name: weatherData.location.name, country: weatherData.location.country },
                        temperature: weatherData.temperature,
                        humidity: weatherData.humidity,
                        windSpeed: weatherData.windSpeed,
                        conditions: weatherData.conditions.map((c: WeatherCondition) => ({
                            condition: c.condition,
                            description: c.description,
                            icon: c.icon
                        }))
                    } as JsonObject);

                    // Update agent state with the weather data
                    const stateChangeActivity: AgentActivity = {
                        id: `weather-update-${Date.now()}`,
                        agentRuntimeId: agentId,
                        timestamp: Date.now(),
                        type: AgentActivityType.STATE_CHANGE,
                        payload: {
                            currentWeather: Option.some(weatherData),
                            requestCount: (yield* runtime.getState()).state.requestCount + 1,
                            lastUpdate: Option.some(Date.now())
                        },
                        metadata: {},
                        sequence: 0
                    };

                    yield* runtime.send(stateChangeActivity);

                    return weatherData;
                }).pipe(
                    Effect.mapError((error: unknown) => new WeatherPipelineError({
                        message: "Failed to get weather data",
                        cause: error
                    }))
                );

            const getWeatherSummary = (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError> =>
                Effect.gen(function* () {
                    const data = yield* getWeather(input);
                    yield* Effect.log("Generating weather summary", {
                        location: data.location as unknown as JsonObject
                    } as JsonObject);

                    const summary = yield* textService.generate({
                        prompt: `Summarize the current weather for ${data.location.name}, ${data.location.country}. Temperature: ${data.temperature}°C, Feels like: ${data.temperatureFeelsLike}°C, Humidity: ${data.humidity}%, Wind: ${data.windSpeed} m/s`,
                        modelId: defaultConfig.defaultModelId,
                        system: Option.some("You are a weather service. Provide a natural, concise summary of the weather conditions."),
                        parameters: {
                            temperature: defaultConfig.defaultTemperature
                        }
                    }).pipe(
                        Effect.map((response): string => response.data.output),
                        Effect.mapError((error): WeatherPipelineError => new WeatherPipelineError({ message: "Failed to generate weather summary", cause: error }))
                    );

                    yield* Effect.log("Weather summary generated", {
                        location: data.location as unknown as JsonObject,
                        summary
                    } as JsonObject);

                    return summary;
                }).pipe(
                    Effect.mapError((error): WeatherPipelineError =>
                        error instanceof WeatherPipelineError
                            ? error
                            : new WeatherPipelineError({ message: "Unexpected error in weather summary", cause: error })
                    )
                );

            const getAgentState = (): Effect.Effect<WeatherAgentState, Error> =>
                Effect.gen(function* () {
                    const state = yield* runtime.getState();
                    return state.state;
                });

            const getRuntime = () => runtime;

            const terminate = (): Effect.Effect<void, Error> =>
                agentRuntimeService.terminate(agentId);

            return {
                getWeather,
                getWeatherSummary,
                getAgentState,
                getRuntime,
                terminate
            };
        }),
        dependencies: [AgentRuntimeService.Default, TextService.Default]
    }
) { } 