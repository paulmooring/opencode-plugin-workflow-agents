// @ts-ignore - ESM module resolution issue with plugin package
import { tool as toolFn } from "@opencode-ai/plugin";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync } from "fs";

const execAsync = promisify(exec);
const tool = toolFn;

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
      return { command: "mix deps.get", name: "mix" };

    default:
      throw new Error(`Unknown package manager: ${(project as ProjectType).packageManager}`);
  }
}

export const installDepsTool = tool({
  description: "Install project dependencies based on detected programming language and package manager",
  args: {
    language: tool.schema.string().optional().describe("Force a specific language (auto-detect if not provided)"),
    devOnly: tool.schema.boolean().optional().default(false).describe("Install dev dependencies only"),
    productionOnly: tool.schema.boolean().optional().default(false).describe("Install production dependencies only"),
  },
  async execute(args: { language?: string; devOnly?: boolean; productionOnly?: boolean }, ctx: any) {
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
      devOnly: args.devOnly ?? false,
      productionOnly: args.productionOnly ?? false,
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
