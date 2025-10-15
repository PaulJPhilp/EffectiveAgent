import { ClassDeclaration, ImportDeclaration, type Project } from "ts-morph";
import type { EdgeData } from "./types.js";

export interface RelationshipInferenceResult {
  success: true;
  data: EdgeData[];
  warnings: string[];
  stats: {
    totalImports: number;
    resolvedImports: number;
    unresolvedImports: number;
    relationshipsFound: number;
  };
}

export interface RelationshipInferenceError {
  success: false;
  error: string;
  warnings: string[];
  partialData?: EdgeData[];
}

export type RelationshipResult =
  | RelationshipInferenceResult
  | RelationshipInferenceError;

/**
 * Infers relationships between architectural components by analyzing import statements.
 * @param project - The ts-morph Project instance containing all source files
 * @returns A RelationshipResult with relationships and diagnostic information
 */
export function inferImportRelationships(project: Project): RelationshipResult {
  const warnings: string[] = [];
  const relationships: EdgeData[] = [];
  let totalImports = 0;
  let resolvedImports = 0;
  let unresolvedImports = 0;

  try {
    // Get all source files in the project
    const sourceFiles = project.getSourceFiles();

    if (sourceFiles.length === 0) {
      return {
        success: false,
        error: "No source files found in project",
        warnings,
      };
    }

    // Create a map of file paths to architectural components for quick lookup
    const fileToComponent = new Map<string, string>();

    // First pass: identify all architectural components and their files
    let componentsFound = 0;
    sourceFiles.forEach((sourceFile) => {
      try {
        const classes = sourceFile.getClasses();

        classes.forEach((cls) => {
          try {
            // Check if this class has the @architectureComponent tag
            const jsDoc = cls.getJsDocs()[0];
            if (jsDoc) {
              const tags = jsDoc.getTags();
              const hasArchitectureComponent = tags.some(
                (tag) => tag.getTagName() === "architectureComponent"
              );

              if (hasArchitectureComponent) {
                const className = cls.getName();
                if (className) {
                  fileToComponent.set(sourceFile.getFilePath(), className);
                  componentsFound++;
                } else {
                  warnings.push(
                    `Found architectural component without name in file`
                  );
                }
              }
            }
          } catch (classError) {
            warnings.push(
              `Error processing class in file ${sourceFile.getFilePath()}: ${
                classError instanceof Error
                  ? classError.message
                  : String(classError)
              }`
            );
          }
        });
      } catch (fileError) {
        warnings.push(
          `Error processing file ${sourceFile.getFilePath()}: ${
            fileError instanceof Error ? fileError.message : String(fileError)
          }`
        );
      }
    });

    if (componentsFound === 0) {
      warnings.push("No architectural components found in project");
    }

    // Second pass: analyze imports and create relationships
    sourceFiles.forEach((sourceFile) => {
      const sourceComponentName = fileToComponent.get(sourceFile.getFilePath());

      // Only process files that contain architectural components
      if (!sourceComponentName) {
        return;
      }

      try {
        // Get all import declarations from this file
        const imports = sourceFile.getImportDeclarations();

        imports.forEach((importDecl) => {

          try {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();

            // Skip external modules (those starting with package names or relative paths to node_modules)
            if (moduleSpecifier.match(/^[a-zA-Z@]/)) {
              // This is an external package, don't count it
              return;
            }
            // Only count internal imports
            totalImports++;

            // Resolve the import to its source file
            const resolvedSourceFile =
              importDecl.getModuleSpecifierSourceFile();

            if (resolvedSourceFile) {
              resolvedImports++;
              const targetFilePath = resolvedSourceFile.getFilePath();
              const targetComponentName = fileToComponent.get(targetFilePath);

              // If the imported file contains an architectural component
              if (
                targetComponentName &&
                targetComponentName !== sourceComponentName
              ) {
                // Create an EdgeData object for this relationship
                const edge: EdgeData = {
                  sourceId: sourceComponentName,
                  targetId: targetComponentName,
                  type: "depends on",
                };

                // Avoid duplicate relationships
                const isDuplicate = relationships.some(
                  (existing) =>
                    existing.sourceId === edge.sourceId &&
                    existing.targetId === edge.targetId
                );

                if (!isDuplicate) {
                  relationships.push(edge);
                } else {
                  warnings.push(
                    `Duplicate relationship detected: ${edge.sourceId} -> ${edge.targetId}`
                  );
                }
              }
            } else {
              unresolvedImports++;
              warnings.push(
                `Could not resolve import '${moduleSpecifier}' in component '${sourceComponentName}'`
              );
            }
          } catch (importError) {
            unresolvedImports++;
            warnings.push(
              `Error processing import in component '${sourceComponentName}': ${
                importError instanceof Error
                  ? importError.message
                  : String(importError)
              }`
            );
          }
        });
      } catch (importsError) {
        warnings.push(
          `Error analyzing imports for component '${sourceComponentName}': ${
            importsError instanceof Error
              ? importsError.message
              : String(importsError)
          }`
        );
      }
    });

    const stats = {
      totalImports,
      resolvedImports,
      unresolvedImports,
      relationshipsFound: relationships.length,
    };

    // Log summary warnings
    if (unresolvedImports > 0) {
      warnings.push(
        `${unresolvedImports} out of ${totalImports} imports could not be resolved`
      );
    }

    if (relationships.length === 0 && componentsFound > 1) {
      warnings.push(
        "No relationships found between components - this may indicate missing imports or isolated components"
      );
    }

    return {
      success: true,
      data: relationships,
      warnings,
      stats,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to infer relationships: ${
        error instanceof Error ? error.message : String(error)
      }`,
      warnings,
      partialData: relationships.length > 0 ? relationships : undefined,
    };
  }
}
