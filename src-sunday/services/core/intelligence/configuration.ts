/**
 * @file Loads and provides access to Intelligence Profile definitions
 * (e.g., from intelligences.json). Defines the Layer for the
 * IntelligenceConfiguration service Tag.
 * NOTE: Effect.cached removed due to persistent type inference issues.
 */

import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { Effect, Layer } from "effect";
import * as Record from "effect/Record";
import { ConfigLoaderApi, ConfigLoaderOptions } from "../configuration/index.js";
import { IntelligenceConfigurationError, IntelligenceProfileNotFoundError } from "./errors.js";
import type { IntelligenceProfile, IntelligencesConfig } from "./schema.js";
import { IntelligencesConfigSchema } from "./schema.js";
import { IntelligenceConfiguration } from "./types.js";

const CONFIG_FILENAME = "intelligences.json";

// --- Implementation ---

type LoadedIntelligenceConfig = {
    profiles: Readonly<Record<string, IntelligenceProfile>>;
};

const loadIntelligencesConfigEffect: Effect.Effect<
    LoadedIntelligenceConfig,
    IntelligenceConfigurationError,
    ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions
> = Effect.gen(function* () {
    const configLoader = yield* ConfigLoaderApi;
    const loadedConfig = (yield* configLoader.loadConfig(CONFIG_FILENAME, {
        schema: IntelligencesConfigSchema,
    })) as IntelligencesConfig;
    const profilesRecord = Record.fromEntries(
        loadedConfig.intelligences.map((p) => [p.name, p])
    );
    return { profiles: profilesRecord };
}).pipe(
    Effect.mapError(
        (cause) => new IntelligenceConfigurationError({ message: `Failed to load or parse ${CONFIG_FILENAME}`, cause })
    )
);

class IntelligenceConfigurationLive implements IntelligenceConfiguration {
    private getConfig = (): Effect.Effect<LoadedIntelligenceConfig, IntelligenceConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        loadIntelligencesConfigEffect;

    getIntelligenceProfileByName = (
        name: string
    ): Effect.Effect<IntelligenceProfile, IntelligenceConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(
            Effect.flatMap((config) => {
                const profile = Record.get(config.profiles, name);
                return profile._tag === "Some"
                    ? Effect.succeed(profile.value)
                    : Effect.fail(new IntelligenceProfileNotFoundError({ profileName: name }));
            })
        );

    listIntelligenceProfiles = (): Effect.Effect<ReadonlyArray<IntelligenceProfile>, IntelligenceConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(
            Effect.map((config) => Record.values(config.profiles))
        );
}

// --- Layer Definition ---
export const IntelligenceConfigurationLiveLayer: Layer.Layer<IntelligenceConfiguration, never, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =
    Layer.succeed(
        IntelligenceConfiguration,
        new IntelligenceConfigurationLive()
    );
