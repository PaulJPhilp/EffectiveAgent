import { Effect } from "effect";
import { ProviderServiceApi } from "./api.js";
import { ProviderNotFoundError, ProviderServiceConfigError } from "./errors.js";
declare const ProviderService_base: Effect.Service.Class<ProviderServiceApi, "ProviderService", {
    readonly effect: Effect.Effect<{
        getProviderClient: (providerName: string) => Effect.Effect<Effect.Effect<import("./api.js").ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | import("./errors.js").ProviderOperationError, import("@/services/ai/index.js").ModelServiceApi | import("@/services/ai/tool-registry/service.js").ToolRegistryService>, ProviderServiceConfigError, never>;
    }, import("@/services/core/configuration/errors.js").ConfigReadError | import("@/services/core/configuration/errors.js").ConfigParseError | import("@/services/core/configuration/errors.js").ConfigValidationError, import("@/services/core/configuration/api.js").ConfigurationServiceApi>;
}>;
export declare class ProviderService extends ProviderService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map