import { EffectiveResponse } from "@/types.js";
import { Effect } from "effect";
import type { ChatCompletionOptions, ChatService } from "../service.js";
import { ChatServiceApi } from "../api.js";
// Inline definition for test harness dependencies
interface AiServiceDeps {
  modelService: unknown;
  providerService: unknown;
}


export class TestChatService extends Effect.Service<ChatServiceApi>()('TestChatService', {
  effect: Effect.succeed({
    create: (options: ChatCompletionOptions) =>
      Effect.succeed({
        data: "Hello, world!", // Assuming the string response goes into 'data'
        metadata: { /* mock metadata if needed */ },
        // Add other required fields of EffectiveResponse like usage, finishReason if necessary for the test
      } as EffectiveResponse<string>)
  })
}) { }

export default TestChatService;
