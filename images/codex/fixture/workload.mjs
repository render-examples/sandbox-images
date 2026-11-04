import { createAgentScenarios } from '/opt/render/runtime/coding-agent-workload.mjs';

export const scenarios = createAgentScenarios({
  slug: 'codex',
  name: 'Codex',
  cli: {
    command: 'codex',
    version: '0.166.0',
    versionArgs: ['--version'],
    helpArgs: ['exec', '--help'],
    requiredHelp: ['--json'],
  },
  launch: { args: ['exec', '--json', '-'], prompt: 'stdin', extraArgsAfter: 1 },
  instructionsFile: 'AGENTS.md',
});
