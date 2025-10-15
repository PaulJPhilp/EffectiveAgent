import type { Schema } from "effect";
import type { ModelFileSchema } from "./schema.js";

// Type for the parsed model configuration data
export type ModelConfigData = Schema.Schema.Type<typeof ModelFileSchema>;
