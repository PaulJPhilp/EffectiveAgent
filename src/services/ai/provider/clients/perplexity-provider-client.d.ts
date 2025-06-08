import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { Effect } from "effect";
import { ToolRegistryService } from '../../tool-registry/service.js';
import type { ProviderClientApi } from "../api.js";
import { ProviderNotFoundError, ProviderOperationError, ProviderServiceConfigError } from "../errors.js";
declare function makePerplexityClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService>;
export { makePerplexityClient };
//# sourceMappingURL=perplexity-provider-client.d.ts.map