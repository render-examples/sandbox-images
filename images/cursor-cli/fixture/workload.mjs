import { createAgentScenarios } from "/opt/render/runtime/coding-agent-workload.mjs";

export const scenarios = createAgentScenarios({
  slug: "cursor-cli",
  name: "Cursor CLI",
  cli: {
    command: "agent",
    version: "2026.10.22-27dcf5f",
    versionArgs: ["--version"],
    helpArgs: ["--help"],
    requiredHelp: ["--print", "--output-format"],
  },
  launch: {
    args: ["--print", "--output-format", "json", "--", "{prompt}"],
    prompt: "argument",
  },
  instructionsFile: "AGENTS.md",
});
