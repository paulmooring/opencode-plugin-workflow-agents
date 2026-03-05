import type { Plugin, Hooks } from "@opencode-ai/plugin";
import { installDepsTool } from "./tools/install-deps.js";
import { configureProviders } from "./config/providers.js";
import { installAgents } from "./agents/install.js";
import { setupLocalConfig } from "./agents/setup.js";

export const WorkflowAgentsPlugin: Plugin = async (ctx) => {
  const hooks: Hooks = {};

  // Register custom tool for dependency installation
  hooks.tool = {
    "install-deps": installDepsTool,
  };

  // Handle /setup command execution
  hooks["command.execute.before"] = async (input, output) => {
    const command = input.command.trim();
    if (command === "setup") {
      await setupLocalConfig(ctx);
      output.parts = [
        {
          type: "text",
          text: "## Setup Complete\n\nProvider configuration and agent files have been written to the `.opencode/` folder. You can now commit these files to git for your team.",
        },
      ] as typeof output.parts;
    }
  };

  // Configure providers and models on startup
  hooks.config = async (config) => {
    await configureProviders(ctx, config);
    
    // Add /setup command
    if (!config.command) {
      config.command = {};
    }
    config.command["setup"] = {
      template: "Run the setup to configure provider configuration and agent files in the .opencode/ folder.",
      description: "Setup workflow agents configuration",
      agent: "default",
    };
  };

  // Install agent definitions on first run
  await installAgents(ctx);

  return hooks;
};

export default WorkflowAgentsPlugin;
