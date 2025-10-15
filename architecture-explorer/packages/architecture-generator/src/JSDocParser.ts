import { ClassDeclaration, JSDoc } from "ts-morph";
import { NodeData, C4Level, LayerName } from "./types.js";

export interface ParseResult {
  success: true;
  data: NodeData;
  warnings: string[];
}

export interface ParseError {
  success: false;
  error: string;
  warnings: string[];
}

export type JSDocParseResult = ParseResult | ParseError;

/**
 * Parses JSDoc comments from a class declaration and extracts architectural metadata.
 * @param classDeclaration - The ts-morph ClassDeclaration node to parse
 * @returns A ParseResult or ParseError with diagnostic information
 */
export function parseComponentJSDoc(
  classDeclaration: ClassDeclaration
): JSDocParseResult {
  const warnings: string[] = [];
  const className = classDeclaration.getName() || "UnnamedComponent";

  if (!classDeclaration.getName()) {
    warnings.push(`Component has no name, using fallback: ${className}`);
  }

  const jsDoc = classDeclaration.getJsDocs()[0];

  if (!jsDoc) {
    return {
      success: false,
      error: `Component '${className}' is missing JSDoc comments`,
      warnings,
    };
  }

  // Initialize the result with required fields
  const result: NodeData = {
    id: className,
    name: className,
    c4Level: "Component" as C4Level, // Default fallback is 'Component'
  };


  // Track which required tags we've found
  let hasArchitectureComponent = false;

  try {
    // Extract JSDoc tags
    const tags = jsDoc.getTags();

    for (const tag of tags) {
      const tagName = tag.getTagName();
      const tagValue = tag.getCommentText()?.trim();

      switch (tagName) {
        case "architectureComponent":
          hasArchitectureComponent = true;
          break;

        case "c4":
          // Supported: SystemContext, Container, Component, Code (C4 model)
          if (tagValue) {
            const validC4Levels: C4Level[] = [
              "SystemContext",
              "Container",
              "Component",
              "Code"
            ];
            if (validC4Levels.includes(tagValue as C4Level)) {
              result.c4Level = tagValue as C4Level;
            } else if (tagValue === "System") {
              result.c4Level = "SystemContext";
              warnings.push(
                `Component '${className}' uses legacy @c4 level 'System'. Use 'SystemContext' instead.`
              );
            } else {
              warnings.push(
                `Component '${className}' has invalid @c4 level '${tagValue}'. Valid levels: ${validC4Levels.join(", ")}`
              );
            }
          } else {
            warnings.push(`Component '${className}' has empty @c4 tag`);
          }
          break;

        case "description":
          if (tagValue) {
            result.description = tagValue;
          } else {
            warnings.push(
              `Component '${className}' has empty @description tag`
            );
          }
          break;

        case "tag":
          if (tagValue) {
            if (!result.tags) {
              result.tags = [];
            }
            result.tags.push(tagValue);
          } else {
            warnings.push(`Component '${className}' has empty @tag`);
          }
          break;

        case "groupByLayer":
          if (tagValue) {
            const validLayers: LayerName[] = [
              "UI",
              "Service",
              "Data",
              "External",
            ];
            if (validLayers.includes(tagValue as LayerName)) {
              result.layer = tagValue as LayerName;
            } else {
              warnings.push(
                `Component '${className}' has invalid @groupByLayer '${tagValue}'. Valid layers: ${validLayers.join(
                  ", "
                )}`
              );
            }
          } else {
            warnings.push(
              `Component '${className}' has empty @groupByLayer tag`
            );
          }
          break;

        case "link":
          if (tagValue) {
            if (!result.links) {
              result.links = [];
            }
            // Basic URL validation
            try {
              new URL(tagValue);
              result.links.push(tagValue);
            } catch {
              warnings.push(
                `Component '${className}' has invalid URL in @link: '${tagValue}'`
              );
            }
          } else {
            warnings.push(`Component '${className}' has empty @link tag`);
          }
          break;

        case "color":
          if (tagValue) {
            result.color = tagValue;
          } else {
            warnings.push(`Component '${className}' has empty @color tag`);
          }
          break;
      }
    }

    // Check for missing required tags
    if (!hasArchitectureComponent) {
      return {
        success: false,
        error: `Component '${className}' is missing required @architectureComponent tag`,
        warnings,
      };
    }

    // Check for missing recommended tags
    if (!result.description) {
      warnings.push(`Component '${className}' is missing @description tag`);
    }

    if (!result.layer) {
      warnings.push(`Component '${className}' is missing @groupByLayer tag`);
    }

    return {
      success: true,
      data: result,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSDoc for component '${className}': ${
        error instanceof Error ? error.message : String(error)
      }`,
      warnings,
    };
  }
}
