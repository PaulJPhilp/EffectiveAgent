/**
 * @file Defines a simple 'get_weather' tool for use in e2e tests.
 * @module e2e/usecase/tools/weather
 */

import { Effect, Schema as S } from "effect"
import {
  RegistryToolSchema,
  ToolMetadataSchema
} from "@/services/ai/tool-registry/schema.js"
import { EffectImplementation } from "@/services/ai/tools/schema.js"

// 1. Define the input schema for the tool
export const WeatherToolInputSchema = S.Struct({
  location: S.String.pipe(
    S.annotations({ description: "The city and state, e.g., San Francisco, CA" })
  )
})
export type WeatherToolInput = S.Schema.Type<typeof WeatherToolInputSchema>

// 2. Define the output schema for the tool
export const WeatherToolOutputSchema = S.Struct({
  forecast: S.String
})
export type WeatherToolOutput = S.Schema.Type<typeof WeatherToolOutputSchema>

// 3. Define the tool's metadata
const metadata = new ToolMetadataSchema({
  name: "get_weather",
  description: "Get the current weather forecast for a specific location.",
  version: "1.0.0",
  author: "EffectiveAgent E2E"
})

// 4. Define the tool's implementation using Effect
const implementation = new EffectImplementation({
  _tag: "EffectImplementation",
  inputSchema: WeatherToolInputSchema,
  outputSchema: WeatherToolOutputSchema,
  execute: (input: WeatherToolInput) =>
    Effect.succeed({
      forecast: `The weather in ${input.location} is sunny with a high of 75F.`
    })
})

// 5. Export the complete tool definition
export const WeatherTool = new RegistryToolSchema({
  metadata,
  implementation
})
