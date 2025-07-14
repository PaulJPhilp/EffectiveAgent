import { describe, it, expect } from "vitest";
import { Project, ClassDeclaration } from "ts-morph";
import { parseComponentJSDoc, JSDocParseResult } from "./JSDocParser.js";

describe("JSDocParser", () => {
  // Helper function to create a class with JSDoc from source code
  function createClassWithJSDoc(sourceCode: string): ClassDeclaration {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile("test.ts", sourceCode);
    const classDeclaration = sourceFile.getClasses()[0];
    if (!classDeclaration) {
      throw new Error("No class found in source code");
    }
    return classDeclaration;
  }

  describe("Valid JSDoc Parsing", () => {
    it("should parse a complete, valid component", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         * @c4 System
         * @description A complete component for testing.
         * @tag ui
         * @tag form
         * @groupByLayer UI
         * @link https://example.com/docs
         */
        export class CompleteComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("CompleteComponent");
        expect(result.data.name).toBe("CompleteComponent");
        expect(result.data.c4Level).toBe("System");
        expect(result.data.description).toBe(
          "A complete component for testing."
        );
        expect(result.data.tags).toEqual(["ui", "form"]);
        expect(result.data.layer).toBe("UI");
        expect(result.data.links).toEqual(["https://example.com/docs"]);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it("should parse a minimal valid component", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         */
        export class MinimalComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("MinimalComponent");
        expect(result.data.name).toBe("MinimalComponent");
        expect(result.data.c4Level).toBe("Component"); // Default fallback
        expect(result.warnings).toContain(
          "Component 'MinimalComponent' is missing @description tag"
        );
        expect(result.warnings).toContain(
          "Component 'MinimalComponent' is missing @groupByLayer tag"
        );
      }
    });

    it("should handle multiple tags and links", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         * @description A component with multiple tags and links.
         * @tag frontend
         * @tag react
         * @tag ui
         * @link https://github.com/example/repo
         * @link https://docs.example.com
         */
        export class MultiTagComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["frontend", "react", "ui"]);
        expect(result.data.links).toEqual([
          "https://github.com/example/repo",
          "https://docs.example.com",
        ]);
      }
    });
  });

  describe("Error Handling", () => {
    it("should fail when @architectureComponent tag is missing", () => {
      const sourceCode = `
        /**
         * @description A component without the required tag.
         */
        export class MissingTagComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "missing required @architectureComponent tag"
        );
      }
    });

    it("should fail when JSDoc is completely missing", () => {
      const sourceCode = `
        export class NoJSDocComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("missing JSDoc comments");
      }
    });

    it("should handle class without name gracefully", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         */
        export class {
          public method(): void {}
        }
      `;

      // This will create an anonymous class, which ts-morph handles
      const project = new Project({ useInMemoryFileSystem: true });
      const sourceFile = project.createSourceFile("test.ts", sourceCode);
      const classDecl = sourceFile.getClasses()[0]!;

      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("UnnamedComponent");
        expect(result.warnings).toContain(
          "Component has no name, using fallback: UnnamedComponent"
        );
      }
    });
  });

  describe("Validation and Warnings", () => {
    it("should warn about invalid c4Level", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         * @c4 InvalidLevel
         */
        export class InvalidC4Component {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.c4Level).toBe("Component"); // Should fallback to default
        expect(result.warnings).toContain(
          "Component 'InvalidC4Component' has invalid @c4 level 'InvalidLevel'. Valid levels: System, Container, Component"
        );
      }
    });

    it("should warn about invalid groupByLayer", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         * @groupByLayer InvalidLayer
         */
        export class InvalidLayerComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.layer).toBeUndefined(); // Should be removed
        expect(result.warnings).toContain(
          "Component 'InvalidLayerComponent' has invalid @groupByLayer 'InvalidLayer'. Valid layers: UI, Service, Data, External"
        );
        expect(result.warnings).toContain(
          "Component 'InvalidLayerComponent' is missing @groupByLayer tag"
        );
      }
    });

    it("should warn about invalid URLs in links", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         * @link not-a-valid-url
         * @link https://valid-url.com
         */
        export class InvalidLinkComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.links).toEqual(["https://valid-url.com"]); // Only valid URL should be kept
        expect(result.warnings).toContain(
          "Component 'InvalidLinkComponent' has invalid URL in @link: 'not-a-valid-url'"
        );
      }
    });

    it("should warn about empty tag values", () => {
      const sourceCode = `
        /**
         * @architectureComponent
         * @tag
         * @tag validTag
         * @description
         * @link
         * @c4
         * @groupByLayer
         */
        export class EmptyTagsComponent {
          public method(): void {}
        }
      `;

      const classDecl = createClassWithJSDoc(sourceCode);
      const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["validTag"]); // Only valid tag should be kept
        expect(result.warnings).toContain(
          "Component 'EmptyTagsComponent' has empty @tag"
        );
        expect(result.warnings).toContain(
          "Component 'EmptyTagsComponent' has empty @description tag"
        );
        expect(result.warnings).toContain(
          "Component 'EmptyTagsComponent' has empty @link tag"
        );
        expect(result.warnings).toContain(
          "Component 'EmptyTagsComponent' has empty @c4 tag"
        );
        expect(result.warnings).toContain(
          "Component 'EmptyTagsComponent' has empty @groupByLayer tag"
        );
      }
    });
  });

  describe("Valid Values", () => {
    it("should accept all valid c4Level values", () => {
      const validLevels = ["System", "Container", "Component"];

      for (const level of validLevels) {
        const sourceCode = `
          /**
           * @architectureComponent
           * @c4 ${level}
           */
          export class Test${level}Component {
            public method(): void {}
          }
        `;

        const classDecl = createClassWithJSDoc(sourceCode);
        const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.c4Level).toBe(level);
          // Should not have warning about invalid c4Level
          const c4Warnings = result.warnings.filter((w) =>
            w.includes("invalid @c4 level")
          );
          expect(c4Warnings).toHaveLength(0);
        }
      }
    });

    it("should accept all valid layer values", () => {
      const validLayers = ["UI", "Service", "Data", "External"];

      for (const layer of validLayers) {
        const sourceCode = `
          /**
           * @architectureComponent
           * @groupByLayer ${layer}
           */
          export class Test${layer}Component {
            public method(): void {}
          }
        `;

        const classDecl = createClassWithJSDoc(sourceCode);
        const result = parseComponentJSDoc(classDecl) as JSDocParseResult;

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.layer).toBe(layer);
          // Should not have warning about invalid layer
          const layerWarnings = result.warnings.filter((w) =>
            w.includes("invalid @groupByLayer")
          );
          expect(layerWarnings).toHaveLength(0);
        }
      }
    });
  });
});
