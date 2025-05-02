import { Effect } from "effect";
import { ChatServiceApi, ChatCompletionOptions } from "../service.js";
// Inline definition for test harness dependencies
interface AiServiceDeps {
  modelService: unknown;
  providerService: unknown;
}

import { EffectiveError } from "@/effective-error.js";
import { AiResponse } from "@effect/ai/AiResponse";
import { User } from "@effect/ai/AiRole";

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
}) {}

export default TestChatService;
