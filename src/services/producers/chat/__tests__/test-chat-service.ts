import { Effect } from "effect";
import type { EffectiveResponse } from "@/types.js";
import type { ChatServiceApi } from "../api.js";
import type { ChatService } from "../service.js";
import type { ChatCompletionOptions } from "../types.js";

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
