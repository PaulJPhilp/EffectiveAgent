/**
 * e2e structured output test for Google Gemini 2.5 Flash using ea-cli chat command
 */

import { Console, Effect, Chunk, pipe, Schema } from "effect"
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

// Define the schema for the structured output
const UserProfileSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  isStudent: Schema.Boolean,
  courses: Schema.Array(Schema.String)
})

type UserProfile = typeof UserProfileSchema.Type

const prompt = "Generate a JSON object for a fictional user named John Doe, who is 30 years old, not a student, and is taking 'History' and 'Math'."

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
          modelId: "gemini-2.5-flash",
          tools: [],
          system: "You are a JSON data generator. EXTREMELY IMPORTANT: You must return ONLY raw JSON data. DO NOT use markdown formatting. DO NOT use code blocks. DO NOT add any explanations or text before or after the JSON. The response must start with { and end with }. No backticks, no ```json, no markdown at all.\n\nThe JSON must match this exact schema:\n{\n  \"name\": string (must be 'John Doe'),\n  \"age\": number (must be 30),\n  \"isStudent\": boolean (must be false),\n  \"courses\": string[] (must include ['History', 'Math'])\n}"
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
  const decodedProfile = yield* Schema.decode(UserProfileSchema)(parsed).pipe(
    Effect.tapError((error: unknown) => Effect.logError("Schema validation failed", { error: String(error) })),
    Effect.mapError(() => new Error("Schema validation failed"))
  )

  // Basic assertions
  const profile = decodedProfile as UserProfile
  ok(profile.name === "John Doe", "Name should be John Doe")
  ok(profile.age === 30, "Age should be 30")
  ok(profile.isStudent === false, "isStudent should be false")
  ok(profile.courses.length === 2, "Should have exactly 2 courses")
  ok(profile.courses.includes("History"), "Should include History course")
  ok(profile.courses.includes("Math"), "Should include Math course")

  yield* Effect.logInfo("Structured output test passed: User profile data is valid")
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
  Effect.withLogSpan("user-profile")
)

Effect.runPromise(runWithServices as Effect.Effect<void, unknown, never>).catch(handleError)