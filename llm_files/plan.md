# OpenCode Plugin Plan

## Goal

Build a distributable OpenCode plugin that bundles custom agents, configures AI providers/models, and provides a dependency installation tool for multi-language project support.

## Approach

The plugin will be structured as an npm package following the `@opencode-ai/plugin` SDK pattern. It exposes three main capabilities through the plugin hooks system:

1. **Agent Distribution**: Package agent definitions as installable assets that copy to the user's `~/.config/opencode/agent/` directory on plugin initialization
2. **Provider Configuration**: Use the `config` hook to programmatically register the `minimax` and `bailian-coding-plan` providers with their model definitions
3. **Dependency Installation Tool**: Implement a custom tool via the `tool` hook that detects project type and installs dependencies using appropriate package managers

This approach keeps the plugin self-contained while integrating seamlessly with OpenCode's existing plugin architecture. The plugin avoids modifying core OpenCode behavior and instead extends it through official hooks.

## Changes

### 1. Plugin Package Structure

**File path**: `package.json`

Creates the npm package configuration for the plugin.

```json
{
  "$schema": "https://json.schemastore.org/package.json",
  "name": "opencode-plugin-workflow-agents",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "agents",
    "scripts"
  ],
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.2.17",
    "@opencode-ai/sdk": "^1.2.17",
    "zod": "^4.1.8"
  },
  "devDependencies": {
    "@types/node": "^22.13.9",
    "typescript": "^5.8.2"
  }
}
```

**Why**: Standard npm package structure that allows the plugin to be published and installed via npm. The `agents` and `scripts` directories are included for asset distribution.

---

### 2. TypeScript Configuration

**File path**: `tsconfig.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@tsconfig/node22/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "nodenext",
    "module": "nodenext"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Why**: Matches the TypeScript configuration used by the official `@opencode-ai/plugin` package for compatibility.

---

### 3. Main Plugin Entry Point

**File path**: `src/index.ts`

```typescript
import type { Plugin, Hooks } from "@opencode-ai/plugin";
import { installDepsTool } from "./tools/install-deps";
import { configureProviders } from "./config/providers";
import { installAgents } from "./agents/install";

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
```

**Why**: Central plugin entry point that wires together all plugin capabilities. Returns hooks for tools, config modification, and performs agent installation as a side effect.

---

### 4. Provider Configuration Module

**File path**: `src/config/providers.ts`

```typescript
import type { PluginInput, Config } from "@opencode-ai/plugin";

export async function configureProviders(ctx: PluginInput, config: Config): Promise<void> {
  // Configure MiniMax provider
  config.providers = config.providers || {};
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
  config.agent = config.agent || {};
  config.agent.default = {
    mode: "primary",
    model: "minimax/MiniMax-M2.5",
  };

  config.default_agent = "default";
}
```

**Why**: Programmatically registers providers and models through the `config` hook. Uses environment variables for API keys to avoid hardcoding secrets. Matches the structure from the user's `opencode.jsonc`.

---

### 5. Dependency Installation Tool

**File path**: `src/tools/install-deps.ts`

```typescript
import { tool } from "@opencode-ai/plugin";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

const execAsync = promisify(exec);

export const installDepsTool = tool({
  description: "Install project dependencies based on detected programming language and package manager",
  args: {
    language: tool.schema.string().optional().describe("Force a specific language (auto-detect if not provided)"),
    devOnly: tool.schema.boolean().optional().default(false).describe("Install dev dependencies only"),
    productionOnly: tool.schema.boolean().optional().default(false).describe("Install production dependencies only"),
  },
  async execute(args, ctx) {
    const directory = ctx.directory;

    // Detect project type
    const projectType = await detectProjectType(directory, args.language);

    if (!projectType) {
      return "No recognized project found. Create a package.json, requirements.txt, go.mod, Cargo.toml, or similar.";
    }

    ctx.metadata({
      title: `Installing dependencies for ${projectType.name}`,
      metadata: { projectType: projectType.name },
    });

    // Build install command
    const installCmd = buildInstallCommand(projectType, {
      devOnly: args.devOnly,
      productionOnly: args.productionOnly,
    });

    try {
      const { stdout, stderr } = await execAsync(installCmd.command, {
        cwd: directory,
        env: { ...process.env, ...installCmd.env },
      });

      const output = [
        `## Dependency Installation: ${projectType.name}`,
        "",
        `**Package Manager**: ${installCmd.name}`,
        `**Command**: \`${installCmd.command}\``,
        "",
        "### Output",
        "```",
        stdout || stderr || "Installation completed.",
        "```",
      ].join("\n");

      return output;
    } catch (error: any) {
      throw new Error(`Failed to install dependencies: ${error.stderr || error.message}`);
    }
  },
});

type ProjectType = {
  name: string;
  language: string;
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "pip" | "pipenv" | "poetry" | "cargo" | "go" | "mix";
  lockFile?: string;
};

async function detectProjectType(directory: string, forceLanguage?: string): Promise<ProjectType | null> {
  // Check for JavaScript/TypeScript
  if (!forceLanguage || forceLanguage === "javascript" || forceLanguage === "typescript") {
    if (existsSync(join(directory, "bun.lock"))) {
      return { name: "Bun Project", language: "javascript", packageManager: "bun", lockFile: "bun.lock" };
    }
    if (existsSync(join(directory, "pnpm-lock.yaml"))) {
      return { name: "pnpm Project", language: "javascript", packageManager: "pnpm", lockFile: "pnpm-lock.yaml" };
    }
    if (existsSync(join(directory, "yarn.lock"))) {
      return { name: "Yarn Project", language: "javascript", packageManager: "yarn", lockFile: "yarn.lock" };
    }
    if (existsSync(join(directory, "package-lock.json"))) {
      return { name: "npm Project", language: "javascript", packageManager: "npm", lockFile: "package-lock.json" };
    }
    if (existsSync(join(directory, "package.json"))) {
      return { name: "npm Project", language: "javascript", packageManager: "npm" };
    }
  }

  // Check for Python
  if (!forceLanguage || forceLanguage === "python") {
    if (existsSync(join(directory, "poetry.lock"))) {
      return { name: "Poetry Project", language: "python", packageManager: "poetry", lockFile: "poetry.lock" };
    }
    if (existsSync(join(directory, "Pipfile"))) {
      return { name: "Pipenv Project", language: "python", packageManager: "pipenv" };
    }
    if (existsSync(join(directory, "requirements.txt"))) {
      return { name: "pip Project", language: "python", packageManager: "pip" };
    }
    if (existsSync(join(directory, "setup.py")) || existsSync(join(directory, "pyproject.toml"))) {
      return { name: "Python Project", language: "python", packageManager: "pip" };
    }
  }

  // Check for Rust
  if (!forceLanguage || forceLanguage === "rust") {
    if (existsSync(join(directory, "Cargo.toml"))) {
      return { name: "Cargo Project", language: "rust", packageManager: "cargo" };
    }
  }

  // Check for Go
  if (!forceLanguage || forceLanguage === "go") {
    if (existsSync(join(directory, "go.mod"))) {
      return { name: "Go Module", language: "go", packageManager: "go" };
    }
  }

  // Check for Elixir
  if (!forceLanguage || forceLanguage === "elixir") {
    if (existsSync(join(directory, "mix.exs"))) {
      return { name: "Mix Project", language: "elixir", packageManager: "mix" };
    }
  }

  return null;
}

function buildInstallCommand(
  project: ProjectType,
  options: { devOnly: boolean; productionOnly: boolean }
): { command: string; name: string; env?: Record<string, string> } {
  const { devOnly, productionOnly } = options;

  switch (project.packageManager) {
    case "npm":
      if (devOnly) return { command: "npm ci --only=dev", name: "npm" };
      if (productionOnly) return { command: "npm ci --only=prod", name: "npm" };
      return { command: "npm ci", name: "npm" };

    case "yarn":
      if (devOnly) return { command: "yarn install --production=false", name: "yarn" };
      if (productionOnly) return { command: "yarn install --production", name: "yarn" };
      return { command: "yarn install", name: "yarn" };

    case "pnpm":
      if (devOnly) return { command: "pnpm install --prod=false", name: "pnpm" };
      if (productionOnly) return { command: "pnpm install --prod", name: "pnpm" };
      return { command: "pnpm install", name: "pnpm" };

    case "bun":
      if (devOnly) return { command: "bun install --dev", name: "bun" };
      if (productionOnly) return { command: "bun install --production", name: "bun" };
      return { command: "bun install", name: "bun" };

    case "pip":
      return { command: "pip install -r requirements.txt", name: "pip" };

    case "pipenv":
      if (devOnly) return { command: "pipenv install --dev", name: "pipenv" };
      if (productionOnly) return { command: "pipenv install", name: "pipenv" };
      return { command: "pipenv install", name: "pipenv" };

    case "poetry":
      if (devOnly) return { command: "poetry install --only dev", name: "poetry" };
      if (productionOnly) return { command: "poetry install --only main", name: "poetry" };
      return { command: "poetry install", name: "poetry" };

    case "cargo":
      if (devOnly) return { command: "cargo build --tests", name: "cargo" };
      return { command: "cargo build", name: "cargo" };

    case "go":
      return { command: "go mod download", name: "go", env: { GOPROXY: "direct" } };

    case "mix":
      if (devOnly) return { command: "mix deps.get", name: "mix" };
      return { command: "mix deps.get", name: "mix" };

    default:
      throw new Error(`Unknown package manager: ${project.packageManager}`);
  }
}
```

**Why**: Provides intelligent dependency detection and installation across multiple ecosystems. Uses lockfiles when available for reproducible installs. Returns formatted output for the AI to understand what was installed.

---

### 6. Agent Installation Module

**File path**: `src/agents/install.ts`

```typescript
import type { PluginInput } from "@opencode-ai/plugin";
import { join } from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function installAgents(ctx: PluginInput): Promise<void> {
  const agentDir = join(ctx.directory, "node_modules", "opencode-plugin-workflow-agents", "agents");
  const configDir = join(ctx.project.homeDir, ".config", "opencode", "agent");

  // Ensure config directory exists
  await mkdir(configDir, { recursive: true });

  // List of agents to install
  const agents = [
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
    const sourcePath = join(agentDir, `${agent}.md`);
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
    content = `<!-- Installed by opencode-plugin-workflow-agents -->\n${content}`;
    await writeFile(destPath, content);
  }
}
```

**Why**: Automatically installs agent definitions to the user's config directory on plugin initialization. Respects user customizations by checking for a marker comment and skipping files that have been manually edited.

---

### 7. Agent Definition Files

**File path**: `agents/research.md` (and 7 other agent files)

```markdown
---
description: >-
  Read, understand and document a code base in detail
model: bailian-coding-plan/qwen3.5-plus
temperature: 0.7
top_p: 0.7
color: "#8A0A33"
mode: primary
---

You are a deep-research agent. Your job is to thoroughly understand a codebase area before any planning or implementation begins.

## Behavior

1. Read every file in the target area — not just signatures, but full implementations, edge cases, error handling, and data flows.
2. Trace cross-cutting concerns: caching layers, retries, auth, ORM conventions, shared utilities, and existing patterns.
3. Identify implicit contracts: what callers expect, what downstream consumers depend on, naming conventions, and architectural boundaries.
4. Look for bugs, dead code, inconsistencies, and undocumented behavior when directed.

## Output

Write all findings to `llm_files/research.md` in the project root. Structure:

- **Overview**: What the system/module does in 2–3 sentences.
- **Key Components**: Files, functions, classes — what each does and how they connect.
- **Data Flow**: How data moves through the system (entry → transform → storage → output).
- **Patterns & Conventions**: ORM usage, naming, error handling, config, DI, etc.
- **Dependencies**: External services, shared libs, environment requirements.
- **Gotchas**: Non-obvious behavior, implicit coupling, known bugs, tech debt.

## Rules

- Never propose changes or write code. Output is research only.
- Never skim. If directed to understand something "deeply," read every relevant file fully.
- Never summarize verbally in chat — all findings go in `llm_files/research.md`.
- If something is ambiguous, state the ambiguity explicitly rather than guessing.
```

**Why**: Bundles the agent definitions from `~/.config/opencode/agent/` into the plugin package for distribution. Each agent file is copied verbatim from the user's configuration.

---

### 8. Build Script (Optional)

**File path**: `scripts/build.ts`

```typescript
import { build } from "tsup";

await build({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
```

**Why**: Alternative build script using `tsup` for faster builds with bundled dependencies if needed.

---

## Trade-offs

### Considered: Config file distribution vs. programmatic config
**Rejected**: Distributing `opencode.jsonc` as a file that users merge manually.
**Chosen**: Using the `config` hook to programmatically register providers.
**Why**: Programmatic configuration is more robust — it doesn't require users to manually merge config files, handles environment variables properly, and can be updated via plugin version bumps.

### Considered: MCP server for agents vs. file installation
**Rejected**: Exposing agents through an MCP server.
**Chosen**: Installing agent markdown files directly to the user's config directory.
**Why**: OpenCode's agent system is file-based, not MCP-based. This approach is simpler and uses the existing agent loading mechanism.

### Considered: Embedding API keys in plugin
**Rejected**: Hardcoding API keys from the user's `opencode.jsonc`.
**Chosen**: Using environment variables (`MINIMAX_API_KEY`, `BAILIAN_API_KEY`).
**Why**: Security best practice — keys should never be distributed in npm packages. Users must set their own keys via environment.

### Considered: Auto-updating agents on every run
**Rejected**: Overwriting user's agent files on every plugin initialization.
**Chosen**: One-time install with marker comment, skip if user has customized.
**Why**: Respects user modifications while still providing defaults. Users can delete and reinstall if they want updates.

---

## Risks

### API Key Management
**Risk**: Users may not know to set `MINIMAX_API_KEY` and `BAILIAN_API_KEY` environment variables.
**Mitigation**: Include setup documentation and error messages when API keys are missing. Consider adding an `auth` hook for interactive key setup.

### Agent File Conflicts
**Risk**: Users may have existing agents with the same names but different configurations.
**Mitigation**: The marker comment system prevents overwriting customized files. Document this behavior clearly.

### Plugin Load Order
**Risk**: If multiple plugins modify the same config, behavior is undefined.
**Mitigation**: Document that this plugin should be loaded first. Use defensive checks in the `config` hook.

### Dependency Tool Permissions
**Risk**: The `install-deps` tool executes shell commands that require user permission in OpenCode.
**Mitigation**: The tool metadata clearly describes what command will run. OpenCode's permission system will prompt the user before execution.

### Breaking Changes in Plugin SDK
**Risk**: `@opencode-ai/plugin` is early-stage and APIs may change.
**Mitigation**: Pin dependency versions and monitor for updates. Include version compatibility matrix in README.

---

## Todo List

### Phase 1: Project Setup
- [x] Create project directory structure: `src/`, `agents/`, `dist/`
- [x] Initialize `package.json` with correct name, version, and dependencies
- [x] Create `tsconfig.json` extending `@tsconfig/node22`
- [x] Add `.gitignore` for `dist/`, `node_modules/`, `*.log`
- [x] Add `.npmignore` to exclude source files from published package

### Phase 2: Core Plugin Implementation
- [x] Create `src/index.ts` with main plugin function
- [x] Implement `src/config/providers.ts` with provider configuration
- [x] Implement `src/tools/install-deps.ts` with dependency detection logic
- [x] Implement `src/agents/install.ts` with agent file installation
- [x] Wire all modules together in main entry point
- [x] Run `npm run typecheck` to verify TypeScript compilation

### Phase 3: Agent Asset Preparation
- [x] Copy all 8 agent files from `~/.config/opencode/agent/` to `agents/`
- [x] Add marker comment `<!-- Installed by opencode-plugin-workflow-agents -->` to each file
- [x] Verify each agent file has valid YAML frontmatter
- [x] Create `agents/README.md` documenting each agent's purpose

### Phase 4: Build and Test
- [x] Run `npm run build` to generate `dist/` output
- [x] Verify `dist/index.js` exports `WorkflowAgentsPlugin`
- [x] Verify `dist/index.d.ts` contains correct type definitions
- [x] Test plugin in a sample OpenCode project:
  - [x] Install plugin locally via `npm link`
  - [x] Verify agents appear in `~/.config/opencode/agent/`
  - [x] Verify providers are registered in OpenCode config
  - [x] Test `install-deps` tool with a sample project

### Phase 5: Documentation
- [x] Create `README.md` with:
  - [x] Plugin description and features
  - [x] Installation instructions (`npm install opencode-plugin-workflow-agents`)
  - [x] Configuration (environment variables required)
  - [x] Usage examples for `install-deps` tool
  - [x] List of included agents with descriptions
- [x] Add example `opencode.jsonc` showing plugin registration
- [x] Document troubleshooting for common issues (missing API keys, etc.)

### Phase 6: Publish
- [ ] Run `npm version patch` (or appropriate semver bump)
- [ ] Run `npm publish --access public`
- [ ] Verify package appears on npmjs.com
- [ ] Update user's `~/.config/opencode/package.json` to use published version
