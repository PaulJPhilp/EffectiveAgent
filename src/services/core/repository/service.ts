import { Context, Effect, Layer, Option } from "effect";
import type { RepositoryServiceApi } from "@core/repository/api.js";
import { BaseEntity, FindOptions } from "@core/repository/types.js";
import { EntityNotFoundError, RepositoryError } from "@core/repository/errors.js";

/**
 * Repository service implementation using Context.Tag pattern.
 * This is an approved exception to the architectural rule against using Context.Tag,
 * as it's required for generic service implementation.
 */
export const RepositoryService = <TEntity extends BaseEntity>() => {
  const Tag = Context.GenericTag<"RepositoryService", RepositoryServiceApi<TEntity>>("RepositoryService");

  const make = () => Effect.gen(function* () {
    // The actual implementation will be provided by specific implementations
    // like in-memory or drizzle
    return {
      create: (entityData: TEntity["data"]) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      findById: (id: TEntity["id"]) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      findOne: (options?: FindOptions<TEntity>) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      findMany: (options?: FindOptions<TEntity>) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      update: (id: TEntity["id"], entityData: Partial<TEntity["data"]>) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      delete: (id: TEntity["id"]) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),

      count: (options?: Pick<FindOptions<TEntity>, "filter">) =>
        Effect.fail(new RepositoryError({ message: "Not implemented", entityType: "unknown" })),
    } as const;
  });

  const live = Layer.effect(Tag, make());

  return { Tag, make, live } as const;
};

export default RepositoryService;