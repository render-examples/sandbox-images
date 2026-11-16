# Maintained code must be type-safe

- Use TypeScript for maintained Node.js code: shared runtimes, image workloads,
  launchers, smoke checks, host tools, tests and snapshot recipe implementations.
  Do not add handwritten `.js`, `.mjs` or `.cjs` files. Node 24 runs erasable
  TypeScript directly; compiled JavaScript belongs in ignored build output.
- For native TypeScript entrypoints, use `.ts` extensions for relative source
  imports. Use `.js` paths only for explicit compiled application output, and
  validate that emitted entrypoint in its image.
- Every maintained TypeScript file must be covered by the repository CI type
  check. Keep `strict`, `noUncheckedIndexedAccess`, and
  `exactOptionalPropertyTypes` enabled. A narrow `include` that omits workloads
  or tests is not an acceptable substitute for fixing their types.
- Do not bypass checking with `any`, `@ts-ignore`, `@ts-nocheck`, disabled strict
  options, unchecked JavaScript, broad ambient module declarations, or double
  assertions through `unknown`. Use real upstream declarations and precise
  local adapters when upstream declarations are unavailable.
- Treat JSON, subprocess results, network responses and dynamically imported
  modules as untrusted boundaries. Validate their required structure before
  using them. Keep the root JSON boundary declaration so `JSON.parse()` returns
  `unknown` during checking. A generic cast from JSON to a requested type is not
  validation.
- Use the shared runtime contracts for recipe lifecycle implementations. Keep
  the canonical runtime and uploaded snapshot copies synchronized.
- Generated fixture programs used to test JavaScript tooling are test data, not
  an exception for maintained implementation code. Keep them explicit and test
  their runtime behavior; do not hide implementation code inside strings.
- Preserve tool-specific Python, SQL and shell examples when those languages are
  part of the example. This does not permit adding untyped Node.js helpers.
- Before shipping changes, run the type-safety policy check, full TypeScript
  checks, affected runtime tests and image/recipe acceptance checks. Changing
  runtime source invalidates previous image evidence: retain historical results
  with their exact source and image identities and validate the new candidate.
- Use `rt/` for new branches and worktrees.
