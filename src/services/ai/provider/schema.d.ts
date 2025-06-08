/**
 * @file Defines Effect Schemas for AI Provider definitions and configurations,
 * typically loaded from a file like 'providers.json'.
 * @module services/ai/provider/schema
 */
import { RateLimit } from "@/schema.js";
import * as S from "effect/Schema";
/**
 * Providers schema and type derived from the canonical provider universe.
 *
 * The PROVIDER_NAMES tuple is inferred from the PROVIDER_UNIVERSE in provider-universe.ts.
 * This approach allows for a single source of truth for provider names.
 */
export declare const Providers: S.SchemaClass<string, string, never>;
export type ProvidersType = typeof Providers.Type;
declare const ProviderConfigSchema_base: S.Class<ProviderConfigSchema, {
    name: S.SchemaClass<string, string, never>;
    displayName: S.filter<S.filter<S.filter<typeof S.String>>>;
    type: S.filter<typeof S.String>;
    apiKeyEnvVar: S.optional<S.filter<typeof S.String>>;
    baseUrl: S.optional<S.filter<typeof S.String>>;
    rateLimit: S.optional<typeof RateLimit>;
}, S.Struct.Encoded<{
    name: S.SchemaClass<string, string, never>;
    displayName: S.filter<S.filter<S.filter<typeof S.String>>>;
    type: S.filter<typeof S.String>;
    apiKeyEnvVar: S.optional<S.filter<typeof S.String>>;
    baseUrl: S.optional<S.filter<typeof S.String>>;
    rateLimit: S.optional<typeof RateLimit>;
}>, never, {
    readonly name: string;
} & {
    readonly displayName: string;
} & {
    readonly type: string;
} & {
    readonly apiKeyEnvVar?: string | undefined;
} & {
    readonly baseUrl?: string | undefined;
} & {
    readonly rateLimit?: RateLimit | undefined;
}, {}, {}>;
/**
 * Schema for a single AI Provider configuration entry.
 */
export declare class ProviderConfigSchema extends ProviderConfigSchema_base {
}
declare const ProviderFile_base: S.Class<ProviderFile, {
    version: typeof S.String;
    description: S.filter<typeof S.String>;
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    providers: S.Array$<typeof ProviderConfigSchema>;
}, S.Struct.Encoded<{
    version: typeof S.String;
    description: S.filter<typeof S.String>;
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    providers: S.Array$<typeof ProviderConfigSchema>;
}>, never, {
    readonly name: string;
} & {
    readonly version: string;
} & {
    readonly providers: readonly ProviderConfigSchema[];
} & {
    readonly description: string;
}, {}, {}>;
export declare class ProviderFile extends ProviderFile_base {
}
export {};
//# sourceMappingURL=schema.d.ts.map