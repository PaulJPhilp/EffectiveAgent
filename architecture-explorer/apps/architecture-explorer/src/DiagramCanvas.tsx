import mermaid from 'mermaid'
import { useEffect, useRef } from 'react'

// DEBUG: DiagramCanvas loaded
console.log('[DiagramCanvas] Module loaded')

interface DiagramCanvasProps {
    mermaidDefinition: string
    onNodeClick?: (nodeId: string) => void
}

function DiagramCanvas({ mermaidDefinition, onNodeClick }: DiagramCanvasProps) {
    console.log('[DiagramCanvas] Render', { mermaidDefinition, onNodeClick })
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current || !mermaidDefinition) {
            console.log('[DiagramCanvas] Skipping render - no container or definition');
            return;
        }

        console.log('[DiagramCanvas] Starting render with definition:', mermaidDefinition);

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
                });

                // Generate a unique ID for this diagram
                const diagramId = `diagram-${Date.now()}`;
                console.log('[DiagramCanvas] Rendering with ID:', diagramId);

                // Render the diagram
                const { svg } = await mermaid.render(diagramId, mermaidDefinition);
                console.log('[DiagramCanvas] Successfully rendered SVG');

                // Inject the SVG into the container
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                    console.log('[DiagramCanvas] SVG injected into container');
                }
            } catch (error) {
                console.error('[DiagramCanvas] Error rendering diagram:', error);
                if (containerRef.current) {
                    containerRef.current.innerHTML = '<div>Error rendering diagram</div>';
                }
            }
        };

        renderDiagram();
    }, [mermaidDefinition])

    // Add click event listeners to nodes after SVG is rendered
    useEffect(() => {
        // Use MutationObserver to reliably detect SVG injection
        if (!containerRef.current || !onNodeClick) {
            console.log('[DiagramCanvas] No container or onNodeClick, skipping node click attach')
            return
        }
        const container = containerRef.current
        let observer: MutationObserver | undefined 

        function attachListeners() {
            const svg = container.querySelector('svg')
            if (!svg) {
                console.log('[DiagramCanvas] No SVG found in container, skipping node click attach')
                return
            }
            // Function to handle node clicks
            const handleNodeClick = (event: Event) => {
                const nodeElement = event.currentTarget as Element
                const nodeId = nodeElement.id
                console.log('[DiagramCanvas] Clicked nodeElement', nodeElement, 'nodeId:', nodeId)
                
                // Proper type guard for the callback
                if (nodeId && onNodeClick && typeof onNodeClick === 'function') {
                    onNodeClick(nodeId)
                    console.log('[DiagramCanvas] onNodeClick fired with', nodeId)
                }
            }
            // Get nodes and ensure they are Elements
            const nodes = Array.from(svg.querySelectorAll('g[id]')) as Element[]
            console.log('[DiagramCanvas] Found nodes:', nodes.length, nodes.map(n => n.id))
            
            nodes.forEach(node => {
                node.addEventListener('click', handleNodeClick)
                ;(node as HTMLElement).style.cursor = 'pointer'
                console.log('[DiagramCanvas] Click listener attached to node', node)
            })
            // Store cleanup function on svg for later
            const cleanup = () => {
                nodes.forEach(node => {
                    node.removeEventListener('click', handleNodeClick)
                    console.log('[DiagramCanvas] Click listener removed from node', node)
                })
            };
            // Use a symbol to avoid name collisions
            const cleanupSymbol = Symbol('cleanupClickListeners');
            ;(svg as any)[cleanupSymbol] = cleanup;
        }

        // Observe for SVG injection
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (Array.from(mutation.addedNodes).some((n) => (n as Element).tagName === 'SVG')) {
                    console.log('[DiagramCanvas] SVG injected (MutationObserver)')
                    attachListeners()
                }
            }
        })
        observer.observe(container, { childList: true })
        // If SVG is already present (e.g., fast render), attach immediately
        if (container.querySelector('svg')) {
            attachListeners()
        }
        // Cleanup
        return () => {
            if (observer) observer.disconnect()
            const svg = container.querySelector('svg')
            if (svg) {
                const cleanupSymbol = Symbol('cleanupClickListeners');
                const cleanup = (svg as any)[cleanupSymbol];
                if (typeof cleanup === 'function') {
                    cleanup();
                }
            }
        }
    }, [onNodeClick])

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