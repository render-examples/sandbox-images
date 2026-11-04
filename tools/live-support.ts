/** Shared checks for the two fixed-fixture live validation runners. */
export function safeError(error: unknown, env: NodeJS.ProcessEnv = process.env): string {
  let message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  for (const token of [env.RENDER_API_KEY, env.GHCR_TOKEN]) {
    if (token) message = message.replaceAll(token, "[redacted]");
  }
  return message.replace(/https?:\/\/\S+/g, "[URL redacted]");
}

export function validateImportedImage(image: {
  id: string; sandboxGroupId: string; status: string; sourceDigest: string;
  source: { repository: string; image: string };
}, expected: { imageId: string; group: string; image: string }) {
  const [repository, digest] = expected.image.split("@");
  if (image.id !== expected.imageId || image.sandboxGroupId !== expected.group ||
      image.sourceDigest !== digest || `${image.source.repository}/${image.source.image}` !== repository) {
    throw new Error("Imported image ID, group or pinned source does not match the requested image");
  }
  if (image.status !== "succeeded") throw new Error("Reused image import must already have succeeded");
}

type ExecEvent = { type: string; data?: string; exit_code?: number };
export type ExecDiagnostic = {
  sandboxId: string; command: string; exitCode: number | null;
  outputTail: string; streamError?: string;
};
export class GuestExecError extends Error {
  diagnostic: ExecDiagnostic;
  constructor(diagnostic: ExecDiagnostic) {
    super(`Guest workload failed in ${diagnostic.sandboxId}; exit=${diagnostic.exitCode ?? "unknown"}`);
    this.name = "GuestExecError";
    this.diagnostic = diagnostic;
  }
}

export async function checkedExec(events: AsyncIterable<ExecEvent> | Promise<AsyncIterable<ExecEvent>>, sandboxId: string,
  command: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  let exitCode: number | undefined;
  let output = Buffer.alloc(0);
  let streamError: unknown;
  // Preserve complete secret matches across chunks and the eventual tail boundary.
  const extra = Math.max(0, ...[env.RENDER_API_KEY, env.GHCR_TOKEN].map(value => Buffer.byteLength(value ?? "")));
  for await (const event of (async function* () {
    try { yield* await events; } catch (error) { streamError = error; }
  })()) {
    if (event.type === "output" && typeof event.data === "string") {
      output = Buffer.concat([output, Buffer.from(event.data)]).subarray(-(16384 + extra));
    }
    if (event.type === "exit") exitCode = event.exit_code;
  }
  if (exitCode !== 0 || streamError !== undefined) {
    throw new GuestExecError({ sandboxId,
      command: Buffer.from(safeError(command, env)).subarray(0, 4096).toString("utf8"),
      exitCode: exitCode ?? null,
      outputTail: Buffer.from(safeError(output.toString("utf8"), env)).subarray(-16384).toString("utf8"),
      ...(streamError !== undefined ? { streamError: safeError(streamError, env).slice(0, 4096) } : {}),
    });
  }
}
