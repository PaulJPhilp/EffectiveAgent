import { RateLimit } from "@/schema.js";
/**
 * @file Defines the schema for Policy entities.
 */
import { Schema as S } from "effect";
declare const PolicyRuleData_base: S.Class<PolicyRuleData, {
    id: typeof S.String;
    name: typeof S.String;
    type: S.Literal<["allow", "deny"]>;
    resource: typeof S.String;
    conditions: S.optional<typeof S.String>;
    priority: typeof S.Number;
    enabled: typeof S.Boolean;
    description: S.optional<typeof S.String>;
    rateLimit: S.optional<typeof RateLimit>;
}, S.Struct.Encoded<{
    id: typeof S.String;
    name: typeof S.String;
    type: S.Literal<["allow", "deny"]>;
    resource: typeof S.String;
    conditions: S.optional<typeof S.String>;
    priority: typeof S.Number;
    enabled: typeof S.Boolean;
    description: S.optional<typeof S.String>;
    rateLimit: S.optional<typeof RateLimit>;
}>, never, {
    readonly id: string;
} & {
    readonly name: string;
} & {
    readonly description?: string | undefined;
} & {
    readonly type: "allow" | "deny";
} & {
    readonly rateLimit?: RateLimit | undefined;
} & {
    readonly enabled: boolean;
} & {
    readonly resource: string;
} & {
    readonly priority: number;
} & {
    readonly conditions?: string | undefined;
}, {}, {}>;
/**
 * PolicyRuleData schema and type
 */
export declare class PolicyRuleData extends PolicyRuleData_base {
}
declare const PolicyUsageData_base: S.Class<PolicyUsageData, {
    userId: typeof S.String;
    modelUsed: typeof S.String;
    operationType: typeof S.String;
    status: S.Literal<["success", "error", "blocked"]>;
    timestamp: typeof S.Number;
    latencyMs: S.optional<typeof S.Number>;
    tokensConsumed: S.optional<typeof S.Number>;
}, S.Struct.Encoded<{
    userId: typeof S.String;
    modelUsed: typeof S.String;
    operationType: typeof S.String;
    status: S.Literal<["success", "error", "blocked"]>;
    timestamp: typeof S.Number;
    latencyMs: S.optional<typeof S.Number>;
    tokensConsumed: S.optional<typeof S.Number>;
}>, never, {
    readonly userId: string;
} & {
    readonly modelUsed: string;
} & {
    readonly operationType: string;
} & {
    readonly timestamp: number;
} & {
    readonly status: "error" | "success" | "blocked";
} & {
    readonly latencyMs?: number | undefined;
} & {
    readonly tokensConsumed?: number | undefined;
}, {}, {}>;
/**
 * PolicyUsageData schema and type
 */
export declare class PolicyUsageData extends PolicyUsageData_base {
}
declare const PolicyRuleEntity_base: S.Class<PolicyRuleEntity, {
    data: typeof PolicyRuleData;
    id: typeof S.String;
    createdAt: typeof S.Date;
    updatedAt: typeof S.Date;
}, S.Struct.Encoded<{
    data: typeof PolicyRuleData;
    id: typeof S.String;
    createdAt: typeof S.Date;
    updatedAt: typeof S.Date;
}>, never, {
    readonly id: string;
} & {
    readonly createdAt: Date;
} & {
    readonly updatedAt: Date;
} & {
    readonly data: PolicyRuleData;
}, {}, {}>;
/**
 * Schema for the policy rule entity
 */
export declare class PolicyRuleEntity extends PolicyRuleEntity_base {
}
declare const PolicyUsageEntity_base: S.Class<PolicyUsageEntity, {
    data: typeof PolicyUsageData;
    id: typeof S.String;
    createdAt: typeof S.Date;
    updatedAt: typeof S.Date;
}, S.Struct.Encoded<{
    data: typeof PolicyUsageData;
    id: typeof S.String;
    createdAt: typeof S.Date;
    updatedAt: typeof S.Date;
}>, never, {
    readonly id: string;
} & {
    readonly createdAt: Date;
} & {
    readonly updatedAt: Date;
} & {
    readonly data: PolicyUsageData;
}, {}, {}>;
/**
 * Schema for the policy usage entity
 */
export declare class PolicyUsageEntity extends PolicyUsageEntity_base {
}
declare const PolicyConfigFile_base: S.Class<PolicyConfigFile, {
    description: S.optional<S.filter<typeof S.String>>;
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    policies: S.filter<S.Array$<typeof PolicyRuleData>>;
    version: typeof S.String;
}, S.Struct.Encoded<{
    description: S.optional<S.filter<typeof S.String>>;
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    policies: S.filter<S.Array$<typeof PolicyRuleData>>;
    version: typeof S.String;
}>, never, {
    readonly name: string;
} & {
    readonly version: string;
} & {
    readonly description?: string | undefined;
} & {
    readonly policies: readonly PolicyRuleData[];
}, {}, {}>;
/**
 * Schema for the policy configuration file
 */
export declare class PolicyConfigFile extends PolicyConfigFile_base {
}
export {};
//# sourceMappingURL=schema.d.ts.map