import { ChatService } from "@/services/pipeline/producers/chat/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";

import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ChatInputError } from "@/services/pipeline/producers/chat/errors.js";
import { type ChatCompletionOptions } from "@/services/pipeline/producers/chat/types.js";
import { describe, expect, it } from "vitest";

describe("ChatService (Integration)", () => {
  describe("generate", () => {
    it("should fail when input is empty", () =>
      Effect.gen(function* () {
        const service = yield* ChatService;
        const result = yield* service.generate({
          input: "",
          modelId: "gpt-4"
        } as ChatCompletionOptions).pipe(
          Effect.flip
        );
        expect(result).toBeInstanceOf(ChatInputError);
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });
});
