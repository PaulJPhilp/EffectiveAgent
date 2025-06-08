# ea-cli

Official command-line interface for the Effective Agents framework.

## Development Status

**Phase 1: Project Setup & Core Dependencies** ✅ COMPLETED
- [x] Initialize Node.js project structure
- [x] Install core dependencies (effect, @effect/cli, @effect/platform-node)
- [x] Install development dependencies (typescript, tsx, biome, vitest)
- [x] Create tsconfig.json for modern Node.js project
- [x] Create biome.json for formatting standards (print width: 80)
- [x] Create main entrypoint file: src/index.ts
- [x] Set up basic CLI structure with placeholder commands

**Phase 2: Project Lifecycle Commands** 🚧 IN PROGRESS
- [ ] Implement `init` command
- [ ] Create boilerplate templates
- [ ] Add package manager selection

**Phase 3: Resource Management** ⏳ PENDING
- [ ] Implement `add:agent` command
- [ ] Implement generic config handlers
- [ ] Wire up resource commands

**Phase 4: Execution & Operations** ⏳ PENDING
- [ ] Implement `config:validate` command
- [ ] Implement `log` commands
- [ ] Implement `run` command
- [ ] Implement `serve` command

**Phase 5: Finalization & Polish** ⏳ PENDING
- [ ] Help system review
- [ ] Error handling review
- [ ] Code cleanup

## Quick Start

```bash
# Development
bun run dev --help

# Build
bun run build

# Test
bun run test

# Format
bun run format
```

## Architecture

The CLI integrates with the existing EffectiveAgent framework through:
- `AgentRuntimeService.Default` for accessing domain services
- Existing service architecture (ConfigurationService, ModelService, etc.)
- Real services (no mocks) for all operations

## Commands (Planned)

- `ea-cli init <project-name>` - Initialize new EA workspace
- `ea-cli add:agent <name>` - Add new agent package
- `ea-cli add:<resource> <name>` - Add configuration resources
- `ea-cli list:<resource>` - List resources
- `ea-cli delete:<resource> <name>` - Delete resources
- `ea-cli run <agent> --input <text>` - Run agent with input
- `ea-cli serve <agent> --port <number>` - Serve agent as WebSocket
- `ea-cli config:validate` - Validate configuration files
- `ea-cli log:view` - View logs
- `ea-cli log:clear` - Clear logs 