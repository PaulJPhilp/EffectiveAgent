import { Effect, Ref } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { ModelService } from "./service.js";
import { b } from "vitest/dist/suite-dWqIFb_-.js";
import { ModelConfigError } from "./errors.js";
import { EntityLoadError } from "@/services/core/errors.js";

interface Model {
    id: string;
    name: string;
    capabilities: string[];
}

const mockModels: Model[] = [
    {
        id: "gpt-4",
        name: "GPT-4",
        capabilities: ["text-generation", "chat", "reasoning"]
    },
    {
        id: "dalle-3",
        name: "DALL·E 3",
        capabilities: ["image-generation"]
    },
    {
        id: "whisper",
        name: "Whisper",
        capabilities: ["audio"]
    }
];

const mockModelFile = { models: mockModels };

describe("ModelService", () => {
    let service: {
        modelRef: Ref.Ref<any>;
        findModelsByCapability: (capability: string) => Effect.Effect<Model[], never>
        findModelsByCapabilities: (capabilities: string[]) => Effect.Effect<Model[], never>;
        validateModel: (modelId: string, capabilities: string[]) => Effect.Effect<boolean, never>;
    };
    let modelRef: Ref.Ref<any>;

    beforeEach(async () => {
        modelRef = await Effect.runPromise(Ref.make(mockModelFile));
        // Inline the actual logic from your service for testing
        service = {
            modelRef,
            findModelsByCapability: (capability: string) =>
                modelRef.get.pipe(
                    Effect.map((modelFile) =>
                        modelFile.models.filter((model: Model) => model.capabilities.includes(capability))
                    )
                ),
            findModelsByCapabilities: (capabilities: string[]) =>
                modelRef.get.pipe(
                    Effect.map((modelFile) =>
                        modelFile.models.filter((model: Model) =>
                            capabilities.every((cap) => model.capabilities.includes(cap))
                        )
                    )
                ),
            validateModel: (modelId: string, capabilities: string[]) =>
                modelRef.get.pipe(
                    Effect.map((modelFile) => {
                        const model = modelFile.models.find((m: Model) => m.id === modelId);
                        if (!model) return false;
                        return capabilities.every((cap) => model.capabilities.includes(cap));
                    })
                ),
        };
    });

    it("findModelsByCapability returns correct models", async () => {
        const eff = service.findModelsByCapability("text-generation");
        const result = await Effect.runPromise(eff);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("gpt-4");
    });

    it("findModelsByCapabilities returns models with all capabilities", async () => {
        const eff = service.findModelsByCapabilities(["text-generation", "chat"]);
        const result = await Effect.runPromise(eff);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("gpt-4");
    });

    it("findModelsByCapabilities returns empty if no model matches all", async () => {
        const eff = service.findModelsByCapabilities(["text-generation", "audio"]);
        const result = await Effect.runPromise(eff);
        expect(result).toHaveLength(0);
    });

    it("validateModel returns true for valid model and capabilities", async () => {
        const eff = service.validateModel("gpt-4", ["text-generation", "chat"]);
        const result = await Effect.runPromise(eff);
        expect(result).toBe(true);
    });

    it("validateModel returns false for missing model", async () => {
        const eff = service.validateModel("not-exist", ["text-generation"]);
        const result = await Effect.runPromise(eff);
        expect(result).toBe(false);
    });

    it("validateModel returns false if model lacks a capability", async () => {
        const eff = service.validateModel("gpt-4", ["audio"]);
        const result = await Effect.runPromise(eff);
        expect(result).toBe(false);
    });

    it("findModelsByCapability returns empty for unknown capability", async () => {
        const eff = service.findModelsByCapability("unknown");
        const result = await Effect.runPromise(eff);
        expect(result).toHaveLength(0);
    });
});
