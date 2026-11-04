# API/Postgres image publication and live validation

The python-api-postgres and typescript-api-postgres 0.1.0 images are privately published and passed live Render import, image smoke, prepared filesystem capture, source workload, fresh restore and output verification. All release statuses remain draft pending public distribution.

## Provenance

Images, recipe inputs and the host runner used commit `7b2b96b598d1e251231166995d187ea5f4331a48`. Both target `linux/amd64`. The downloaded OCI manifest hashes match the published digests, and each published configuration digest matches its tested-build receipt. Package visibility was independently confirmed private.

The live checks used `@renderinc/sdk@1.6.0`, plan `1c-2g`, deny-all egress on source and restored sandboxes, a 900-second runtime limit and a 300-second idle timeout. Snapshot kind was explicitly `filesystem`, captured before workload outputs existed. Credentials stayed on the host and image-import API; no credentials were injected into guests.

## Results

### python-api-postgres

- Image: `ghcr.io/render-examples/sandbox-python-api-postgres:0.1.0`
- Digest: `sha256:e60453033bd9e83fdfd273f0e264cdbc5c852703d24129d440f463a9b9d4536a`
- Configuration: `sha256:dcb836bfd6e8fd93c187228236e132d7e226c42849848dc8b293c9e435a06d71`
- Publication: [Run 41813794162](https://github.com/render-examples/sandbox-images/actions/runs/41813794162)
- Recipe: `fullstack-fastapi-postgres` version `0.1.0`
- Started `2026-11-04T10:26:03.968Z`; completed `2026-11-04T10:27:50.132Z`.
- Image smoke: `{"status":"passed","baselineTests":4,"seedRows":3,"totalCents":3351}`
- Restored result: `{"baselineTests":4,"testsPassed":7,"regressionFailuresBeforeFix":1,"seedRows":3,"totalCents":3351,"roundedCents":51,"migrationUpgradePassed":true,"migrationDowngradePassed":true,"dataPreserved":true,"changedFiles":2}`

Recipe SHA-256 hashes:

- `recipe.sh`: `13d469b17c38cb11fa1dff7b2c735740c4d2894e032b1aaba1605ddb70b481cf`
- `recipe.py`: `d49a2380298eef81c02615b174834a50d765facdaa77329402ee26314d237a24`

Downloaded artifact SHA-256 hashes:

- `summary.json`: `4fb436fb5fd8314e5919c6b43546044dc02408db6f4ad589bc2719d24868bf1d`
- `tests.xml`: `d3df0d1061d474dbb74accf954e095fa17263956edeba3d91bcec2f5ce6177cc`
- `regression.xml`: `429b1583fc98086301b9a1699c72bd0d87d3183d7e7821422e4c07b8ea0f8629`
- `api-results.json`: `1db7e87bd950d6b7cdd473c475f8edada31ad2fce7dd35cf8b153e2ee6172cbf`
- `migration.json`: `5b196d48c61b8bf56cef449779d5591cd6c9228d28cc3582af35ebc2d1884b02`
- `change.patch`: `12ebd9aa12b5617cca0a80fbd13bf29df6ec29836d7d35291dd59052dc34406a`

Cleanup independently confirmed at `2026-11-04T10:28:22.722Z`: source and restored sandboxes terminated, snapshot deleted (typed not-found response), and imported image digest matched. The imported image remains available in its sandbox group.

### typescript-api-postgres

- Image: `ghcr.io/render-examples/sandbox-typescript-api-postgres:0.1.0`
- Digest: `sha256:a145a46b56c759e90ec93f921b709a65ccfed8bd13a586a022060eb956244e8b`
- Configuration: `sha256:fa7e1a218d2bd20d7e6808ee959733d66a16249776922706591edc39ae44afec`
- Publication: [Run 41813799651](https://github.com/render-examples/sandbox-images/actions/runs/41813799651)
- Recipe: `fullstack-node-postgres` version `0.1.0`
- Started `2026-11-04T10:26:03.969Z`; completed `2026-11-04T10:28:21.884Z`.
- Image smoke: `{"status":"passed","baselineTests":3,"rows":3,"totalCents":5000}`
- Restored result: `{"baselineTests":3,"testsPassed":8,"orders":3,"totalCents":5000,"paidCents":750,"migrationSteps":3,"dataPreserved":true,"changedFiles":1}`

Recipe SHA-256 hashes:

- `recipe.sh`: `74750f2b3c8730a0bc0b245af469bf5166874e8cd7c3b3b8715de2d2b8b91e7e`
- `recipe.mjs`: `1ac53d429c38056521f29b20c06172ae4be28e702b727063ecd40aeb0e6d036a`

Downloaded artifact SHA-256 hashes:

- `summary.json`: `dccca471b502972bc12c5c9cc6e70943de8c96eac492bc21852fa6e235cb3539`
- `api-results.json`: `4973541f4ab718b66af03527aba8d2f24abd9153e9cf008480e72342beeef5b2`
- `migrations.json`: `f25d38e1c02a3319fa8433ac218a12ebcaaa5efe209278fee1525824f90e124d`
- `change.patch`: `d1cb261522084898ba303ab567449fb6fb9d2c7005383c85c776ece3b9bb40a0`

Cleanup independently confirmed at `2026-11-04T10:28:23.102Z`: source and restored sandboxes terminated, snapshot deleted (typed not-found response), and imported image digest matched. The imported image remains available in its sandbox group.

## Scope

Both recipes captured a seeded database and application fixture with PostgreSQL stopped. Source and restored workloads explicitly restarted it, tested the application against actual PostgreSQL, verified migration upgrade/downgrade and data preservation, then stopped it. Restores preserved baseline hashes and had no precomputed workload outputs.

These are deterministic functional checks using synthetic inputs, not an AI-agent quality assessment or a performance benchmark. Workspace, group and resource identifiers remain in ignored local journals. The registry distributes recipes that create snapshots within a caller's group, not portable snapshot IDs.

Both API/Postgres image pairs now have completed private publication and live validation. The separate [migration-lab live report](migration-lab-validation-2026-11-04.md) covers the new recipe reusing the existing Postgres image.
