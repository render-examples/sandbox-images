# promptfoo skills and coding CLI evaluation image

Pinned promptfoo 0.125.1, Codex CLI 0.169.0, OpenCode 2.3.0 and Claude Code 2.1.325 with Node/Python and Git. Install versions and integrity hashes are recorded in the npm lockfile.

## Prepared snapshots

- `promptfoo-skill-cli-matrix`: frozen task controls and a skill file for the real CLI × skill-off/on runner.
- `promptfoo-tool-regression`: frozen valid/wrong-file/forbidden-write tool traces scored by actual promptfoo assertions.

Catalog checks execute promptfoo with explicitly prerecorded control outputs. They verify evaluator plumbing and failure retention; `agentInvoked: false` and `providerCalls: 0` stay explicit. They do not demonstrate skill effectiveness.

## Actual skills × CLI experiment

Run `live-matrix.mjs` only inside the sandbox. It creates four fresh Git projects by default: Codex and OpenCode, each with the skill disabled/enabled. Every variant gets the same bug and five independent tests. No variant shares mutated state. Credentials enter at execution time and are never part of prepared snapshots.

```sh
timeout -k 5 800 node /opt/render/fixtures/promptfoo/live-matrix.mjs \
  --skill /workspace/promptfoo-skill-cli-matrix/input/SKILL.md \
  --codex-model SELECT_CODEX_MODEL --opencode-model openrouter/SELECT_MODEL \
  --output /workspace/skill-cli-live
```

Supply `OPENAI_API_KEY` and `OPENROUTER_API_KEY` at run time for the default pair. Alternatively add `--codex-provider openrouter --codex-model PROVIDER/MODEL` to route both CLIs through OpenRouter using only `OPENROUTER_API_KEY`. This writes an isolated Responses API provider config for Codex and prevents ambient OpenAI credentials from overriding it. Use `--clis codex,claude --claude-model SELECT_MODEL` with `ANTHROPIC_API_KEY` to select Claude instead, or select all three CLIs for six variants. OpenCode also accepts a direct provider model supported by the installed version. Each CLI has a 180-second limit, bounded output and a separate five-second grading process. The CLI runs with its internal sandbox disabled because Render supplies the outer execution boundary. The evaluator saves every variant receipt, exit codes, grading outcomes, CLI logs, and task/skill hashes. Failed executions remain visible and fail the run; incorrect patches remain scored failures. A successful experiment does not require the skill to improve results.

Neither hosted model path has been validated merely by building this image. Keep unsupported/missing-credit routes explicit.

## Acceptance and release

`python3 scripts/check-image.py promptfoo` checks both offline recipes, independent semantic checks, corruption rejection, regeneration and fresh-container filesystem restore. Live model calls, Render capture/restore, image publication and immutable digest recording are separate gates.

Sources: [OpenCode](https://opencode.ai/docs/cli/), [promptfoo Node API](https://www.promptfoo.dev/docs/usage/node-api-reference/), [custom providers](https://www.promptfoo.dev/docs/providers/custom-api/), [Codex CLI](https://github.com/openai/codex), [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference).

For OpenRouter, the live runner gives each Codex invocation a fresh `HOME` and writes its user-level `.codex/config.toml` there. It does not depend on trusting a project-local config or reuse ambient OpenAI credentials.
