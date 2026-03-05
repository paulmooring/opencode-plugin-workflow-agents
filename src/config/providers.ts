import type { PluginInput } from "@opencode-ai/plugin";

export async function configureProviders(ctx: PluginInput, config: any): Promise<void> {
  // Ensure providers object exists
  if (!config.providers) {
    config.providers = {};
  }

  // Configure MiniMax provider
  config.providers.minimax = {
    npm: "@ai-sdk/anthropic",
    name: "MiniMax",
    options: {
      baseURL: "https://api.minimax.io/anthropic/v1",
      apiKey: process.env.MINIMAX_API_KEY || "",
    },
    models: {
      "MiniMax-M2.5": {
        name: "MiniMax-M2.5",
      },
    },
  };

  // Configure Bailian Coding Plan provider
  config.providers["bailian-coding-plan"] = {
    npm: "@ai-sdk/anthropic",
    name: "Model Studio Coding Plan",
    options: {
      baseURL: "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1",
      apiKey: process.env.BAILIAN_API_KEY || "",
    },
    models: {
      "qwen3.5-plus": {
        name: "Qwen3.5 Plus",
        modalities: {
          input: ["text", "image"],
          output: ["text"],
        },
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 1024,
          },
        },
      },
      "glm-5": {
        name: "GLM-5",
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 1024,
          },
        },
      },
      "glm-4.7": {
        name: "GLM-4.7",
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 1024,
          },
        },
      },
      "kimi-k2.5": {
        name: "Kimi K2.5",
        modalities: {
          input: ["text", "image"],
          output: ["text"],
        },
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 1024,
          },
        },
      },
    },
  };

  // Set default agent configuration
  if (!config.agent) {
    config.agent = {};
  }
  config.agent.default = {
    mode: "primary",
    model: "minimax/MiniMax-M2.5",
  };

  config.default_agent = "default";
}
