
import { Effect, Either, Option } from "effect";
import { describe, expect, it } from "vitest";
import { ImageGenerationError, ImageModelError, ImageSizeError } from "../errors.js";
import { ImageQualities, ImageService, ImageSizes, ImageStyles } from "../service.js";

// Helper to create test options
const createTestOptions = () => ({
  modelId: "test-model",
  prompt: "A beautiful sunset",
  size: ImageSizes.MEDIUM,
  quality: ImageQualities.STANDARD,
  style: ImageStyles.NATURAL,
  n: 1,
  system: Option.none()
});

describe("ImageService Integration Tests", () => {
  it("should generate a valid image", () => {
    return Effect.gen(function* () {
      const imageService = yield* ImageService;
      
      // Generate the image
      const response = yield* imageService.generate(createTestOptions());
      
      // Check the response structure
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.imageUrl).toBeDefined();
      expect(response.data.model).toBeDefined();
      expect(response.data.usage).toBeDefined();
      expect(response.data.timestamp).toBeDefined();
      expect(response.data.id).toBeDefined();
      
      // Check metadata
      expect(response.metadata).toBeDefined();
      
      // Check agent state was updated
      const state = yield* imageService.getAgentState();
      expect(state.generationCount).toBe(1);
      expect(state.generationHistory).toHaveLength(1);
      expect(state.generationHistory[0].success).toBe(true);
      expect(state.generationHistory[0].imageCount).toBe(1);
    }).pipe(
      Effect.provide(ImageService.Default)
    );
  });

  it("should handle empty prompt error", () => {
    return Effect.gen(function* () {
      const imageService = yield* ImageService;
      
      const result = yield* Effect.either(imageService.generate({
        ...createTestOptions(),
        prompt: ""
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ImageGenerationError;
        expect(error).toBeInstanceOf(ImageGenerationError);
        expect(error.message).toContain("Prompt cannot be empty");
        expect(error.module).toBe("ImageService");
        expect(error.method).toBe("generate");
      }

      // Check agent state was updated with failure
      const state = yield* imageService.getAgentState();
      expect(state.generationHistory[0].success).toBe(false);
    }).pipe(
      Effect.provide(ImageService.Default)
    );
  });

  it("should handle missing model ID error", () => {
    return Effect.gen(function* () {
      const imageService = yield* ImageService;
      
      const result = yield* Effect.either(imageService.generate({
        ...createTestOptions(),
        modelId: undefined
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ImageModelError;
        expect(error).toBeInstanceOf(ImageModelError);
        expect(error.message).toContain("Model ID must be provided");
        expect(error.module).toBe("ImageService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ImageService.Default)
    );
  });

  it("should handle invalid size error", () => {
    return Effect.gen(function* () {
      const imageService = yield* ImageService;
      
      const result = yield* Effect.either(imageService.generate({
        ...createTestOptions(),
        size: "invalid-size" as any
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ImageSizeError;
        expect(error).toBeInstanceOf(ImageSizeError);
        expect(error.message).toContain("Invalid image size");
        expect(error.module).toBe("ImageService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ImageService.Default)
    );
  });

  it("should handle abort signal", () => {
    return Effect.gen(function* () {
      const imageService = yield* ImageService;
      
      const controller = new AbortController();
      const options = {
        ...createTestOptions(),
        signal: controller.signal
      };

      // Abort immediately
      controller.abort();

      const result = yield* Effect.either(imageService.generate(options));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ImageGenerationError;
        expect(error).toBeInstanceOf(ImageGenerationError);
        expect(error.message).toContain("aborted");
        expect(error.module).toBe("ImageService");
        expect(error.method).toBe("generate");
      }

      // Check agent state was updated with failure
      const state = yield* imageService.getAgentState();
      expect(state.generationHistory[0].success).toBe(false);
    }).pipe(
      Effect.provide(ImageService.Default)
    );
  });
});
