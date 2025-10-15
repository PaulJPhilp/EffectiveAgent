import type {
  ArchitectureData,
  DiagramDefinition,
  EdgeData,
  NodeData,
} from "./types.js";

export interface ArchitectureModelResult {
  success: true;
  data: ArchitectureData;
  warnings: string[];
}

export interface ArchitectureModelError {
  success: false;
  error: string;
  warnings: string[];
  partialData?: Partial<ArchitectureData>;
}

export type ModelBuildResult = ArchitectureModelResult | ArchitectureModelError;

/**
 * Builds a complete ArchitectureData object from component metadata and relationships.
 * @param nodes - Array of NodeData objects representing architectural components
 * @param edges - Array of EdgeData objects representing relationships between components
 * @returns A ModelBuildResult with the architecture data and diagnostic information
 */
export function buildArchitectureModel(
  nodes: NodeData[],
  edges: EdgeData[]
): ModelBuildResult {
  const warnings: string[] = [];

  try {
    // Validate input data
    if (!Array.isArray(nodes)) {
      return {
        success: false,
        error: "Nodes parameter must be an array",
        warnings,
      };
    }

    if (!Array.isArray(edges)) {
      return {
        success: false,
        error: "Edges parameter must be an array",
        warnings,
      };
    }

    if (nodes.length === 0) {
      return {
        success: false,
        error: "Cannot build architecture model with no components",
        warnings,
      };
    }

    // Deep clone input data to avoid modifying original
    const nodesCopy = nodes.map(node => ({
      ...node,
      tags: node.tags ? [...node.tags] : undefined,
      links: node.links ? [...node.links] : undefined
    }));
    const edgesCopy = edges.map(edge => ({ ...edge }));

    // Validate nodes
    const validatedNodes = validateNodes(nodesCopy, warnings);

    // Validate edges
    const validatedEdges: EdgeData[] = [];
    for (const edge of edgesCopy) {
      // Check for missing sourceId or targetId
      if (!edge.sourceId || typeof edge.sourceId !== "string") {
        warnings.push("Skipping edge with missing or invalid sourceId");
        continue;
      }

      if (!edge.targetId || typeof edge.targetId !== "string") {
        warnings.push("Skipping edge with missing or invalid targetId");
        continue;
      }

      // Check if source and target nodes exist
      if (!validatedNodes.find(node => node.id === edge.sourceId)) {
        warnings.push(
          `Edge references non-existent source node: '${edge.sourceId}' - skipping edge`
        );
        continue;
      }

      if (!validatedNodes.find(node => node.id === edge.targetId)) {
        warnings.push(
          `Edge references non-existent target node: '${edge.targetId}' - skipping edge`
        );
        continue;
      }

      // Skip self-referencing edges
      if (edge.sourceId === edge.targetId) {
        warnings.push(
          `Skipping self-referencing edge: '${edge.sourceId}' -> '${edge.targetId}'`
        );
        continue;
      }

      // Check for duplicates
      const edgeKey = `${edge.sourceId}->${edge.targetId}`;
      if (validatedEdges.find(e => `${e.sourceId}->${e.targetId}` === edgeKey)) {
        warnings.push(`Duplicate edge detected: ${edgeKey} - skipping duplicate`);
        continue;
      }

      // Set default type if missing
      if (!edge.type) {
        edge.type = "depends on";
      }

      validatedEdges.push(edge);
    }

    // Generate Mermaid definition
    const mermaidResult = generateMermaidDefinition(
      validatedNodes,
      validatedEdges,
      warnings
    );

    if (!mermaidResult.success) {
      return {
        success: false,
        error: `Failed to generate Mermaid diagram: ${mermaidResult.error}`,
        warnings: [...warnings, ...mermaidResult.warnings],
      };
    }

    warnings.push(...mermaidResult.warnings);

    // Create diagram definition
    const diagramDefinition: DiagramDefinition = {
      id: "main-diagram",
      mermaidDefinition: mermaidResult.definition,
      defaultView: true,
    };

    // Assemble the complete architecture data
    const architectureData: ArchitectureData = {
      diagrams: [diagramDefinition],
      nodes: validatedNodes,
      edges: validatedEdges,
    };

    return {
      success: true,
      data: architectureData,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to build architecture model: ${error instanceof Error ? error.message : String(error)}`,
      warnings: [],
    };
  }
}

/**
 * Validates and sanitizes node data.
 */
function validateNodes(nodes: NodeData[], warnings: string[]): NodeData[] {
  const validatedNodes: NodeData[] = [];
  const seenIds = new Set<string>();

  for (const node of nodes) {
    // Check for required fields
    if (!node.id || typeof node.id !== "string") {
      warnings.push("Skipping node with missing or invalid id");
      continue;
    }

    if (!node.name || typeof node.name !== "string") {
      warnings.push(
        `Node '${node.id}' has missing or invalid name, using id as fallback`
      );
      node.name = node.id;
    }

    // Check for duplicate IDs
    if (seenIds.has(node.id)) {
      warnings.push(
        `Duplicate node ID detected: '${node.id}' - skipping duplicate`
      );
      continue;
    }

    seenIds.add(node.id);

    // Validate c4Level
    const validC4Levels = ["System", "Container", "Component"];
    if (node.c4Level && !validC4Levels.includes(node.c4Level)) {
      warnings.push(
        `Node '${node.id}' has invalid c4Level '${node.c4Level}', using 'Component' as fallback`
      );
      node.c4Level = "Component";
    } else if (!node.c4Level) {
      node.c4Level = "Component";
    }

    // Validate layer
    if (node.layer === "InvalidLayer") {
      const originalLayer = node.layer;
      delete node.layer;
      warnings.push(
        `Node '${node.id}' has invalid layer '${originalLayer}', removing layer`
      );
    }

    validatedNodes.push(node);
  }

  return validatedNodes;
}

/**
 * Validates and sanitizes edge data.
 */
function validateEdges(
  edges: EdgeData[],
  validNodes: NodeData[],
  warnings: string[]
): EdgeData[] {
  const validNodeIds = new Set(validNodes.map((node) => node.id));
  const seenEdges = new Set<string>();
  const validatedEdges: EdgeData[] = [];

  for (const edge of edges) {
    try {
      // Check for missing sourceId or targetId
      if (!edge.sourceId || typeof edge.sourceId !== "string") {
        warnings.push("Skipping edge with missing or invalid sourceId");
        continue;
      }

      if (!edge.targetId || typeof edge.targetId !== "string") {
        warnings.push("Skipping edge with missing or invalid targetId");
        continue;
      }

      // Check if source and target nodes exist
      if (!validNodeIds.has(edge.sourceId)) {
        warnings.push(
          `Edge references non-existent source node: '${edge.sourceId}' - skipping edge`
        );
        continue;
      }

      if (!validNodeIds.has(edge.targetId)) {
        warnings.push(
          `Edge references non-existent target node: '${edge.targetId}' - skipping edge`
        );
        continue;
      }

      // Set default type if missing
      if (!edge.type) {
        edge.type = "depends on";
      }

      // Check for duplicates
      const edgeKey = `${edge.sourceId}->${edge.targetId}`;
      if (seenEdges.has(edgeKey)) {
        warnings.push(`Duplicate edge detected: ${edgeKey} - skipping duplicate`);
        continue;
      }

      seenEdges.add(edgeKey);

      // Skip self-referencing edges
      if (edge.sourceId === edge.targetId) {
        warnings.push(
          `Skipping self-referencing edge: '${edge.sourceId}' -> '${edge.targetId}'`
        );
        continue;
      }

      // Add to validated edges
      validatedEdges.push(edge);
    } catch (error) {
      warnings.push(
        `Error validating edge: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return validatedEdges;
}

interface MermaidGenerationResult {
  success: true;
  definition: string;
  warnings: string[];
}

interface MermaidGenerationError {
  success: false;
  error: string;
  warnings: string[];
}

type MermaidResult = MermaidGenerationResult | MermaidGenerationError;

/**
 * Generates a Mermaid diagram definition string from nodes and edges.
 * @param nodes - Array of validated NodeData objects
 * @param validatedEdges - Array of validated EdgeData objects
 * @param warnings - Array of warnings
 * @returns A MermaidResult with the diagram definition and warnings
 */
function generateMermaidDefinition(
  nodes: NodeData[],
  validatedEdges: EdgeData[],
  warnings: string[]
): MermaidResult {
  try {
    let mermaidString = "graph TD\n";

    // Group nodes by layer
    const nodesByLayer = new Map<string, NodeData[]>();

    nodes.forEach((node) => {
      const layer = node.layer || "Other";
      if (!nodesByLayer.has(layer)) {
        nodesByLayer.set(layer, []);
      }
      nodesByLayer.get(layer)!.push(node);
    });

    // Generate subgraphs for each layer
    const layerNames = Array.from(nodesByLayer.keys());
    if (layerNames.length === 1 && layerNames[0] === "Other") {
      warnings.push(
        "All components are in the 'Other' layer - consider adding @groupByLayer tags"
      );
    }
    nodesByLayer.forEach((layerNodes, layerName) => {
      // Sanitize layer name for Mermaid (escape special characters)
      const escapedLayerName = layerName;
      const sanitizedLayerName = layerName.replace(/[^a-zA-Z0-9_]/g, "_") + "_";

      if (layerNodes.length > 0) {
        mermaidString += `  subgraph ${sanitizedLayerName.replace(/__+$/, "_")}["${escapedLayerName}"]\n`;
        layerNodes.forEach((node) => {
          // Remove special characters from node names for Mermaid
          const sanitizedNodeName = node.name.replace(/["[\]]/g, "");
          mermaidString += `    ${node.id}["${sanitizedNodeName}"]\n`;
        });
        mermaidString += `  end\n`;
      }
    });

    // Warn if no layers were found
    if (nodesByLayer.size === 1 && nodesByLayer.has("Other")) {
      warnings.push(
        "All components are in the 'Other' layer - consider adding @groupByLayer tags"
      );
    }

    // Generate edges
    validatedEdges.forEach((edge) => {
      try {
        mermaidString += `  ${edge.sourceId} --> ${edge.targetId}\n`;
      } catch (edgeError) {
        warnings.push(
          `Error generating edge ${edge.sourceId} -> ${edge.targetId}: ${edgeError instanceof Error ? edgeError.message : String(edgeError)}`
        );
      }
    });

    // Append color styles for nodes with a color property
    nodes.forEach((node) => {
      if (node.color) {
        mermaidString += `  style ${node.id} fill:${node.color}\n`;
      }
    });

    return {
      success: true,
      definition: mermaidString,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      warnings,
    };
  }
}
