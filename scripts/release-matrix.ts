import { readdir, readFile } from 'node:fs/promises';
import { jsonObject, parseJson, jsonString } from '../runtime/contracts.ts';
const requested = process.env.RELEASE_IMAGES ?? 'all';
const names = requested === 'all' ? null : new Set(requested.split(',').map(s => s.trim()));
if (names && [...names].some(s => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)))
    throw new Error('Use comma-separated image slugs');
const images: string[] = [];
for (const dir of await readdir('images', { withFileTypes: true })) {
    if (!dir.isDirectory())
        continue;
    const asset = jsonObject(parseJson(await readFile(`images/${dir.name}/manifest.json`, 'utf8'))), image = jsonObject(asset.image);
    const slug = jsonString(asset.slug);
    if (slug !== dir.name)
        throw new Error('Manifest path mismatch');
    if (names ? names.has(slug) : image.digest === null)
        images.push(slug);
}
if (names && images.length !== names.size)
    throw new Error('Unknown image slug');
if (!images.length)
    throw new Error('No unpublished image candidates. Existing tags are never overwritten.');
console.log(JSON.stringify(images.sort()));
