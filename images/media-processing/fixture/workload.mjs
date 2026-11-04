import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import sharp from "sharp";
const ff = (args) =>
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
    { timeout: 20000, maxBuffer: 4_000_000 },
  );
const probe = (p) =>
  JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", p],
      { encoding: "utf8", timeout: 10000 },
    ),
  );
const json = async (p, x) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const videoSummary = {
  width: 80,
  height: 60,
  frames: 10,
  contactWidth: 160,
  contactHeight: 120,
  durationSeconds: 2,
};
async function verifyVideo({ outputDir }) {
  const p = probe(join(outputDir, "preview.mp4"));
  const stream = p.streams.find((s) => s.codec_type === "video");
  assert.equal(stream.width, 80);
  assert.equal(stream.height, 60);
  assert.equal(+stream.nb_frames, 10);
  assert.ok(Math.abs(+p.format.duration - 2) < 0.05);
  ff(["-i", join(outputDir, "preview.mp4"), "-f", "null", "-"]);
  const { data, info } = await sharp(join(outputDir, "contact-sheet.png"))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 160);
  assert.equal(info.height, 120);
  assert.ok(new Set(data).size > 20, "Expected actual test pattern pixels");
  return {
    width: stream.width,
    height: stream.height,
    frames: +stream.nb_frames,
    contactWidth: info.width,
    contactHeight: info.height,
    durationSeconds: Math.round(+p.format.duration),
  };
}
const audioSummary = {
  sampleRate: 16000,
  channels: 1,
  samples: 16000,
  durationSeconds: 1,
  nonzeroSamples: true,
};
async function verifyAudio({ outputDir }) {
  const p = probe(join(outputDir, "clip.wav"));
  const stream = p.streams.find((s) => s.codec_type === "audio");
  assert.equal(+stream.sample_rate, 16000);
  assert.equal(stream.channels, 1);
  const bytes = ff([
    "-i",
    join(outputDir, "clip.wav"),
    "-f",
    "s16le",
    "-acodec",
    "pcm_s16le",
    "-",
  ]);
  assert.equal(bytes.length, 32000);
  let energy = 0;
  for (let i = 0; i < bytes.length; i += 2) energy += bytes.readInt16LE(i) ** 2;
  assert.ok(energy > 1000000);
  const rms = Math.sqrt(energy / 16000);
  assert.ok(rms > 100 && rms < 4000);
  return {
    sampleRate: +stream.sample_rate,
    channels: stream.channels,
    samples: bytes.length / 2,
    durationSeconds: Math.round(+p.format.duration),
    nonzeroSamples: energy > 0,
  };
}
export const scenarios = {
  "media-project": {
    expectedSummary: videoSummary,
    artifacts: ["preview.mp4", "contact-sheet.png"],
    async prepare(inputDir) {
      ff([
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=160x120:rate=5:duration=2",
        "-c:v",
        "mpeg4",
        "-q:v",
        "2",
        "-pix_fmt",
        "yuv420p",
        "-threads",
        "1",
        join(inputDir, "source.mp4"),
      ]);
      await json(join(inputDir, "transform.json"), {
        width: 80,
        height: 60,
        frames: 10,
      });
    },
    async run(ctx) {
      const transform = await read(join(ctx.inputDir, "transform.json"));
      ff([
        "-i",
        join(ctx.inputDir, "source.mp4"),
        "-vf",
        `scale=${transform.width}:${transform.height}`,
        "-c:v",
        "mpeg4",
        "-q:v",
        "2",
        "-threads",
        "1",
        join(ctx.outputDir, "preview.mp4"),
      ]);
      ff([
        "-i",
        join(ctx.outputDir, "preview.mp4"),
        "-vf",
        "select=not(mod(n\\,3)),tile=2x2",
        "-frames:v",
        "1",
        "-threads",
        "1",
        join(ctx.outputDir, "contact-sheet.png"),
      ]);
      return verifyVideo(ctx);
    },
    verify: verifyVideo,
  },
  "audio-processing": {
    expectedSummary: audioSummary,
    artifacts: ["clip.wav"],
    async prepare(inputDir) {
      ff([
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000:duration=2",
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        join(inputDir, "source.wav"),
      ]);
      await json(join(inputDir, "transform.json"), {
        start: 0.5,
        duration: 1,
        sampleRate: 16000,
      });
    },
    async run(ctx) {
      const transform = await read(join(ctx.inputDir, "transform.json"));
      ff([
        "-i",
        join(ctx.inputDir, "source.wav"),
        "-af",
        `atrim=start=${transform.start}:duration=${transform.duration},asetpts=PTS-STARTPTS,volume=0.5`,
        "-ar",
        String(transform.sampleRate),
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        join(ctx.outputDir, "clip.wav"),
      ]);
      return verifyAudio(ctx);
    },
    verify: verifyAudio,
  },
};
