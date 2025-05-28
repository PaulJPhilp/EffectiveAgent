import { Context } from 'effect';
// MasterConfigData is now directly imported from the schema file
import type { MasterConfigData } from './master-config-schema.js';

/**
 * Tag for accessing the MasterConfigData in the Effect context.
 */
export const MasterConfig = Context.GenericTag<MasterConfigData>(
  '@services/core/MasterConfig'
);
