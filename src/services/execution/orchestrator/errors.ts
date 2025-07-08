import { EffectiveError } from "@/errors.js";

export class OrchestratorServiceError extends EffectiveError {
  constructor(message: string) {
    super({
      description: message,
      module: "OrchestratorService",
      method: "execute",
    });
  }
}
