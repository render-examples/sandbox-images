import { createAgentScenarios } from '/opt/render/runtime/coding-agent-workload.mjs';

export const scenarios = createAgentScenarios({
  slug: 'claude-code',
  name: 'Claude Code',
  cli: {
    command: 'claude',
    version: '2.1.318',
    versionArgs: ['--version'],
    helpArgs: ['--help'],
    requiredHelp: ['--print', '--output-format'],
  },
  launch: {
    args: ['--print', '--output-format', 'json', '--', '{prompt}'],
    prompt: 'argument',
  },
  instructionsFile: 'CLAUDE.md',
});
