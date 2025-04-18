import { EntityParseError } from "@/services/core/errors.js";
import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { SkillConfigError } from "./errors.js";
import { SkillFile } from "./schema.js";

export class SkillService extends Effect.Service<SkillService>()("SkillService", {
    effect: Effect.gen(function* () {
        let SkillRef: Ref.Ref<SkillFile>;

        return {
            load: () => {
                return Effect.gen(function* () {
                    const configProvider = yield* ConfigProvider.ConfigProvider;
                    const rawConfig = yield* configProvider.load(Config.string("skills")).pipe(
                        Effect.mapError(cause => new SkillConfigError({
                            message: "Failed to load Skill config",
                            cause: new EntityParseError({
                                filePath: "Skills.json",
                                cause
                            })
                        }))
                    );

                    const parsedConfig = Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => {
                            throw new SkillConfigError({
                                message: "Failed to parse Skill config",
                                cause: new EntityParseError({
                                    filePath: "Skills.json",
                                    cause: error
                                })
                            });
                        }
                    });

                    const data = yield* parsedConfig;
                    const validConfig = yield* S.decode(SkillFile)(data).pipe(
                        Effect.mapError(cause => new SkillConfigError({
                            message: "Failed to validate Skill config",
                            cause: new EntityParseError({
                                filePath: "Skills.json",
                                cause
                            })
                        }))
                    );

                    SkillRef = yield* Ref.make<SkillFile>(validConfig);
                    return yield* SkillRef.get;
                });
            }
        };
    })
}) { }