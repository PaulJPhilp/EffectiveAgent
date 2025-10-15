/**
 * e2e simple chat test using ea-cli chat command with Google Gemini
 */

import { join } from "node:path";
import { Args, Command } from "@effect/cli";
import { NodeContext } from "@effect/platform-node";
import { Message, TextPart } from "@effective-agent/ai-sdk";
import { Chunk, Console, Effect, Option, pipe } from "effect";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { EffectiveInput } from "@/types.js";

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(
  process.cwd(),
  "src/e2e/config/master-config.json"
);

const prompts = [
  "Let's have a conversation about France. What is the capital of France?",
  "What is the population?",
  "What famous museum?",
];

// Create chat command
const makeChatCommand = Effect.gen(function* () {
  // Get required services
  const provider = yield* ProviderService;
  const model = yield* ModelService;

  return {
    chat: (input: string, messages: Chunk.Chunk<Message> = Chunk.empty()) =>
      Effect.gen(function* () {
        // Load available models
        const models = yield* model.load();
        const defaultModel = models.models[0];

        // Create message with user input
        const message = new Message({
          role: "user",
          parts: Chunk.fromIterable([
            new TextPart({ _tag: "Text", content: input }),
          ]),
        });

        // Get provider client and send chat request
        const client = yield* provider.getProviderClient("google");
        const response = yield* client.chat(
          new EffectiveInput(input, messages),
          {
            modelId: "gemini-2.5-flash",
            tools: [],
            system:
              "You are a helpful assistant that provides accurate, factual answers about France. Keep your responses brief and focused.",
          }
        );

        return response;
      }),
  };
});

// Create chat command
const chatCommand = Command.make(
  "chat",
  {
    message: Args.text({ name: "message" }).pipe(
      Args.withDescription("Message to send to the AI assistant")
    ),
  },
  ({ message }) =>
    pipe(
      Effect.gen(function* () {
        const service = yield* makeChatCommand;
        const response = yield* service.chat(message);
        yield* Console.log(response.data.text);
        return response;
      }),
      Effect.provide(ProviderService.Default),
      Effect.provide(ModelService.Default)
    )
);

const testEffect = Effect.gen(function* () {
  // Run chat command directly
  const service = yield* makeChatCommand;
  let messages = Chunk.empty<Message>();

  // Have a 3-turn conversation
  for (const prompt of prompts) {
    yield* Effect.logInfo(`Asking: ${prompt}`);
    const response = yield* service.chat(prompt, messages);
    yield* Effect.logInfo("AI Response:", response.data.text);

    // Add the new message to history if present
    if (response.effectiveMessage && Option.isSome(response.effectiveMessage)) {
      messages = Chunk.append(messages, response.effectiveMessage.value);
    }

    // Verify responses contain expected keywords
    const text = response.data.text.toLowerCase();
    if (prompt.includes("capital") && !text.includes("paris")) {
      return yield* Effect.fail(
        new Error(
          "Test failed: Response did not correctly identify Paris as the capital of France"
        )
      );
    } else if (prompt.includes("population") && !text.includes("million")) {
      return yield* Effect.fail(
        new Error(
          "Test failed: Response did not mention population in millions"
        )
      );
    } else if (prompt.includes("museum") && !text.includes("louvre")) {
      return yield* Effect.fail(
        new Error("Test failed: Response did not mention the Louvre museum")
      );
    }
  }

  yield* Effect.logInfo(
    "Test passed: All responses contained expected information"
  );
});

const handleError = (error: unknown) => {
  console.error("Test failed:", error);
  process.exit(1);
};

process.on("uncaughtException", handleError);
process.on("unhandledRejection", handleError);

const runWithServices = pipe(
  testEffect,
  Effect.provide(ModelService.Default),
  Effect.provide(ProviderService.Default),
  Effect.provide(ToolRegistryService.Default),
  Effect.provide(NodeContext.layer),
  Effect.withLogSpan("simple-chat-google-gemini")
);

Effect.runPromise(runWithServices as Effect.Effect<void, unknown, never>).catch(
  handleError
);
