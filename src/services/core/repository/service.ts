import { Context, Effect, Layer } from "effect";
import type { BaseEntity, JsonObject } from "@/types.js";
import type { RepositoryServiceApi } from "./api.js";
import { RepositoryError } from "./errors.js";
import type { FindOptions } from "./types.js";

/**
 * Base entity type with required data property
 */
interface BaseEntityWithData<T extends JsonObject = JsonObject> extends BaseEntity {
  readonly data: T;
}

/**
 * Repository service implementation using Context.Tag pattern.
 * This is an approved exception to the architectural rule against using Context.Tag,
 * as it's required for generic service implementation.
 */
export const RepositoryService = <TEntity extends BaseEntityWithData>() => {
  const Tag = Context.GenericTag<"RepositoryService", RepositoryServiceApi<TEntity>>("RepositoryService");

  const make = () => Effect.gen(function* () {
    // The actual implementation will be provided by specific implementations
    // like in-memory or drizzle
    return {
      create: (_entityData: TEntity["data"]) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      findById: (_id: TEntity["id"]) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      findOne: (_options?: FindOptions<TEntity>) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      findMany: (_options?: FindOptions<TEntity>) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      update: (_id: TEntity["id"], _entityData: Partial<TEntity["data"]>) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      delete: (_id: TEntity["id"]) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      count: (_options?: Pick<FindOptions<TEntity>, "filter">) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),
    } as const;
  });

  const live = Layer.effect(Tag, make());

  return { Tag, make, live } as const;
};

export default RepositoryService;