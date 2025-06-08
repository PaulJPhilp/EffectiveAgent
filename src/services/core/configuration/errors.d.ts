/**
 * @file Defines error types for the Configuration Service.
 * @module services/core/configuration/errors
 */
import { ParseError } from "effect/ParseResult";
declare const ConfigReadError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConfigReadError";
} & Readonly<A>;
/**
 * Error thrown when reading a configuration file fails.
 */
export declare class ConfigReadError extends ConfigReadError_base<{
    readonly filePath: string;
    readonly cause: unknown;
}> {
}
declare const ConfigParseError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConfigParseError";
} & Readonly<A>;
/**
 * Error thrown when parsing JSON content fails.
 */
export declare class ConfigParseError extends ConfigParseError_base<{
    readonly filePath: string;
    readonly cause: unknown;
}> {
}
declare const ConfigValidationError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConfigValidationError";
} & Readonly<A>;
/**
 * Error thrown when validating configuration against a schema fails.
 */
export declare class ConfigValidationError extends ConfigValidationError_base<{
    readonly filePath: string;
    readonly validationError: ParseError;
}> {
}
/**
 * Union type of all possible configuration service errors.
 */
export type ConfigError = ConfigReadError | ConfigParseError | ConfigValidationError;
declare const ConfigurationError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConfigurationError";
} & Readonly<A>;
export declare class ConfigurationError extends ConfigurationError_base<{
    readonly message: string;
    readonly key?: string;
    readonly filePath?: string;
    readonly cause?: unknown;
}> {
    constructor(options: {
        message: string;
        key?: string;
        filePath?: string;
        cause?: unknown;
    });
}
declare const ConfigSchemaMissingError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConfigSchemaMissingError";
} & Readonly<A>;
export declare class ConfigSchemaMissingError extends ConfigSchemaMissingError_base<{
    readonly message: string;
    readonly filePath: string;
}> {
    constructor(options: {
        filePath: string;
    });
}
export {};
//# sourceMappingURL=errors.d.ts.map