import { createAgentScenarios } from "/opt/render/runtime/coding-agent-workload.mjs";

export const scenarios = createAgentScenarios({
  slug: "devin-cli",
  name: "Devin CLI",
  cli: {
    command: "devin",
    version: "3000.11.234",
    versionArgs: ["--version"],
    helpArgs: ["--help"],
    requiredHelp: ["--print", "--prompt-file"],
  },
  launch: {
    args: ["--print", "--", "{prompt}"],
    prompt: "argument",
  },
  instructionsFile: "AGENTS.md",
});
