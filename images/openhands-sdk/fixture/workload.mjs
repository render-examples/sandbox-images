import {createAgentScenarios} from '/opt/render/runtime/coding-agent-workload.mjs';
const base=createAgentScenarios({
  "slug": "openhands-sdk",
  "name": "OpenHands SDK",
  "cli": {
    "command": "render-openhands-sdk",
    "version": "1.62.0",
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
"openhands-typescript-repair":base["openhands-sdk-typescript-repo"],
"openhands-python-repair":base["openhands-sdk-python-repo"]
};
