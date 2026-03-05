# Workflow Agents

This directory contains agent definitions for the OpenCode plugin workflow-agents package.

## Included Agents

| Agent | Description | Model |
|-------|-------------|-------|
| **research** | Read, understand and document a codebase in detail | bailian-coding-plan/qwen3.5-plus |
| **spec** | Plan out new features or fixes in a codebase | bailian-coding-plan/glm-5 |
| **implement** | Build a new feature according to a documented plan | bailian-coding-plan/kimi-k2.5 |
| **review** | Review code for quality, best practices, and security | bailian-coding-plan/glm-5 |
| **debug** | Debug issues with written code | bailian-coding-plan/glm-5 |
| **quality** | Perform code quality checks and run linters | minimax/MiniMax-M2.5 |
| **security** | Perform security audits and identify vulnerabilities | bailian-coding-plan/qwen3.5-plus |
| **documentation** | Write and maintain project documentation | minimax/MiniMax-M2.5 |

## Agent Installation

When the plugin is loaded, these agent definitions are automatically copied to:
- `~/.config/opencode/agent/` (on Linux/macOS)

The plugin checks for existing customizations and will not overwrite agent files that have been manually edited.

## File Format

Each agent is defined in a markdown file with YAML frontmatter:

```yaml
---
description: Agent description
model: provider/model-name
temperature: 0.5
top_p: 0.7
color: "#HEXCODE"
mode: primary
---

Agent instructions...
```

## Customizing Agents

To customize an agent:
1. Edit the file in `~/.config/opencode/agent/`
2. Remove or modify the marker comment `<!-- Installed by opencode-plugin-workflow-agents -->`
3. The plugin will preserve your changes on subsequent loads
