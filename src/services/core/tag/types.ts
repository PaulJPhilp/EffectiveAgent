/**
 * @file Defines the types for the Tag service.
 */

import type { EntityId } from "../../../types.js";
import type { RepositoryServiceApi } from "../repository/api.js";
import type { EntityTagLinkEntity, TagEntity } from "./schema.js";

/**
 * Repository dependencies for the Tag service.
 */
export interface TagRepositoryDeps {
  readonly tagRepo: RepositoryServiceApi<TagEntity>;
  readonly linkRepo: RepositoryServiceApi<EntityTagLinkEntity>;
}

/**
 * Entity reference for tagged entities.
 */
export interface TaggedEntityRef {
  readonly entityId: EntityId;
  readonly entityType: string;
}
