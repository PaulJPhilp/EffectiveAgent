# Architecture Explorer

A powerful tool for automatically generating and visualizing software architecture diagrams from your TypeScript codebase using JSDoc annotations.

## Overview

The Architecture Explorer consists of two main components that work together to help you understand and document your software architecture:

1. **Architecture Generator** (`packages/architecture-generator`) - Analyzes your TypeScript code, extracts architectural metadata from JSDoc comments, and generates structured architecture data
2. **Architecture Explorer Frontend** (`apps/architecture-explorer`) - A React-based web application that visualizes the generated architecture data using interactive Mermaid diagrams

## How It Works

1. **Annotate** your TypeScript classes and components with special JSDoc tags to define their architectural role, layer, and relationships
2. **Generate** architecture data by running the generator against your codebase
3. **Explore** your architecture using the interactive web interface with filtering, node inspection, and diagram navigation

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 18+ (for compatibility)

### Installation

1. Clone this repository
2. Install dependencies for all packages:
   ```bash
   bun install
   ```

### Quick Start

1. **Generate Architecture Data:**
   ```bash
   cd packages/architecture-generator
   bun run generate
   ```
   
   This will analyze the sample TypeScript files and create `architecture.json` with the extracted architecture data.

2. **Start the Frontend:**
   ```bash
   cd apps/architecture-explorer
   bun run dev
   ```
   
   Open [http://localhost:3001](http://localhost:3001) in your browser to explore the generated architecture.

## Project Structure

```
architecture-explorer/
├── packages/
│   └── architecture-generator/    # TypeScript code analyzer and data generator
└── apps/
    └── architecture-explorer/     # React frontend for visualization
```

## Key Features

- **Automatic Architecture Discovery** - Extracts components, layers, and relationships from code
- **Interactive Visualization** - Pan, zoom, and click through your architecture
- **Layered Organization** - Automatically groups components by architectural layers
- **Tag-based Filtering** - Filter and highlight components by custom tags
- **Metadata Inspection** - View detailed information about each component
- **Export Capabilities** - Generate Mermaid diagrams and JSON data

## Documentation

- [Generator Documentation](packages/architecture-generator/README.md) - How to configure and run the code analyzer
- [Frontend Documentation](apps/architecture-explorer/README.md) - How to use the visualization interface

## Contributing

This project follows a phased development approach. See the individual package READMEs for development setup and contribution guidelines.

## License

MIT License - see individual packages for specific license details. 