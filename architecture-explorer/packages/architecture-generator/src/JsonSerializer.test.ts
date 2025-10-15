import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type JsonSerializeResult, serializeToJson } from "./JsonSerializer.js";
import {
  type ArchitectureData,
  DiagramDefinition,
  type EdgeData,
  type NodeData,
} from "./types.js";

describe("JsonSerializer", () => {
  const testDir = "test-output";

  beforeEach(() => {
    // Clean up and recreate test directory before each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test files after each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Valid Serialization", () => {
    it("should serialize a complete architecture data object", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          {
            id: "main-diagram",
            mermaidDefinition: "graph TD\n  A --> B",
            defaultView: true,
          },
        ],
        nodes: [
          {
            id: "ComponentA",
            name: "Component A",
            c4Level: "Component",
            description: "Test component A",
            tags: ["test", "component"],
            layer: "Service",
            links: ["https://example.com"],
          },
          {
            id: "ComponentB",
            name: "Component B",
            c4Level: "Container",
          },
        ],
        edges: [
          {
            sourceId: "ComponentA",
            targetId: "ComponentB",
            type: "depends on",
          },
        ],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/test.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.filePath).toBe(`${testDir}/test.json`);
        expect(result.warnings).toHaveLength(0);

        // Verify file was created
        expect(existsSync(`${testDir}/test.json`)).toBe(true);

        // Verify file contents
        const fileContent = readFileSync(`${testDir}/test.json`, "utf8");
        const parsedData = JSON.parse(fileContent);
        expect(parsedData).toEqual(architectureData);
      }
    });

    it("should create directory if it does not exist", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: [],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/nested/deep/test.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toContain(
          `Created directory: ${testDir}/nested/deep`
        );
        expect(existsSync(`${testDir}/nested/deep/test.json`)).toBe(true);
      }
    });

    it("should handle minimal valid architecture data", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          {
            id: "simple",
            mermaidDefinition: "graph TD",
            defaultView: true,
          },
        ],
        nodes: [
          {
            id: "SimpleNode",
            name: "Simple Node",
            c4Level: "Component",
          },
        ],
        edges: [],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/simple.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(existsSync(`${testDir}/simple.json`)).toBe(true);

        const fileContent = readFileSync(`${testDir}/simple.json`, "utf8");
        const parsedData = JSON.parse(fileContent);
        expect(parsedData).toEqual(architectureData);
      }
    });

    it("should format JSON with proper indentation", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: [],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/formatted.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        const fileContent = readFileSync(`${testDir}/formatted.json`, "utf8");

        // Check for proper indentation (2 spaces)
        expect(fileContent).toContain('{\n  "diagrams":');
        expect(fileContent).toContain('    "id": "test"');
        expect(fileContent).toContain('  ],\n  "nodes":');
      }
    });
  });

  describe("Input Validation", () => {
    it("should fail with null or undefined architecture data", () => {
      const result = serializeToJson(null as any, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Architecture data is null or undefined"
        );
      }
    });

    it("should fail with empty or invalid file path", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: [],
      };

      const result = serializeToJson(architectureData, "");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("File path is missing or invalid");
      }
    });
  });

  describe("Architecture Data Validation", () => {
    it("should fail with invalid architecture data structure", () => {
      const invalidData = { invalid: "structure" } as any;

      const result = serializeToJson(invalidData, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid architecture data");
      }
    });

    it("should fail with non-array diagrams", () => {
      const invalidData = {
        diagrams: "not an array",
        nodes: [],
        edges: [],
      } as any;

      const result = serializeToJson(invalidData, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Diagrams must be an array");
      }
    });

    it("should fail with non-array nodes", () => {
      const invalidData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: "not an array",
        edges: [],
      } as any;

      const result = serializeToJson(invalidData, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Nodes must be an array");
      }
    });

    it("should fail with non-array edges", () => {
      const invalidData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: "not an array",
      } as any;

      const result = serializeToJson(invalidData, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Edges must be an array");
      }
    });

    it("should warn about empty arrays but still succeed", () => {
      const architectureData: ArchitectureData = {
        diagrams: [],
        nodes: [],
        edges: [],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/empty.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toContain(
          "No diagrams found in architecture data"
        );
        expect(result.warnings).toContain(
          "No nodes found in architecture data"
        );
      }
    });

    it("should fail with diagram missing required fields", () => {
      const invalidData = {
        diagrams: [{ defaultView: true }], // Missing id and mermaidDefinition
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: [],
      } as any;

      const result = serializeToJson(invalidData, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Diagram at index 0 is missing required 'id' field"
        );
      }
    });

    it("should fail with node missing required fields", () => {
      const invalidData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ name: "Test", c4Level: "Component" }], // Missing id
        edges: [],
      } as any;

      const result = serializeToJson(invalidData, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Node at index 0 is missing required 'id' field"
        );
      }
    });

    it("should fail with edge missing required fields", () => {
      const invalidData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: [{ sourceId: "TestNode" }], // Missing targetId
      } as any;

      const result = serializeToJson(invalidData, `${testDir}/test.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Edge at index 0 is missing required 'targetId' field"
        );
      }
    });

    it("should warn about missing optional fields", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          {
            id: "test-diagram",
            mermaidDefinition: "", // Empty but present
            defaultView: true,
          },
        ],
        nodes: [
          {
            id: "TestNode",
            name: "", // Empty but present
            c4Level: "", // Empty but present
          } as any,
        ],
        edges: [],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/warnings.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toContain(
          "Diagram 'test-diagram' has empty mermaidDefinition"
        );
        expect(result.warnings).toContain(
          "Node 'TestNode' is missing 'name' field"
        );
        expect(result.warnings).toContain(
          "Node 'TestNode' is missing 'c4Level' field"
        );
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle JSON serialization errors", () => {
      // Create an object with circular references that will fail JSON.stringify
      const circularData: any = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: [],
      };
      circularData.circular = circularData;

      const result = serializeToJson(circularData, `${testDir}/circular.json`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Failed to serialize architecture data to JSON"
        );
      }
    });

    it("should handle file system errors gracefully", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [{ id: "TestNode", name: "Test", c4Level: "Component" }],
        edges: [],
      };

      // Try to write to an invalid path (assuming /root is not writable)
      const result = serializeToJson(
        architectureData,
        "/root/invalid-path/test.json"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in data", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          {
            id: "test-diagram",
            mermaidDefinition:
              'graph TD\n  "Special [Component]" --> "Another & Component"',
            defaultView: true,
          },
        ],
        nodes: [
          {
            id: "SpecialComponent",
            name: 'Component with "quotes" and [brackets]',
            c4Level: "Component",
            description: "A component with special chars: <>&\"'",
          },
        ],
        edges: [],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/special-chars.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        const fileContent = readFileSync(
          `${testDir}/special-chars.json`,
          "utf8"
        );
        const parsedData = JSON.parse(fileContent);
        expect(parsedData).toEqual(architectureData);
      }
    });

    it("should handle unicode characters", () => {
      const architectureData: ArchitectureData = {
        diagrams: [
          { id: "test", mermaidDefinition: "graph TD", defaultView: true },
        ],
        nodes: [
          {
            id: "UnicodeComponent",
            name: "Component with émojis 🚀 and ünïcödé",
            c4Level: "Component",
            description: "Testing unicode: 中文, العربية, Русский",
          },
        ],
        edges: [],
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/unicode.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        const fileContent = readFileSync(`${testDir}/unicode.json`, "utf8");
        const parsedData = JSON.parse(fileContent);
        expect(parsedData).toEqual(architectureData);
      }
    });

    it("should handle large data structures", () => {
      // Create a large architecture data object
      const nodes: NodeData[] = [];
      const edges: EdgeData[] = [];

      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `Component${i}`,
          name: `Component ${i}`,
          c4Level: "Component",
          description: `Generated component ${i}`,
          tags: [`tag${i}`, "generated"],
          layer: i % 2 === 0 ? "Service" : "Data",
        });

        if (i > 0) {
          edges.push({
            sourceId: `Component${i}`,
            targetId: `Component${i - 1}`,
            type: "depends on",
          });
        }
      }

      const architectureData: ArchitectureData = {
        diagrams: [
          {
            id: "large-diagram",
            mermaidDefinition:
              "graph TD\n" +
              nodes.map((n) => `  ${n.id}["${n.name}"]`).join("\n"),
            defaultView: true,
          },
        ],
        nodes,
        edges,
      };

      const result = serializeToJson(
        architectureData,
        `${testDir}/large.json`
      ) as JsonSerializeResult;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(existsSync(`${testDir}/large.json`)).toBe(true);

        const fileContent = readFileSync(`${testDir}/large.json`, "utf8");
        const parsedData = JSON.parse(fileContent);
        expect(parsedData.nodes).toHaveLength(100);
        expect(parsedData.edges).toHaveLength(99);
      }
    });
  });
});
