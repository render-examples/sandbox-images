import assert from 'node:assert/strict';
import type {ScenarioMap} from '/opt/render/runtime/contracts.ts';
import {createAgentScenarios} from '/opt/render/runtime/coding-agent-workload.ts';
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
const typescript=base["mini-swe-agent-typescript-repo"];
const python=base["mini-swe-agent-python-repo"];
assert.ok(typescript && python);
export const scenarios:ScenarioMap={
"mini-swe-typescript-issue":typescript,
"mini-swe-python-issue":python
};
