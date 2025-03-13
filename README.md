# PDF Loader

A TypeScript library for processing PDF documents, extracting profile data, normalizing profiles, and generating personas based on the extracted data.

## Features

- **PDF Processing**: Extract text and structured data from PDF documents
- **Profile Normalization**: Standardize company names, job titles, skills, locations, and dates
- **Persona Generation**: Create representative personas from normalized profile data
- **Data Analysis**: Analyze and cluster profiles based on various attributes

## Modules

### Normalizing Agent

The normalizing agent module handles the processing of raw PDF and text files into normalized profiles. It includes functionality for parsing, merging, and normalizing profile data.

```typescript
import { normalizingAgent } from 'pdf-loader';

// Normalize a profile
const normalizedProfile = await normalizingAgent.normalizeProfile(profile);

// Batch normalize multiple profiles
const results = await normalizingAgent.batchNormalizeProfiles(profiles);
```

### Persona Generator

The persona generator module provides tools for creating representative personas from normalized profile data. It includes functionality for clustering profiles, generating basic personas, and elaborating on those personas.

```typescript
import { personaGenerator } from 'pdf-loader';

// Generate personas from profiles
const personas = await personaGenerator.generatePersonas(profiles, options);
```

## Installation

```bash
bun install pdf-loader
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- TypeScript (v5.7 or higher)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/pdf-loader.git
cd pdf-loader

# Install dependencies
bun install

# Run tests
bun test
```

## License

MIT
