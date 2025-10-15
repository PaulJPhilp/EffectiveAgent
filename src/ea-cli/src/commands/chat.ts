import { Args, Command } from "@effect/cli"
import { Chunk, Console, Data, Effect, pipe } from "effect"
import { Message, TextPart } from "@/schema.js"
import type { ModelServiceApi } from "@/services/ai/model/api.js"
import type { ModelNotFoundError } from "@/services/ai/model/errors.js"
import { ModelService } from "@/services/ai/model/service.js"
import type { ProviderServiceApi } from "@/services/ai/provider/api.js"
import type {
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
} from "@/services/ai/provider/errors.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { EffectiveInput, type ToolExecutionError } from "@/types.js"

/**
 * Union type of all possible errors that can occur during chat operations
 */
type ChatError =
  | ModelNotFoundError
  | ProviderServiceConfigError
  | ProviderNotFoundError
  | ProviderOperationError
  | ToolExecutionError

/**
 * API interface for the chat service
 */
interface ChatServiceApi {
  /**
   * Sends a chat message to the AI provider and returns the response
   *
   * @param input - The user's input message
   * @returns Effect producing the AI response string or ChatError
   */
  chat: (
    input: string,
  ) => Effect.Effect<string, ChatError, ProviderServiceApi | ModelServiceApi>
}

/**
 * Implementation of the chat service using Effect.Service pattern
 */
const makeChatService = Effect.gen(function* () {
  // Get required services
  const provider = yield* ProviderService
  const model = yield* ModelService

  return {
    chat: (input: string) =>
      Effect.gen(function* () {
        // Load available models
        const models = yield* model.load()
        const defaultModel = models.models[0]

        // Create message with user input
        const message = new Message({
          role: "user",
          parts: Chunk.fromIterable([
            new TextPart({ _tag: "Text", content: input }),
          ]),
        })

        // Get provider client and send chat request
        const client = yield* provider.getProviderClient("google")
        const response = yield* client.generateText(
          new EffectiveInput(input, Chunk.fromIterable([message])),
          {
            modelId: defaultModel.id,
            system:
              "You are a helpful assistant that provides accurate, factual answers.",
          },
        )

        return response.data
      }),
  }
})

export class ChatService extends Effect.Service<ChatServiceApi>()(
  "ChatService",
  {
    effect: makeChatService,
    dependencies: [ProviderService.Default, ModelService.Default],
  },
) {}

// Create CLI command
export const chatCommand = Command.make(
  "chat",
  {
    message: Args.text({ name: "message" }).pipe(
      Args.withDescription("Message to send to the AI assistant"),
    ),
  },
  ({ message }) =>
    Effect.gen(function* () {
      const service = yield* ChatService
      const response = yield* service.chat(message)
      yield* Console.log(response)
      return Effect.succeed(void 0)
    }).pipe(Effect.provide(ChatService.Default)),
).pipe(Command.withDescription("Chat with the AI assistant"))
