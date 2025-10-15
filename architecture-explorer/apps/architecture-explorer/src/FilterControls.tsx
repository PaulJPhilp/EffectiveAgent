import type { NodeData } from './types'

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
        borderRadius: '4px',
        padding: '6px 8px',
        backgroundColor: '#fafbfc',
        marginBottom: '8px',
        maxWidth: '220px',
        fontSize: '0.85rem',
        lineHeight: 1.2
    }

    const buttonStyle = {
        padding: '2px 6px',
        margin: '0 2px 4px 0',
        border: '1px solid #ddd',
        borderRadius: '3px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontSize: '0.8rem',
        height: '22px',
        minWidth: '54px'
    }

    const checkboxContainerStyle = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
        marginTop: '6px'
    }

    const checkboxItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        minHeight: '20px'
    }

    const tagLabelStyle = {
        fontSize: '0.8rem',
        cursor: 'pointer',
        padding: '0 2px'
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