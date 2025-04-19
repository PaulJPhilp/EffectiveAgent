import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { ProviderClient, ProviderClientApi } from "../client.js";
import { ProviderConfigError } from "../errors.js";
import { ProvidersType } from "../schema.js";
import { ProviderService, ProviderServiceType } from "../service.js";

// --- Mock Base ProviderClient ---
const mockBaseClient: ProviderClientApi = {
    setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => Effect.die("Mock base setVercelProvider called"),
    generateText: (modelId: string, prompt: string) => Effect.die("Mock base generateText called") as any,
    streamText: (modelId: string, prompt: string) => Effect.die("Mock base streamText called") as any,
    generateObject: (modelId: string, prompt: string) => Effect.die("Mock base generateObject called") as any,
    streamObject: (modelId: string, prompt: string) => Effect.die("Mock base streamObject called") as any,
    generateSpeech: (modelId: string, prompt: string) => Effect.die("Mock base generateSpeech called") as any,
    generateImage: (modelId: string, prompt: string) => Effect.die("Mock base generateImage called") as any,
    transcribe: (modelId: string, prompt: string) => Effect.die("Mock base transcribe called") as any,
    embedding: (modelId: string, prompt: string) => Effect.die("Mock base embedding called") as any,
};
const mockBaseClientLayer = Layer.succeed(ProviderClient, mockBaseClient);
// --- End Mock ---

const providersJsonPath = path.resolve(__dirname, "providers.json");
const validConfig = fs.readFileSync(providersJsonPath, "utf-8");

const validConfigLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([["provider", validConfig]]))
);
const invalidJsonLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([["provider", "not a json"]]))
);
const invalidSchemaLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([["provider", JSON.stringify({ description: "Missing name and providers" })]]))
);

describe("ProviderService", () => {
    it("loads and validates provider config successfully", async () => {
        const effect: Effect.Effect<void, ProviderConfigError, ProviderServiceType | ConfigProvider.ConfigProvider> = Effect.gen(function* () {
            const service = yield* ProviderService;
            const loaded = yield* service.load();
            expect(loaded.name).toBe("test-provider-config");
            expect(loaded.providers.length).toBeGreaterThan(0);
        });

        const layer = Layer.provideMerge(validConfigLayer, ProviderService.Default);
        const runnable = effect.pipe(Effect.provide(layer));
        await Effect.runPromise(runnable);
    });

    it("fails with ProviderConfigError if config is invalid JSON", async () => {
        const effect: Effect.Effect<any, ProviderConfigError, ProviderServiceType | ConfigProvider.ConfigProvider> = Effect.gen(function* () {
            const service = yield* ProviderService;
            return yield* service.load();
        });

        const layer = Layer.provideMerge(invalidJsonLayer, ProviderService.Default);
        const runnable = Effect.exit(effect).pipe(Effect.provide(layer));
        const exit = await Effect.runPromise(runnable);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const error = Option.getOrThrow(Cause.failureOption(exit.cause));
            expect(error).toBeInstanceOf(ProviderConfigError);
        }
    });

    it("fails with ProviderConfigError if config fails schema validation", async () => {
        const effect: Effect.Effect<any, ProviderConfigError, ProviderServiceType | ConfigProvider.ConfigProvider> = Effect.gen(function* () {
            const service = yield* ProviderService;
            return yield* service.load();
        });

        const layer = Layer.provideMerge(invalidSchemaLayer, ProviderService.Default);
        const runnable = Effect.exit(effect).pipe(Effect.provide(layer));
        const exit = await Effect.runPromise(runnable);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const error = Option.getOrThrow(Cause.failureOption(exit.cause));
            expect(error).toBeInstanceOf(ProviderConfigError);
        }
    });

    it("retrieves a provider client successfully", async () => {
        const effect: Effect.Effect<void, unknown, ProviderServiceType | ConfigProvider.ConfigProvider | ProviderClient> = Effect.gen(function* () {
            const service = yield* ProviderService;
            yield* service.load();
            const client = yield* service.getProviderClient("openai");
            expect(client).toBeDefined();
        });

        const layer = Layer.mergeAll(validConfigLayer, ProviderService.Default, mockBaseClientLayer);
        const runnable = effect.pipe(Effect.provide(layer));
        await Effect.runPromise(runnable as Effect.Effect<void, unknown, never>);
    });

    it("fails to retrieve a provider client if not found", async () => {
        const effect: Effect.Effect<any, ProviderConfigError, ProviderServiceType | ConfigProvider.ConfigProvider> = Effect.gen(function* () {
            const service = yield* ProviderService;
            yield* service.load();
            // @ts-expect-error - testing invalid provider name explicitly
            return yield* service.getProviderClient("notarealprovider");
        });

        const layer = Layer.provideMerge(validConfigLayer, ProviderService.Default);
        const runnable = Effect.exit(effect).pipe(Effect.provide(layer));
        const exit = await Effect.runPromise(runnable);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const error = Option.getOrThrow(Cause.failureOption(exit.cause));
            expect(error).toBeInstanceOf(ProviderConfigError);
            expect((error as ProviderConfigError).message).toContain("No ProviderClient layer found");
        }
    });
});
