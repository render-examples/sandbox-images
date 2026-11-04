# Agent regression recipe live validation

Both 0.1.0 recipes passed live Render image smoke, clean prepared-filesystem capture, source reference acceptance, fresh restore and output verification on 2026-11-04. They reuse existing private images; no new image publication was required. Releases remain draft pending public distribution.

The checks used `@renderinc/sdk@1.6.0`, plan `1c-2g`, deny-all egress on source and restored sandboxes, a 900-second runtime limit and a 300-second idle timeout. All workload outputs were absent at capture and immediately after restore. Credentials stayed on the host/image-import API.

These runs evaluate the shipped reference acceptance flow, not an AI agent. The separate `grade` commands assess candidate edits without installing the reference answer. Local acceptance additionally tested alternative implementations, partial/failing grades, corruption rejection, receipt invalidation and bounded execution. Graders and candidate code share a sandbox; this is not an adversarial grading boundary.

## agent-regression-python

- Recipe/runner source: `cf21387cdefa7a3fc18b75ed9101a6f9e3a71ccc`
- Image: `ghcr.io/render-examples/sandbox-python-coding@sha256:104f04f5a91273080b02a9c9ccfdbe34a0dba86de4c1928b476c65f836296a4a`
- Started `2026-11-04T10:36:59.253Z`; completed `2026-11-04T10:37:42.338Z`.
- Restored summary: `{"baselineTasksPassed":0,"baselineTestsPassed":3,"tasksPassed":3,"testsPassed":12,"totalTasks":3,"totalTests":12}`
- Prepared baseline SHA-256: `c3b69acee4bd62af65a2ced2b9852dd21753f45b734ef74b7e8350caeecfbbbf`

Recipe input SHA-256 hashes:

- `recipe.sh`: `13d469b17c38cb11fa1dff7b2c735740c4d2894e032b1aaba1605ddb70b481cf`
- `recipe.py`: `a88cd6c23564080ec5920bed3474598e6e419fc0f7a26422f5704011651f251b`
- `fixture/tasks.py`: `5971b8a3cd2991425ac7296543785e7afdbb9475c82b8b4cd3ae3ee9ae761d7b`
- `reference.py`: `1a7e89fea9d60e74c29367d64cf479caddcc351fdbc07fb174f426e5a66bc637`
- `TASKS.json`: `55b662174d134aabe4bdc4745ae4c9a03498a4e189f198189afa1efed34eb24f`
- `evaluation/test_tasks.py`: `3e982f747d95c8a4cc074113708518ebbe402a6c57c009bcc4634159b3006d9c`
- `grader.py`: `f6cb711a186db2ba658fa36db07c947269de92ac3a3c081e479eb834283f68bf`

Downloaded artifact SHA-256 hashes:

- `baseline-results.json`: `d235a4cbca5c51829bdd107257763b7ba2491b169ac37c96a49cfdfafebbcc39`
- `change.patch`: `6c523af8297c3fe37b895f0e94924967c8b5ea8ab03edc222940f0e5575917f9`
- `source.json`: `1d95913d0708aa7e61909ea66a8130a09d60758c9075135e0940f86bbb235f5b`
- `summary.json`: `5f35258c6c657a1bdee7da44d35bab8e0f7baa29002cb416c9fa7ebce9a7a91c`
- `task-results.json`: `f5ce9248042fc8818b98b6faffc807e25f201f8509df6fd5f908dee39b2a9833`

Cleanup independently confirmed at `2026-11-04T10:38:25.637Z`: source and restored sandboxes terminated, filesystem snapshot returned typed not-found, imported image digest matched, and downloaded/recipe hashes were verified. Imported images remain in the authorized sandbox group.

## agent-regression-typescript

- Recipe/runner source: `67fb5f357776ac4ad18aef39fa91ffc1b4292297`
- Image: `ghcr.io/render-examples/sandbox-coding-workspace@sha256:978f6b05e6b10fd332ed351989bf72269ce4014b3af67812675a86a78f330914`
- Started `2026-11-04T10:40:59.138Z`; completed `2026-11-04T10:42:37.761Z`.
- Restored summary: `{"tasks":3,"tasksPassed":3,"checks":12,"checksPassed":12,"baselineFailedTasks":3,"compileSucceeded":true}`
- Prepared baseline SHA-256: `aa845ad8d32c61a875d8efb43977d4a6cb424e3e08403785b3fca38c3698ed2d`

Recipe input SHA-256 hashes:

- `recipe.sh`: `23493d0188b20685b95f55913e9a959b27f262a106bd7377db5f9915e47e499f`
- `recipe.mjs`: `f02a59cabcf9d1c31e6aab8e3db4cbb176a2a04ab1211b2d995ceec7d2d8f81c`
- `tasks.json`: `0f2669ffb60add414b5873f935fff788fb1238f92f95944d69d30005416c8b65`
- `grader.mjs`: `fd977d882936b544f85d0eda8e79b1dcce41cd4de91419d9cfc50de4131ac7e5`
- `fixture/grouping.ts`: `ed6bad433b51284a59231beebd1be08636f114c65f7d2a27f93773e6e927aeae`
- `fixture/idempotency.ts`: `8f1639eb5841aa6a56a99df38c07c275735db70bb25766eb0e22ef6e0510e571`
- `fixture/validation.ts`: `a05c04bbafec9ad53fef68d2c4b143c7b82386c59a508cb7d10bae122f0063d8`
- `reference/grouping.ts`: `cb6b22f46cea8c52d1bca936870109a90b3dc7636985cd002f83e93967c5bb88`
- `reference/idempotency.ts`: `88c7ac307a6772a15246594861664269bd8bfe930d4644ac22375fa9e7a7f7f8`
- `reference/validation.ts`: `fa4a730b1c4b3274924972199162149864801506f19112eb3dcb770676b9f1be`

Downloaded artifact SHA-256 hashes:

- `summary.json`: `93bd210fb53ed1cb61a9342598f458ee50d4f99a0b79d24dcf540c29729b6e5b`
- `task-results.json`: `f0dcf4f6a216ed02ae11af5c202e51e5bbf16f3c5ff217ee3b095c4779baa6b8`
- `build.txt`: `88f1fc2eaa2cd30b8a9d5475828836e91d7b4db5cf7f0797685e9c5ea96be734`
- `change.patch`: `44d09a24d7ac06c22add3f5dae1744977d6c68935108ed93e469217da1534bb7`

Cleanup independently confirmed at `2026-11-04T10:42:56.693Z`: source and restored sandboxes terminated, filesystem snapshot returned typed not-found, imported image digest matched, and downloaded/recipe hashes were verified. Imported images remain in the authorized sandbox group.

## Review correction

The first TypeScript run passed the reference workflow but preceded a review fix. A candidate could modify its source after compilation and produce results for stale compiled bytes. The corrected recipe fingerprints the complete editable source tree before compilation and after every worker; task-file and added-helper mutation regressions reject success receipts. The TypeScript evidence above is from the corrected rerun. Both runs were cleaned up.

Snapshots are group-local artifacts built from these recipes, not portable IDs. Workspace/group/resource identifiers and raw journals remain in ignored local evidence directories.
