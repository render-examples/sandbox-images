import {createAgentScenarios} from '/opt/render/runtime/coding-agent-workload.mjs';

export const scenarios=createAgentScenarios({
  slug:'opencode',
  name:'OpenCode',
  cli:{
    command:'opencode',
    version:'2.2.5',
    versionArgs:['--version'],
    helpArgs:['run','--help'],
    requiredHelp:['--format','--standalone','--model'],
  },
  launch:{args:['run','--standalone','--format','json','{prompt}'],prompt:'argument',extraArgsAfter:1},
  instructionsFile:'AGENTS.md',
});
