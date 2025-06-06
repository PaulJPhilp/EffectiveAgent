import { AgentActivityType, AgentRuntimeService, makeAgentRuntimeId } from "@/ea-agent-runtime/index.js";
import type { AgentActivity } from "@/ea-agent-runtime/types.js";
import { Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import type { WeatherAgentState } from "../types.js";

describe("Minimal Weather Agent Runtime Test", () => {
    it("should update weather agent state correctly", () =>
        Effect.gen(function* () {
            // Get the real service
            const service = yield* AgentRuntimeService;

            // Create a runtime with weather agent state
            const id = makeAgentRuntimeId("minimal-weather-test");
            const initialState: WeatherAgentState = {
                currentWeather: Option.none(),
                requestCount: 0,
                lastUpdate: Option.none()
            };

            const runtime = yield* service.create(id, initialState);

            console.log("Created weather runtime, checking initial state...");
            const initial = yield* runtime.getState();
            console.log("Initial state:", initial);

            // Send a state change activity with weather agent state
            const newState: WeatherAgentState = {
                requestCount: initial.state.requestCount + 1,
                currentWeather: Option.some({
                    location: { name: "Test City", country: "Test Country" },
                    temperature: 20,
                    temperatureFeelsLike: 19,
                    humidity: 50,
                    windSpeed: 10,
                    windDirection: 180,
                    conditions: [{ condition: "Sunny", description: "Clear sky", icon: "sun" }],
                    timestamp: "2023-10-05T14:30:00Z",
                    units: { type: "celsius", windSpeedUnit: "mps" }
                }),
                lastUpdate: Option.some(Date.now())
            };

            const activity: AgentActivity = {
                id: "minimal-weather-activity",
                agentRuntimeId: id,
                timestamp: Date.now(),
                type: AgentActivityType.STATE_CHANGE,
                payload: newState,
                metadata: {},
                sequence: 0
            };

            console.log("Sending weather state change activity...");
            yield* runtime.send(activity);

            // Wait for processing
            yield* Effect.sleep(200);

            console.log("Checking state after update...");
            const updated = yield* runtime.getState();
            console.log("Updated state:", updated);

            // Verify the state was updated correctly
            expect(updated.state.requestCount).toBe(1);
            expect(updated.processing?.processed).toBe(1);
            expect(updated.processing?.failures).toBe(0);
            expect(Option.isSome(updated.state.currentWeather)).toBe(true);
            expect(Option.isSome(updated.state.lastUpdate)).toBe(true);

            // Cleanup
            yield* service.terminate(id);

            return updated;
        }).pipe(
            Effect.provide(AgentRuntimeService.Default)
        )
    );
}); 