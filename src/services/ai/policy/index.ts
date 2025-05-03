// Export types
export * from "./types.js";
export * from "./errors.js";
export * from "./api.js";

import PermissivePolicyService from "./permissive-service.js";
// Re-export the services
import PolicyService from "./service.js";

export {
  PolicyService,
  PermissivePolicyService
};

// Default export is the PolicyService
export default PolicyService;
