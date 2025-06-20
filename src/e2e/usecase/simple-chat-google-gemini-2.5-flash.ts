// Load environment variables first
import "./load-env.js";

// e2e simple chat test for Google Gemini 2.5 Flash (direct Effect, no CLI)
// Run with:
// bun run src/e2e/usecase/simple-chat-google-gemini-2.5-flash.ts

import { TextPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/index.js";
import { ProviderService } from "@/services/ai/provider/index.js";
import type { GenerateTextResult, ProviderChatOptions, ProviderClientApi } from "@/services/ai/provider/types.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/index.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { EffectiveInput, EffectiveMessage, ProviderEffectiveResponse } from "@/types.js"; // EffectiveMessage is re-exported from @/schema.js via @/types.js
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Chunk, Effect, Option, pipe } from "effect";
import { join } from "path";

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(process.cwd(), "src/e2e/config/master-config.json");

const systemPrompt = "You are a helpful AI assistant. Your goal is to provide concise and accurate answers.";
const chatOptions: ProviderChatOptions = {
  modelId: "gemini-2.5-flash",
  system: "You are a helpful assistant. Be concise."
};

// Run the test with all dependencies provided
const testEffect = Effect.gen(function* () {
  return yield* Effect.gen(function* () {
    // Get required services
    const providerService = yield* ProviderService;
    yield* Effect.logInfo("Setup:", { details: "Getting Google provider client for gemini-2.5-flash chat test" });
    const client: ProviderClientApi = yield* providerService.getProviderClient("google");

    const extractText = (msg: EffectiveMessage): string => msg.parts.pipe(Chunk.filter(part => part._tag === "Text"), Chunk.map(p => (p as TextPart).content), Chunk.join(" "));

    // --- Turn 1 ---
    const userMessage1Content = "What is the capital of France?";
    const userMessage1 = new EffectiveMessage({
      role: "user",
      parts: Chunk.make(new TextPart({ _tag: "Text", content: userMessage1Content }))
    });
    const input1 = new EffectiveInput(
      userMessage1Content,
      Chunk.make(userMessage1)
    );

    yield* Effect.logInfo("Turn 1 Request:", { content: userMessage1Content });
    const response1: ProviderEffectiveResponse<GenerateTextResult> = yield* client.chat(input1, chatOptions);
    yield* Effect.logInfo("Turn 1 Response:", { text: response1.data.text });

    // --- Validate and Extract Assistant Message for Turn 1 ---
    const assistantMessage1Opt = response1.effectiveMessage;
    if (!assistantMessage1Opt || Option.isNone(assistantMessage1Opt)) {
      const error = new Error("Test failed: No assistant message found in the first response.");
      yield* Effect.logError(error.message, { response: response1 });
      return yield* Effect.fail(error);
    }
    // assistantMessage1Opt.value is already an EffectiveMessage, mapped by the provider client.
    const assistantMessage1 = assistantMessage1Opt.value;

    // Assertion for Turn 1
    const assistant1Text = extractText(assistantMessage1);
    if (!assistant1Text.toLowerCase().includes("paris")) {
      const assertionError = new Error("Assertion Failed: Turn 1 - Response for 'capital of France' did not contain 'Paris'. Got: " + assistant1Text);
      yield* Effect.logError(assertionError.message, { response: assistant1Text });
      return yield* Effect.fail(assertionError);
    }
    yield* Effect.logInfo("Assertion Passed: Turn 1 - Response contains 'Paris'");

    // --- Turn 2 ---
    const userMessage2Content = "What is a famous landmark there?";
    const userMessage2 = new EffectiveMessage({
      role: "user",
      parts: Chunk.make(new TextPart({ _tag: "Text", content: userMessage2Content }))
    });
    // Accumulate history for the next turn
    const messagesTurn2 = Chunk.make(userMessage1, assistantMessage1, userMessage2);
    const input2 = new EffectiveInput(
      userMessage2Content,
      messagesTurn2
    );

    yield* Effect.logInfo("Turn 2 Request:", { content: userMessage2Content });
    const response2: ProviderEffectiveResponse<GenerateTextResult> = yield* client.chat(input2, chatOptions);
    yield* Effect.logInfo("Turn 2 Response:", { text: response2.data.text });

    // --- Validate and Extract Assistant Message for Turn 2 ---
    const assistantMessage2Opt = response2.effectiveMessage;
    if (!assistantMessage2Opt || Option.isNone(assistantMessage2Opt)) {
      const error = new Error("Test failed: No assistant message found in the second response.");
      yield* Effect.logError(error.message, { response: response2 });
      return yield* Effect.fail(error);
    }
    // assistantMessage2Opt.value is already an EffectiveMessage, mapped by the provider client.
    const assistantMessage2 = assistantMessage2Opt.value;

    // Assertion for Turn 2
    const assistant2Text = extractText(assistantMessage2);
    if (!assistant2Text.toLowerCase().includes("eiffel tower")) {
      const assertionError = new Error("Assertion Failed: Turn 2 - Response for 'famous landmark' did not contain 'Eiffel Tower'. Got: " + assistant2Text);
      yield* Effect.logError(assertionError.message, { response: assistant2Text });
      return yield* Effect.fail(assertionError);
    }
    yield* Effect.logInfo("Assertion Passed: Turn 2 - Response contains 'Eiffel Tower'");

    // --- Turn 3 ---
    const userMessage3Content = "When was it built?";
    const userMessage3 = new EffectiveMessage({
      role: "user",
      parts: Chunk.make(new TextPart({ _tag: "Text", content: userMessage3Content }))
    });
    // Accumulate history for the next turn
    const messagesTurn3 = Chunk.make(userMessage1, assistantMessage1, userMessage2, assistantMessage2, userMessage3);
    const input3 = new EffectiveInput(
      userMessage3Content,
      messagesTurn3
    );

    yield* Effect.logInfo("Turn 3 Request:", { content: userMessage3Content });
    const response3 = yield* client.chat(input3, chatOptions);
    yield* Effect.logInfo("Turn 3 Response:", { text: response3.data.text });

    // --- Validate and Extract Assistant Message for Turn 3 ---
    const assistantMessage3Opt = response3.effectiveMessage;
    if (!assistantMessage3Opt || Option.isNone(assistantMessage3Opt)) {
      const error = new Error("Test failed: No assistant message found in the third response.");
      yield* Effect.logError(error.message, { response: response3 });
      return yield* Effect.fail(error);
    }
    const assistantMessage3 = assistantMessage3Opt.value;

    // Assertion for Turn 3
    const assistant3Text = extractText(assistantMessage3);
    if (!assistant3Text.includes("1889")) { // Assuming the landmark is Eiffel Tower, built in 1889
      const assertionError = new Error("Assertion Failed: Turn 3 - Response for 'when built' did not contain '1889'. Got: " + assistant3Text);
      yield* Effect.logError(assertionError.message, { response: assistant3Text });
      return yield* Effect.fail(assertionError);
    }
    yield* Effect.logInfo("Assertion Passed: Turn 3 - Response contains '1889'");

    yield* Effect.logInfo("Summary:", { title: "Full Conversation History (extracted text)" });
    yield* Effect.logInfo("User 1:", { text: extractText(userMessage1) });
    yield* Effect.logInfo("Assistant 1:", { text: extractText(assistantMessage1) });
    yield* Effect.logInfo("User 2:", { text: extractText(userMessage2) });
    yield* Effect.logInfo("Assistant 2:", { text: extractText(assistantMessage2) });
    yield* Effect.logInfo("User 3:", { text: extractText(userMessage3) });
    yield* Effect.logInfo("Assistant 3:", { text: extractText(assistantMessage3) });

    return Effect.succeed(void 0);
  })
}).pipe(
  Effect.map(() => void 0)
);

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
