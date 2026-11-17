import {readFileSync} from 'node:fs';

/** Inputs and outputs live in separate directories; prepared inputs are immutable. */
export interface RecipeContext {
  inputDir: string;
  workDir: string;
  outputDir: string;
}

export interface Scenario<Summary extends object = Record<string, unknown>> {
  expectedSummary: Summary;
  artifacts: readonly string[];
  prepare(inputDir: string): void | Promise<void>;
  run(context: RecipeContext): Summary | Promise<Summary>;
  verify(context: RecipeContext): Summary | Promise<Summary>;
}

export type ScenarioMap = Record<string, Scenario<object>>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {[key: string]: JsonValue};

/** JSON is untrusted until its consumer validates the required structure. */
export function parseJson(text: string): unknown { return JSON.parse(text); }
export function readJson(path: string): unknown { return parseJson(readFileSync(path, 'utf8')); }
export function readJsonFile<T>(path: string, decode: (value: unknown) => T): T {
  return decode(readJson(path));
}
export function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Expected a JSON object');
  return value as Record<string, unknown>;
}
export function jsonArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError('Expected a JSON array');
  return value;
}
export function jsonString(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Expected a string');
  return value;
}
export function jsonNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Expected a finite number');
  return value;
}
export function jsonBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new TypeError('Expected a boolean');
  return value;
}
