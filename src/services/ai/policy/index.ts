// Export types
export * from "./api.js";
export * from "./errors.js";
export * from "./types.js";

import PermissivePolicyService from "./permissive-service.js";
// Re-export the services
import { PolicyService } from "./service.js";

export {
  PermissivePolicyService, PolicyService
};

// Default export is the PolicyService
export default PolicyService;
