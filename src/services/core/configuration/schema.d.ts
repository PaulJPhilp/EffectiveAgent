/**
 * @file Core configuration schemas used across services
 */
import { Schema } from 'effect';
declare const EnvironmentConfig_base: Schema.Class<EnvironmentConfig, {
    nodeEnv: Schema.optional<Schema.Union<[Schema.Literal<["development"]>, Schema.Literal<["test"]>, Schema.Literal<["production"]>]>>;
    logLevel: Schema.optional<Schema.Union<[Schema.Literal<["debug"]>, Schema.Literal<["info"]>, Schema.Literal<["warn"]>, Schema.Literal<["error"]>]>>;
    isDebug: Schema.optional<typeof Schema.Boolean>;
}, Schema.Struct.Encoded<{
    nodeEnv: Schema.optional<Schema.Union<[Schema.Literal<["development"]>, Schema.Literal<["test"]>, Schema.Literal<["production"]>]>>;
    logLevel: Schema.optional<Schema.Union<[Schema.Literal<["debug"]>, Schema.Literal<["info"]>, Schema.Literal<["warn"]>, Schema.Literal<["error"]>]>>;
    isDebug: Schema.optional<typeof Schema.Boolean>;
}>, never, {
    readonly nodeEnv?: "development" | "test" | "production" | undefined;
} & {
    readonly logLevel?: "debug" | "info" | "warn" | "error" | undefined;
} & {
    readonly isDebug?: boolean | undefined;
}, {}, {}>;
/**
 * Schema for environment configuration
 */
export declare class EnvironmentConfig extends EnvironmentConfig_base {
}
/**
 * Base interface that all configuration types must extend.
 * Ensures consistent properties across all configurations.
 */
export interface BaseConfig {
    readonly name: string;
    readonly version: string;
}
declare const BaseConfigSchema_base: Schema.Class<BaseConfigSchema, {
    name: typeof Schema.String;
    version: typeof Schema.String;
}, Schema.Struct.Encoded<{
    name: typeof Schema.String;
    version: typeof Schema.String;
}>, never, {
    readonly name: string;
} & {
    readonly version: string;
}, {}, {}>;
/**
 * Base schema that all configuration schemas must extend.
 * Provides validation for the base configuration properties.
 */
export declare class BaseConfigSchema extends BaseConfigSchema_base {
}
/**
 * Runtime settings configuration
 */
export declare const RuntimeSettingsSchema: Schema.Struct<{
    fileSystemImplementation: Schema.optionalWith<Schema.Literal<["node", "bun"]>, {
        default: () => "node";
    }>;
}>;
/**
 * Logging configuration
 */
export declare const LoggingConfigSchema: Schema.Struct<{
    level: Schema.optionalWith<Schema.Literal<["error", "warn", "info", "debug", "trace"]>, {
        default: () => "info";
    }>;
    filePath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    enableConsole: Schema.optionalWith<typeof Schema.Boolean, {
        default: () => true;
    }>;
}>;
/**
 * Agent configuration paths
 */
export declare const AgentConfigSchema: Schema.Struct<{
    agentsDirectory: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    modelsConfigPath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    providersConfigPath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    policiesConfigPath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
}>;
export declare const ConfigPathsSchema: Schema.Struct<{
    providers: typeof Schema.String;
    models: typeof Schema.String;
    policy: typeof Schema.String;
}>;
declare const MasterConfigSchema_base: Schema.Class<MasterConfigSchema, {
    name: typeof Schema.String;
    version: typeof Schema.String;
    runtimeSettings: Schema.Struct<{
        fileSystemImplementation: Schema.optionalWith<Schema.Literal<["node", "bun"]>, {
            default: () => "node";
        }>;
    }>;
    logging: Schema.Struct<{
        level: Schema.optionalWith<Schema.Literal<["error", "warn", "info", "debug", "trace"]>, {
            default: () => "info";
        }>;
        filePath: Schema.optionalWith<typeof Schema.String, {
            default: () => string;
        }>;
        enableConsole: Schema.optionalWith<typeof Schema.Boolean, {
            default: () => true;
        }>;
    }>;
    configPaths: Schema.Struct<{
        providers: typeof Schema.String;
        models: typeof Schema.String;
        policy: typeof Schema.String;
    }>;
}, Schema.Struct.Encoded<{
    name: typeof Schema.String;
    version: typeof Schema.String;
    runtimeSettings: Schema.Struct<{
        fileSystemImplementation: Schema.optionalWith<Schema.Literal<["node", "bun"]>, {
            default: () => "node";
        }>;
    }>;
    logging: Schema.Struct<{
        level: Schema.optionalWith<Schema.Literal<["error", "warn", "info", "debug", "trace"]>, {
            default: () => "info";
        }>;
        filePath: Schema.optionalWith<typeof Schema.String, {
            default: () => string;
        }>;
        enableConsole: Schema.optionalWith<typeof Schema.Boolean, {
            default: () => true;
        }>;
    }>;
    configPaths: Schema.Struct<{
        providers: typeof Schema.String;
        models: typeof Schema.String;
        policy: typeof Schema.String;
    }>;
}>, never, {
    readonly name: string;
} & {
    readonly version: string;
} & {
    readonly runtimeSettings: {
        readonly fileSystemImplementation: "node" | "bun";
    };
} & {
    readonly logging: {
        readonly level: "debug" | "info" | "warn" | "error" | "trace";
        readonly filePath: string;
        readonly enableConsole: boolean;
    };
} & {
    readonly configPaths: {
        readonly providers: string;
        readonly models: string;
        readonly policy: string;
    };
}, {}, {}>;
/**
 * Master configuration schema
 */
export declare class MasterConfigSchema extends MasterConfigSchema_base {
}
export type MasterConfig = Schema.Schema.Type<typeof MasterConfigSchema>;
export type RuntimeSettings = Schema.Schema.Type<typeof RuntimeSettingsSchema>;
export type LoggingConfig = Schema.Schema.Type<typeof LoggingConfigSchema>;
export type AgentConfig = Schema.Schema.Type<typeof AgentConfigSchema>;
export {};
//# sourceMappingURL=schema.d.ts.map