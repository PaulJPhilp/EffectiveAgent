import fs from "node:fs";
import path from "node:path";
/**
 * Adapter around the required `models.dev` package.
 * Exposes a single function `fetchGlobalModels` which returns a list of
 * canonical model metadata objects. The concrete shape is `any` so the
 * calling service can merge/hydrate local model entries.
 *
 * NOTE: `models.dev` is required at runtime for canonical model hydration.
 * If the package cannot be imported the adapter will throw a clear error
 * instructing the developer/CI to install it in the `packages/effect-aisdk`
 * workspace package.
 */
import { ModelsDevMissingError } from "./errors";

export type GlobalModel = any;

export async function fetchGlobalModels(): Promise<GlobalModel[]> {
    // During test runs, prefer a local test fixture to avoid network calls.
    const testPath = process.env.TEST_MODELS_REGISTRY_PATH || path.resolve(__dirname, "__tests__/config/models.json");
    const isTest = process.env.NODE_ENV === "test" || !!process.env.TEST_MODELS_REGISTRY_PATH;

    if (isTest) {
        try {
            if (fs.existsSync(testPath)) {
                const content = fs.readFileSync(testPath, "utf8");
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) return parsed as GlobalModel[];
                if (parsed && Array.isArray((parsed as any).models)) return (parsed as any).models as GlobalModel[];
                throw new Error("Invalid test registry shape: expected array or { models: [] }");
            }
        } catch (err) {
            throw new ModelsDevMissingError({
                message: `Failed to read local test models registry at ${testPath}: ${(err instanceof Error) ? err.message : String(err)}`,
                method: "fetchGlobalModels",
                installCommand: `Create a test registry JSON at ${testPath} or set TEST_MODELS_REGISTRY_PATH to a valid file`,
                cause: err,
            });
        }
        // Fallthrough to network fetch if local test file not present
    }

    const url = process.env.MODELS_DEV_URL || "https://models.dev/models.json";
    try {
        const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
        if (!res.ok) {
            throw new Error(`Failed to fetch models from ${url}: ${res.status} ${res.statusText}`);
        }
        const payload = await res.json();

        // Payload may be an array or an object with a 'models' array
        if (Array.isArray(payload)) return payload as GlobalModel[];
        if (payload && Array.isArray((payload as any).models)) return (payload as any).models as GlobalModel[];

        throw new Error(`Unexpected payload shape returned from ${url}`);
    } catch (err) {
        throw new ModelsDevMissingError({
            message: `Failed to fetch canonical models from ${url}: ${(err instanceof Error) ? err.message : String(err)}`,
            method: "fetchGlobalModels",
            installCommand: `Ensure MODELS_DEV_URL is reachable or provide a local copy: export MODELS_DEV_URL=${url}`,
            cause: err,
        });
    }
}
