import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import { Project } from "ts-morph";
import {
  buildArchitectureModel,
  type ModelBuildResult,
} from "./ArchitectureModelBuilder.js";
import { type JSDocParseResult, parseComponentJSDoc } from "./JSDocParser.js";
import { type JsonSerializeResult, serializeToJson } from "./JsonSerializer.js";
import {
  inferImportRelationships,
  type RelationshipResult,
} from "./RelationshipInferrer.js";
import type { EdgeData, NodeData } from "./types.js";

interface GenerationStats {
  filesProcessed: number;
  componentsFound: number;
  componentsSuccessful: number;
  componentsFailed: number;
  relationshipsFound: number;
  totalWarnings: number;
  totalErrors: number;
}

interface GenerationResult {
  success: boolean;
  stats: GenerationStats;
  outputFile?: string;
  criticalErrors: string[];
  allWarnings: string[];
}

function logInfo(message: string): void {
  console.log(`[INFO] ${message}`);
}

function logWarning(message: string): void {
  console.warn(`[WARN] ${message}`);
}

function logError(message: string): void {
  console.error(`[ERROR] ${message}`);
}

function logStats(stats: GenerationStats): void {
  console.log("\n=== Generation Statistics ===");
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Components found: ${stats.componentsFound}`);
  console.log(`Components successfully parsed: ${stats.componentsSuccessful}`);
  console.log(`Components failed to parse: ${stats.componentsFailed}`);
  console.log(`Relationships found: ${stats.relationshipsFound}`);
  console.log(`Total warnings: ${stats.totalWarnings}`);
  console.log(`Total errors: ${stats.totalErrors}`);
  console.log("============================\n");
}

function main(): GenerationResult {
  const stats: GenerationStats = {
    filesProcessed: 0,
    componentsFound: 0,
    componentsSuccessful: 0,
    componentsFailed: 0,
    relationshipsFound: 0,
    totalWarnings: 0,
    totalErrors: 0,
  };

  const criticalErrors: string[] = [];
  const allWarnings: string[] = [];

  try {
    logInfo("Starting architecture generation...");

    // Step 1: Load all source files
    logInfo("Loading source files...");
    const project = new Project();

    let sourceFiles;
    try {
      sourceFiles = project.addSourceFilesAtPaths("test-data/*.ts");
      stats.filesProcessed = sourceFiles.length;

      if (sourceFiles.length === 0) {
        const error = "No source files found in test-data/ directory";
        criticalErrors.push(error);
        logError(error);
        return { success: false, stats, criticalErrors, allWarnings };
      }

      logInfo(`Loaded ${sourceFiles.length} source files`);
    } catch (loadError) {
      const error = `Failed to load source files: ${
        loadError instanceof Error ? loadError.message : String(loadError)
      }`;
      criticalErrors.push(error);
      logError(error);
      return { success: false, stats, criticalErrors, allWarnings };
    }

    // Step 2: Parse JSDoc metadata for each component
    logInfo("Parsing component metadata...");
    const nodes: NodeData[] = [];
    // --- Layer color extraction ---
    const layerColors: Record<string, string> = {};
    const layerColorSources: Record<string, string> = {};

    sourceFiles.forEach((sourceFile) => {
      try {
        const classes = sourceFile.getClasses();

        classes.forEach((cls) => {
          // Check if this class has the @architectureComponent tag
          const jsDoc = cls.getJsDocs()[0];
          if (jsDoc) {
            const tags = jsDoc.getTags();
            const hasArchitectureComponent = tags.some(
              (tag) => tag.getTagName() === "architectureComponent"
            );

            if (hasArchitectureComponent) {
              stats.componentsFound++;

              const parseResult: JSDocParseResult = parseComponentJSDoc(cls);

              if (parseResult.success) {
                nodes.push(parseResult.data);
                stats.componentsSuccessful++;

                // --- Layer color extraction logic ---
                const jsDoc = cls.getJsDocs()[0];
                if (jsDoc) {
                  let layerName: string | undefined;
                  let color: string | undefined;
                  for (const tag of jsDoc.getTags()) {
                    const tagName = tag.getTagName();
                    const tagValue = tag.getCommentText()?.trim();
                    if (tagName === "groupByLayer" && tagValue) layerName = tagValue;
                    if (tagName === "color" && tagValue) color = tagValue;
                  }
                  if (layerName && color) {
                    if (layerColors[layerName] && layerColors[layerName] !== color) {
                      const msg = `Layer '${layerName}' has multiple color definitions: '${layerColors[layerName]}' and '${color}'.`;
                      logWarning(msg);
                      allWarnings.push(msg);
                    }
                    layerColors[layerName] = color;
                    layerColorSources[layerName] = cls.getName() || sourceFile.getBaseName();
                  }
                }
                // --- End layer color extraction ---

                // Log warnings for this component
                parseResult.warnings.forEach((warning) => {
                  logWarning(warning);
                  allWarnings.push(warning);
                  stats.totalWarnings++;
                });

                logInfo(
                  `Successfully parsed component: ${parseResult.data.id}`
                );
              } else {
                stats.componentsFailed++;
                stats.totalErrors++;

                // Log the error
                logError(parseResult.error);

                // Log warnings even for failed components
                parseResult.warnings.forEach((warning) => {
                  logWarning(warning);
                  allWarnings.push(warning);
                  stats.totalWarnings++;
                });

                // Decide if this is critical or not
                // Missing @architectureComponent is critical, other issues might not be
                if (
                  parseResult.error.includes(
                    "missing required @architectureComponent"
                  )
                ) {
                  // This is expected for non-architectural components, not critical
                  logInfo(
                    `Skipping non-architectural component: ${
                      cls.getName() || "Unknown"
                    }`
                  );
                } else {
                  criticalErrors.push(parseResult.error);
                }
              }
            }
          }
        });
      } catch (fileError) {
        const error = `Error processing file ${sourceFile.getFilePath()}: ${
          fileError instanceof Error ? fileError.message : String(fileError)
        }`;
        logError(error);
        criticalErrors.push(error);
        stats.totalErrors++;
      }
    });

    if (nodes.length === 0) {
      const error = "No architectural components found in source files";
      criticalErrors.push(error);
      logError(error);
      return { success: false, stats, criticalErrors, allWarnings };
    }

    logInfo(`Found ${nodes.length} architectural components`);

    // Step 3: Run the relationship inferrer
    logInfo("Inferring component relationships...");
    const relationshipResult: RelationshipResult =
      inferImportRelationships(project);

    let edges: EdgeData[] = [];

    if (relationshipResult.success) {
      edges = relationshipResult.data;
      stats.relationshipsFound = edges.length;

      // Log relationship inference warnings
      relationshipResult.warnings.forEach((warning) => {
        logWarning(warning);
        allWarnings.push(warning);
        stats.totalWarnings++;
      });

      // Log relationship stats if available
      if ("stats" in relationshipResult) {
        logInfo(
          `Relationship inference stats: ${relationshipResult.stats.resolvedImports}/${relationshipResult.stats.totalImports} imports resolved`
        );
      }

      logInfo(`Found ${edges.length} relationships between components`);
    } else {
      stats.totalErrors++;
      logError(relationshipResult.error);

      // Log warnings even for failed relationship inference
      relationshipResult.warnings.forEach((warning) => {
        logWarning(warning);
        allWarnings.push(warning);
        stats.totalWarnings++;
      });

      // Use partial data if available
      if (relationshipResult.partialData) {
        edges = relationshipResult.partialData;
        stats.relationshipsFound = edges.length;
        logWarning(
          `Using partial relationship data: ${edges.length} relationships`
        );
      } else {
        logWarning(
          "No relationship data available, continuing with isolated components"
        );
      }
    }

    // Step 4: Build the architecture model
    logInfo("Building architecture model...");
    const modelResult: ModelBuildResult = buildArchitectureModel(nodes, edges);

    if (!modelResult.success) {
      const error = `Failed to build architecture model: ${modelResult.error}`;
      criticalErrors.push(error);
      logError(error);
      stats.totalErrors++;

      // Log model building warnings
      modelResult.warnings.forEach((warning) => {
        logWarning(warning);
        allWarnings.push(warning);
        stats.totalWarnings++;
      });

      return { success: false, stats, criticalErrors, allWarnings };
    }

    // Log model building warnings
    modelResult.warnings.forEach((warning) => {
      logWarning(warning);
      allWarnings.push(warning);
      stats.totalWarnings++;
    });

    const architectureData = modelResult.data;
    // Attach layerColors if any were found
    if (Object.keys(layerColors).length > 0) {
      architectureData.layerColors = layerColors;
      logInfo(`Extracted layerColors: ${JSON.stringify(layerColors)}`);
    }
    logInfo("Architecture model built successfully");

    // Step 5: Validate against schema
    logInfo("Validating against JSON schema...");
    try {
      const schemaJson = readFileSync("src/architecture.schema.json", "utf8");
      const schema = JSON.parse(schemaJson);

      const ajv = new Ajv();
      addFormats(ajv);
      const validate = ajv.compile(schema);
      const isValid = validate(architectureData);

      if (!isValid) {
        const schemaErrors =
          validate.errors
            ?.map((err) => `${err.instancePath}: ${err.message}`)
            .join("; ") || "Unknown validation errors";

        const error = `Schema validation failed: ${schemaErrors}`;
        criticalErrors.push(error);
        logError(error);
        stats.totalErrors++;
        return { success: false, stats, criticalErrors, allWarnings };
      }

      logInfo("Schema validation passed");
    } catch (schemaError) {
      const error = `Schema validation error: ${
        schemaError instanceof Error ? schemaError.message : String(schemaError)
      }`;
      criticalErrors.push(error);
      logError(error);
      stats.totalErrors++;
      return { success: false, stats, criticalErrors, allWarnings };
    }

    // Step 6: Write to JSON file
    logInfo("Writing architecture data to file...");
    const serializationResult: JsonSerializeResult = serializeToJson(
      architectureData,
      "architecture.json"
    );

    if (!serializationResult.success) {
      const error = `Failed to write output file: ${serializationResult.error}`;
      criticalErrors.push(error);
      logError(error);
      stats.totalErrors++;

      // Log serialization warnings
      serializationResult.warnings.forEach((warning) => {
        logWarning(warning);
        allWarnings.push(warning);
        stats.totalWarnings++;
      });

      return { success: false, stats, criticalErrors, allWarnings };
    }

    // Log serialization warnings
    serializationResult.warnings.forEach((warning) => {
      logWarning(warning);
      allWarnings.push(warning);
      stats.totalWarnings++;
    });

    logInfo(
      `Architecture data successfully written to ${serializationResult.filePath}`
    );

    return {
      success: true,
      stats,
      outputFile: serializationResult.filePath,
      criticalErrors,
      allWarnings,
    };
  } catch (error) {
    const criticalError = `Unexpected error during architecture generation: ${
      error instanceof Error ? error.message : String(error)
    }`;
    criticalErrors.push(criticalError);
    logError(criticalError);
    stats.totalErrors++;
    return { success: false, stats, criticalErrors, allWarnings };
  }
}

// Run the main function and handle the result
logInfo("Architecture Generator v1.0");
logInfo("==============================");

const result = main();

// Log final statistics
logStats(result.stats);

// Log summary of warnings and errors
if (result.allWarnings.length > 0) {
  logWarning(`Total warnings encountered: ${result.allWarnings.length}`);
}

if (result.criticalErrors.length > 0) {
  logError(`Critical errors encountered: ${result.criticalErrors.length}`);
  result.criticalErrors.forEach((error) => {
    logError(`- ${error}`);
  });
}

// Determine exit code
if (result.success) {
  if (result.allWarnings.length > 0) {
    logInfo("Generation completed successfully with warnings");
    logInfo(`Output file: ${result.outputFile}`);
  } else {
    logInfo("Generation completed successfully without issues");
    logInfo(`Output file: ${result.outputFile}`);
  }
  process.exit(0);
} else {
  logError("Generation failed due to critical errors");

  // Provide helpful guidance
  if (result.stats.componentsFound === 0) {
    logError(
      "Suggestion: Ensure your TypeScript files contain classes with @architectureComponent JSDoc tags"
    );
  }

  if (result.stats.filesProcessed === 0) {
    logError(
      "Suggestion: Ensure the test-data/ directory exists and contains *.ts files"
    );
  }

  process.exit(1);
}
