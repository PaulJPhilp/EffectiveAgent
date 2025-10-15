import { describe, expect, it } from "vitest";
import {
  buildArchitectureModel,
  type ModelBuildResult,
} from "./ArchitectureModelBuilder.js";
import type { EdgeData, NodeData } from "./types.js";

describe("ArchitectureModelBuilder", () => {
  describe("Valid Model Building", () => {
    it("should build a complete architecture model", () => {
      const nodes: NodeData[] = [
        {
          id: "UIComponent",
          name: "UI Component",
          c4Level: "Component",
          description: "User interface component",
          tags: ["frontend", "ui"],
          layer: "UI",
          links: ["https://example.com/ui-docs"],
        },
        {
          id: "ServiceComponent",
          name: "Service Component",
          c4Level: "Container",
          description: "Business logic service",
          tags: ["backend", "service"],
          layer: "Service",
        },
      ];

      const edges: EdgeData[] = [
        {
          sourceId: "UIComponent",
          targetId: "ServiceComponent",
          type: "depends on",
          label: "uses",
        },
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toEqual(nodes);
        expect(result.data.edges).toEqual(edges);
        expect(result.data.diagrams).toHaveLength(1);

        const diagram = result.data.diagrams[0];
        expect(diagram.id).toBe("main-diagram");
        expect(diagram.defaultView).toBe(true);
        expect(diagram.mermaidDefinition).toContain("graph TD");
        expect(diagram.mermaidDefinition).toContain('subgraph UI_["UI"]');
        expect(diagram.mermaidDefinition).toContain(
          'subgraph Service_["Service"]'
        );
        expect(diagram.mermaidDefinition).toContain(
          'UIComponent["UI Component"]'
        );
        expect(diagram.mermaidDefinition).toContain(
          'ServiceComponent["Service Component"]'
        );
        expect(diagram.mermaidDefinition).toContain(
          'UIComponent --> ServiceComponent'
        );
      }
    });

    it("should handle components with no layer (Other group)", () => {
      const nodes: NodeData[] = [
        {
          id: "ComponentWithoutLayer",
          name: "Component Without Layer",
          c4Level: "Component",
        },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.diagrams[0].mermaidDefinition).toContain(
          'subgraph Other_["Other"]'
        );
        expect(result.warnings).toContain(
          "All components are in the 'Other' layer - consider adding @groupByLayer tags"
        );
      }
    });

    it("should handle empty edges gracefully", () => {
      const nodes: NodeData[] = [
        {
          id: "IsolatedComponent",
          name: "Isolated Component",
          c4Level: "Component",
          layer: "Service",
        },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0);
        expect(result.data.diagrams[0].mermaidDefinition).not.toContain("-->");
      }
    });

    it("should sanitize Mermaid-unsafe characters", () => {
      const nodes: NodeData[] = [
        {
          id: "ComponentWithSpecialChars",
          name: 'Component [With] "Special" Chars',
          c4Level: "Component",
          layer: "Special Layer!",
        },
      ];

      const edges: EdgeData[] = [
        {
          sourceId: "ComponentWithSpecialChars",
          targetId: "ComponentWithSpecialChars",
          type: "depends on",
          label: 'self-ref with [brackets] and "quotes"',
        },
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        const mermaid = result.data.diagrams[0].mermaidDefinition;
        expect(mermaid).toContain(
          'ComponentWithSpecialChars["Component With Special Chars"]'
        );
        expect(mermaid).toContain('subgraph Special_Layer_["Special Layer!"]');
        expect(result.warnings).toContain(
          "Skipping self-referencing edge: 'ComponentWithSpecialChars' -> 'ComponentWithSpecialChars'"
        );
      }
    });
  });

  describe("Input Validation", () => {
    it("should fail with invalid nodes parameter", () => {
      const result = buildArchitectureModel(null as any, []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Nodes parameter must be an array");
      }
    });

    it("should fail with invalid edges parameter", () => {
      const nodes: NodeData[] = [
        { id: "TestComponent", name: "Test", c4Level: "Component" },
      ];

      const result = buildArchitectureModel(nodes, null as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Edges parameter must be an array");
      }
    });

    it("should fail with empty nodes array", () => {
      const result = buildArchitectureModel([], []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Cannot build architecture model with no components"
        );
      }
    });
  });

  describe("Node Validation", () => {
    it("should skip nodes with missing or invalid id", () => {
      const nodes: NodeData[] = [
        { id: "", name: "Invalid", c4Level: "Component" } as any,
        { id: "ValidComponent", name: "Valid", c4Level: "Component" },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toHaveLength(1);
        expect(result.data.nodes[0].id).toBe("ValidComponent");
        expect(result.warnings).toContain(
          "Skipping node with missing or invalid id"
        );
      }
    });

    it("should fix nodes with missing name", () => {
      const nodes: NodeData[] = [
        { id: "ComponentWithoutName", name: "", c4Level: "Component" } as any,
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes[0].name).toBe("ComponentWithoutName");
        expect(result.warnings).toContain(
          "Node 'ComponentWithoutName' has missing or invalid name, using id as fallback"
        );
      }
    });

    it("should skip duplicate node IDs", () => {
      const nodes: NodeData[] = [
        { id: "DuplicateComponent", name: "First", c4Level: "Component" },
        { id: "DuplicateComponent", name: "Second", c4Level: "System" },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toHaveLength(1);
        expect(result.data.nodes[0].name).toBe("First"); // First one should be kept
        expect(result.warnings).toContain(
          "Duplicate node ID detected: 'DuplicateComponent' - skipping duplicate"
        );
      }
    });

    it("should fix invalid c4Level", () => {
      const nodes: NodeData[] = [
        {
          id: "InvalidC4Component",
          name: "Invalid",
          c4Level: "InvalidLevel" as any,
        },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes[0].c4Level).toBe("Component");
        expect(result.warnings).toContain(
          "Node 'InvalidC4Component' has invalid c4Level 'InvalidLevel', using 'Component' as fallback"
        );
      }
    });

    it("should remove invalid layer", () => {
      const nodes: NodeData[] = [
        {
          id: "InvalidLayerComponent",
          name: "Invalid",
          c4Level: "Component",
          layer: "InvalidLayer" as any,
        },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes[0].layer).toBeUndefined();
        expect(result.warnings).toContain(
          "Node 'InvalidLayerComponent' has invalid layer 'InvalidLayer', removing layer"
        );
      }
    });
  });

  describe("Edge Validation", () => {
    it("should skip edges with missing sourceId or targetId", () => {
      const nodes: NodeData[] = [
        { id: "ValidComponent", name: "Valid", c4Level: "Component" },
      ];

      const edges: EdgeData[] = [
        { sourceId: "", targetId: "ValidComponent", type: "depends on" } as any,
        { sourceId: "ValidComponent", targetId: "", type: "depends on" } as any,
        {
          sourceId: "ValidComponent",
          targetId: "ValidComponent",
          type: "self-ref",
        },
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0); // All edges should be skipped
        expect(result.warnings).toContain(
          "Skipping edge with missing or invalid sourceId"
        );
        expect(result.warnings).toContain(
          "Skipping edge with missing or invalid targetId"
        );
        expect(result.warnings).toContain(
          "Skipping self-referencing edge: 'ValidComponent' -> 'ValidComponent'"
        );
      }
    });

    it("should skip edges referencing non-existent nodes", () => {
      const nodes: NodeData[] = [
        { id: "ExistingComponent", name: "Existing", c4Level: "Component" },
      ];

      const edges: EdgeData[] = [
        {
          sourceId: "NonExistentSource",
          targetId: "ExistingComponent",
          type: "depends on",
        },
        {
          sourceId: "ExistingComponent",
          targetId: "NonExistentTarget",
          type: "depends on",
        },
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0);
        expect(result.warnings).toContain(
          "Edge references non-existent source node: 'NonExistentSource' - skipping edge"
        );
        expect(result.warnings).toContain(
          "Edge references non-existent target node: 'NonExistentTarget' - skipping edge"
        );
      }
    });

    it("should skip duplicate edges", () => {
      const nodes: NodeData[] = [
        { id: "ComponentA", name: "Component A", c4Level: "Component" },
        { id: "ComponentB", name: "Component B", c4Level: "Component" },
      ];

      const edges: EdgeData[] = [
        { sourceId: "ComponentA", targetId: "ComponentB", type: "depends on" },
        { sourceId: "ComponentA", targetId: "ComponentB", type: "uses" }, // Different type, same connection
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(1);
        expect(result.warnings).toContain(
          "Duplicate edge detected: ComponentA->ComponentB - skipping duplicate"
        );
      }
    });

    it("should set default type for edges without type", () => {
      const nodes: NodeData[] = [
        { id: "ComponentA", name: "Component A", c4Level: "Component" },
        { id: "ComponentB", name: "Component B", c4Level: "Component" },
      ];

      const edges: EdgeData[] = [
        { sourceId: "ComponentA", targetId: "ComponentB", type: "" } as any,
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges[0].type).toBe("depends on");
      }
    });
  });

  describe("Mermaid Generation", () => {
    it("should generate proper subgraph structure", () => {
      const nodes: NodeData[] = [
        {
          id: "UIComp",
          name: "UI Component",
          c4Level: "Component",
          layer: "UI",
        },
        {
          id: "ServiceComp",
          name: "Service Component",
          c4Level: "Component",
          layer: "Service",
        },
        {
          id: "DataComp",
          name: "Data Component",
          c4Level: "Component",
          layer: "Data",
        },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        const mermaid = result.data.diagrams[0].mermaidDefinition;
        expect(mermaid).toContain('subgraph UI_["UI"]');
        expect(mermaid).toContain('subgraph Service_["Service"]');
        expect(mermaid).toContain('subgraph Data_["Data"]');
        expect(mermaid).toContain('UIComp["UI Component"]');
        expect(mermaid).toContain('ServiceComp["Service Component"]');
        expect(mermaid).toContain('DataComp["Data Component"]');
      }
    });

    it("should handle edges with and without labels", () => {
      const nodes: NodeData[] = [
        { id: "CompA", name: "Component A", c4Level: "Component" },
        { id: "CompB", name: "Component B", c4Level: "Component" },
        { id: "CompC", name: "Component C", c4Level: "Component" },
      ];

      const edges: EdgeData[] = [
        {
          sourceId: "CompA",
          targetId: "CompB",
          type: "depends on",
          label: "uses API",
        },
        { sourceId: "CompB", targetId: "CompC", type: "depends on" }, // No label
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        const mermaid = result.data.diagrams[0].mermaidDefinition;
        expect(mermaid).toContain('CompA --> CompB');
        expect(mermaid).toContain('CompB --> CompC');
      }
    });
  });

  describe("Error Recovery", () => {
    it("should continue processing after encountering bad nodes", () => {
      const nodes: NodeData[] = [
        { id: "", name: "Bad Node 1", c4Level: "Component" } as any,
        { id: "GoodNode", name: "Good Node", c4Level: "Component" },
        { id: "DuplicateGood", name: "Duplicate 1", c4Level: "Component" },
        { id: "DuplicateGood", name: "Duplicate 2", c4Level: "System" },
      ];

      const result = buildArchitectureModel(nodes, []) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toHaveLength(2); // Should have 2 valid nodes
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it("should handle edge processing errors gracefully", () => {
      const nodes: NodeData[] = [
        { id: "ValidNode", name: "Valid Node", c4Level: "Component" },
      ];

      const edges: EdgeData[] = [
        { sourceId: "ValidNode", targetId: "NonExistent", type: "depends on" },
        { sourceId: "ValidNode", targetId: "ValidNode", type: "depends on" },
      ];

      const result = buildArchitectureModel(nodes, edges) as ModelBuildResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0); // All edges should be filtered out
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });
});
