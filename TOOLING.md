
# Tooling

This project uses the following developer tooling:

- **Bun** — runtime used for development and some scripts.
- **Biome** — linter/formatter used as configured in `biome.json`.
- **Ultracite** — optional AI-assisted coding helper. See usage notes below.

## Ultracite

We recommend installing Ultracite locally for improved code generation and
contextual assistance. Ultracite provides AI-driven completions and
explanations. To enable it locally:

1. Install the package (dev dependency):

```bash
bun add -d ultracite
```

1. Configure Ultracite using its CLI or VS Code extension. See upstream
	documentation: [Ultracite](https://www.ultracite.ai/).

## Notes

- `biome.json` already includes Bun and browser globals (for example
	`Bun`, `fetch`, and `Headers`).
- `bunfig.toml` contains a `[meta] tooling = ["bun", "biome"]` entry.
- If you want Ultracite enabled in CI or as a pre-commit hook, I can add a
	script or Husky pre-commit step — tell me how you'd like it run.

## Run Ultracite

After installing Ultracite locally you can run it with Bun:

```bash
bun run ultracite
```

If you want, I can also add a small example config for Ultracite or a
Husky pre-commit hook to run it automatically.
