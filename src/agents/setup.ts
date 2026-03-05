import type { PluginInput } from "@opencode-ai/plugin";
import { join, dirname } from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setupLocalConfig(ctx: PluginInput): Promise<void> {
  const pluginAgentsDir = join(__dirname, "..", "..", "agents");
  const projectDir = ctx.directory;
  const opencodeDir = join(projectDir, ".opencode");
  const agentsDir = join(opencodeDir, "agents");

  await mkdir(agentsDir, { recursive: true });

  const agents = [
    "default",
    "research",
    "spec",
    "implement",
    "review",
    "debug",
    "quality",
    "security",
    "documentation",
  ];

  for (const agent of agents) {
    const sourcePath = join(pluginAgentsDir, `${agent}.md`);
    const destPath = join(agentsDir, `${agent}.md`);

    if (!existsSync(sourcePath)) {
      continue;
    }

    let content = await readFile(sourcePath, "utf-8");
    if (!content.includes("<!-- Managed by opencode-plugin-workflow-agents -->")) {
      content = `<!-- Managed by opencode-plugin-workflow-agents -->\n${content}`;
    }
    await writeFile(destPath, content);
  }

  await writeProviderConfig(opencodeDir);
}

async function writeProviderConfig(opencodeDir: string): Promise<void> {
  const configContent = `{
  // Provider configuration for opencode-plugin-workflow-agents
  // This file is managed by the /setup command
  
  "providers": {
    "minimax": {
      "npm": "@ai-sdk/anthropic",
      "name": "MiniMax",
      "options": {
        "baseURL": "https://api.minimax.io/anthropic/v1",
        "apiKey": "${process.env.MINIMAX_API_KEY || ""}"
      },
      "models": {
        "MiniMax-M2.5": {
          "name": "MiniMax-M2.5"
        }
      }
    },
    "bailian-coding-plan": {
      "npm": "@ai-sdk/anthropic",
      "name": "Model Studio Coding Plan",
      "options": {
        "baseURL": "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1",
        "apiKey": "${process.env.BAILIAN_API_KEY || ""}"
      },
      "models": {
        "qwen3.5-plus": {
          "name": "Qwen3.5 Plus",
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "options": {
            "thinking": {
              "type": "enabled",
              "budgetTokens": 1024
            }
          }
        },
        "glm-5": {
          "name": "GLM-5",
          "options": {
            "thinking": {
              "type": "enabled",
              "budgetTokens": 1024
            }
          }
        },
        "glm-4.7": {
          "name": "GLM-4.7",
          "options": {
            "thinking": {
              "type": "enabled",
              "budgetTokens": 1024
            }
          }
        },
        "kimi-k2.5": {
          "name": "Kimi K2.5",
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "options": {
            "thinking": {
              "type": "enabled",
              "budgetTokens": 1024
            }
          }
        }
      }
    }
  },

  "agent": {
    "default": {
      "mode": "primary",
      "model": "minimax/MiniMax-M2.5"
    },
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
  },

  "default_agent": "default",

  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}"
      },
      "enabled": false
    },
    "sequential-thinking": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
      "enabled": false
    },
    "firecrawl": {
      "type": "local",
      "command": ["npx", "-y", "@mcp-servers/firecrawl"],
      "enabled": false
    },
    "mcp-server-docker": {
      "type": "local",
      "command": ["npx", "-y", "@mcp-servers/docker"],
      "enabled": false
    }
  },

  "tools": {
    "context7_*": false,
    "sequential-thinking_*": false,
    "firecrawl_*": false,
    "docker_*": false
  }
}
`;

  await writeFile(join(opencodeDir, "config.jsonc"), configContent);
}
