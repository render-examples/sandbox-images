import assert from 'node:assert/strict';
import type {ScenarioMap} from '/opt/render/runtime/contracts.ts';
import {createAgentScenarios} from '/opt/render/runtime/coding-agent-workload.ts';
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
const typescript=base["openhands-sdk-typescript-repo"];
const python=base["openhands-sdk-python-repo"];
assert.ok(typescript && python);
export const scenarios:ScenarioMap={
"openhands-typescript-repair":typescript,
"openhands-python-repair":python
};
