import { Effect } from "effect";
import { ensureModelsDevAvailable } from "../services/ai/model/registry";

async function main() {
    try {
        console.log("Running in-code preflight: ensureModelsDevAvailable...");
        // Effect.runPromise expects an Effect that never returns (never), so cast here to bypass
        // the narrow type and run the preflight which returns void on success.
        await Effect.runPromise(ensureModelsDevAvailable as unknown as any);
        console.log("Preflight check passed: ensureModelsDevAvailable succeeded");
        process.exit(0);
    } catch (err) {
        console.error("Preflight failed:", err);
        process.exit(1);
    }
}

main();
