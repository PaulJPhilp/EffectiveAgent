import { NodeData } from './types'

interface MetadataPanelProps {
    node: NodeData | null
}

function MetadataPanel({ node }: MetadataPanelProps) {
    const panelStyle = {
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px 10px',
        backgroundColor: '#fafbfc',
        maxWidth: '240px',
        margin: '8px 0',
        fontSize: '0.85rem',
        lineHeight: 1.2
    }

    const itemStyle = {
        marginBottom: '6px'
    }

    const labelStyle = {
        display: 'inline-block',
        minWidth: '72px',
        color: '#333',
        fontWeight: 500,
        fontSize: '0.8rem'
    }

    const tagStyle = {
        display: 'inline-block',
        backgroundColor: '#e1f5fe',
        color: '#0277bd',
        padding: '1px 5px',
        borderRadius: '3px',
        marginRight: '2px',
        marginBottom: '2px',
        fontSize: '0.75rem'
    }

    const linkStyle = {
        color: '#1976d2',
        textDecoration: 'none',
        fontSize: '0.8rem'
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