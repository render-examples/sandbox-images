import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('rejects an ICNS entry with zero length without hanging', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { imageSize } from 'image-size';
    const malformed = Buffer.alloc(16);
    malformed.write('icns', 0);
    malformed.writeUInt32BE(16, 4);
    malformed.write('icp4', 8);
    malformed.writeUInt32BE(0, 12);
    assert.throws(() => imageSize(malformed), /Invalid ICNS/);
  `], { cwd: import.meta.dirname, encoding: 'utf8', timeout: 5000 });
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.equal(child.status, 0, child.stderr);
});
