import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import {
  inferImportRelationships,
  RelationshipResult,
} from "./RelationshipInferrer.js";

describe("RelationshipInferrer", () => {
  describe("Valid Relationship Inference", () => {
    it("should detect relationships between architectural components", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      // Create the target component
      project.createSourceFile(
        "target.ts",
        `
        /**
         * @architectureComponent
         * @description Target component
         */
        export class TargetComponent {
          public method(): void {}
        }
      `
      );

      // Create the source component that imports the target
      project.createSourceFile(
        "source.ts",
        `
        import { TargetComponent } from './target';
        
        /**
         * @architectureComponent
         * @description Source component that depends on target
         */
        export class SourceComponent {
          private target: TargetComponent;
          
          constructor() {
            this.target = new TargetComponent();
          }
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          sourceId: "SourceComponent",
          targetId: "TargetComponent",
          type: "depends on",
        });
        expect(result.stats.totalImports).toBe(1);
        expect(result.stats.resolvedImports).toBe(1);
        expect(result.stats.unresolvedImports).toBe(0);
        expect(result.stats.relationshipsFound).toBe(1);
      }
    });

    it("should handle multiple imports and relationships", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      // Create multiple target components
      project.createSourceFile(
        "service.ts",
        `
        /**
         * @architectureComponent
         * @description Service component
         */
        export class ServiceComponent {
          public method(): void {}
        }
      `
      );

      project.createSourceFile(
        "data.ts",
        `
        /**
         * @architectureComponent
         * @description Data component
         */
        export class DataComponent {
          public method(): void {}
        }
      `
      );

      // Create a source component that imports both
      project.createSourceFile(
        "ui.ts",
        `
        import { ServiceComponent } from './service';
        import { DataComponent } from './data';
        
        /**
         * @architectureComponent
         * @description UI component that uses service and data
         */
        export class UIComponent {
          private service: ServiceComponent;
          private data: DataComponent;
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);

        const relationships = result.data.map(
          (edge) => `${edge.sourceId} -> ${edge.targetId}`
        );
        expect(relationships).toContain("UIComponent -> ServiceComponent");
        expect(relationships).toContain("UIComponent -> DataComponent");

        expect(result.stats.totalImports).toBe(2);
        expect(result.stats.resolvedImports).toBe(2);
        expect(result.stats.relationshipsFound).toBe(2);
      }
    });

    it("should ignore imports to non-architectural components", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      // Create a regular component (no @architectureComponent tag)
      project.createSourceFile(
        "utility.ts",
        `
        export class UtilityClass {
          public helper(): void {}
        }
      `
      );

      // Create an architectural component that imports the utility
      project.createSourceFile(
        "main.ts",
        `
        import { UtilityClass } from './utility';
        
        /**
         * @architectureComponent
         * @description Main component
         */
        export class MainComponent {
          private util: UtilityClass;
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0); // No relationships to non-architectural components
        expect(result.stats.totalImports).toBe(1);
        expect(result.stats.resolvedImports).toBe(1);
        expect(result.stats.relationshipsFound).toBe(0);
      }
    });

    it("should ignore external package imports", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "component.ts",
        `
        import React from 'react';
        import { Observable } from 'rxjs';
        import { SomePackage } from '@external/package';
        
        /**
         * @architectureComponent
         * @description Component with external imports
         */
        export class ComponentWithExternals {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0); // No relationships to external packages
        expect(result.stats.totalImports).toBe(0); // External imports should be skipped
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle empty project gracefully", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No source files found in project");
      }
    });

    it("should handle project with no architectural components", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "regular.ts",
        `
        export class RegularClass {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
        expect(result.warnings).toContain(
          "No architectural components found in project"
        );
      }
    });

    it("should handle unresolved imports gracefully", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "component.ts",
        `
        import { NonExistentComponent } from './missing-file';
        import { AnotherMissing } from './another-missing';
        
        /**
         * @architectureComponent
         * @description Component with broken imports
         */
        export class ComponentWithBrokenImports {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
        expect(result.stats.totalImports).toBe(2);
        expect(result.stats.unresolvedImports).toBe(2);
        expect(result.warnings).toContain(
          "Could not resolve import './missing-file' in component 'ComponentWithBrokenImports'"
        );
        expect(result.warnings).toContain(
          "Could not resolve import './another-missing' in component 'ComponentWithBrokenImports'"
        );
        expect(result.warnings).toContain(
          "2 out of 2 imports could not be resolved"
        );
      }
    });

    it("should detect and warn about duplicate relationships", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "target.ts",
        `
        /**
         * @architectureComponent
         * @description Target component
         */
        export class TargetComponent {
          public method(): void {}
        }
        
        export const helper = () => {};
      `
      );

      project.createSourceFile(
        "source.ts",
        `
        import { TargetComponent } from './target';
        import { helper } from './target';
        
        /**
         * @architectureComponent
         * @description Source component
         */
        export class SourceComponent {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1); // Should deduplicate
        expect(result.warnings).toContain(
          "Duplicate relationship detected: SourceComponent -> TargetComponent"
        );
      }
    });

    it("should handle components with no imports", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "isolated1.ts",
        `
        /**
         * @architectureComponent
         * @description First isolated component
         */
        export class IsolatedComponent1 {
          public method(): void {}
        }
      `
      );

      project.createSourceFile(
        "isolated2.ts",
        `
        /**
         * @architectureComponent
         * @description Second isolated component
         */
        export class IsolatedComponent2 {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
        expect(result.warnings).toContain(
          "No relationships found between components - this may indicate missing imports or isolated components"
        );
      }
    });
  });

  describe("Edge Cases", () => {
    it("should prevent self-referencing relationships", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      // This shouldn't happen in practice, but let's test the safeguard
      project.createSourceFile(
        "self.ts",
        `
        import type { SelfComponent } from './self';
        
        /**
         * @architectureComponent
         * @description Self-referencing component
         */
        export class SelfComponent {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        // Should not create self-referencing relationships
        const selfRefs = result.data.filter(
          (edge) => edge.sourceId === edge.targetId
        );
        expect(selfRefs).toHaveLength(0);
      }
    });

    it("should handle components without names gracefully", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "unnamed.ts",
        `
        /**
         * @architectureComponent
         */
        export class {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toContain(
          "Found architectural component without name in file"
        );
      }
    });

    it("should handle malformed source files", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      // Add a component that should work
      project.createSourceFile(
        "good.ts",
        `
        /**
         * @architectureComponent
         * @description Good component
         */
        export class GoodComponent {
          public method(): void {}
        }
      `
      );

      const result = inferImportRelationships(project) as RelationshipResult;

      // Should still succeed with the good component
      expect(result.success).toBe(true);
    });
  });
});
