import { ArchitectureData, NodeData } from "./types";

/**
 * Generates a filtered Mermaid diagram definition string based on active tag filters.
 * @param architectureData - The complete architecture data
 * @param activeFilters - Set of active tag filters
 * @returns A Mermaid diagram definition string containing only filtered nodes and edges
 */
import type { LayerColors } from "./types";

import type { C4Level } from "./types";

// C4 levels from most abstract (SystemContext) to most detailed (Code)
const c4LevelOrder: Record<C4Level, number> = {
  SystemContext: 0, // Shows system + external deps + users
  Container: 1,    // Shows containers within the system
  Component: 2,    // Shows components within containers
  Code: 3          // Shows code-level details
};

export function generateFilteredDiagram(
  architectureData: ArchitectureData,
  layerColors?: LayerColors,
  c4Level?: C4Level
): string {
  console.log('[DiagramUtils] Generating diagram with:', {
    c4Level,
    totalNodes: architectureData.nodes.length,
    nodesWithC4: architectureData.nodes.filter(n => n.c4Level).length,
    availableLevels: architectureData.nodes.map(n => n.c4Level).filter(Boolean)
  });

  // Filter nodes based only on C4 level
  const visibleNodes = architectureData.nodes.filter((node) => {
    // If no C4 level selected, show all nodes
    if (!c4Level) return true;

    // At SystemContext level, show only system-level nodes and SystemContext nodes
    if (c4Level === 'SystemContext') {
      const match = !node.c4Level || node.c4Level === 'SystemContext';
      console.log(`[DiagramUtils] Node ${node.name}:`, {
        nodeC4Level: node.c4Level || 'system',
        isSystemContext: true,
        match
      });
      return match;
    }

    // For other levels, show nodes at or below the selected level
    const nodeLevel = node.c4Level ? c4LevelOrder[node.c4Level] : -1;
    const selectedLevel = c4LevelOrder[c4Level];
    const match = nodeLevel <= selectedLevel;
    console.log(`[DiagramUtils] Node ${node.name}:`, {
      nodeC4Level: node.c4Level || 'system',
      nodeLevel,
      selectedLevel,
      match
    });
    return match;
  });

  console.log('[DiagramUtils] Visible nodes:', visibleNodes.map(n => ({ name: n.name, c4Level: n.c4Level })));

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
      if (node.color) {
        mermaidString += `    style ${node.id} fill:${node.color},stroke:#333,stroke-width:2px\n`;
      } else if (layerColors && layerColors[layerName]) {
        mermaidString += `    style ${node.id} fill:${layerColors[layerName]},stroke:#333,stroke-width:2px\n`;
      }
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
