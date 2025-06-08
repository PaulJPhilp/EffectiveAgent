
import { Prompt } from "@effect/cli";
import { FileSystem, Path } from "@effect/platform";
// filepath: /Users/paul/Projects/EffectiveAgent/src/ea-cli/src/utils/config-helpers.ts
import { Data, Effect } from "effect";
import { FileSystemLayer, FileSystemOps } from "../services/fs.js"; // Assuming FileSystemOps has readJson and writeJson

export type ResourceType = "model" | "provider" | "rule" | "toolkit";

interface ResourceConfig {
    readonly filePath: string; // Relative to ea-config directory
    readonly itemsKey: string; // Key in the JSON file that holds the array of items
    readonly itemNameKey: string; // Key within an item object that holds its unique name/ID
}

export const configMap: Record<ResourceType, ResourceConfig> = {
    model: {
        filePath: "models.json",
        itemsKey: "models",
        itemNameKey: "modelId", // Assuming items have a 'modelId' or similar
    },
    provider: {
        filePath: "providers.json",
        itemsKey: "providers",
        itemNameKey: "providerId", // Assuming items have a 'providerId'
    },
    rule: {
        filePath: "policy.json", // As per PRD
        itemsKey: "rules",
        itemNameKey: "ruleId", // Assuming items have a 'ruleId'
    },
    toolkit: {
        filePath: "tool-registry.json", // As per PRD
        itemsKey: "toolkits",
        itemNameKey: "toolkitId", // Assuming items have a 'toolkitId'
    },
};

const getConfigFilePath = (resourceType: ResourceType) =>
    Effect.gen(function* (_) {
        const path = yield* _(Path.Path);
        // Assuming ea-config is at the project root relative to CWD
        // This might need to be more robust, e.g., by reading from master-config.json
        return path.join(process.cwd(), "ea-config", configMap[resourceType].filePath);
    });

export const listConfigItems = (resourceType: ResourceType) =>
    Effect.gen(function* (_) {
        const filePath = yield* _(getConfigFilePath(resourceType));
        const resourceConfig = configMap[resourceType];

        const fileExists = yield* _(FileSystemOps.exists(filePath));
        if (!fileExists) {
            return yield* _(Effect.fail(`Config file ${filePath} not found.`));
        }

        // Need to add readJson to FileSystemOps or use FileSystem directly
        const fs = yield* _(FileSystem.FileSystem);
        const contentString = yield* _(fs.readFileString(filePath, "utf-8"));
        const content = JSON.parse(contentString);

        const items = content[resourceConfig.itemsKey] as any[];
        if (!items || items.length === 0) {
            yield* _(Effect.log(`No ${resourceType}s found.`));
            return [];
        }

        yield* _(Effect.log(`${resourceType}s:`));
        items.forEach((item) => Effect.log(`- ${item[resourceConfig.itemNameKey] || "Unknown Item"}`));
        return items;
    }).pipe(Effect.provide(FileSystemLayer));

export const deleteConfigItem = (resourceType: ResourceType, itemName: string) =>
    Effect.gen(function* (_) {
        const filePath = yield* _(getConfigFilePath(resourceType));
        const resourceConfig = configMap[resourceType];

        const fileExists = yield* _(FileSystemOps.exists(filePath));
        if (!fileExists) {
            return yield* _(Effect.fail(`Config file ${filePath} not found.`));
        }

        const fs = yield* _(FileSystem.FileSystem);
        const contentString = yield* _(fs.readFileString(filePath, "utf-8"));
        let content = JSON.parse(contentString);

        const items = content[resourceConfig.itemsKey] as any[];
        const itemIndex = items.findIndex(
            (item) => item[resourceConfig.itemNameKey] === itemName
        );

        if (itemIndex === -1) {
            return yield* _(Effect.fail(`${resourceType} "${itemName}" not found.`));
        }

        const confirmation = yield* _(
            Prompt.confirm({
                message: `Are you sure you want to delete ${resourceType} "${itemName}"?`,
            })
        );

        if (!confirmation) {
            yield* _(Effect.log("Deletion cancelled."));
            return;
        }

        items.splice(itemIndex, 1);
        content[resourceConfig.itemsKey] = items;

        yield* _(FileSystemOps.writeJson(filePath, content)); // Assumes writeJson is in FileSystemOps
        yield* _(Effect.log(`${resourceType} "${itemName}" deleted successfully.`));
    }).pipe(Effect.provide(FileSystemLayer));

// Placeholder for addConfigItem - to be implemented when wiring up add commands
export const addConfigItem = (resourceType: ResourceType, itemName: string, itemData: Record<string, any>) =>
    Effect.gen(function* (_) {
        const filePath = yield* _(getConfigFilePath(resourceType));
        const resourceConfig = configMap[resourceType];

        const fileExists = yield* _(FileSystemOps.exists(filePath));
        if (!fileExists) {
            // Optionally create the file with initial structure if it doesn't exist
            yield* _(Effect.log(`Config file ${filePath} not found. Creating...`));
            const initialContent: Record<string, any> = {};
            initialContent[resourceConfig.itemsKey] = [];
            yield* _(FileSystemOps.writeJson(filePath, initialContent));
        }

        const fs = yield* _(FileSystem.FileSystem);
        const contentString = yield* _(fs.readFileString(filePath, "utf-8"));
        let content = JSON.parse(contentString);

        const items = content[resourceConfig.itemsKey] as any[];
        const itemExists = items.some(
            (item) => item[resourceConfig.itemNameKey] === itemName
        );

        if (itemExists) {
            return yield* _(Effect.fail(`${resourceType} "${itemName}" already exists.`));
        }

        const newItem = { ...itemData, [resourceConfig.itemNameKey]: itemName };
        items.push(newItem);
        content[resourceConfig.itemsKey] = items;

        yield* _(FileSystemOps.writeJson(filePath, content));
        yield* _(Effect.log(`${resourceType} "${itemName}" added successfully.`));
    }).pipe(Effect.provide(FileSystemLayer));
