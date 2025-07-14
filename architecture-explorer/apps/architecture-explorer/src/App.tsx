import { useState, useEffect } from 'react'
import Ajv from 'ajv'
import { ArchitectureData } from './types'
import DiagramCanvas from './DiagramCanvas'
import MetadataPanel from './MetadataPanel'
import FilterControls from './FilterControls'
import { generateFilteredDiagram, getAllUniqueTags } from './diagramUtils'

function App() {
    const [architectureData, setArchitectureData] = useState<ArchitectureData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

    useEffect(() => {
        const loadAndValidateData = async () => {
            try {
                // Fetch both the architecture data and schema
                const [dataResponse, schemaResponse] = await Promise.all([
                    fetch('/architecture.json'),
                    fetch('/architecture.schema.json')
                ])

                if (!dataResponse.ok || !schemaResponse.ok) {
                    throw new Error('Failed to fetch data or schema')
                }

                const data = await dataResponse.json()
                const schema = await schemaResponse.json()

                // Validate the data against the schema
                const ajv = new Ajv()
                const validate = ajv.compile(schema)
                const isValid = validate(data)

                if (!isValid) {
                    const errorMessage = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ')
                    throw new Error(`Data validation failed: ${errorMessage}`)
                }

                // If validation passes, store the data
                const validatedData = data as ArchitectureData
                setArchitectureData(validatedData)
                
                // Initialize filters with all available tags
                const allTags = getAllUniqueTags(validatedData)
                setActiveFilters(new Set(allTags))
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred')
            } finally {
                setLoading(false)
            }
        }

        loadAndValidateData()
    }, [])

    if (loading) {
        return <div>Loading architecture data...</div>
    }

    if (error) {
        return <div>Error: {error}</div>
    }

    if (!architectureData) {
        return <div>No architecture data available</div>
    }

    // Generate filtered diagram based on active filters
    const filteredMermaidDefinition = generateFilteredDiagram(architectureData, activeFilters)

    // Handle node clicks
    const handleNodeClick = (nodeId: string) => {
        setSelectedNodeId(nodeId)
    }

    // Handle filter changes
    const handleFilterChange = (newFilters: Set<string>) => {
        setActiveFilters(newFilters)
        // Clear selected node if it's no longer visible
        if (selectedNodeId) {
            const selectedNode = architectureData.nodes.find(node => node.id === selectedNodeId)
            if (selectedNode && selectedNode.tags) {
                const isNodeVisible = selectedNode.tags.some(tag => newFilters.has(tag))
                if (!isNodeVisible) {
                    setSelectedNodeId(null)
                }
            }
        }
    }

    // Find the selected node data
    const selectedNode = selectedNodeId 
        ? architectureData.nodes.find(node => node.id === selectedNodeId) || null
        : null

    return (
        <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
            <div style={{ flex: 1 }}>
                <h1>Architecture Explorer</h1>
                <DiagramCanvas 
                    mermaidDefinition={filteredMermaidDefinition} 
                    onNodeClick={handleNodeClick}
                />
            </div>
            <div style={{ width: '400px' }}>
                <FilterControls 
                    nodes={architectureData.nodes}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                />
                <MetadataPanel node={selectedNode} />
            </div>
        </div>
    )
}

export default App 