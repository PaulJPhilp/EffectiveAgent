import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { Project } from "ts-morph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildArchitectureModel } from "./ArchitectureModelBuilder.js";
import { parseComponentJSDoc } from "./JSDocParser.js";
import { serializeToJson } from "./JsonSerializer.js";
import { inferImportRelationships } from "./RelationshipInferrer.js";
import type { ArchitectureData, EdgeData, NodeData } from "./types.js";

describe("Architecture Generator Integration", () => {
  const testDataDir = "test-integration-data";
  const outputFile = "test-architecture.json";

  beforeEach(() => {
    // Clean up any existing test files
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
    if (existsSync(outputFile)) {
      rmSync(outputFile, { force: true });
    }

    // Create test data directory
    mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test files after each test
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
    if (existsSync(outputFile)) {
      rmSync(outputFile, { force: true });
    }
  });

  describe("Complete Pipeline", () => {
    it("should generate architecture data for a simple component hierarchy", () => {
      // Create test files
      writeFileSync(
        `${testDataDir}/service.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Container
         * @description Core business logic service
         * @tag backend
         * @tag service
         * @groupByLayer Service
         * @link https://example.com/service-docs
         */
        export class ServiceComponent {
          public processData(data: string): string {
            return data.toUpperCase();
          }
        }
      `
      );

      writeFileSync(
        `${testDataDir}/ui.ts`,
        `
        import { ServiceComponent } from './service';
        
        /**
         * @architectureComponent
         * @c4 Component
         * @description User interface component
         * @tag frontend
         * @tag ui
         * @groupByLayer UI
         */
        export class UIComponent {
          private service: ServiceComponent;

          constructor() {
            this.service = new ServiceComponent();
          }

          public displayData(data: string): void {
            const processed = this.service.processData(data);
            console.log(processed);
          }
        }
      `
      );

      writeFileSync(
        `${testDataDir}/data.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description Data access component
         * @tag backend
         * @tag data
         * @groupByLayer Data
         */
        export class DataComponent {
          public fetchData(): string {
            return "sample data";
          }
        }
      `
      );

      // Run the full pipeline
      const project = new Project();
      const sourceFiles = project.addSourceFilesAtPaths(`${testDataDir}/*.ts`);

      // Step 1: Parse components
      const nodes: NodeData[] = [];
      sourceFiles.forEach((sourceFile) => {
        const classes = sourceFile.getClasses();
        classes.forEach((cls) => {
          const jsDoc = cls.getJsDocs()[0];
          if (jsDoc) {
            const tags = jsDoc.getTags();
            const hasArchitectureComponent = tags.some(
              (tag) => tag.getTagName() === "architectureComponent"
            );
            if (hasArchitectureComponent) {
              const parseResult = parseComponentJSDoc(cls);
              if (parseResult.success) {
                nodes.push(parseResult.data);
              }
            }
          }
        });
      });

      // Step 2: Infer relationships
      const relationshipResult = inferImportRelationships(project);
      const edges: EdgeData[] = relationshipResult.success
        ? relationshipResult.data
        : [];

      // Step 3: Build model
      const modelResult = buildArchitectureModel(nodes, edges);
      expect(modelResult.success).toBe(true);

      if (modelResult.success) {
        const architectureData = modelResult.data;

        // Step 4: Serialize
        const serializationResult = serializeToJson(
          architectureData,
          outputFile
        );
        expect(serializationResult.success).toBe(true);

        // Verify results
        expect(architectureData.nodes).toHaveLength(3);
        expect(architectureData.edges).toHaveLength(1);

        // Check nodes
        const serviceNode = architectureData.nodes.find(
          (n) => n.id === "ServiceComponent"
        );
        const uiNode = architectureData.nodes.find(
          (n) => n.id === "UIComponent"
        );
        const dataNode = architectureData.nodes.find(
          (n) => n.id === "DataComponent"
        );

        expect(serviceNode).toBeDefined();
        expect(serviceNode?.c4Level).toBe("Container");
        expect(serviceNode?.layer).toBe("Service");
        expect(serviceNode?.tags).toContain("backend");
        expect(serviceNode?.tags).toContain("service");
        expect(serviceNode?.links).toContain(
          "https://example.com/service-docs"
        );

        expect(uiNode).toBeDefined();
        expect(uiNode?.layer).toBe("UI");
        expect(uiNode?.tags).toContain("frontend");

        expect(dataNode).toBeDefined();
        expect(dataNode?.layer).toBe("Data");

        // Check relationships
        expect(architectureData.edges[0]).toEqual({
          sourceId: "UIComponent",
          targetId: "ServiceComponent",
          type: "depends on",
        });

        // Check diagram
        const diagram = architectureData.diagrams[0];
        expect(diagram.id).toBe("main-diagram");
        expect(diagram.mermaidDefinition).toContain("graph TD");
        expect(diagram.mermaidDefinition).toContain('subgraph UI_["UI"]');
        expect(diagram.mermaidDefinition).toContain(
          'subgraph Service_["Service"]'
        );
        expect(diagram.mermaidDefinition).toContain('subgraph Data_["Data"]');
        expect(diagram.mermaidDefinition).toContain(
          "UIComponent --> ServiceComponent"
        );

        // Verify file was written
        expect(existsSync(outputFile)).toBe(true);
        const fileContent = readFileSync(outputFile, "utf8");
        const parsedData = JSON.parse(fileContent);
        expect(parsedData).toEqual(architectureData);
      }
    });

    it("should handle components with no relationships", () => {
      // Create isolated components
      writeFileSync(
        `${testDataDir}/isolated1.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description First isolated component
         * @tag isolated
         * @groupByLayer Service
         */
        export class IsolatedComponent1 {
          public method1(): void {}
        }
      `
      );

      writeFileSync(
        `${testDataDir}/isolated2.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description Second isolated component
         * @tag isolated
         * @groupByLayer Service
         */
        export class IsolatedComponent2 {
          public method2(): void {}
        }
      `
      );

      // Run pipeline
      const project = new Project();
      const sourceFiles = project.addSourceFilesAtPaths(`${testDataDir}/*.ts`);

      const nodes: NodeData[] = [];
      sourceFiles.forEach((sourceFile) => {
        const classes = sourceFile.getClasses();
        classes.forEach((cls) => {
          const jsDoc = cls.getJsDocs()[0];
          if (jsDoc) {
            const tags = jsDoc.getTags();
            const hasArchitectureComponent = tags.some(
              (tag) => tag.getTagName() === "architectureComponent"
            );
            if (hasArchitectureComponent) {
              const parseResult = parseComponentJSDoc(cls);
              if (parseResult.success) {
                nodes.push(parseResult.data);
              }
            }
          }
        });
      });

      const relationshipResult = inferImportRelationships(project);
      const edges: EdgeData[] = relationshipResult.success
        ? relationshipResult.data
        : [];

      const modelResult = buildArchitectureModel(nodes, edges);
      expect(modelResult.success).toBe(true);

      if (modelResult.success) {
        expect(modelResult.data.nodes).toHaveLength(2);
        expect(modelResult.data.edges).toHaveLength(0);

        // Should still generate valid Mermaid diagram
        const diagram = modelResult.data.diagrams[0];
        expect(diagram.mermaidDefinition).toContain("IsolatedComponent1");
        expect(diagram.mermaidDefinition).toContain("IsolatedComponent2");
        expect(diagram.mermaidDefinition).not.toContain("-->");
      }
    });

    it("should handle complex dependency chains", () => {
      // Create a chain: UI -> Service -> Data
      writeFileSync(
        `${testDataDir}/data.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description Data layer component
         * @groupByLayer Data
         */
        export class DataComponent {
          public getData(): string {
            return "data";
          }
        }
      `
      );

      writeFileSync(
        `${testDataDir}/service.ts`,
        `
        import { DataComponent } from './data';
        
        /**
         * @architectureComponent
         * @c4 Container
         * @description Service layer component
         * @groupByLayer Service
         */
        export class ServiceComponent {
          private data: DataComponent;
          
          public processData(): string {
            return this.data.getData().toUpperCase();
          }
        }
      `
      );

      writeFileSync(
        `${testDataDir}/ui.ts`,
        `
        import { ServiceComponent } from './service';
        
        /**
         * @architectureComponent
         * @c4 Component
         * @description UI layer component
         * @groupByLayer UI
         */
        export class UIComponent {
          private service: ServiceComponent;
          
          public render(): void {
            console.log(this.service.processData());
          }
        }
      `
      );

      // Run pipeline
      const project = new Project();
      const sourceFiles = project.addSourceFilesAtPaths(`${testDataDir}/*.ts`);

      const nodes: NodeData[] = [];
      sourceFiles.forEach((sourceFile) => {
        const classes = sourceFile.getClasses();
        classes.forEach((cls) => {
          const jsDoc = cls.getJsDocs()[0];
          if (jsDoc) {
            const tags = jsDoc.getTags();
            const hasArchitectureComponent = tags.some(
              (tag) => tag.getTagName() === "architectureComponent"
            );
            if (hasArchitectureComponent) {
              const parseResult = parseComponentJSDoc(cls);
              if (parseResult.success) {
                nodes.push(parseResult.data);
              }
            }
          }
        });
      });

      const relationshipResult = inferImportRelationships(project);
      const edges: EdgeData[] = relationshipResult.success
        ? relationshipResult.data
        : [];

      const modelResult = buildArchitectureModel(nodes, edges);
      expect(modelResult.success).toBe(true);

      if (modelResult.success) {
        expect(modelResult.data.nodes).toHaveLength(3);
        expect(modelResult.data.edges).toHaveLength(2);

        // Check the dependency chain
        const relationships = modelResult.data.edges.map(
          (e) => `${e.sourceId} -> ${e.targetId}`
        );
        expect(relationships).toContain("UIComponent -> ServiceComponent");
        expect(relationships).toContain("ServiceComponent -> DataComponent");

        // Verify diagram contains the chain
        const mermaid = modelResult.data.diagrams[0].mermaidDefinition;
        expect(mermaid).toContain("UIComponent --> ServiceComponent");
        expect(mermaid).toContain("ServiceComponent --> DataComponent");
      }
    });

    it("should handle mixed valid and invalid components gracefully", () => {
      // Valid component
      writeFileSync(
        `${testDataDir}/valid.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description Valid component
         * @groupByLayer Service
         */
        export class ValidComponent {
          public method(): void {}
        }
      `
      );

      // Component without JSDoc
      writeFileSync(
        `${testDataDir}/no-jsdoc.ts`,
        `
        export class NoJSDocComponent {
          public method(): void {}
        }
      `
      );

      // Component without architecture tag
      writeFileSync(
        `${testDataDir}/no-arch-tag.ts`,
        `
        /**
         * @description Component without architecture tag
         */
        export class NoArchTagComponent {
          public method(): void {}
        }
      `
      );

      // Component with invalid metadata
      writeFileSync(
        `${testDataDir}/invalid-metadata.ts`,
        `
        /**
         * @architectureComponent
         * @c4 InvalidLevel
         * @groupByLayer InvalidLayer
         */
        export class InvalidMetadataComponent {
          public method(): void {}
        }
      `
      );

      // Run pipeline
      const project = new Project();
      const sourceFiles = project.addSourceFilesAtPaths(`${testDataDir}/*.ts`);

      const nodes: NodeData[] = [];
      sourceFiles.forEach((sourceFile) => {
        const classes = sourceFile.getClasses();
        classes.forEach((cls) => {
          const jsDoc = cls.getJsDocs()[0];
          if (jsDoc) {
            const tags = jsDoc.getTags();
            const hasArchitectureComponent = tags.some(
              (tag) => tag.getTagName() === "architectureComponent"
            );
            if (hasArchitectureComponent) {
              const parseResult = parseComponentJSDoc(cls);
              if (parseResult.success) {
                nodes.push(parseResult.data);
              }
            }
          }
        });
      });

      const relationshipResult = inferImportRelationships(project);
      const edges: EdgeData[] = relationshipResult.success
        ? relationshipResult.data
        : [];

      const modelResult = buildArchitectureModel(nodes, edges);
      expect(modelResult.success).toBe(true);

      if (modelResult.success) {
        // Should only have 2 valid components (ValidComponent and InvalidMetadataComponent with corrected metadata)
        expect(modelResult.data.nodes).toHaveLength(2);

        const validComponent = modelResult.data.nodes.find(
          (n) => n.id === "ValidComponent"
        );
        const invalidComponent = modelResult.data.nodes.find(
          (n) => n.id === "InvalidMetadataComponent"
        );

        expect(validComponent).toBeDefined();
        expect(validComponent?.layer).toBe("Service");

        expect(invalidComponent).toBeDefined();
        expect(invalidComponent?.c4Level).toBe("Component"); // Should be corrected to default
        expect(invalidComponent?.layer).toBeUndefined(); // Invalid layer should be removed
      }
    });

    it("should generate valid JSON that passes schema validation", () => {
      // Create a simple valid component
      writeFileSync(
        `${testDataDir}/simple.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description Simple test component
         * @groupByLayer Service
         */
        export class SimpleComponent {
          public method(): void {}
        }
      `
      );

      // Run pipeline
      const project = new Project();
      const sourceFiles = project.addSourceFilesAtPaths(`${testDataDir}/*.ts`);

      const nodes: NodeData[] = [];
      sourceFiles.forEach((sourceFile) => {
        const classes = sourceFile.getClasses();
        classes.forEach((cls) => {
          const jsDoc = cls.getJsDocs()[0];
          if (jsDoc) {
            const tags = jsDoc.getTags();
            const hasArchitectureComponent = tags.some(
              (tag) => tag.getTagName() === "architectureComponent"
            );
            if (hasArchitectureComponent) {
              const parseResult = parseComponentJSDoc(cls);
              if (parseResult.success) {
                nodes.push(parseResult.data);
              }
            }
          }
        });
      });

      const relationshipResult = inferImportRelationships(project);
      const edges: EdgeData[] = relationshipResult.success
        ? relationshipResult.data
        : [];

      const modelResult = buildArchitectureModel(nodes, edges);
      expect(modelResult.success).toBe(true);

      if (modelResult.success) {
        const serializationResult = serializeToJson(
          modelResult.data,
          outputFile
        );
        expect(serializationResult.success).toBe(true);

        // Verify the generated JSON structure
        const fileContent = readFileSync(outputFile, "utf8");
        const parsedData: ArchitectureData = JSON.parse(fileContent);

        // Check required top-level properties
        expect(parsedData).toHaveProperty("diagrams");
        expect(parsedData).toHaveProperty("nodes");
        expect(parsedData).toHaveProperty("edges");

        // Check diagrams structure
        expect(Array.isArray(parsedData.diagrams)).toBe(true);
        expect(parsedData.diagrams).toHaveLength(1);
        expect(parsedData.diagrams[0]).toHaveProperty("id");
        expect(parsedData.diagrams[0]).toHaveProperty("mermaidDefinition");
        expect(parsedData.diagrams[0]).toHaveProperty("defaultView");

        // Check nodes structure
        expect(Array.isArray(parsedData.nodes)).toBe(true);
        expect(parsedData.nodes).toHaveLength(1);
        expect(parsedData.nodes[0]).toHaveProperty("id");
        expect(parsedData.nodes[0]).toHaveProperty("name");
        expect(parsedData.nodes[0]).toHaveProperty("c4Level");

        // Check edges structure
        expect(Array.isArray(parsedData.edges)).toBe(true);
      }
    });
  });

  describe("Error Recovery", () => {
    it("should continue processing when some files fail to parse", () => {
      // Valid component
      writeFileSync(
        `${testDataDir}/valid.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description Valid component
         * @groupByLayer Service
         */
        export class ValidComponent {
          public method(): void {}
        }
      `
      );

      // File with syntax errors
      writeFileSync(
        `${testDataDir}/broken.ts`,
        `
        /**
         * @architectureComponent
         * @c4 Component
         * @description Broken component
         */
        export class BrokenComponent {
          public method(: void { // Syntax error
            console.log("broken"
          // Missing closing brace
      `
      );

      // Run pipeline
      const project = new Project();

      // ts-morph should handle the syntax error gracefully
      const sourceFiles = project.addSourceFilesAtPaths(`${testDataDir}/*.ts`);

      const nodes: NodeData[] = [];
      sourceFiles.forEach((sourceFile) => {
        try {
          const classes = sourceFile.getClasses();
          classes.forEach((cls) => {
            const jsDoc = cls.getJsDocs()[0];
            if (jsDoc) {
              const tags = jsDoc.getTags();
              const hasArchitectureComponent = tags.some(
                (tag) => tag.getTagName() === "architectureComponent"
              );
              if (hasArchitectureComponent) {
                const parseResult = parseComponentJSDoc(cls);
                if (parseResult.success) {
                  nodes.push(parseResult.data);
                }
              }
            }
          });
        } catch (_error) {
          // Should handle parse errors gracefully
          console.log(`Error processing file: ${sourceFile.getFilePath()}`);
        }
      });

      const relationshipResult = inferImportRelationships(project);
      const edges: EdgeData[] = relationshipResult.success
        ? relationshipResult.data
        : [];

      const modelResult = buildArchitectureModel(nodes, edges);

      // Should still succeed with at least the valid component
      expect(modelResult.success).toBe(true);
      if (modelResult.success) {
        expect(modelResult.data.nodes.length).toBeGreaterThanOrEqual(1);
        const validComponent = modelResult.data.nodes.find(
          (n) => n.id === "ValidComponent"
        );
        expect(validComponent).toBeDefined();
      }
    });
  });
});
