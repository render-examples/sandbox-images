import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Render } from "@renderinc/sdk";

const usage = `Usage: npm run analytics-workbench -- --workspace tea-... --group sbg-... --image ghcr.io/ORG/IMAGE@sha256:DIGEST --plan PLAN [--keep-snapshot] [--output DIRECTORY]

Requires RENDER_API_KEY on the host. Imports a pinned image, prepares synthetic
files, captures a filesystem snapshot, restores and verifies it. Terminates
the two temporary sandboxes and deletes the snapshot unless --keep-snapshot
was requested and verification passed. Imported image stays in the group.
No credentials are sent into the sandbox. Explicit workspace, group and plan
are required; the tool does not create a group or select an implicit workspace.
`;

function safeError(error: unknown): string {
  let message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const token = process.env.RENDER_API_KEY;
  if (token) message = message.replaceAll(token, "[redacted]");
  return message.replace(/https?:\/\/\S+/g, "[URL redacted]");
}

export function parseOptions(args: string[]) {
  const { values } = parseArgs({ args, options: {
    workspace: { type: "string" }, group: { type: "string" }, image: { type: "string" },
    plan: { type: "string" }, output: { type: "string" },
    "keep-snapshot": { type: "boolean", default: false }, help: { type: "boolean" },
  } });
  if (values.help) return null;
  if (!values.workspace?.match(/^tea-[a-z0-9]+$/)) throw new Error("Provide --workspace tea-...");
  if (!values.group?.match(/^sbg-[a-z0-9]+$/)) throw new Error("Provide --group sbg-...");
  if (!values.image?.match(/^ghcr\.io\/[a-z0-9][a-z0-9._/-]+@sha256:[a-f0-9]{64}$/)) {
    throw new Error("Provide a public GHCR image pinned by sha256 digest with --image");
  }
  if (!values.plan?.match(/^[a-z0-9][a-z0-9-]+$/)) throw new Error("Provide --plan explicitly");
  return { workspace: values.workspace as `tea-${string}`, group: values.group,
    image: values.image, plan: values.plan, keepSnapshot: values["keep-snapshot"],
    output: resolve(values.output ?? join("evidence", `analytics-workbench-${randomUUID()}`)) };
}

function sha256(data: Uint8Array) { return createHash("sha256").update(data).digest("hex"); }

export async function main(args: string[]) {
  const options = parseOptions(args);
  if (!options) { console.log(usage); return; }
  if (!process.env.RENDER_API_KEY) throw new Error("Set RENDER_API_KEY on the host");
  // No overwrite: every run has its own durable resource journal and evidence.
  await mkdir(dirname(options.output), { recursive: true });
  await mkdir(options.output, { recursive: false });
  const api = new Render({ ownerId: options.workspace }).sandboxes;
  const startedAt = new Date().toISOString();
  const journal: Record<string, unknown> = {
    schemaVersion: 1, recipe: "analytics-workbench", recipeVersion: "0.1.0",
    clientVersion: "@renderinc/sdk@1.6.0", startedAt, workspaceId: options.workspace,
    sandboxGroupId: options.group, imageSource: options.image, computePlan: options.plan,
    snapshotKind: "filesystem", passed: false,
  };
  const persist = () => writeFile(join(options.output, "run.json"), JSON.stringify(journal, null, 2) + "\n", { mode: 0o600 });
  await persist();
  // SDK mutation calls do not all accept an AbortSignal. Bound the whole caller;
  // the journal identifies resources to inspect after an interrupted request.
  const watchdog = setTimeout(() => {
    console.error(`Run deadline exceeded. Inspect ${join(options.output, "run.json")} before retrying. Temporary sandboxes have a 900-second runtime limit; an in-flight import/capture may still complete.`);
    process.exit(1);
  }, 18 * 60_000);
  let sourceId: string | undefined;
  let restoredId: string | undefined;
  let snapshotId: string | undefined;
  let success = false;
  let failure: unknown;
  const cleanupErrors: string[] = [];

  async function stage(name: string) { journal.stage = name; await persist(); }
  async function boundedCleanup(operation: Promise<void>) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([operation, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Cleanup request timed out; outcome unknown")), 30_000);
      })]);
    } finally { if (timer) clearTimeout(timer); }
  }

  async function exec(id: string, command: string) {
    let exitCode: number | undefined;
    for await (const event of await api.exec(id, command, options!.workspace, AbortSignal.timeout(180_000))) {
      // This runner controls every command and fixture; do not stream arbitrary guest output.
      if (event.type === "exit") exitCode = event.exit_code;
    }
    if (exitCode !== 0) throw new Error(`Guest workload failed in ${id}; exit=${exitCode ?? "unknown"}`);
  }
  async function download(id: string, path: string) {
    // These are bounded outputs of this repository's fixed fixture, not arbitrary user files.
    const file = await api.download(id, path, options!.workspace, AbortSignal.timeout(30_000));
    if (file.data.length > 5_000_000) throw new Error(`Unexpected fixture output size for ${path}`);
    return file.data;
  }
  const create = { ownerId: options.workspace, sandboxGroupId: options.group, plan: options.plan,
    timeoutSeconds: 900, idleTimeoutSeconds: 300, networkPolicy: { type: "deny-all" as const } };
  try {
    // listGroups is owner scoped. Paginate instead of assuming the first 100 groups are all groups.
    let cursor: string | undefined;
    let found = false;
    do {
      const groups = await api.listGroups({ ownerId: options.workspace, limit: 100, cursor });
      found = groups.some(({ sandboxGroup }) => sandboxGroup.id === options.group);
      const next = groups.at(-1)?.cursor;
      if (found || !next || next === cursor || groups.length === 0) break;
      cursor = next;
    } while (!found);
    if (!found) throw new Error("The supplied sandbox group is not accessible in the supplied workspace");
    await stage("importing-image");
    const image = await api.images.import({ sandboxGroupId: options.group,
      name: "python-analysis", source: options.image });
    journal.imageId = image.id;
    await persist();
    await api.images.waitUntilReady({ sandboxGroupId: options.group, imageId: image.id }, { timeoutMs: 600_000 });
    await stage("creating-source-sandbox");
    const source = await api.create({ ...create, image: image.id });
    sourceId = source.id;
    journal.sourceSandboxId = sourceId;
    await persist();
    await api.waitUntilRunning(sourceId, { timeoutMs: 120_000, ownerId: options.workspace });
    await exec(sourceId, "timeout -k 5 120 python /opt/render/examples/python-analysis/smoke.py --output /workspace/image-smoke");
    const imageSmokeBytes = await download(sourceId, "/workspace/image-smoke/result.json");
    const imageSmoke = JSON.parse(imageSmokeBytes.toString("utf8"));
    if (imageSmoke.status !== "passed" || imageSmoke.total_cents !== 4500 || imageSmoke.rows !== 2) {
      throw new Error("Imported image did not pass its bundled analytics workload");
    }
    await writeFile(join(options.output, "image-smoke.json"), imageSmokeBytes);
    journal.imageWorkloadPassed = true;
    await persist();
    await exec(sourceId, "timeout -k 5 30 mkdir -p /workspace/analytics-workbench /workspace/output");
    const recipe = await readFile(new URL("../snapshots/analytics-workbench/recipe.py", import.meta.url));
    journal.recipeSha256 = sha256(recipe);
    await api.upload(sourceId, "/workspace/analytics-workbench/recipe.py", recipe, options.workspace, { signal: AbortSignal.timeout(30_000) });
    await exec(sourceId, "timeout -k 5 120 python /workspace/analytics-workbench/recipe.py prepare");
    const baseline = await download(sourceId, "/workspace/analytics-workbench/baseline.json");
    await writeFile(join(options.output, "baseline.json"), baseline);
    journal.baselineSha256 = sha256(baseline);
    // Validate the image with the actual analytics job before capture. Clear generated
    // outputs so the restore must recreate them from preserved inputs.
    await exec(sourceId, "timeout -k 5 120 python /workspace/analytics-workbench/recipe.py analyze");
    await exec(sourceId, "timeout -k 5 30 rm -f /workspace/output/summary.json /workspace/output/clean-orders.parquet /workspace/output/revenue.png /workspace/output/verification.json");
    const snapshotName = `analytics-workbench-${randomUUID().slice(0, 8)}`;
    journal.snapshotName = snapshotName;
    await stage("capturing-snapshot");
    const captured = await api.snapshots.create({ sandboxId: sourceId, kind: "filesystem",
      ownerId: options.workspace, name: snapshotName,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString() });
    snapshotId = captured.id;
    journal.snapshotId = snapshotId;
    await persist();
    await api.snapshots.waitUntilAvailable({ sandboxGroupId: options.group, snapshotId, ownerId: options.workspace }, { timeoutMs: 300_000 });
    await api.terminate(sourceId, options.workspace);
    journal.sourceTerminated = true;
    sourceId = undefined;
    await persist();
    await stage("creating-restored-sandbox");
    const restored = await api.create({ ...create, snapshotId });
    restoredId = restored.id;
    journal.restoredSandboxId = restoredId;
    await persist();
    await api.waitUntilRunning(restoredId, { timeoutMs: 120_000, ownerId: options.workspace });
    if (sha256(await download(restoredId, "/workspace/analytics-workbench/baseline.json")) !== sha256(baseline)) {
      throw new Error("Restored baseline differs from the captured baseline");
    }
    await exec(restoredId, "timeout -k 5 30 test ! -e /workspace/output/summary.json");
    await exec(restoredId, "timeout -k 5 120 python /workspace/analytics-workbench/recipe.py analyze");
    const verificationBytes = await download(restoredId, "/workspace/output/verification.json");
    const verification = JSON.parse(verificationBytes.toString("utf8"));
    if (verification.passed !== true || verification.summary?.revenueCents !== 21200 || verification.summary?.cleanOrders !== 6) {
      throw new Error("Restored workload did not produce the known expected result");
    }
    for (const name of ["summary.json", "clean-orders.parquet", "revenue.png"]) {
      const data = await download(restoredId, `/workspace/output/${name}`);
      if (sha256(data) !== verification.outputSha256[name]) throw new Error(`Output hash mismatch: ${name}`);
      await writeFile(join(options.output, name), data);
    }
    await writeFile(join(options.output, "verification.json"), verificationBytes);
    journal.workloadPassed = true;
    success = true;
  } catch (error) {
    failure = error;
    journal.error = safeError(error);
  } finally {
    // A full/unwritable evidence directory must not prevent remote cleanup.
    try { await stage("cleaning-up"); }
    catch (error) { cleanupErrors.push(`Resource journal: ${safeError(error)}`); }
    for (const id of [restoredId, sourceId]) {
      if (!id) continue;
      try { await boundedCleanup(api.terminate(id, options.workspace)); }
      catch (error) { cleanupErrors.push(`Sandbox ${id}: ${safeError(error)}`); }
    }
    if (snapshotId && (!options.keepSnapshot || !success)) {
      try {
        await boundedCleanup(api.snapshots.delete({ sandboxGroupId: options.group, snapshotId, ownerId: options.workspace }));
        journal.snapshotDeleted = true;
      } catch (error) { cleanupErrors.push(`Snapshot ${snapshotId}: ${safeError(error)}`); }
    } else if (snapshotId) { journal.retainedSnapshotId = snapshotId; }
    journal.cleanupErrors = cleanupErrors;
    journal.completedAt = new Date().toISOString();
    journal.passed = success && cleanupErrors.length === 0;
    journal.stage = journal.passed ? "complete" : "incomplete";
    try { await persist(); }
    finally { clearTimeout(watchdog); }
  }
  if (failure || cleanupErrors.length) throw new Error(`Validation incomplete. Inspect ${join(options.output, "run.json")}. ${failure ? safeError(failure) : cleanupErrors.join("; ")}`);
  console.log(`Verified analytics-workbench; local evidence: ${options.output}`);
  if (options.keepSnapshot) console.log(`Reusable snapshot ${snapshotId} belongs only to group ${options.group}; expires after 24 hours.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(safeError(error)); process.exitCode = 1; });
}
