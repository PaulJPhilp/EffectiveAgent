import { ArchitectureData, NodeData } from "./types";

/**
 * Generates a filtered Mermaid diagram definition string based on active tag filters.
 * @param architectureData - The complete architecture data
 * @param activeFilters - Set of active tag filters
 * @returns A Mermaid diagram definition string containing only filtered nodes and edges
 */
export function generateFilteredDiagram(
  architectureData: ArchitectureData,
  activeFilters: Set<string>
): string {
  // If no filters are active, show nothing
  if (activeFilters.size === 0) {
    return "graph TD\n  %% No nodes match the current filters";
  }

  // Filter nodes based on active tags
  const visibleNodes = architectureData.nodes.filter((node) => {
    // If node has no tags, it's not visible when filters are applied
    if (!node.tags || node.tags.length === 0) {
      return false;
    }

    // Node is visible if it has at least one active tag
    return node.tags.some((tag) => activeFilters.has(tag));
  });

  // If no nodes are visible, return empty diagram
  if (visibleNodes.length === 0) {
    return "graph TD\n  %% No nodes match the current filters";
  }

  // Create a set of visible node IDs for quick lookup
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

  // Filter edges to only include those where both source and target are visible
  const visibleEdges = architectureData.edges.filter(
    (edge) =>
      visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)
  );

  // Generate the Mermaid diagram string
  let mermaidString = "graph TD\n";

  // Group nodes by layer for subgraph generation
  const nodesByLayer = new Map<string, NodeData[]>();

  visibleNodes.forEach((node) => {
    const layer = node.layer || "Other";
    if (!nodesByLayer.has(layer)) {
      nodesByLayer.set(layer, []);
    }
    nodesByLayer.get(layer)!.push(node);
  });

  // Generate subgraphs for each layer
  nodesByLayer.forEach((layerNodes, layerName) => {
    mermaidString += `  subgraph ${layerName}\n`;
    layerNodes.forEach((node) => {
      mermaidString += `    ${node.id}[${node.name}]\n`;
    });
    mermaidString += `  end\n`;
  });

  // Generate edges
  visibleEdges.forEach((edge) => {
    const label = edge.label || edge.type || "";
    if (label) {
      mermaidString += `  ${edge.sourceId} -->|${label}| ${edge.targetId}\n`;
    } else {
      mermaidString += `  ${edge.sourceId} --> ${edge.targetId}\n`;
    }
  });

  return mermaidString;
}

/**
 * Gets all unique tags from the architecture data nodes.
 * @param architectureData - The complete architecture data
 * @returns Array of unique tags sorted alphabetically
 */
export function getAllUniqueTags(architectureData: ArchitectureData): string[] {
  const allTags = new Set<string>();

  architectureData.nodes.forEach((node) => {
    if (node.tags) {
      node.tags.forEach((tag) => allTags.add(tag));
    }
  });

  return Array.from(allTags).sort();
}
