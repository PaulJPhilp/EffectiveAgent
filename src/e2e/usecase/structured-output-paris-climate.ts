// Load environment variables first
import "./load-env.js";

// e2e structured output (JSON) test for Google Gemini 2.0 Flash - Paris Climate Data
// Run with:
// bun run src/e2e/usecase/structured-output-paris-climate.ts

import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/index.js";
import type { ProviderServiceApi } from "@/services/ai/provider/api.js";
import { ProviderService } from "@/services/ai/provider/index.js";
import type { ToolRegistryApi } from "@/services/ai/tool-registry/api.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/index.js";
import type { ConfigurationServiceApi } from "@/services/core/configuration/api.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { EffectiveInput, EffectiveMessage, ProviderEffectiveResponse } from "@/types.js";
import { TextPart } from "@/schema.js";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { GenerateTextResult, ProviderChatOptions } from "@/services/ai/provider/types.js";
import { Chunk, Effect, Option, pipe } from "effect";
import * as S from "@effect/schema/Schema";
import { join } from "path";
import { deepStrictEqual, ok } from "node:assert";

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(process.cwd(), "src/e2e/config/master-config.json");

// Define the schema for the climate data
const MonthlyClimateSchema = S.Struct({
  month: S.String,
  average_temperature_celsius: S.Number,
  rainfall_mm: S.Number,
  humidity_percentage: S.Number
});

const ParisClimateSchema = S.Struct({
  city: S.String,
  country: S.String,
  climate_description: S.String,
  seasons: S.Struct({
    spring: S.String,
    summer: S.String,
    autumn: S.String,
    winter: S.String
  }),
  monthly_data: S.Array(MonthlyClimateSchema)
});

const chatOptions: ProviderChatOptions = {
  modelId: "gemini-2.0-flash",
  system: "You are a helpful AI assistant. You must only output valid JSON that conforms to the user's request. Do not include any other text or markdown formatting."
};

const extractText = (msg: EffectiveMessage): string => 
  msg.parts.pipe(
    Chunk.filter(part => part._tag === "Text"),
    Chunk.map(p => (p as TextPart).content),
    Chunk.join(" ")
  );

const testEffect = Effect.gen(function* () {
  yield* Effect.logInfo("Setup:", { details: "Getting Google provider client for gemini-2.0-flash structured output test" });

  const providerService = yield* ProviderService;
  const client = yield* providerService.getProviderClient("google");

  const userPrompt = "Generate a JSON object containing annual climate information for Paris, France. Include: city name, country, general climate description, seasons, and monthly data (average temperature in Celsius, rainfall in mm, and humidity percentage) for all 12 months.";

  const input: EffectiveInput = {
    text: userPrompt,
    messages: Chunk.empty()
  };

  yield* Effect.logInfo("Request:", { content: userPrompt });

  const response: ProviderEffectiveResponse<GenerateTextResult> = yield* client.chat(input, chatOptions);

  const assistantMessageOpt = response.effectiveMessage;
  if (Option.isNone(assistantMessageOpt)) {
    const error = new Error("Test failed: No assistant message found in the response.");
    yield* Effect.logError(error.message, { response });
    return yield* Effect.fail(error);
  }
  const assistantMessage = assistantMessageOpt.value;
  const assistantText = extractText(assistantMessage);

  yield* Effect.logInfo("Response:", { text: assistantText });

  // Attempt to parse the JSON from the response
  const parsedJson = yield* Effect.try({
    try: () => {
      // The model might wrap the JSON in ```json ... ```, so we need to extract it.
      const jsonMatch = assistantText.match(/\{.*\}/s);
      if (!jsonMatch?.[0]) {
        throw new Error("No JSON object found in the response.");
      }
      return JSON.parse(jsonMatch[0]);
    },
    catch: (error) => new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`)
  }).pipe(
    Effect.tapError(error => Effect.logError("JSON parsing failed", { error: error.message }))
  );

  // Validate the parsed JSON against the schema
  const decodedClimate = yield* S.decode(ParisClimateSchema)(parsedJson).pipe(
    Effect.tapError(error => Effect.logError("Schema validation failed", { error: error.toString() })),
    Effect.mapError(() => new Error("Schema validation failed"))
  );

  yield* Effect.logInfo("JSON validation passed.");

  // Basic assertions
  deepStrictEqual(decodedClimate.city, "Paris");
  deepStrictEqual(decodedClimate.country, "France");
  ok(decodedClimate.climate_description.length > 0, "Climate description should not be empty");
  ok(decodedClimate.seasons.spring.length > 0, "Spring season should not be empty");
  ok(decodedClimate.monthly_data.length === 12, "Should have data for all 12 months");

  // Validate temperature ranges (Paris typically ranges from 2°C to 25°C)
  for (const monthData of decodedClimate.monthly_data) {
    ok(monthData.average_temperature_celsius >= -5 && monthData.average_temperature_celsius <= 35,
      `Temperature ${monthData.average_temperature_celsius}°C for ${monthData.month} is outside reasonable range`);
    ok(monthData.rainfall_mm >= 0 && monthData.rainfall_mm <= 100,
      `Rainfall ${monthData.rainfall_mm}mm for ${monthData.month} is outside reasonable range`);
    ok(monthData.humidity_percentage >= 0 && monthData.humidity_percentage <= 100,
      `Humidity ${monthData.humidity_percentage}% for ${monthData.month} is outside reasonable range`);
  }

  yield* Effect.logInfo("Assertions Passed: Paris climate data is within expected ranges.");
});

// Run the test with all dependencies provided
const runWithServices = pipe(
  testEffect,
  Effect.provide(ConfigurationService.Default),
  Effect.provide(ToolRegistryService.Default),
  Effect.provide(ModelService.Default),
  Effect.provide(ProviderService.Default),
  Effect.provide(NodePath.layer),
  Effect.provide(NodeFileSystem.layer)
);

const handleTestError = (error: unknown) => Effect.sync(() => {
  console.error("Test failed:", error);
  process.exit(1);
});

const handleUnhandledError = () => {
  console.error("Test failed with unhandled error");
  process.exit(1);
};

const runWithErrorHandling = pipe(
  runWithServices,
  Effect.catchAll(handleTestError),
  Effect.map(() => void 0)
);

Effect.runPromise(runWithErrorHandling as Effect.Effect<void, never, never>).catch(handleUnhandledError);
