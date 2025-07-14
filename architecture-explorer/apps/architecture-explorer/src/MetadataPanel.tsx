import { NodeData } from './types'

interface MetadataPanelProps {
    node: NodeData | null
}

function MetadataPanel({ node }: MetadataPanelProps) {
    const panelStyle = {
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#f9f9f9',
        maxWidth: '400px',
        margin: '16px 0'
    }

    const itemStyle = {
        marginBottom: '12px'
    }

    const labelStyle = {
        display: 'inline-block',
        minWidth: '100px',
        color: '#333',
        fontWeight: 'bold'
    }

    const tagStyle = {
        display: 'inline-block',
        backgroundColor: '#e1f5fe',
        color: '#0277bd',
        padding: '2px 8px',
        borderRadius: '4px',
        marginRight: '4px',
        marginBottom: '4px',
        fontSize: '0.875rem'
    }

    const linkStyle = {
        color: '#1976d2',
        textDecoration: 'none'
    }

    if (!node) {
        return (
            <div style={panelStyle}>
                <h3>Node Details</h3>
                <p>Select a node to view its details.</p>
            </div>
        )
    }

    return (
        <div style={panelStyle}>
            <h3>Node Details</h3>
            
            <div style={itemStyle}>
                <span style={labelStyle}>Name:</span> {node.name}
            </div>
            
            <div style={itemStyle}>
                <span style={labelStyle}>ID:</span> {node.id}
            </div>
            
            <div style={itemStyle}>
                <span style={labelStyle}>C4 Level:</span> {node.c4Level}
            </div>
            
            {node.layer && (
                <div style={itemStyle}>
                    <span style={labelStyle}>Layer:</span> {node.layer}
                </div>
            )}
            
            {node.description && (
                <div style={itemStyle}>
                    <span style={labelStyle}>Description:</span> {node.description}
                </div>
            )}
            
            {node.tags && node.tags.length > 0 && (
                <div style={itemStyle}>
                    <span style={labelStyle}>Tags:</span>
                    <div style={{ marginTop: '4px' }}>
                        {node.tags.map((tag, index) => (
                            <span key={index} style={tagStyle}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {node.links && node.links.length > 0 && (
                <div style={itemStyle}>
                    <span style={labelStyle}>Links:</span>
                    <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                        {node.links.map((link, index) => (
                            <li key={index}>
                                <a href={link} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                                    {link}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default MetadataPanel 