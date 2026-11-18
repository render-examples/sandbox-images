import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseAsset, verifyLiveResult } from '../release-image.ts';
const expected = { recipe: 'recipe', version: '0.1.1', image: 'ghcr.io/render-examples/sandbox-example@sha256:' + 'a'.repeat(64) };
const run = () => ({ recipe: 'recipe', recipeVersion: '0.1.1', imageSource: expected.image, passed: true, imageWorkloadPassed: true, workloadPassed: true, cleanupErrors: [], completedAt: '2026-11-18T12:00:00Z', snapshotDeleted: true });
test('release cannot use a passing result for another version or image', () => {
    assert.doesNotThrow(() => verifyLiveResult(run(), expected));
    for (const patch of [{ recipeVersion: '0.1.0' }, { imageSource: 'ghcr.io/other@sha256:' + 'b'.repeat(64) }, { recipe: 'other' }, { imageWorkloadPassed: false }, { workloadPassed: false }, { passed: false }])
        assert.throws(() => verifyLiveResult({ ...run(), ...patch }, expected));
});
test('release requires clean completed snapshot validation', () => {
    for (const patch of [{ cleanupErrors: ['cleanup uncertain'] }, { snapshotDeleted: false }, { completedAt: null }, { retainedSnapshotId: 'snp-kept' }])
        assert.throws(() => verifyLiveResult({ ...run(), ...patch }, expected));
});
test('verified release pins source and digest without altering the source manifest', () => {
    const asset = { kind: 'sandbox-image', slug: 'example', version: '0.1.1', status: 'draft', source: { repository: 'https://github.com/render-examples/sandbox-images', path: 'images/example', revision: null }, image: { repository: 'ghcr.io/render-examples/sandbox-example', tag: '0.1.1', digest: null }, verification: { status: 'unverified' } };
    const url = 'https://github.com/render-examples/sandbox-images/releases/tag/image-example-0.1.1';
    const result = releaseAsset(asset, 'c'.repeat(40), 'sha256:' + 'a'.repeat(64), url, '2026-11-18T12:00:00Z');
    assert.equal(result.status, 'verified');
    assert.equal(result.source.revision, 'c'.repeat(40));
    assert.equal(asset.source.revision, null);
    assert.equal(asset.status, 'draft');
    assert.throws(() => releaseAsset({ ...asset, source: { ...asset.source, path: '../other' } }, 'c'.repeat(40), 'sha256:' + 'a'.repeat(64), url, '2026-11-18T12:00:00Z'));
});
