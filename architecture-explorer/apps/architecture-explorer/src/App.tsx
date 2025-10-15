import { useState, useEffect } from 'react'
import Ajv from 'ajv'
import { ArchitectureData } from './types'
import DiagramCanvas from './DiagramCanvas'
import MetadataPanel from './MetadataPanel'
import { generateFilteredDiagram } from './diagramUtils'

import type { C4Level } from './types';

function App() {
    const [architectureData, setArchitectureData] = useState<ArchitectureData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    // C4 level selector state
    const [c4Level, setC4Level] = useState<C4Level>('SystemContext')

    // Debug logging for state changes
    useEffect(() => {
        console.log('[App] C4 level changed:', c4Level)
    }, [c4Level])

    useEffect(() => {
        console.log('[App] Architecture data changed:', architectureData ? 'loaded' : 'null')
    }, [architectureData])

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

                console.log('Fetching data and schema...')
                const data = await dataResponse.json()
                const schema = await schemaResponse.json()
                console.log('Data:', data)
                console.log('Schema:', schema)

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
                
                // Data loaded successfully
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred')
            } finally {
                setLoading(false)
            }
        }

        loadAndValidateData()
    }, [])

    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Architecture Explorer</h1>
                <div>Loading architecture data...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Architecture Explorer</h1>
                <div style={{ color: 'red', marginTop: '10px' }}>
                    <strong>Error:</strong> {error}
                </div>
            </div>
        )
    }

    if (!architectureData) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Architecture Explorer</h1>
                <div style={{ marginTop: '10px' }}>
                    No architecture data available. Please ensure architecture.json exists in the public directory.
                </div>
            </div>
        )
    }

    // Use layerColors from architectureData (if present) for group/layer coloring
    console.log('[App] Rendering with C4 level:', c4Level)
    const filteredMermaidDefinition = generateFilteredDiagram(
        architectureData,
        architectureData.layerColors,
        c4Level
    )
    console.log('[App] Generated diagram definition:', filteredMermaidDefinition.slice(0, 100) + '...')

    // Handle node clicks
    const handleNodeClick = (nodeId: string) => {
        setSelectedNodeId(nodeId)
    }



    // Find the selected node data
    const selectedNode = selectedNodeId 
        ? architectureData.nodes.find(node => node.id === selectedNodeId) || null
        : null

    return (
        <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
            <div style={{ flex: 1 }}>
                <h1>Architecture Explorer</h1>
                <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="c4-level-select" style={{ marginRight: 8, fontWeight: 500 }}>
                        C4 Level:
                    </label>
                    <select
                        id="c4-level-select"
                        value={c4Level}
                        onChange={e => setC4Level(e.target.value as C4Level)}
                        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #bbb', fontSize: 14 }}
                    >
                        <option value="SystemContext">System Context</option>
                        <option value="Container">Container</option>
                        <option value="Component">Component</option>
                        <option value="Code">Code</option>
                    </select>
                </div>
                <DiagramCanvas 
                    mermaidDefinition={filteredMermaidDefinition} 
                    onNodeClick={handleNodeClick}
                />
            </div>
            <div style={{ maxWidth: '240px', width: 'auto' }}>
                <MetadataPanel node={selectedNode} />
            </div>
        </div>
    )
}

export default App 