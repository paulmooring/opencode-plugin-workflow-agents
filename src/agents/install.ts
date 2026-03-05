import type { PluginInput } from "@opencode-ai/plugin";
import { join, dirname } from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function installAgents(ctx: PluginInput): Promise<void> {
  // Get the plugin's agents directory from the installed package
  const pluginAgentsDir = join(__dirname, "..", "..", "agents");
  const configDir = join(homedir(), ".config", "opencode", "agent");

  // Ensure config directory exists
  await mkdir(configDir, { recursive: true });

  // List of agents to install
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
    const destPath = join(configDir, `${agent}.md`);

    // Skip if agent file doesn't exist in plugin
    if (!existsSync(sourcePath)) {
      continue;
    }

    // Skip if user already has a custom version
    if (existsSync(destPath)) {
      const existing = await readFile(destPath, "utf-8");
      // Check if it's the plugin-installed version (has marker comment)
      if (!existing.includes("<!-- Installed by opencode-plugin-workflow-agents -->")) {
        continue;
      }
    }

    // Read, add marker, and write
    let content = await readFile(sourcePath, "utf-8");
    if (!content.includes("<!-- Installed by opencode-plugin-workflow-agents -->")) {
      content = `<!-- Installed by opencode-plugin-workflow-agents -->\n${content}`;
    }
    await writeFile(destPath, content);
  }
}
