import { writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { ArchitectureData } from "./types.js";

export interface SerializationResult {
  success: true;
  filePath: string;
  warnings: string[];
}

export interface SerializationError {
  success: false;
  error: string;
  warnings: string[];
}

export type JsonSerializeResult = SerializationResult | SerializationError;

/**
 * Serializes an ArchitectureData object to a formatted JSON file.
 * @param architectureData - The ArchitectureData object to serialize
 * @param filePath - The path where the JSON file should be written
 * @returns A JsonSerializeResult with success status and diagnostic information
 */
export function serializeToJson(
  architectureData: ArchitectureData,
  filePath: string
): JsonSerializeResult {
  const warnings: string[] = [];

  try {
    // Validate input parameters
    if (!architectureData) {
      return {
        success: false,
        error: "Architecture data is null or undefined",
        warnings,
      };
    }

    if (!filePath || typeof filePath !== "string") {
      return {
        success: false,
        error: "File path is missing or invalid",
        warnings,
      };
    }

    // Validate the architecture data structure
    const validationResult = validateArchitectureData(architectureData);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: `Invalid architecture data: ${validationResult.error}`,
        warnings,
      };
    }

    warnings.push(...validationResult.warnings);

    // Ensure the directory exists
    const dirPath = dirname(filePath);
    if (!existsSync(dirPath)) {
      try {
        mkdirSync(dirPath, { recursive: true });
        warnings.push(`Created directory: ${dirPath}`);
      } catch (dirError) {
        return {
          success: false,
          error: `Failed to create directory ${dirPath}: ${
            dirError instanceof Error ? dirError.message : String(dirError)
          }`,
          warnings,
        };
      }
    }

    // Convert the object to a formatted JSON string
    let jsonString: string;
    try {
      jsonString = JSON.stringify(architectureData, null, 2);
    } catch (stringifyError) {
      return {
        success: false,
        error: `Failed to serialize architecture data to JSON: ${
          stringifyError instanceof Error
            ? stringifyError.message
            : String(stringifyError)
        }`,
        warnings,
      };
    }

    // Validate the JSON string is not empty
    if (!jsonString || jsonString.length === 0) {
      return {
        success: false,
        error: "Generated JSON string is empty",
        warnings,
      };
    }

    // Write the JSON string to the specified file
    try {
      writeFileSync(filePath, jsonString, "utf8");
    } catch (writeError) {
      return {
        success: false,
        error: `Failed to write JSON file to ${filePath}: ${
          writeError instanceof Error ? writeError.message : String(writeError)
        }`,
        warnings,
      };
    }

    // Verify the file was written successfully
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `File was not created successfully: ${filePath}`,
        warnings,
      };
    }

    console.log(`Architecture data successfully written to ${filePath}`);

    return {
      success: true,
      filePath,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error during serialization: ${
        error instanceof Error ? error.message : String(error)
      }`,
      warnings,
    };
  }
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
}

/**
 * Validates the structure of an ArchitectureData object.
 */
function validateArchitectureData(data: ArchitectureData): ValidationResult {
  const warnings: string[] = [];

  try {
    // Check top-level structure
    if (typeof data !== "object") {
      return {
        isValid: false,
        error: "Architecture data must be an object",
        warnings,
      };
    }

    // Validate diagrams array
    if (!Array.isArray(data.diagrams)) {
      return {
        isValid: false,
        error: "Diagrams must be an array",
        warnings,
      };
    }

    if (data.diagrams.length === 0) {
      warnings.push("No diagrams found in architecture data");
    }

    // Validate each diagram
    for (let i = 0; i < data.diagrams.length; i++) {
      const diagram = data.diagrams[i];
      if (!diagram.id || typeof diagram.id !== "string") {
        return {
          isValid: false,
          error: `Diagram at index ${i} is missing required 'id' field`,
          warnings,
        };
      }

      if (
        !diagram.mermaidDefinition ||
        typeof diagram.mermaidDefinition !== "string" ||
        diagram.mermaidDefinition.length === 0
      ) {
        warnings.push(`Diagram '${diagram.id}' has empty mermaidDefinition`);
      }
    }

    // Validate nodes array
    if (!Array.isArray(data.nodes)) {
      return {
        isValid: false,
        error: "Nodes must be an array",
        warnings,
      };
    }

    if (data.nodes.length === 0) {
      warnings.push("No nodes found in architecture data");
    }

    // Validate each node
    for (let i = 0; i < data.nodes.length; i++) {
      const node = data.nodes[i];
      if (!node.id || typeof node.id !== "string") {
        return {
          isValid: false,
          error: `Node at index ${i} is missing required 'id' field`,
          warnings,
        };
      }

      if (!node.name || typeof node.name !== "string") {
        warnings.push(`Node '${node.id}' is missing 'name' field`);
      }

      if (!node.c4Level || typeof node.c4Level !== "string") {
        warnings.push(`Node '${node.id}' is missing 'c4Level' field`);
      }
    }

    // Validate edges array
    if (!Array.isArray(data.edges)) {
      return {
        isValid: false,
        error: "Edges must be an array",
        warnings,
      };
    }

    // Validate each edge
    for (let i = 0; i < data.edges.length; i++) {
      const edge = data.edges[i];
      if (!edge.sourceId || typeof edge.sourceId !== "string") {
        return {
          isValid: false,
          error: `Edge at index ${i} is missing required 'sourceId' field`,
          warnings,
        };
      }

      if (!edge.targetId || typeof edge.targetId !== "string") {
        return {
          isValid: false,
          error: `Edge at index ${i} is missing required 'targetId' field`,
          warnings,
        };
      }
    }

    return {
      isValid: true,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      warnings,
    };
  }
}
