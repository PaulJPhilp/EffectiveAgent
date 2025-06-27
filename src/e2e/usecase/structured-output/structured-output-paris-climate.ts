/**
 * e2e structured output test for Paris climate data using ea-cli chat command
 */

import { Console, Effect, Chunk, pipe, Schema } from "effect"
import { Args, Command } from "@effect/cli"
import { join } from "node:path"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ModelService } from "@/services/ai/model/service.js"
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js"
import { NodeContext } from "@effect/platform-node"
import { EffectiveInput } from "@/types.js"
import { Message, TextPart } from "@/schema.js"
import { deepStrictEqual, ok } from "node:assert"

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(
  process.cwd(),
  "src/e2e/config/master-config.json"
)

// Define the schema for the climate data
const MonthlyClimateSchema = Schema.Struct({
  month: Schema.String,
  average_temperature_celsius: Schema.Number,
  rainfall_mm: Schema.Number,
  humidity_percentage: Schema.Number
})

const ParisClimateSchema = Schema.Struct({
  city: Schema.String,
  country: Schema.String,
  climate_description: Schema.String,
  seasons: Schema.Struct({
    spring: Schema.String,
    summer: Schema.String,
    autumn: Schema.String,
    winter: Schema.String
  }),
  monthly_data: Schema.Array(MonthlyClimateSchema)
})

type ParisClimate = typeof ParisClimateSchema.Type

const prompt = "IMPORTANT: Generate climate data ONLY for Paris, France. The city MUST be 'Paris' and country MUST be 'France'. I need accurate annual climate information for Paris, including:\n\n1. City name (must be exactly 'Paris')\n2. Country (must be exactly 'France')\n3. General climate description of Paris\n4. Description of Paris's four seasons\n5. Monthly climate data for Paris including:\n   - Average temperature (Celsius)\n   - Rainfall (mm)\n   - Humidity percentage\n\nProvide data for all 12 months using accurate Paris climate statistics. Do not substitute any other city's data."

const makeChatCommand = Effect.gen(function* (_) {
  const providerService = yield* ProviderService
  const modelService = yield* ModelService

  const chat = (input: EffectiveInput) =>
    Effect.gen(function* (_) {
      const client = yield* providerService.getProviderClient("google")
      const models = yield* modelService.load()

      return yield* client.chat(
        input,
        {
          modelId: "gemini-2.0-flash",
          tools: [],
          system: "You are a JSON data generator for Paris, France climate data. EXTREMELY IMPORTANT: You must return ONLY raw JSON data. DO NOT use markdown formatting. DO NOT use code blocks. DO NOT add any explanations or text before or after the JSON. The response must start with { and end with }. No backticks, no ```json, no markdown at all.\n\nThe JSON must match this exact schema:\n{\n  \"city\": string (must be 'Paris'),\n  \"country\": string (must be 'France'),\n  \"climate_description\": string (describe Paris climate),\n  \"seasons\": {\n    \"spring\": string (describe Paris spring),\n    \"summer\": string (describe Paris summer),\n    \"autumn\": string (describe Paris autumn),\n    \"winter\": string (describe Paris winter)\n  },\n  \"monthly_data\": [\n    {\n      \"month\": string,\n      \"average_temperature_celsius\": number (Paris temperature),\n      \"rainfall_mm\": number (Paris rainfall),\n      \"humidity_percentage\": number (Paris humidity)\n    }\n  ]\n}"
        }
      )
    })

  return { chat }
})

const testEffect = Effect.gen(function* (_) {
  const command = yield* makeChatCommand

  // Send the prompt and get response
  const message = new Message({
    role: "user",
    parts: Chunk.fromIterable([new TextPart({ _tag: "Text", content: prompt })])
  })
  const response = yield* command.chat(new EffectiveInput("", Chunk.fromIterable([message])))

  yield* Effect.logInfo("Model output:", response.data.text)

  // Strip markdown formatting and parse JSON
  const cleanJson = response.data.text
    .replace(/^```json\s*/, "") // Remove opening ```json
    .replace(/\s*```$/, "")     // Remove closing ```
    .trim()

  // Parse and validate JSON
  const parsed = yield* Effect.try({
    try: () => JSON.parse(cleanJson),
    catch: (e: unknown) => new Error(`Failed to parse model output as JSON: ${e instanceof Error ? e.message : String(e)}`)
  })

  // Validate against schema
  const decodedClimate = yield* Schema.decode(ParisClimateSchema)(parsed).pipe(
    Effect.tapError((error: unknown) => Effect.logError("Schema validation failed", { error: String(error) })),
    Effect.mapError(() => new Error("Schema validation failed"))
  )

  // Basic assertions
  const climate = decodedClimate as ParisClimate
  ok(climate.city === "Paris", "City should be Paris")
  ok(climate.country === "France", "Country should be France")
  ok(climate.climate_description.length > 0, "Climate description should not be empty")
  ok(climate.seasons.spring.length > 0, "Spring description should not be empty")
  ok(climate.seasons.summer.length > 0, "Summer description should not be empty")

  // Validate monthly data
  ok(climate.monthly_data.length === 12, "Should have data for all 12 months")

  // Validate temperature ranges (Paris typically ranges from 2°C to 25°C)
  for (const monthData of climate.monthly_data) {
    ok(
      monthData.average_temperature_celsius >= -5 &&
      monthData.average_temperature_celsius <= 30,
      `Temperature ${monthData.average_temperature_celsius}°C for ${monthData.month} is outside reasonable range`
    )
    ok(
      monthData.rainfall_mm >= 0 && monthData.rainfall_mm <= 100,
      `Rainfall ${monthData.rainfall_mm}mm for ${monthData.month} is outside reasonable range`
    )
    ok(
      monthData.humidity_percentage >= 0 && monthData.humidity_percentage <= 100,
      `Humidity ${monthData.humidity_percentage}% for ${monthData.month} is outside reasonable range`
    )
  }

  yield* Effect.logInfo("Structured output test passed: Paris climate data is valid")
})

const handleError = (error: Error | unknown) => {
  console.error("Test failed:", error instanceof Error ? error.message : String(error))
  process.exit(1)
}

process.on("uncaughtException", handleError)
process.on("unhandledRejection", handleError)

const runWithServices = pipe(
  testEffect,
  Effect.provide(ModelService.Default),
  Effect.provide(ProviderService.Default),
  Effect.provide(ToolRegistryService.Default),
  Effect.provide(NodeContext.layer),
  Effect.withLogSpan("paris-climate")
)

Effect.runPromise(runWithServices as Effect.Effect<void, unknown, never>).catch(handleError)
