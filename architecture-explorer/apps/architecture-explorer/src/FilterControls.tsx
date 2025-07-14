import { NodeData } from './types'

interface FilterControlsProps {
    nodes: NodeData[]
    activeFilters: Set<string>
    onFilterChange: (activeFilters: Set<string>) => void
}

function FilterControls({ nodes, activeFilters, onFilterChange }: FilterControlsProps) {
    // Extract all unique tags from the nodes
    const allTags = new Set<string>()
    nodes.forEach(node => {
        if (node.tags) {
            node.tags.forEach(tag => allTags.add(tag))
        }
    })
    
    const uniqueTags = Array.from(allTags).sort()

    const handleTagToggle = (tag: string) => {
        const newFilters = new Set(activeFilters)
        if (newFilters.has(tag)) {
            newFilters.delete(tag)
        } else {
            newFilters.add(tag)
        }
        onFilterChange(newFilters)
    }

    const handleSelectAll = () => {
        onFilterChange(new Set(uniqueTags))
    }

    const handleClearAll = () => {
        onFilterChange(new Set())
    }

    const containerStyle = {
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#f9f9f9',
        marginBottom: '16px'
    }

    const buttonStyle = {
        padding: '4px 8px',
        margin: '0 4px 8px 0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontSize: '0.875rem'
    }

    const checkboxContainerStyle = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        marginTop: '12px'
    }

    const checkboxItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    }

    const tagLabelStyle = {
        fontSize: '0.875rem',
        cursor: 'pointer'
    }

    if (uniqueTags.length === 0) {
        return (
            <div style={containerStyle}>
                <h3>Filter by Tags</h3>
                <p>No tags available</p>
            </div>
        )
    }

    return (
        <div style={containerStyle}>
            <h3>Filter by Tags</h3>
            
            <div>
                <button style={buttonStyle} onClick={handleSelectAll}>
                    Select All
                </button>
                <button style={buttonStyle} onClick={handleClearAll}>
                    Clear All
                </button>
            </div>

            <div style={checkboxContainerStyle}>
                {uniqueTags.map(tag => (
                    <div key={tag} style={checkboxItemStyle}>
                        <input
                            type="checkbox"
                            id={`filter-${tag}`}
                            checked={activeFilters.has(tag)}
                            onChange={() => handleTagToggle(tag)}
                        />
                        <label 
                            htmlFor={`filter-${tag}`} 
                            style={tagLabelStyle}
                            onClick={() => handleTagToggle(tag)}
                        >
                            {tag}
                        </label>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#666' }}>
                {activeFilters.size} of {uniqueTags.length} tags selected
            </div>
        </div>
    )
}

export default FilterControls 