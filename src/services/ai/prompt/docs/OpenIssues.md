# Open Issues for AI Prompt Service

1.  **Schema Definition for Unknown Input:**
    *   **Issue:** Persistent TypeScript type errors (TS2322) occurred when trying to pass `PromptsConfigFileSchema` (defined as a `Schema.Struct`) to `EntityLoaderApi.loadEntity<PromptsConfigFile, unknown>`. The expected approach using `Schema.transformOrFail(Schema.Unknown, PromptsConfigFileStructSchema, ...)` also failed to resolve type errors in the specific environment/version.
    *   **Current Workaround:** The schema (`PromptsConfigFileSchema` in `schema.ts`) is currently defined using `Schema.transform(PromptsConfigFileStructSchema, { decode: (i)=>i as PromptsConfigFile, encode: (v)=>v })`. This resolves compile-time errors.
    *   **Potential Risk:** This workaround relies on `EntityLoaderApi` internally performing the initial validation against `PromptsConfigFileStructSchema` before the transform's identity `decode` function is called. If `EntityLoaderApi`'s internal implementation changes or doesn't perform this initial validation robustly, runtime errors could occur with invalid JSON structures that wouldn't be caught by this schema's `decode` function.
    *   **Action:** Thoroughly test `PromptConfigLiveLayer` with invalid `prompts.json` files to ensure validation occurs correctly within `EntityLoaderApi`. Revisit the schema definition if runtime errors occur or if `@effect/schema` / `EntityLoaderApi` interaction becomes clearer. (Tracked: 2024-07-29)

2.  **LiquidJS Options:**
    *   **Issue:** The `PromptApi` implementation currently initializes `new Liquid()` with default options.
    *   **Action:** Consider allowing `LiquidOptions` to be configured or injected via a dedicated configuration service or layer if customization (e.g., custom filters/tags, different delimiters) is needed later. (Tracked: 2024-07-29)
