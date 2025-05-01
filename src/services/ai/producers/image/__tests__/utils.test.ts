/**
 * @file Tests for image generation utility functions
 * @module services/ai/producers/image/__tests__/utils
 */

import { describe, it } from "@effect/vitest";
import { expect } from "vitest";
import {
    createContentImagePrompt,
    createNegativePrompt,
    createProductImagePrompt,
    enhancePrompt,
    formatImageUrl
} from "../utils.js";

describe("Image Generation Utilities", () => {
    describe("enhancePrompt", () => {
        it("should return base prompt when no options provided", () => {
            const basePrompt = "A mountain landscape";
            const result = enhancePrompt(basePrompt);
            expect(result).toBe(basePrompt);
        });

        it("should format prompt with all options", () => {
            const basePrompt = "A mountain landscape";
            const result = enhancePrompt(basePrompt, {
                style: "photorealistic",
                lighting: "golden hour",
                perspective: "wide angle",
                mood: "serene",
                detail: "high detail",
                format: "16:9"
            });

            expect(result).toBe(
                "A mountain landscape, Style: photorealistic, Lighting: golden hour, " +
                "Perspective: wide angle, Mood: serene, Detail: high detail, Format: 16:9"
            );
        });

        it("should include only provided options", () => {
            const basePrompt = "A mountain landscape";
            const result = enhancePrompt(basePrompt, {
                style: "photorealistic",
                lighting: "golden hour"
            });

            expect(result).toBe(
                "A mountain landscape, Style: photorealistic, Lighting: golden hour"
            );
        });
    });

    describe("createNegativePrompt", () => {
        it("should return default negative prompts when no exclusions added", () => {
            const result = createNegativePrompt();
            expect(result).toContain("blurry");
            expect(result).toContain("distorted");
            expect(result).toContain("low quality");
        });

        it("should include additional exclusions", () => {
            const result = createNegativePrompt(["text", "writing", "cartoon style"]);
            expect(result).toContain("blurry");
            expect(result).toContain("text");
            expect(result).toContain("writing");
            expect(result).toContain("cartoon style");
        });
    });

    describe("createProductImagePrompt", () => {
        it("should create a product image prompt with no features", () => {
            const result = createProductImagePrompt("smartphone", "electronics", []);
            expect(result).toContain("Professional product photography of a smartphone, electronics");
            expect(result).toContain("Style: product photography");
            expect(result).toContain("Lighting: studio lighting");
        });

        it("should create a product image prompt with features", () => {
            const result = createProductImagePrompt("smartphone", "electronics", ["curved edges", "OLED display"]);
            expect(result).toContain("Professional product photography of a smartphone, electronics, highlighting curved edges, OLED display");
            expect(result).toContain("Style: product photography");
            expect(result).toContain("Perspective: front view, 3/4 angle");
            expect(result).toContain("Format: clean white background");
        });
    });

    describe("createContentImagePrompt", () => {
        it("should create a content image prompt with default photographic style", () => {
            const result = createContentImagePrompt("artificial intelligence");

            // Check generated prompt
            expect(result.prompt).toContain("A compelling visual representation of artificial intelligence");
            expect(result.prompt).toContain("Style: professional photography, realistic");
            expect(result.prompt).toContain("natural lighting");

            // Check negative prompt
            expect(result.negativePrompt).toContain("text");
            expect(result.negativePrompt).toContain("UI elements");
            expect(result.negativePrompt).toContain("human faces");
        });

        it("should include context when provided", () => {
            const result = createContentImagePrompt(
                "machine learning",
                "neural networks processing data"
            );

            expect(result.prompt).toContain("A compelling visual representation of machine learning showing neural networks processing data");
        });

        it("should apply digital art style correctly", () => {
            const result = createContentImagePrompt("blockchain technology", undefined, "digital");

            expect(result.prompt).toContain("Style: digital art, 3D render, vibrant colors");
            expect(result.prompt).toContain("soft ambient light");
            expect(result.prompt).toContain("modern, professional");
        });

        it("should apply artistic style correctly", () => {
            const result = createContentImagePrompt("climate change", undefined, "artistic");

            expect(result.prompt).toContain("Style: artistic illustration, painterly style");
            expect(result.prompt).toContain("dramatic lighting, high contrast");
            expect(result.prompt).toContain("expressive, emotional");
        });

        it("should apply minimalist style correctly", () => {
            const result = createContentImagePrompt("web design principles", undefined, "minimalist");

            expect(result.prompt).toContain("Style: minimalist design, limited color palette");
            expect(result.prompt).toContain("flat lighting");
            expect(result.prompt).toContain("clean lines, simple shapes");
        });
    });

    describe("formatImageUrl", () => {
        it("should return empty string for empty URL", () => {
            expect(formatImageUrl("")).toBe("");
        });

        it("should return original URL for full format", () => {
            const url = "https://example.com/image.jpg";
            expect(formatImageUrl(url, "full")).toBe(url);
        });

        it("should append width parameter for thumbnail", () => {
            const url = "https://example.com/image.jpg";
            expect(formatImageUrl(url, "thumbnail")).toBe("https://example.com/image.jpg?width=100");
        });

        it("should append width parameter for preview", () => {
            const url = "https://example.com/image.jpg";
            expect(formatImageUrl(url, "preview")).toBe("https://example.com/image.jpg?width=512");
        });

        it("should handle URLs that already have query parameters", () => {
            const url = "https://example.com/image.jpg?token=123";
            expect(formatImageUrl(url, "thumbnail")).toBe("https://example.com/image.jpg?token=123&width=100");
        });
    });
}); 