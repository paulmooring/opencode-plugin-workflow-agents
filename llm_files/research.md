# MCP Server Configuration in OpenCode Plugins - Research

## Overview

OpenCode supports MCP (Model Context Protocol) servers as a way to add external tools to the AI assistant. MCP servers can be configured at the **user/project config level** (`opencode.json/opencode.jsonc`), not directly through plugin code. Plugins can contribute custom tools, but MCP server configuration itself is a user-level setting.

---

## Configuration Schema/Format for MCP Servers

### Configuration Location

MCP servers are configured in the `mcp` section of `opencode.json` (or `opencode.jsonc`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "server-name": {
      // MCP configuration
    }
  }
}
```

### Configuration Options

#### Local MCP Servers

```json
{
  "mcp": {
    "my-local-server": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"],
      "enabled": true,
      "environment": {
        "MY_ENV_VAR": "value"
      },
      "timeout": 5000
    }
  }
}
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `type` | string | Yes | Must be `"local"` |
| `command` | array | Yes | Command and arguments to run the MCP server |
| `environment` | object | No | Environment variables to set when running |
| `enabled` | boolean | No | Enable/disable on startup (default: true) |
| `timeout` | number | No | Timeout in ms for fetching tools (default: 5000) |

#### Remote MCP Servers

```json
{
  "mcp": {
    "my-remote-server": {
      "type": "remote",
      "url": "https://my-mcp-server.com/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer {env:MY_API_KEY}"
      },
      "oauth": {
        "clientId": "{env:MCP_CLIENT_ID}",
        "clientSecret": "{env:MCP_CLIENT_SECRET}",
        "scope": "tools:read tools:execute"
      },
      "timeout": 5000
    }
  }
}
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `type` | string | Yes | Must be `"remote"` |
| `url` | string | Yes | URL of the remote MCP server |
| `enabled` | boolean | No | Enable/disable on startup |
| `headers` | object | No | Headers to send with requests |
| `oauth` | object \| false | No | OAuth config, or `false` to disable |
| `timeout` | number | No | Timeout in ms (default: 5000) |

---

## Enabling/Disabling MCP Servers Per Agent

MCP servers can be controlled at both **global** and **per-agent** levels.

### Global Enable/Disable

In the `tools` section of config:

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    },
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/mcp"
    }
  },
  "tools": {
    "context7_*": false,
    "sentry_*": true
  }
}
```

Glob patterns are supported:
- `*` - matches zero or more characters
- `?` - matches exactly one character

### Per-Agent Enable/Disable

1. **Disable globally** in `tools`
2. **Enable per-agent** in agent config:

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "enabled": true
    }
  },
  "tools": {
    "context7_*": false
  },
  "agent": {
    "research": {
      "tools": {
        "context7_*": true
      }
    }
  }
}
```

---

## Example Configurations

### Context7 MCP

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}"
      }
    }
  }
}
```

### Sequential Thinking MCP

```json
{
  "mcp": {
    "sequential-thinking": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

### Sentry MCP with OAuth

```json
{
  "mcp": {
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/mcp",
      "oauth": {}
    }
  }
}
```

Then authenticate with:
```bash
opencode mcp auth sentry
```

---

## How Plugins Can Work with MCP

### Current Plugin Capabilities

Based on the OpenCode plugin documentation, plugins can:

1. **Register custom tools** via the `tool` hook
2. **Configure providers** via the `config` hook
3. **React to events** (tool.execute.before, etc.)
4. **Inject environment variables** via `shell.env` hook

### What Plugins Cannot Do Directly

According to the current plugin architecture:
- There is **no direct MCP hook** in the plugin SDK
- MCP server configuration is handled at the **user config level**, not programmatically through plugins
- The `config` hook allows modifying the config object, but this is primarily for providers

### Recommendation for Plugin authors

If you want to distribute MCP server configurations via a plugin:

1. **Option A**: Document the required MCP configuration for users to add to their `opencode.jsonc`
2. **Option B**: Use the `config` hook to programmatically add MCP servers (if supported by the config hook - not explicitly documented but worth testing)

The plan.md in this codebase confirms this approach was considered:
> **Rejected**: Exposing agents through an MCP server.
> **Chosen**: Installing agent markdown files directly to the user's config directory.
> **Why**: OpenCode's agent system is file-based, not MCP-based.

---

## Important Notes

1. **MCP servers add to context**: Using MCP servers consumes context tokens. Be selective about which servers to enable.

2. **Config schema**: Use `$schema: "https://opencode.ai/config.json"` for validation and autocompletion.

3. **Environment variables**: Use `{env:VARIABLE_NAME}` syntax for sensitive data like API keys.

4. **Remote defaults**: Organizations can provide default MCP servers via `.well-known/opencode` endpoint. Users can override with local config.

5. **CLI commands**:
   - `opencode mcp auth <server-name>` - Authenticate with MCP server
   - `opencode mcp list` - List all MCP servers
   - `opencode mcp logout <server-name>` - Remove credentials
   - `opencode mcp debug <server-name>` - Debug connection issues

---

## Related Files in This Codebase

- `llm_files/plan.md` - Contains discussion about MCP server approach (lines 556-559)
- This codebase is an OpenCode plugin that uses `@opencode-ai/plugin` SDK
- Agent system is file-based (markdown files in `~/.config/opencode/agents/`)

---

## References

- [OpenCode MCP Servers Documentation](https://opencode.ai/docs/mcp-servers/)
- [OpenCode Config Documentation](https://opencode.ai/docs/config/)
- [OpenCode Plugins Documentation](https://opencode.ai/docs/plugins/)
- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/)
