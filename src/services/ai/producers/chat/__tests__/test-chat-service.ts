import { Effect } from "effect";
import { ChatServiceApi } from "../service.js";
// Inline definition for test harness dependencies
interface AiServiceDeps {
  modelService: unknown;
  providerService: unknown;
}

import { ChatCompletionOptions } from "../service.js";
import { EffectiveError } from "@/effective-error.js";
import { AiResponse } from "@effect/ai/AiResponse";
import { User } from "@effect/ai/AiRole";

export class TestChatService implements ChatServiceApi {
  constructor(private readonly deps: AiServiceDeps) {}

  /**
   * Mock implementation of create for testing.
   * Returns a fixed AiResponse for happy path.
   */
  create(options: ChatCompletionOptions): Effect.Effect<AiResponse, EffectiveError> {
    // Use AiResponse.fromText for a valid minimal response
    return Effect.succeed(
      AiResponse.fromText({
        role: new User(),
        content: "Hello, world!"
      })
    );
  }
}

export default TestChatService;
