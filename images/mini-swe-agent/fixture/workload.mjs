import {createAgentScenarios} from '/opt/render/runtime/coding-agent-workload.mjs';
const base=createAgentScenarios({
  "slug": "mini-swe-agent",
  "name": "Mini SWE agent",
  "cli": {
    "command": "render-mini-swe-agent",
    "version": "2.4.6",
    "versionArgs": [
      "--version"
    ],
    "helpArgs": [
      "--help"
    ],
    "requiredHelp": [
      "--model"
    ]
  },
  "launch": {
    "args": [
      "{prompt}"
    ],
    "prompt": "argument",
    "extraArgsAfter": 0
  },
  "instructionsFile": "AGENTS.md"
});
export const scenarios={
"mini-swe-typescript-issue":base["mini-swe-agent-typescript-repo"],
"mini-swe-python-issue":base["mini-swe-agent-python-repo"]
};
