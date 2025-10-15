import { Effect } from "effect";
import { fetchGlobalModels } from "./modelsDev";

export interface ModelsRegistryApi {
    readonly list: Effect.Effect<any, any, any[]>;
}

export class ModelsRegistryService extends Effect.Service<ModelsRegistryApi>()(
    "ModelsRegistry",
    {
        effect: Effect.gen(function* () {
            // list is an effect that fetches canonical models from the required models.dev adapter.
            const list = Effect.promise(() => fetchGlobalModels() as Promise<any[]>) as any;

            return {
                list,
            } satisfies ModelsRegistryApi;
        }),
        // No additional dependencies: this service expects models.dev to be available at runtime
    }
)
{ };

// Export the Default layer so tests can provide a mock via Layer.succeed(ModelsRegistryService.Default, impl)
export const ModelsRegistryDefault = ModelsRegistryService.Default;

export const ModelsRegistryLive = ModelsRegistryService.Default;

export type ModelsRegistry = ModelsRegistryApi;

// Preflight check: attempt to fetch models once to surface problems early (exports an Effect)
export const ensureModelsDevAvailable: Effect.Effect<unknown, unknown, void> = Effect.promise(
    () => fetchGlobalModels().then(() => undefined)
).pipe(Effect.mapError((err) => err));
