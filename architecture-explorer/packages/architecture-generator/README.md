# Architecture Generator

A TypeScript code analyzer that automatically extracts architectural metadata from your codebase using JSDoc annotations and generates structured architecture data for visualization.

## What It Does

The Architecture Generator:

1. **Scans TypeScript Files** - Uses `ts-morph` to parse and analyze TypeScript source code
2. **Extracts Metadata** - Reads JSDoc annotations to identify architectural components and their properties
3. **Infers Relationships** - Analyzes import statements to understand dependencies between components
4. **Generates Architecture Data** - Produces a structured JSON file with nodes, edges, and Mermaid diagram definitions
5. **Validates Output** - Ensures all generated data conforms to the architecture schema

## Getting Started

### Installation

```bash
cd packages/architecture-generator
bun install
```

### Running the Generator

```bash
# Generate architecture data from the test-data directory
bun run generate

# Run with custom source directory
bun run generate --source="../../../src"

# Run tests
bun run test
```

The generator will:
- Scan the specified source directory for TypeScript files
- Extract components marked with `@architectureComponent`
- Generate `architecture.json` with the extracted data
- Display detailed statistics and any warnings

## Supported JSDoc Tags

Mark your TypeScript classes with these JSDoc tags to include them in the architecture analysis:

### Required Tags

#### `@architectureComponent`
Marks a class as an architectural component. **Required** for the class to be included in the analysis.

```typescript
/**
 * @architectureComponent
 */
export class UserService {
  // ...
}
```

### Optional Tags

#### `@c4 <level>`
Specifies the C4 model level. Valid values: `system`, `container`, `component`

```typescript
/**
 * @architectureComponent
 * @c4 component
 */
export class UserService {
  // ...
}
```

#### `@description <text>`
Provides a description of the component's purpose and functionality.

```typescript
/**
 * @architectureComponent
 * @description Handles user authentication and session management
 */
export class AuthService {
  // ...
}
```

#### `@tag <name>`
Adds custom tags for categorization and filtering. Multiple tags are supported.

```typescript
/**
 * @architectureComponent
 * @tag authentication
 * @tag security
 * @tag api
 */
export class AuthService {
  // ...
}
```

#### `@groupByLayer <layer>`
Assigns the component to an architectural layer. Valid values: `presentation`, `application`, `domain`, `infrastructure`, `data`

```typescript
/**
 * @architectureComponent
 * @groupByLayer domain
 */
export class UserService {
  // ...
}
```

#### `@link <url>`
Adds external links to documentation, repositories, or other resources. Multiple links are supported.

```typescript
/**
 * @architectureComponent
 * @link https://docs.example.com/auth
 * @link https://github.com/example/auth-service
 */
export class AuthService {
  // ...
}
```

## Complete Example

```typescript
/**
 * @architectureComponent
 * @c4 component
 * @description Manages user data and business logic including profile updates, 
 * user preferences, and account lifecycle operations
 * @tag user-management
 * @tag business-logic
 * @groupByLayer domain
 * @link https://docs.example.com/user-service
 * @link https://api-docs.example.com/users
 */
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private notificationService: NotificationService
  ) {}

  async createUser(userData: CreateUserData): Promise<User> {
    // Implementation...
  }
}
```

## Output Format

The generator produces an `architecture.json` file with this structure:

```json
{
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "sourceDirectory": "./test-data",
    "statistics": {
      "totalFiles": 5,
      "componentsFound": 3,
      "relationshipsInferred": 2
    }
  },
  "diagrams": {
    "mermaid": "graph TD\n  subgraph Domain\n    UserService\n  end\n  ..."
  },
  "nodes": [
    {
      "id": "UserService",
      "c4Level": "component",
      "layer": "domain",
      "description": "Manages user data and business logic...",
      "tags": ["user-management", "business-logic"],
      "links": ["https://docs.example.com/user-service"]
    }
  ],
  "edges": [
    {
      "from": "UserController",
      "to": "UserService", 
      "relationshipType": "imports"
    }
  ]
}
```

## Configuration

### Source Directory
By default, the generator analyzes files in the `test-data` directory. You can specify a different directory:

```bash
bun run generate --source="../../../src"
```

### Schema Validation
All output is validated against `architecture.schema.json` to ensure consistency and compatibility with the frontend visualization.

## Error Handling

The generator includes comprehensive error handling and will:

- **Continue processing** when individual files fail to parse
- **Report warnings** for missing or invalid metadata
- **Provide suggestions** for common issues
- **Display statistics** showing what was successfully processed
- **Exit with appropriate codes** for CI/CD integration

Common warnings include:
- Components without descriptions
- Invalid c4Level or layer values
- Unresolved import references
- Duplicate relationship definitions

## Development

### Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run specific test file
bun run test JSDocParser.test.ts
```

### Test Structure

The test suite includes:
- **Unit tests** for each module (JSDocParser, RelationshipInferrer, etc.)
- **Integration tests** for the complete pipeline
- **Error handling tests** for various failure scenarios
- **Schema validation tests** for output format compliance

### Adding New Features

1. **JSDoc Tags** - Add parsing logic to `JSDocParser.ts`
2. **Relationship Types** - Extend `RelationshipInferrer.ts`
3. **Output Formats** - Modify `JsonSerializer.ts`
4. **Validation** - Update `architecture.schema.json`

Always include tests for new functionality and ensure schema compatibility.

## Troubleshooting

### Common Issues

**"No components found"**
- Ensure classes have the `@architectureComponent` tag
- Check that TypeScript files are in the specified source directory
- Verify JSDoc syntax is correct

**"Schema validation failed"**
- Check that all required fields are present in components
- Ensure c4Level and layer values are from the allowed lists
- Verify relationship types are valid

**"Import resolution warnings"**
- Some warnings are normal for external packages
- Internal imports should resolve correctly
- Check for typos in import paths

### Debug Mode

For verbose output, you can modify the logging level in `index.ts` or add console.log statements during development.

## Architecture

The generator follows a clean pipeline architecture:

1. **JSDocParser** - Extracts metadata from JSDoc comments
2. **RelationshipInferrer** - Analyzes imports to determine relationships  
3. **ArchitectureModelBuilder** - Combines data and generates Mermaid diagrams
4. **JsonSerializer** - Validates and writes the final output

Each module has comprehensive error handling and can operate independently for testing purposes. 