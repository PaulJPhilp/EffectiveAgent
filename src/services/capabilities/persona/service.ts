import { EntityParseError } from "@/services/core/errors.js";
import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { PersonaConfigError } from "./errors.js";
import { PersonasFile } from "./schema.js";

export class PersonaService extends Effect.Service<PersonaService>()("PersonaService", {
    effect: Effect.gen(function* () {
        let PersonaRef: Ref.Ref<PersonasFile>;

        return {
            load: () => {
                return Effect.gen(function* () {
                    const configProvider = yield* ConfigProvider.ConfigProvider;
                    const rawConfig = yield* configProvider.load(Config.string("personas")).pipe(
                        Effect.mapError(cause => new PersonaConfigError({
                            message: "Failed to load persona config",
                            cause: new EntityParseError({
                                filePath: "personas.json",
                                cause
                            })
                        }))
                    );

                    const parsedConfig = Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => {
                            throw new PersonaConfigError({
                                message: "Failed to parse persona config",
                                cause: new EntityParseError({
                                    filePath: "personas.json",
                                    cause: error
                                })
                            });
                        }
                    });

                    const data = yield* parsedConfig;
                    const validConfig = yield* S.decode(PersonasFile)(data).pipe(
                        Effect.mapError(cause => new PersonaConfigError({
                            message: "Failed to validate persona config",
                            cause: new EntityParseError({
                                filePath: "personas.json",
                                cause
                            })
                        }))
                    );

                    PersonaRef = yield* Ref.make<PersonasFile>(validConfig);
                    return yield* PersonaRef.get;
                });
            }
        };
    })
}) { }