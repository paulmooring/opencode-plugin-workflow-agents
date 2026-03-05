import type { Plugin, Hooks } from "@opencode-ai/plugin";
import { installDepsTool } from "./tools/install-deps.js";
import { configureProviders } from "./config/providers.js";
import { installAgents } from "./agents/install.js";

export const WorkflowAgentsPlugin: Plugin = async (ctx) => {
  const hooks: Hooks = {};

  // Register custom tool for dependency installation
  hooks.tool = {
    "install-deps": installDepsTool,
  };

  // Configure providers and models on startup
  hooks.config = async (config) => {
    await configureProviders(ctx, config);
  };

  // Install agent definitions on first run
  await installAgents(ctx);

  return hooks;
};

export default WorkflowAgentsPlugin;
