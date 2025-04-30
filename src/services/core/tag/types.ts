/**
 * @file Defines additional types for the Tag service.
 */

import type { EntityId } from "@/types.js";
import type { RepositoryApi } from "@core/repository/types.js";
import type { EntityTagLinkEntity, TagEntity } from "@core/tag/schema.js";

/**
 * Repository dependencies for the Tag service.
 */
export interface TagRepositoryDeps {
  readonly tagRepo: RepositoryApi<TagEntity>;
  readonly linkRepo: RepositoryApi<EntityTagLinkEntity>;
}

/**
 * Entity reference for tagged entities.
 */
export interface TaggedEntityRef {
  readonly entityId: EntityId;
  readonly entityType: string;
}
