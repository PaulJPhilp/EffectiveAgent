import { ChatService } from "@/services/pipeline/producers/chat/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ChatInputError } from "@/services/pipeline/producers/chat/errors.js";
import { type ChatCompletionOptions } from "@/services/pipeline/producers/chat/types.js";
import { describe, expect, it } from "vitest";

describe("ChatService (Integration)", () => {
  // Create explicit dependency layers following centralized pattern
  const fileSystemLayer = NodeFileSystem.layer;
  const configurationLayer = Layer.provide(
    ConfigurationService.Default,
    fileSystemLayer
  );
  const providerLayer = Layer.provide(
    ProviderService.Default,
    Layer.mergeAll(configurationLayer, fileSystemLayer)
  );
  const modelLayer = Layer.provide(
    ModelService.Default,
    configurationLayer
  );
  const chatServiceTestLayer = Layer.provide(
    ChatService.Default,
    Layer.mergeAll(modelLayer, providerLayer)
  );

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
        Effect.provide(chatServiceTestLayer)
      )
    );
  });
});
