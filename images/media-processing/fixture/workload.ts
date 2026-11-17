import type { RecipeContext, ScenarioMap } from '/opt/render/runtime/contracts.ts';
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import sharp from "sharp";
const ff = (args: string[]) =>
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
    { timeout: 20000, maxBuffer: 4_000_000 },
  );
function probe(p: string) {
 const raw: unknown = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_streams','-show_format','-of','json',p], {encoding:'utf8',timeout:10000}));
 assert.ok(isRecord(raw) && Array.isArray(raw.streams) && isRecord(raw.format));
 const streams = raw.streams.map((stream: unknown) => { assert.ok(isRecord(stream)); return stream; });
 const duration = numeric(raw.format.duration); return {streams,duration};
}
function numeric(value: unknown): number {
 assert.ok(typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0));
 const n = Number(value); assert.ok(Number.isFinite(n)); return n;
}
const json = async (p: string, x: unknown) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
async function videoTransform(p: string) {
 const value: unknown = JSON.parse(await readFile(p,'utf8')); assert.ok(isRecord(value));
 const width=numeric(value.width),height=numeric(value.height);
 assert.ok(Number.isSafeInteger(width)&&width>0&&Number.isSafeInteger(height)&&height>0);
 return {width,height};
}
async function audioTransform(p: string) {
 const value: unknown = JSON.parse(await readFile(p,'utf8')); assert.ok(isRecord(value));
 const start=numeric(value.start),duration=numeric(value.duration),sampleRate=numeric(value.sampleRate);
 assert.ok(start>=0&&duration>0&&Number.isSafeInteger(sampleRate)&&sampleRate>0);
 return {start,duration,sampleRate};
}
const videoSummary = {
  width: 80,
  height: 60,
  frames: 10,
  contactWidth: 160,
  contactHeight: 120,
  durationSeconds: 2,
};
async function verifyVideo({ outputDir }: RecipeContext) {
  const p = probe(join(outputDir, "preview.mp4"));
  const stream = p.streams.find((s) => s.codec_type === "video");
  assert.ok(stream);
  assert.equal(stream.width, 80);
  assert.equal(stream.height, 60);
  assert.equal(numeric(stream.nb_frames), 10);
  assert.ok(Math.abs(p.duration - 2) < 0.05);
  ff(["-i", join(outputDir, "preview.mp4"), "-f", "null", "-"]);
  const { data, info } = await sharp(join(outputDir, "contact-sheet.png"))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 160);
  assert.equal(info.height, 120);
  assert.ok(new Set(data).size > 20, "Expected actual test pattern pixels");
  return {
    width: numeric(stream.width),
    height: numeric(stream.height),
    frames: numeric(stream.nb_frames),
    contactWidth: info.width,
    contactHeight: info.height,
    durationSeconds: Math.round(p.duration),
  };
}
const audioSummary = {
  sampleRate: 16000,
  channels: 1,
  samples: 16000,
  durationSeconds: 1,
  nonzeroSamples: true,
};
async function verifyAudio({ outputDir }: RecipeContext) {
  const p = probe(join(outputDir, "clip.wav"));
  const stream = p.streams.find((s) => s.codec_type === "audio");
  assert.ok(stream);
  assert.equal(numeric(stream.sample_rate), 16000);
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
    sampleRate: numeric(stream.sample_rate),
    channels: numeric(stream.channels),
    samples: bytes.length / 2,
    durationSeconds: Math.round(p.duration),
    nonzeroSamples: energy > 0,
  };
}
export const scenarios: ScenarioMap = {
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
      const config = await videoTransform(join(ctx.inputDir, "transform.json"));
      ff([
        "-i",
        join(ctx.inputDir, "source.mp4"),
        "-vf",
        `scale=${config.width}:${config.height}`,
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
      const config = await audioTransform(join(ctx.inputDir, "transform.json"));
      ff([
        "-i",
        join(ctx.inputDir, "source.wav"),
        "-af",
        `atrim=start=${config.start}:duration=${config.duration},asetpts=PTS-STARTPTS,volume=0.5`,
        "-ar",
        String(config.sampleRate),
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
