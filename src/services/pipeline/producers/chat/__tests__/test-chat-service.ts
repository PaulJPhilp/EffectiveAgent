import { Effect } from "effect";
import { ChatCompletionOptions, ChatServiceApi } from "../service.js";
// Inline definition for test harness dependencies
interface AiServiceDeps {
  modelService: unknown;
  providerService: unknown;
}

import { User } from "@/services/pipeline/input/schema.js";
import { AiResponse } from "@effect/ai";

export class TestChatService extends Effect.Service<ChatServiceApi>()('TestChatService', {
  effect: Effect.succeed({
    create: (options: ChatCompletionOptions) =>
      Effect.succeed(
        AiResponse.fromText({
          role: new User(),
          content: "Hello, world!"
        })
      )
  })
}) { }

export default TestChatService;
