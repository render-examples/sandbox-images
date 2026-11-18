import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { Render } from '@renderinc/sdk';
import { jsonObject, jsonArray, jsonString, parseJson } from '../runtime/contracts.ts';
import { verifyReceipt } from './image-security.ts';
import { main as validateRecipe } from './validate-recipe.ts';
import { main as validateAnalytics } from './analytics-workbench.ts';
import { safeError } from './live-support.ts';
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const json = async (path: string): Promise<unknown> => parseJson(await readFile(path, 'utf8'));
function digest(value: unknown): string { const text = jsonString(value); if (!digestPattern.test(text))
    throw new Error('Invalid image digest'); return text; }
function slug(value: unknown): string { const text = jsonString(value); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text))
    throw new Error('Invalid slug'); return text; }
export function verifyLiveResult(value: unknown, expected: {
    recipe: string;
    version: string;
    image: string;
}) {
    const run = jsonObject(value);
    if (run.recipe !== expected.recipe || run.recipeVersion !== expected.version || run.imageSource !== expected.image || run.passed !== true || run.imageWorkloadPassed !== true || run.workloadPassed !== true || jsonArray(run.cleanupErrors).length || typeof run.completedAt !== 'string' || !Number.isFinite(Date.parse(run.completedAt)))
        throw new Error('Live result does not prove this recipe and image passed');
    if (run.snapshotDeleted !== true || run.retainedSnapshotId)
        throw new Error('Release validation must delete its temporary snapshot');
    return run;
}
export function releaseAsset(value: unknown, revision: string, imageDigest: string, evidenceUrl: string, verifiedAt: string) {
    const asset = jsonObject(value), source = jsonObject(asset.source), image = jsonObject(asset.image);
    if (!/^[a-f0-9]{40}$/.test(revision) || !digestPattern.test(imageDigest) || !/^https:\/\/github.com\/render-examples\/sandbox-images\/releases\/tag\/image-[a-z0-9.-]+$/.test(evidenceUrl) || !Number.isFinite(Date.parse(verifiedAt)))
        throw new Error('Invalid release provenance');
    if (source.repository !== 'https://github.com/render-examples/sandbox-images' || !['sandbox-image', 'snapshot-recipe'].includes(jsonString(asset.kind)))
        throw new Error('Unexpected asset source');
    const name = slug(asset.slug), category = asset.kind === 'sandbox-image' ? 'images' : 'snapshots';
    if (source.path !== `${category}/${name}`)
        throw new Error('Asset source path mismatch');
    return { ...asset, status: 'verified', source: { ...source, revision }, image: { ...image, digest: imageDigest }, verification: { status: 'passed', verifiedAt, evidenceUrl, clientVersion: '@renderinc/sdk@1.6.0', computePlan: '1c-2g' } };
}
async function anonymousManifest(repository: string, imageDigest: string, configDigest: string) {
    if (!/^ghcr.io\/render-examples\/sandbox-[a-z0-9-]+$/.test(repository))
        throw new Error('Unexpected image repository');
    const name = repository.slice('ghcr.io/'.length);
    const auth = await fetch('https://ghcr.io/token?' + new URLSearchParams({ service: 'ghcr.io', scope: `repository:${name}:pull` }), { signal: AbortSignal.timeout(30000) });
    if (!auth.ok)
        throw new Error(`Image is not anonymously accessible (${auth.status})`);
    const token = jsonString(jsonObject(await auth.json()).token);
    const response = await fetch(`https://ghcr.io/v2/${name}/manifests/${imageDigest}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok)
        throw new Error(`Public image manifest unavailable (${response.status})`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 1000000 || 'sha256:' + sha(bytes) !== imageDigest)
        throw new Error('Published manifest digest mismatch');
    if (jsonObject(jsonObject(parseJson(Buffer.from(bytes).toString('utf8'))).config).digest !== configDigest)
        throw new Error('Published image differs from the tested image');
}
export async function main(args: string[]) {
    const { values: v } = parseArgs({ args, options: { image: { type: 'string' }, publication: { type: 'string' }, workspace: { type: 'string' }, group: { type: 'string' }, output: { type: 'string' }, 'existing-evidence': { type: 'string' } } });
    const name = slug(v.image);
    if (!v.publication || !v.output || !v.workspace?.match(/^tea-[a-z0-9]+$/) || !v.group?.match(/^sbg-[a-z0-9]+$/))
        throw new Error('Provide image, publication, workspace, group and new output directory');
    const workspace = `tea-${v.workspace.slice(4)}` as const, group = v.group, publication = resolve(v.publication), output = resolve(v.output);
    const checked = jsonObject(await json(join(publication, `checked-${name}.json`))), security = await json(join(publication, `security-receipt-${name}.json`));
    verifyReceipt(security, checked, await readFile(join(publication, `security-${name}.json`), 'utf8'), await readFile(join(publication, `sbom-${name}.cdx.json`), 'utf8'));
    const revision = (await readFile(join(publication, 'source-revision.txt'), 'utf8')).trim();
    if (!/^[a-f0-9]{40}$/.test(revision))
        throw new Error('Invalid publication source revision');
    const descriptor = jsonObject(await json(join(publication, 'oci-descriptor.json'))), imageDigest = digest(descriptor.digest), configDigest = digest(checked.configDigest);
    const catalog = jsonArray(jsonObject(await json(join(publication, 'catalog.json'))).assets).map(jsonObject);
    const image = catalog.find(a => a.kind === 'sandbox-image' && a.slug === name);
    if (!image || image.version !== checked.version)
        throw new Error('Publication does not match source manifest');
    const imageRecord = jsonObject(image.image), repository = jsonString(imageRecord.repository), version = jsonString(image.version);
    if (!/^\d+\.\d+\.\d+$/.test(version) || imageRecord.tag !== version)
        throw new Error('Invalid release version');
    await anonymousManifest(repository, imageDigest, configDigest);
    const reference = repository + '@' + imageDigest, tag = `image-${name}-${version}`, evidenceUrl = `https://github.com/render-examples/sandbox-images/releases/tag/${tag}`;
    const recipes = catalog.filter(a => a.kind === 'snapshot-recipe' && jsonObject(a.recipe).imageSlug === name);
    if (!recipes.length)
        throw new Error('An image release requires its prepared recipe checks');
    await mkdir(output, { recursive: false });
    const api = new Render({ ownerId: workspace }).sandboxes;
    let imageId: string | undefined;
    const results: Record<string, unknown>[] = [];
    const failures: Record<string, unknown>[] = [];
    for (const recipe of recipes) {
        const recipeSlug = slug(recipe.slug), directory = v['existing-evidence'] ? join(resolve(v['existing-evidence']), recipeSlug) : join(output, recipeSlug);
        try {
            if (!v['existing-evidence']) {
                const options = ['--workspace', workspace, '--group', group, '--plan', '1c-2g', '--image', reference, '--output', directory, ...(imageId ? ['--image-id', imageId] : [])];
                if (recipeSlug === 'analytics-workbench')
                    await validateAnalytics(options);
                else
                    await validateRecipe([...options, '--recipe', recipeSlug]);
            }
            const run = verifyLiveResult(await json(join(directory, 'run.json')), { recipe: recipeSlug, version: jsonString(recipe.version), image: reference });
            if (run.workspaceId !== workspace || run.sandboxGroupId !== group || run.computePlan !== '1c-2g' || run.clientVersion !== '@renderinc/sdk@1.6.0' || run.snapshotKind !== 'filesystem')
                throw new Error('Live result configuration mismatch');
            imageId = jsonString(run.imageId);
            for (const id of [jsonString(run.sourceSandboxId), jsonString(run.restoredSandboxId)]) {
                const resource = await api.get(id, workspace, AbortSignal.timeout(30000));
                if (resource.id !== id || resource.status !== 'terminated')
                    throw new Error('Temporary sandbox termination is unconfirmed');
            }
            try {
                await api.snapshots.get({ sandboxGroupId: group, snapshotId: jsonString(run.snapshotId), ownerId: workspace }, AbortSignal.timeout(30000));
                throw new Error('Temporary snapshot still exists');
            }
            catch (error) {
                if (!error || typeof error !== 'object' || !('statusCode' in error) || error.statusCode !== 404)
                    throw error;
            }
            const receipt = jsonObject(await json(join(directory, 'verification.json')));
            if (receipt.passed !== true || sha(await readFile(join(directory, 'baseline.json'))) !== run.baselineSha256)
                throw new Error('Restored baseline or output verification mismatch');
            for (const [file, hash] of Object.entries(jsonObject(receipt.outputSha256))) {
                if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(file) || sha(await readFile(join(directory, file))) !== hash)
                    throw new Error('Output hash mismatch');
            }
            const files = run.recipeFilesSha256 === undefined ? { 'recipe.py': run.recipeSha256 } : jsonObject(run.recipeFilesSha256);
            for (const [file, hash] of Object.entries(files)) {
                if (file.split('/').some(s => s === '..' || !s) || sha(await readFile(join('snapshots', recipeSlug, file))) !== hash)
                    throw new Error('Recipe source hash mismatch');
            }
            results.push({ recipe: recipeSlug, version: recipe.version, completedAt: run.completedAt, recipeFilesSha256: files, baselineSha256: run.baselineSha256, outputSha256: receipt.outputSha256, summary: receipt.summary, cleanupPassed: true });
        }
        catch (error) {
            failures.push({ recipe: recipeSlug, error: safeError(error) });
            break;
        }
    }
    await writeFile(join(output, 'validation.json'), JSON.stringify({ results, failures }, null, 2) + '\n');
    if (failures.length)
        throw new Error('Release validation failed; inspect validation.json. No release is ready.');
    const verifiedAt = new Date().toISOString();
    const runnerSha256: Record<string, string> = {};
    for (const file of ['tools/validate-recipe.ts', 'tools/analytics-workbench.ts', 'tools/live-support.ts', 'tools/package-lock.json'])
        runnerSha256[file] = sha(await readFile(file));
    const release = { schemaVersion: 1, kind: 'sandbox-image-release', slug: name, version, sourceRevision: revision, image: { repository, digest: imageDigest, configDigest, platform: 'linux/amd64' }, publication: { securityReceipt: security, anonymousManifestPassed: true }, validation: { status: 'passed', completedAt: verifiedAt, ...(v['existing-evidence'] ? {} : { runnerSha256 }), clientVersion: '@renderinc/sdk@1.6.0', computePlan: '1c-2g', networkPolicy: 'deny-all', cleanupPassed: true, recipes: results }, assets: [image, ...recipes].map(a => releaseAsset(a, revision, imageDigest, evidenceUrl, verifiedAt)) };
    await writeFile(join(output, 'release.json'), JSON.stringify(release, null, 2) + '\n', { flag: 'wx' });
    console.log(`Release ready: ${tag}; ${recipes.length} recipes passed`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
    main(process.argv.slice(2)).catch(error => { console.error(safeError(error)); process.exitCode = 1; });
