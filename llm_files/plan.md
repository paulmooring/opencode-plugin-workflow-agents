# MCP Server Support Plan

## Goal

Add MCP (Model Context Protocol) server support to the opencode-plugin-workflow-agents plugin, enabling four MCP servers with per-agent selective enablement.

## Approach

The plugin will use the `config` hook to programmatically register MCP server configurations in the user's OpenCode config. Since MCP servers are configured at the user/project level (not in plugin code), the plugin will inject the configuration on initialization while respecting user customizations.

**Configuration Strategy:**
1. All MCP servers defined with `enabled: false` by default
2. Use the `tools` section with glob patterns to globally disable all MCP server tools
3. Use the `agent` section to selectively enable specific MCP servers per agent
4. This two-layer approach allows fine-grained control while keeping servers available

The plugin will add MCP server definitions to the config programmatically, which users can then enable as needed by modifying their local config or relying on the per-agent tool settings.

## Changes

### 1. Update Provider Configuration Module

**File path**: `src/config/providers.ts`

**What changes and why**: Extend the existing provider configuration to also configure MCP servers. The config hook allows modifying the entire config object, including the `mcp` section.

**Code changes:**

```typescript
import type { PluginInput, Config } from "@opencode-ai/plugin";

export async function configureProviders(ctx: PluginInput, config: Config): Promise<void> {
  // ... existing provider configuration ...

  // Configure MCP servers
  configureMcpServers(config);

  // Set default agent configuration
  // ... existing code ...
}

function configureMcpServers(config: Config): void {
  // Initialize MCP section if not present
  config.mcp = config.mcp || {};

  // Define MCP servers - all disabled by default
  // context7: documentation lookup
  config.mcp["context7"] = {
    type: "remote",
    url: "https://mcp.context7.com/mcp",
    headers: {
      "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}",
    },
    enabled: false,
  };

  // sequential-thinking: reasoning/thinking tools
  config.mcp["sequential-thinking"] = {
    type: "local",
    command: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
    enabled: false,
  };

  // firecrawl: web scraping
  config.mcp["firecrawl"] = {
    type: "local",
    command: ["npx", "-y", "@mcp-servers/firecrawl"],
    enabled: false,
  };

  // mcp-server-docker: docker management
  config.mcp["mcp-server-docker"] = {
    type: "local",
    command: ["npx", "-y", "@mcp-servers/docker"],
    enabled: false,
  };

  // Configure tool access patterns
  // First, disable all MCP tools globally
  config.tools = config.tools || {};
  config.tools["context7_*"] = false;
  config.tools["sequential-thinking_*"] = false;
  config.tools["firecrawl_*"] = false;
  config.tools["docker_*"] = false;

  // Configure per-agent tool enablement
  config.agent = config.agent || {};

  // context7: all agents
  const allAgents = ["research", "spec", "implement", "review", "debug", "quality", "security", "documentation"];
  for (const agent of allAgents) {
    config.agent[agent] = config.agent[agent] || {};
    config.agent[agent].tools = config.agent[agent].tools || {};
    config.agent[agent].tools["context7_*"] = true;
  }

  // sequential-thinking: research, spec, debug
  const sequentialThinkingAgents = ["research", "spec", "debug"];
  for (const agent of sequentialThinkingAgents) {
    config.agent[agent] = config.agent[agent] || {};
    config.agent[agent].tools = config.agent[agent].tools || {};
    config.agent[agent].tools["sequential-thinking_*"] = true;
  }

  // firecrawl: research, spec, debug
  const firecrawlAgents = ["research", "spec", "debug"];
  for (const agent of firecrawlAgents) {
    config.agent[agent] = config.agent[agent] || {};
    config.agent[agent].tools = config.agent[agent].tools || {};
    config.agent[agent].tools["firecrawl_*"] = true;
  }

  // mcp-server-docker: debug, review
  const dockerAgents = ["debug", "review"];
  for (const agent of dockerAgents) {
    config.agent[agent] = config.agent[agent] || {};
    config.agent[agent].tools = config.agent[agent].tools || {};
    config.agent[agent].tools["docker_*"] = true;
  }
}
```

**Why**: This approach programmatically registers all four MCP servers with per-agent tool access patterns. The plugin doesn't force enablement - it sets up the infrastructure that users can then override in their local config if desired.

---

### 2. Create MCP Configuration Documentation

**File path**: `docs/mcp-servers.md`

**What changes and why**: Document the MCP server configurations added by the plugin for user reference.

**Code changes:**

```markdown
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
    "debug": {
      "tools": {
        "context7_*": true,
        "sequential-thinking_*": true,
        "firecrawl_*": true,
        "docker_*": true
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

Set these in your shell profile or `.env` file.
```

---

### 3. Update Main Plugin Entry Point

**File path**: `src/index.ts`

**What changes and why**: Ensure the MCP configuration is called during plugin initialization. The existing structure already calls `configureProviders` which will now include MCP setup.

**Code changes**: No changes needed - existing `hooks.config` already calls `configureProviders` which now includes MCP configuration.

---

## Trade-offs

### Considered: Enable MCP servers by default
**Rejected**: Enable MCP servers automatically when plugin loads
**Chosen**: Keep all servers disabled by default (`enabled: false`)
**Why**: MCP servers consume context tokens, may require authentication, and users should explicitly opt-in. This is safer and more predictable.

### Considered: Per-agent MCP server definitions in agent files
**Rejected**: Add MCP server configs to each agent markdown file
**Chosen**: Use programmatic config via `config` hook
**Why**: Agent files use YAML frontmatter which doesn't support complex MCP config. The `config` hook provides a cleaner approach.

### Considered: Configuration via separate JSON file
**Rejected**: Distribute a separate `mcp-servers.json` file for users to merge
**Chosen**: Programmatic configuration via plugin `config` hook
**Why**: Single source of truth in plugin code. Users don't need to manage separate files. Easier to maintain and update.

---

## Risks

### Config Merge Conflicts
**Risk**: If users have existing MCP configurations in their `opencode.jsonc`, the plugin's programmatic config may conflict or be overwritten.
**Mitigation**: The plugin uses defensive checks (`config.mcp = config.mcp || {}`) to preserve existing configurations. Document that plugin config runs first.

### MCP Server Availability
**Risk**: Local MCP servers require `npx` to be available. Remote servers require network access.
**Mitigation**: Document requirements clearly. Use remote (context7) where possible for reliability.

### Token Usage
**Risk**: MCP tools add to context, potentially increasing token usage and costs.
**Mitigation**: Keep servers disabled by default. Per-agent enablement allows selective use.

### API Key Management
**Risk**: Users need `CONTEXT7_API_KEY` for context7 server.
**Mitigation**: Document required environment variables. Server works without key for limited functionality.

---

## Installation Requirements

### NPM Packages

The plugin itself doesn't require additional npm packages - MCP servers are run via `npx` at runtime. However, users may want to install these packages locally:

```bash
# Optional: Install MCP server packages globally for faster startup
npm install -g @modelcontextprotocol/server-sequential-thinking
npm install -g @mcp-servers/firecrawl
npm install -g @mcp-servers/docker

# Or install locally in your project
npm install --save-dev @modelcontextprotocol/server-sequential-thinking
```

### Environment Variables

For full MCP functionality, set these environment variables:

```bash
# Context7 (for documentation lookup)
export CONTEXT7_API_KEY="your-api-key"

# Add to your shell profile (~/.zshrc, ~/.bashrc, etc.)
```

---

## Todo List

### Phase 1: Plugin Code Updates
- [ ] Update `src/config/providers.ts` to add `configureMcpServers()` function
- [ ] Add MCP server definitions for all 4 servers (context7, sequential-thinking, firecrawl, mcp-server-docker)
- [ ] Configure global tool disable patterns in `tools` section
- [ ] Configure per-agent tool enablement in `agent` section
- [ ] Run `npm run typecheck` to verify TypeScript compilation

### Phase 2: Documentation
- [ ] Create `docs/mcp-servers.md` with MCP server documentation
- [ ] Update main `README.md` to mention MCP server support
- [ ] Document required environment variables

### Phase 3: Testing
- [ ] Build plugin with `npm run build`
- [ ] Test in sample OpenCode project
- [ ] Verify MCP servers appear in `opencode mcp list`
- [ ] Test per-agent tool access patterns

### Phase 4: Optional Enhancements
- [ ] Consider adding MCP server health checks
- [ ] Consider adding setup wizard for API keys
- [ ] Consider version compatibility matrix for MCP server packages
