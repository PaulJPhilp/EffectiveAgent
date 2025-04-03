import type { ProviderId, ProviderType } from './types.js';

/** Creates a ProviderId from a ProviderType */
export const createProviderId = (type: ProviderType): ProviderId => type as ProviderId;
