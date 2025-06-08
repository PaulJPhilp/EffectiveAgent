import { Effect } from "effect";
import type { ModelServiceApi } from "../../model/api.js";
import { ToolRegistryService } from '../../tool-registry/service.js';
import type { ProviderClientApi } from "../api.js";
import { ProviderNotFoundError, ProviderOperationError, ProviderServiceConfigError } from "../errors.js";
declare function makeAnthropicClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService>;
export { makeAnthropicClient };
//# sourceMappingURL=anthropic-provider-client.d.ts.map