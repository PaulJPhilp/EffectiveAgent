/**
 * @file Defines types and the Context Tag for the AI Provider configuration data.
 * @module services/ai/provider/types
 */

// Import Schema, Context, Data, HashMap from 'effect'
import { Context, Data, Effect, HashMap, Ref } from "effect";
// Import types derived from schemas using 'import type'
import type {
    Provider,
    ProviderFile,
} from "./schema.js";

import { Name } from "@/schema.js"; // Adjust the import path as necessary

export class ProviderService extends Effect.Service<ProviderService>()("ProviderService", {
    effect: Effect.gen(function* () {
        const ProviderRef = yield* Ref.make<ProviderFile>({ providers: [] as Provider[] });

        return {
            load: (filePath: string) => {
                return Effect.gen(function* () {
                    const fileContent = yield* Effect.readFile(filePath);
                    const parsedData = yield* ProviderFile.decode(fileContent);

                    if (parsedData._tag === "Right") {
                        const providerFile = parsedData.right;
                        yield* ProviderRef.set(providerFile);
                        return providerFile;
                    } else {
                        throw new Error("Failed to parse provider file");
                    }
                });
            }
        }
    }

    )
}) { }	
