import { Effect } from "effect";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { PolicyService } from "@/services/ai/policy/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { RuntimeServices } from "./types.js";

export class ServiceProvider extends Effect.Service<RuntimeServices>()(
  "ServiceProvider",
  {
    effect: Effect.gen(function* () {
      const configurationService = yield* ConfigurationService;
      const providerService = yield* ProviderService;
      const modelService = yield* ModelService;
      const policyService = yield* PolicyService;
      const toolRegistryService = yield* ToolRegistryService;

      return {
        configurationService,
        providerService,
        modelService,
        policyService,
        toolRegistryService
      };
    }),
    dependencies: [
      ConfigurationService.Default,
      ProviderService.Default,
      ModelService.Default,
      PolicyService.Default,
      ToolRegistryService.Default
    ]
  }
) {}
