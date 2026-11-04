import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
const json = async (p, x) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const colors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
];
async function quadrants(p) {
  const b = Buffer.alloc(80 * 40 * 3);
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 80; x++) {
      const c = colors[(y >= 20 ? 2 : 0) + (x >= 40 ? 1 : 0)];
      for (let k = 0; k < 3; k++) b[(y * 80 + x) * 3 + k] = c[k];
    }
  await sharp(b, { raw: { width: 80, height: 40, channels: 3 } })
    .png()
    .toFile(p);
}
async function pixels(path, width, height) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, width);
  assert.equal(info.height, height);
  assert.equal(info.channels, 3);
  return data;
}
const derivativeSummary = {
  derivatives: 2,
  width: 40,
  height: 20,
  pixelChecks: 8,
};
async function verifyDerivatives({ outputDir }) {
  for (const name of ["thumbnail.png", "thumbnail.webp"]) {
    const b = await pixels(join(outputDir, name), 40, 20);
    for (const [i, [x, y]] of [
      [0, [1, 1]],
      [1, [38, 1]],
      [2, [1, 18]],
      [3, [38, 18]],
    ])
      assert.deepEqual(
        [...b.subarray((y * 40 + x) * 3, (y * 40 + x) * 3 + 3)],
        colors[i],
      );
  }
  assert.deepEqual(
    await read(join(outputDir, "results.json")),
    derivativeSummary,
  );
  return derivativeSummary;
}
const compositeSummary = {
  width: 40,
  height: 40,
  bluePixels: 100,
  redPixels: 1500,
};
async function verifyComposite({ outputDir }) {
  const b = await pixels(join(outputDir, "composite.png"), 40, 40);
  let red = 0,
    blue = 0;
  for (let i = 0; i < b.length; i += 3) {
    const c = [...b.subarray(i, i + 3)];
    if (c.join() === "255,0,0") red++;
    else if (c.join() === "0,0,255") blue++;
    else assert.fail("Unexpected composite pixel");
  }
  assert.equal(red, 1500);
  assert.equal(blue, 100);
  assert.deepEqual(
    await read(join(outputDir, "results.json")),
    compositeSummary,
  );
  return compositeSummary;
}
export const scenarios = {
  "image-derivatives": {
    expectedSummary: derivativeSummary,
    artifacts: ["thumbnail.png", "thumbnail.webp", "results.json"],
    async prepare(inputDir) {
      await quadrants(join(inputDir, "source.png"));
      await json(join(inputDir, "transform.json"), { width: 40, height: 20 });
    },
    async run({ inputDir, outputDir }) {
      const options = await read(join(inputDir, "transform.json"));
      await sharp(join(inputDir, "source.png"))
        .resize({ ...options, kernel: "nearest" })
        .png()
        .toFile(join(outputDir, "thumbnail.png"));
      await sharp(join(inputDir, "source.png"))
        .resize({ ...options, kernel: "nearest" })
        .webp({ lossless: true })
        .toFile(join(outputDir, "thumbnail.webp"));
      await json(join(outputDir, "results.json"), derivativeSummary);
      return verifyDerivatives({ outputDir });
    },
    verify: verifyDerivatives,
  },
  "image-compositing": {
    expectedSummary: compositeSummary,
    artifacts: ["composite.png", "results.json"],
    async prepare(inputDir) {
      await sharp({
        create: { width: 40, height: 40, channels: 3, background: "#ff0000" },
      })
        .png()
        .toFile(join(inputDir, "background.png"));
      await sharp({
        create: { width: 10, height: 10, channels: 3, background: "#0000ff" },
      })
        .png()
        .toFile(join(inputDir, "overlay.png"));
      await json(join(inputDir, "placement.json"), { left: 15, top: 15 });
    },
    async run({ inputDir, outputDir }) {
      const position = await read(join(inputDir, "placement.json"));
      await sharp(join(inputDir, "background.png"))
        .composite([{ input: join(inputDir, "overlay.png"), ...position }])
        .png()
        .toFile(join(outputDir, "composite.png"));
      await json(join(outputDir, "results.json"), compositeSummary);
      return verifyComposite({ outputDir });
    },
    verify: verifyComposite,
  },
};
