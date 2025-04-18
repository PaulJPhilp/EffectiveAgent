/**
 * @file Defines types and the Context Tag for the AI Intelligence configuration data.
 * @module services/ai/Intelligence/types
 */

// Import Schema, Context, Data, HashMap from 'effect'
import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
// Import types derived from schemas using 'import type'
import { IntelligenceFile } from "./schema.js";
import { EntityParseError } from "@/services/core/errors.js";
import { IntelligenceConfigError } from "./errors.js";

export class IntelligenceService extends Effect.Service<IntelligenceService>()("IntelligenceService", {
	effect: Effect.gen(function* () {
		let IntelligenceRef: Ref.Ref<IntelligenceFile>;

		return {
			load: () => {
				return Effect.gen(function* () {
					const configIntelligence = yield* ConfigProvider.ConfigProvider;
					const rawConfig = yield* configIntelligence.load(Config.string("intelligence")).pipe(
						Effect.mapError(cause => new IntelligenceConfigError({
							message: "Failed to load model config",
							cause: new EntityParseError({
								filePath: "models.json",
								cause
							})
						}))
					);

					const parsedConfig = Effect.try({
						try: () => JSON.parse(rawConfig),
						catch: (error) => {
							throw new IntelligenceConfigError({
								message: "Failed to parse model config",
								cause: new EntityParseError({
									filePath: "models.json",
									cause: error
								})
							});
						}
					});

					const data = yield* parsedConfig
					const validConfig = yield* S.decode(IntelligenceFile)(data).pipe(
						Effect.mapError(cause => new IntelligenceConfigError({
							message: "Failed to validate model config",
							cause: new EntityParseError({
								filePath: "models.json",
								cause
							})
						}))
					);

					IntelligenceRef = yield* Ref.make<IntelligenceFile>(validConfig);
					return yield* IntelligenceRef.get;
				})
			}
		}
	})
}) { }