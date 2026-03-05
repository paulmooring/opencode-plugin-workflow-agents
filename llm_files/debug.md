# Default Agent Configuration Analysis

## Symptom

The default agent configuration (`agents/default.md`) was created with the following characteristics:
- Uses `tools:` field to disable write, edit, and bash tools
- Includes instructions to call other agents using `@research`, `@spec`, `@implement`, `@review`, `@debug` syntax
- Intended to orchestrate complex tasks by delegating to specialized agents

## Root Cause

**Issue 1: Unsupported `tools:` Field**

**File**: `agents/default.md` (lines 10-13)

The YAML frontmatter includes a `tools:` field that is NOT supported by the opencode plugin system:

```yaml
tools:
  write: false
  edit: false
  bash: false
```

**Evidence**:
1. The `agents/README.md` (lines 29-37) documents supported fields: `description`, `model`, `temperature`, `top_p`, `color`, `mode` — `tools` is not listed
2. The `@opencode-ai/plugin` type definitions (node_modules/@opencode-ai/plugin/dist/index.d.ts) show no support for tool disabling per agent
3. The `@opencode-ai/sdk` type definitions contain no `tools` field in agent configuration types
4. No other agent files in the repository use this pattern

**Issue 2: Unsupported @Agent Reference Syntax**

**File**: `agents/default.md` (line 16)

The agent prompt instructs the model to call other agents using `@-syntax`:

```
use @research, @spec, @implement, @review and @debug to complete the request
```

This syntax has no implementation support:
1. No hooks in the plugin system for inter-agent communication
2. No `@agent` reference handler in the SDK
3. No documentation on agent orchestration or delegation
4. No mechanism for one agent to invoke another agent

## Related Instances

N/A - This is a new configuration being introduced.

## Fix Applied

**Status**: Configuration needs to be revised to align with actual system capabilities.

**Recommended Changes**:

### Option 1: Remove Unsupported Features (Minimal Fix)

Remove the `tools:` field from the frontmatter and revise the prompt to avoid references to unsupported @agent syntax:

**Before**:
```yaml
---
description: >-
  Orchestrate complex tasks by delegating to specialized agents
model: bailian-coding-plan/qwen3.5-plus
top_p: 0.85
top_k: 20
color: "#1E3A5F"
mode: primary
tools:
  write: false
  edit: false
  bash: false
---

You are the architect. Never write code or run bash yourself. Analyze the user request and use @research, @spec, @implement, @review and @debug to complete the request.
```

**After**:
```yaml
---
description: >-
  Orchestrate complex tasks by delegating to specialized agents
model: bailian-coding-plan/qwen3.5-plus
top_p: 0.85
top_k: 20
color: "#1E3A5F"
mode: primary
---

You are the architect. Your role is to analyze user requests and plan the workflow. Recommend which specialized agent should handle each phase:
- Use the research agent to understand codebases
- Use the spec agent to create implementation plans
- Use the implement agent to write code
- Use the review agent to review changes
- Use the debug agent to diagnose issues

Provide clear guidance but do not write code yourself.
```

### Option 2: Implement Missing Features (Comprehensive Fix)

To support the intended behavior, the plugin would need to:

1. **Tool Filtering Hook**: Implement a `tool.definition` hook that filters available tools based on agent name
2. **Agent Delegation Tool**: Create a custom `delegate` tool that allows agents to invoke other agents
3. **Agent Configuration Schema**: Extend the agent definition format to support tool filtering

Example implementation in `src/index.ts`:
```typescript
// Filter tools for specific agents
hooks["tool.definition"] = async (input, output) => {
  if (input.toolID === "default") {
    // Return filtered tool list excluding write, edit, bash
  }
};
```

## Verification

### Test 1: YAML Parsing
The YAML frontmatter syntax is valid and will parse correctly. The opencode system will likely ignore the unknown `tools:` field rather than failing.

### Test 2: Agent Loading
The agent will load successfully and be available in the opencode interface.

### Test 3: Tool Access
The disabled tools (write, edit, bash) will **NOT** actually be disabled. The agent will still have access to them.

### Test 4: Agent Delegation
The @-syntax references to other agents will **NOT** work. The model will treat these as text references, not executable commands.

## Recommendation

The configuration is **aspirational but not functional**. Until the plugin implements:
1. Tool filtering per agent
2. Agent-to-agent delegation mechanism

The default agent should be revised to work within current system constraints (Option 1). Alternatively, create a roadmap to implement these missing features (Option 2).

## Testing Required

1. Load the plugin and verify default.md is installed to `~/.config/opencode/agent/default.md`
2. Start a session with the default agent and verify it can still access write/edit/bash tools
3. Verify that @agent references do not trigger any agent switching behavior
