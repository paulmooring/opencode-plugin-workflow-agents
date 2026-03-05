# MCP Servers Configuration

This plugin configures four MCP servers with per-agent selective enablement.

## Servers

| Server | Type | Purpose | Enabled Agents |
|--------|------|---------|----------------|
| context7 | remote | Documentation lookup and research | research, spec, implement, review, debug, quality, security, documentation |
| sequential-thinking | local | Reasoning and thinking tools | research, spec, debug |
| firecrawl | local | Web scraping and content extraction | research, spec, debug |
| mcp-server-docker | local | Docker container management | debug, review |

## Default State

All MCP servers are **disabled by default**. The plugin configures the servers but does not enable them automatically. This allows users to opt-in to MCP functionality.

## Per-Agent Tool Access

The plugin configures tool access patterns at the agent level:

```json
{
  "tools": {
    "context7_*": false,
    "sequential-thinking_*": false,
    "firecrawl_*": false,
    "docker_*": false
  },
  "agent": {
    "research": {
      "tools": {
        "context7_*": true,
        "sequential-thinking_*": true,
        "firecrawl_*": true
      }
    },
    "spec": {
      "tools": {
        "context7_*": true,
        "sequential-thinking_*": true,
        "firecrawl_*": true
      }
    },
    "implement": {
      "tools": {
        "context7_*": true
      }
    },
    "review": {
      "tools": {
        "context7_*": true,
        "docker_*": true
      }
    },
    "debug": {
      "tools": {
        "context7_*": true,
        "sequential-thinking_*": true,
        "firecrawl_*": true,
        "docker_*": true
      }
    },
    "quality": {
      "tools": {
        "context7_*": true
      }
    },
    "security": {
      "tools": {
        "context7_*": true
      }
    },
    "documentation": {
      "tools": {
        "context7_*": true
      }
    }
  }
}
```

## Enabling MCP Servers

To enable an MCP server globally (not just per-agent):

1. Set `enabled: true` in the MCP server configuration
2. Or remove the global `tools.*_*: false` setting

Example in `opencode.jsonc`:

```json
{
  "mcp": {
    "context7": {
      "enabled": true
    }
  }
}
```

## Environment Variables

Some MCP servers require environment variables:

| Variable | Server | Description |
|----------|--------|-------------|
| `CONTEXT7_API_KEY` | context7 | API key for Context7 service |

Set these in your shell profile or `.env` file:

```bash
# Context7 (for documentation lookup)
export CONTEXT7_API_KEY="your-api-key"
```

## Installation Requirements

The plugin uses `npx` to run MCP servers at runtime. No additional npm packages are required for the plugin itself.

Optionally, install packages globally for faster startup:

```bash
npm install -g @modelcontextprotocol/server-sequential-thinking
npm install -g @mcp-servers/firecrawl
npm install -g @mcp-servers/docker
```
