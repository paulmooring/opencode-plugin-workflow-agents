# OpenCode Workflow Agents Plugin

A distributable OpenCode plugin that bundles custom agents, configures AI providers/models, and provides a dependency installation tool for multi-language project support.

## Features

- **9 Pre-configured Agents**: Default (Architect), Research, Spec, Implement, Review, Debug, Quality, Security, and Documentation
- **AI Provider Configuration**: Automatic registration of MiniMax and Bailian Coding Plan providers
- **Dependency Installation Tool**: Auto-detect project type and install dependencies across multiple ecosystems
- **MCP Server Support**: Configure context7, sequential-thinking, firecrawl, and mcp-server-docker with per-agent access control

## Installation

```bash
npm install opencode-plugin-workflow-agents
```

## Configuration

Add the plugin to your `opencode.jsonc`:

```json
{
  "plugins": ["opencode-plugin-workflow-agents"]
}
```

### Required Environment Variables

The plugin requires API keys for the configured providers:

```bash
# For MiniMax provider
export MINIMAX_API_KEY="your-minimax-api-key"

# For Bailian Coding Plan provider
export BAILIAN_API_KEY="your-bailian-api-key"
```

## Included Agents

| Agent | Description | Model | Temperature | Color |
|-------|-------------|-------|-------------|-------|
| **default** | Orchestrate tasks by delegating to specialized agents | bailian-coding-plan/qwen3.5-plus | 0.2 | #1E3A5F |
| **research** | Read, understand and document a codebase in detail | bailian-coding-plan/qwen3.5-plus | 0.7 | #8A0A33 |
| **spec** | Plan out new features or fixes in a codebase | bailian-coding-plan/glm-5 | 0.3 | #1C3ED6 |
| **implement** | Build a new feature according to a documented plan | bailian-coding-plan/kimi-k2.5 | 0.2 | #ED2F09 |
| **review** | Review code for quality, best practices, and security | bailian-coding-plan/glm-5 | 0.3 | #1C3ED6 |
| **debug** | Debug issues with written code | bailian-coding-plan/glm-5 | 0.3 | #C2C200 |
| **quality** | Perform code quality checks and run linters | minimax/MiniMax-M2.5 | 0.3 | #6B21A8 |
| **security** | Perform security audits and identify vulnerabilities | bailian-coding-plan/qwen3.5-plus | 0.3 | #A10000 |
| **documentation** | Write and maintain project documentation | minimax/MiniMax-M2.5 | 0.3 | #1C3ED6 |

Agent definitions are automatically installed to `~/.config/opencode/agent/` when the plugin loads. User customizations are preserved.

## Install Dependencies Tool

The plugin provides an `install-deps` tool that automatically detects the project type and installs dependencies:

### Supported Ecosystems

| Language | Package Managers | Detection Files |
|----------|------------------|-----------------|
| JavaScript/TypeScript | npm, yarn, pnpm, bun | package.json, lock files |
| Python | pip, pipenv, poetry | requirements.txt, Pipfile, poetry.lock |
| Rust | cargo | Cargo.toml |
| Go | go | go.mod |
| Elixir | mix | mix.exs |

### Usage

The tool can be invoked via OpenCode's tool system:

```json
{
  "tool": "install-deps",
  "args": {
    "language": "javascript",  // Optional: force specific language
    "devOnly": false,          // Optional: install dev dependencies only
    "productionOnly": false    // Optional: install production dependencies only
  }
}
```

### Auto-Detection

The tool automatically detects the project type by checking for common files:

- **Bun**: `bun.lock`
- **pnpm**: `pnpm-lock.yaml`
- **Yarn**: `yarn.lock`
- **npm**: `package-lock.json` or `package.json`
- **Poetry**: `poetry.lock`
- **Pipenv**: `Pipfile`
- **pip**: `requirements.txt`, `setup.py`, or `pyproject.toml`
- **Cargo**: `Cargo.toml`
- **Go**: `go.mod`
- **Mix**: `mix.exs`

## Provider Configuration

The plugin automatically registers these providers and models:

### MiniMax

- **Base URL**: `https://api.minimax.io/anthropic/v1`
- **Models**:
  - `MiniMax-M2.5`

### Bailian Coding Plan

- **Base URL**: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1`
- **Models**:
  - `qwen3.5-plus` (supports text + image input)
  - `glm-5`
  - `glm-4.7`
  - `kimi-k2.5` (supports text + image input)

All models have thinking enabled with a 1024 token budget.

## Default Agent Configuration

The plugin includes a **default (Architect)** agent that orchestrates complex tasks by delegating to specialized agents.

### Default Agent

- **Prompt**: "You are the architect. Never write code or run bash yourself. Analyze the user request and use @research, @spec, @implement, @review and @debug to complete the request"
- **Disabled Tools**: write, edit, bash (can only read files and delegate to other agents)
- **Model**: bailian-coding-plan/qwen3.5-plus
- **Purpose**: Acts as a project manager/architect that breaks down requests and delegates to specialized agents

### Workflow

The default agent uses these agents to complete tasks:

1. **@research** - Understand the codebase
2. **@spec** - Create a specification/plan
3. **@implement** - Write the code
4. **@review** - Review the implementation
5. **@debug** - Fix any issues

### Setting as Default

To use the default agent as your primary agent, configure in `opencode.jsonc`:

```json
{
  "plugins": ["opencode-plugin-workflow-agents"],
  "agent": "default"
}
```

The plugin sets the following defaults:

- **Default Mode**: `primary`
- **Default Model**: `minimax/MiniMax-M2.5`

## Customizing Agents

To customize an agent:

1. Edit the file in `~/.config/opencode/agent/`
2. Remove or modify the marker comment `<!-- Installed by opencode-plugin-workflow-agents -->`
3. The plugin will preserve your changes on subsequent loads

To reset to the plugin's default version, delete the agent file and restart OpenCode.

## Troubleshooting

### Missing API Keys

If you see errors about missing API keys, ensure you've set the environment variables:

```bash
export MINIMAX_API_KEY="your-key"
export BAILIAN_API_KEY="your-key"
```

### Agent Files Not Installing

Check that the `~/.config/opencode/agent/` directory is writable:

```bash
ls -la ~/.config/opencode/agent/
```

### Build Issues

If you encounter TypeScript errors, ensure you're using the correct package versions:

```bash
npm install
npm run typecheck
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Publish
npm version patch
npm publish --access public
```

## License

MIT
