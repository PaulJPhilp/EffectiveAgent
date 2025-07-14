import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

interface DiagramCanvasProps {
    mermaidDefinition: string
    onNodeClick?: (nodeId: string) => void
}

function DiagramCanvas({ mermaidDefinition, onNodeClick }: DiagramCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current || !mermaidDefinition) return

        const renderDiagram = async () => {
            try {
                // Initialize mermaid with basic configuration
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: 'basis'
                    }
                })

                // Generate a unique ID for this diagram
                const diagramId = `diagram-${Date.now()}`

                // Render the diagram
                const { svg } = await mermaid.render(diagramId, mermaidDefinition)

                // Inject the SVG into the container
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg
                }
            } catch (error) {
                console.error('Error rendering diagram:', error)
                if (containerRef.current) {
                    containerRef.current.innerHTML = '<div>Error rendering diagram</div>'
                }
            }
        }

        renderDiagram()
    }, [mermaidDefinition])

    // Add click event listeners to nodes after SVG is rendered
    useEffect(() => {
        if (!containerRef.current || !onNodeClick) return

        const container = containerRef.current
        const svg = container.querySelector('svg')
        if (!svg) return

        // Function to handle node clicks
        const handleNodeClick = (event: Event) => {
            const target = event.target as Element
            
            // Find the closest node element (could be the rect, text, or g element)
            let nodeElement = target.closest('.node')
            if (!nodeElement) {
                // Try alternative selectors for different node types
                nodeElement = target.closest('g[id]')
            }
            
            if (nodeElement) {
                const nodeId = nodeElement.id
                if (nodeId) {
                    onNodeClick(nodeId)
                }
            }
        }

        // Add click listeners to all node elements
        const nodes = svg.querySelectorAll('.node, g[id*="flowchart-"]')
        nodes.forEach(node => {
            node.addEventListener('click', handleNodeClick)
            // Add cursor pointer to indicate clickable elements
            ;(node as HTMLElement).style.cursor = 'pointer'
        })

        // Cleanup function to remove event listeners
        return () => {
            nodes.forEach(node => {
                node.removeEventListener('click', handleNodeClick)
            })
        }
    }, [onNodeClick, mermaidDefinition])

    return (
        <div 
            ref={containerRef}
            style={{
                width: '100%',
                height: '600px',
                overflow: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '16px'
            }}
        />
    )
}

export default DiagramCanvas 