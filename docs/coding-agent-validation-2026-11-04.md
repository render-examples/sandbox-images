# Coding-agent images and prepared repositories

Five additional images and ten recipes extend the catalog from 25/50 to
**30 images and 60 snapshot recipes**. Each profile installs the actual upstream
coding CLI alongside Node 24.22.2, TypeScript 7.0.2, Python 3.13.18 and Git. There
is one prepared TypeScript repository and one Python repository per agent.

| Image | Pinned CLI | Distribution |
| --- | --- | --- |
| codex | 0.166.0 | Official npm package and locked Linux x64 artifact |
| claude-code | 2.1.318 | Official npm native package and platform linker |
| opencode | V2 2.2.5 | Official baseline Linux x64 npm artifact |
| cursor-cli | 2026.10.22-27dcf5f | Versioned vendor archive, recorded SHA-256 |
| devin-cli | 3000.11.234 | Versioned vendor archive, manifest-verified SHA-256 |

Install sources and exact integrity values are recorded in the Dockerfiles and
package locks. The Cursor hash is independently measured from its official
archive; its installer did not supply a vendor checksum. Devin's hash matches
its official release manifest. Both vendor installers were inspected rather
than executed as floating build scripts. The full vendor bundles/notices are
retained. OpenCode uses the baseline CPU artifact so build-host AVX2 support
does not determine whether the image will start elsewhere.

References: [Codex CLI](https://learn.chatgpt.com/docs/codex/cli),
[Claude Code setup](https://code.claude.com/docs/en/setup),
[OpenCode V2](https://dev.opencode.ai/v2/docs/),
[Cursor installation](https://cursor.com/docs/cli/installation), and
[Devin CLI](https://devin.ai/cli).

## Prepared state and real-agent use

Preparation creates an intentionally failing Git repository in `project/`,
immutable inputs and a hash baseline, a task prompt, agent instructions, a
`run-agent.mjs` launcher, and `grade-project.sh`. Capture before execution, then
restore in the caller's sandbox group. The TypeScript task implements replay-safe
integer-cent totals; the Python task fixes ordered batching of one-pass iterables.

The caller authenticates after restore using the CLI's supported method and
supplies the necessary network access. `node run-agent.mjs` invokes the real CLI
inside the prepared project with a five-minute process budget. Extra arguments
are inserted at the correct command/subcommand position; prompts are passed
through stdin or as one argument, never evaluated as shell code. The launcher
preserves upstream permission controls. Callers configure approved unattended
permissions using the CLI's own options.

`bash grade-project.sh` copies candidate source into separate scratch state and
runs independent tests from the image. Project-owned tests/configuration cannot
replace those tests. The grader is a development fixture, not an adversarially
secure model-evaluation service.

## Offline acceptance and evidence boundaries

Automatic acceptance runs CLI version/help without credentials or model access.
It rejects the broken baseline, applies a known reference repair in a separate
worktree, runs five tests including 100 generated cases, and emits the patch,
candidate source, test results and CLI preflight evidence. Independent verification
replays that patch onto a fresh baseline and reruns the tests. The user's mutable
project is not overwritten by reference analysis.

Every summary explicitly records **`agentInvoked: false`**. A passing reference
workload establishes installation/workspace/test behavior; it does not establish
that an authenticated model solved the task. The five image profiles and ten
recipes remain draft and Render-unverified pending publication/live validation.

Checks cover offline Linux/amd64 execution under 2 GB/120-second acceptance
limits, input/output corruption rejection and regeneration, mode-0600 uploads,
and prepared files restored into a second fresh container. Additional candidate
probes verify that broken source fails, a repaired candidate passes, edited
project tests cannot bypass independent grading, and analysis preserves the
user's project. Host tests check literal prompt handling, stdin preservation,
subcommand argument placement, invalid insertion rejection and failure exit codes.

```sh
node --test scripts/test-coding-agent-workload.mjs
python3 scripts/check-image.py codex
python3 scripts/check-image.py claude-code
python3 scripts/check-image.py opencode
python3 scripts/check-image.py cursor-cli
python3 scripts/check-image.py devin-cli
```

## Authentication and updates

No user credentials, local account configuration, provider tokens or model weights
are copied into the images or prepared snapshots. Keep authentication out of
shared captures. CLI help confirms supported options; authentication and hosted
model execution have not been exercised by these offline checks.

Codex and Claude Code retain their upstream account/API/provider sign-in paths.
OpenCode retains its built-in provider authentication choices. Cursor supports its
normal login/API-key flow. Devin documents login and remote manual-token flows;
this image does not assume that an installer-only `DEVIN_API_KEY` authenticates
ordinary CLI inference. See [Devin authentication](https://docs.devin.ai/cli/enterprise/devin-auth).

Versions are fixed at build time. Claude's supported updater environment switch
and OpenCode's V2 global update policy disable automatic installation; OpenCode
also disables automatic LSP/formatter installation. Cursor's launcher passes the
upstream binary's version-specific `--disable-auto-update` flag without patching
vendor code. Devin's documented `auto_update: false` disables installation but
can still check for updates. These defaults do not restrict authentication.

All binaries retain upstream terms and notices. Claude's documented hosted-
preinstallation conditions require an unmodified binary, all built-in auth
methods, and end-user authentication/direct billing. No credential intermediary
is included. See [Claude Code hosted-preinstall guidance](https://code.claude.com/docs/en/legal-and-compliance).

After review/merge, publish versioned candidates through the existing workflow,
then record actual Render import, preparation, capture, fresh restore, workload,
and cleanup evidence. Authenticated agent-task evidence is an additional distinct
step; neither local reference tests nor CLI startup substitute for it.
