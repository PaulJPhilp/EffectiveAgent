// Load environment variables first
import "./load-env.js";

// e2e structured output (JSON) test for Google Gemini 2.5 Flash
// Run with:
// bun run src/e2e/usecase/structured-output-google-gemini-2.5-flash.ts

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

// Define the schema for the structured output
const UserProfileSchema = S.Struct({
  name: S.String,
  age: S.Number,
  isStudent: S.Boolean,
  courses: S.Array(S.String)
});

const chatOptions: ProviderChatOptions = {
  modelId: "gemini-2.5-flash",
  system: "You are a helpful AI assistant. You must only output valid JSON that conforms to the user's request. Do not include any other text or markdown formatting."
};

const extractText = (msg: EffectiveMessage): string => msg.parts.pipe(Chunk.filter(part => part._tag === "Text"), Chunk.map(p => (p as TextPart).content), Chunk.join(" "));

const testEffect = Effect.gen(function* () {
  yield* Effect.logInfo("Setup:", { details: "Getting Google provider client for gemini-2.5-flash structured output test" });

  const providerService = yield* ProviderService;
    const client = yield* providerService.getProviderClient("google");

  const userPrompt = "Generate a JSON object for a fictional user named John Doe, who is 30 years old, not a student, and is taking 'History' and 'Math'.";

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
  const decodedProfile = yield* S.decode(UserProfileSchema)(parsedJson).pipe(
    Effect.tapError(error => Effect.logError("Schema validation failed", { error: error.toString() })),
    Effect.mapError(() => new Error("Schema validation failed"))
  );

  yield* Effect.logInfo("JSON validation passed.");

  // Assertions
  deepStrictEqual(decodedProfile.name, "John Doe");
  deepStrictEqual(decodedProfile.age, 30);
  deepStrictEqual(decodedProfile.isStudent, false);
  deepStrictEqual(decodedProfile.courses.length, 2);
  ok(decodedProfile.courses.includes("History"));
  ok(decodedProfile.courses.includes("Math"));

  yield* Effect.logInfo("Assertions Passed: User profile data is correct.");
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