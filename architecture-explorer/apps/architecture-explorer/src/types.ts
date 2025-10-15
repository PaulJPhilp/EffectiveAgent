// packages/architecture-generator/src/types.ts
// Or consider a dedicated `packages/common/src/types.ts` for larger monorepos

/**
 * Represents the overall structure of the generated architectural data.
 * This is the root object of the `architecture-data.json` file.
 */
/**
 * C4 model level of detail.
 * - SystemContext: Big picture, external actors, and systems
 * - Container: Major deployable units/services
 * - Component: Internal components/classes/modules
 * - Code: Source code-level structure
 */
export type C4Level = "SystemContext" | "Container" | "Component" | "Code";

export interface ArchitectureData {
	/**
	 * An array of diagram definitions. In V1, this will typically contain one
	 * primary diagram representing the flattened architecture with static layers.
	 */
	diagrams: DiagramDefinition[];
	/**
	 * An array of all identified architectural nodes (components, systems, databases, etc.)
	 * with their associated metadata.
	 */
	nodes: NodeData[];
	/**
	 * An array of all identified relationships (edges) between architectural nodes.
	 */
	edges: EdgeData[];
	/**
	 * Optional map of group/layer names to color strings, extracted from @color JSDoc tags on groups/layers.
	 * Used for group/layer coloring in diagrams. Example: { Core: "#ffeedd", AI: "#eeddff" }
	 */
	layerColors?: LayerColors;
	/**
	 * Optional C4 model level of detail for this architecture data.
	 * Controls diagram scope and abstraction (SystemContext, Container, Component, Code).
	 */
	c4Level?: C4Level;
}

/**
 * Defines a specific Mermaid diagram that can be rendered.
 * In V1, this will primarily be the single, main layered diagram.
 */
export interface DiagramDefinition {
	/**
	 * A unique identifier for this specific diagram (e.g., "main-diagram").
	 */
	id: string;
	/**
	 * The raw Mermaid diagram definition string (e.g., "graph TD\n subgraph Core...\n").
	 */
	mermaidDefinition: string;
	/**
	 * True if this is the default view loaded when the explorer starts.
	 * (Always true for the single diagram in V1).
	 */
	defaultView: boolean;
}

/**
 * Represents an individual architectural component (node) within the system.
 * This data is extracted from code and JSDoc comments.
 */
export interface NodeData {
	/**
	 * A unique identifier for the node (e.g., a hash, file path + component name).
	 */
	id: string;
	/**
	 * The display name of the node.
	 */
	name: string;
	/**
	 * The C4 model level of the component.
	 */
	c4Level: C4Level;
	/**
	 * A detailed description of the component's purpose or functionality.
	 */
	description?: string;
	/**
	 * An array of tags associated with the component, used for filtering/highlighting.
	 */
	tags?: string[];
	/**
	 * The architectural layer this component belongs to (e.g., "Core", "AI").
	 * This drives the static `subgraph` generation in Mermaid.
	 */
	layer?: LayerName;
	/**
	 * An array of URLs to external resources related to the component (e.g., source code, docs).
	 */
	links?: string[];
	/**
	 * Optional hex or CSS color string for the node, extracted from the @color JSDoc tag in source code.
	 * Example: "#ffcc00" or "red".
	 */
	color?: string;
	// Future: Add position or layout hints if needed
	// x?: number;
	// y?: number;
}

/**
 * Represents a relationship (edge) between two architectural nodes.
 * Inferred from code analysis.
 */
export interface EdgeData {
	/**
	 * The ID of the source node for this relationship.
	 */
	sourceId: string;
	/**
	 * The ID of the target node for this relationship.
	 */
	targetId: string;
	/**
	 * An optional label describing the nature of the relationship (e.g., "uses", "calls").
	 */
	label?: string;
	/**
	 * The type of relationship. Useful for more semantic understanding and potential future filtering.
	 */
	type?: RelationshipType;
	// Future: Add more properties like protocol, data types etc.
}

/**
 * Defines the accepted C4 model levels for architectural components.
 * Corresponds to the `@c4` JSDoc tag.
 */


/**
 * Defines the names of the architectural layers for static grouping.
 * Corresponds to the `@groupByLayer` JSDoc tag.
 * These should be customized based on your specific monorepo's layered architecture.
 */
export type LayerName = "Core" | "AI" | "Pipeline" | "Infrastructure" | string; // 'string' to allow for custom, unlisted layers

/**
 * Maps architectural layer names to color strings, extracted from @color JSDoc tags on groups/layers.
 * Example: { Core: "#ffeedd", AI: "#eeddff" }
 */
export type LayerColors = Record<LayerName, string>;

/**
 * Defines common types of relationships between components.
 */
export type RelationshipType = "uses" | "calls" | "communicates" | "depends on" | "reads from" | "writes to";