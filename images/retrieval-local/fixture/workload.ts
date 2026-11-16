import type { RecipeContext, ScenarioMap } from '/opt/render/runtime/contracts.ts';
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import MiniSearch from "minisearch";
const options = {
  fields: ["title", "text"],
  storeFields: ["title", "text", "source", "section", "category"],
};
const corpus = [
  {
    id: "snapshot",
    title: "Snapshot restore",
    text: "Capture filesystem state and restore into a fresh sandbox. Restart processes after filesystem restore.",
    source: "fixture://guide/snapshots",
    section: "restore",
    category: "runtime",
  },
  {
    id: "network",
    title: "Network policies",
    text: "Deny external requests by default and allow only explicit destinations.",
    source: "fixture://guide/network",
    section: "egress",
    category: "security",
  },
  {
    id: "secrets",
    title: "Secret handling",
    text: "Keep credentials on the host. Do not bake keys into reusable images.",
    source: "fixture://guide/secrets",
    section: "keys",
    category: "security",
  },
  {
    id: "build",
    title: "Build images",
    text: "Pin dependency versions and verify offline workloads before publishing.",
    source: "fixture://guide/build",
    section: "dependencies",
    category: "build",
  },
];
const json = async (p: string, x: unknown) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
const read = async (p: string): Promise<unknown> => JSON.parse(await readFile(p, "utf8"));
type SearchDocument = {id:string;title:string;text:string;source:string;section:string;category:string};
function document(value: unknown): SearchDocument {
 assert.ok(isRecord(value));
 const {id,title,text,source,section,category}=value;
 assert.ok(typeof id==='string'&&typeof title==='string'&&typeof text==='string'&&typeof source==='string'&&typeof section==='string'&&typeof category==='string');
 return {id,title,text,source,section,category};
}
function resultId(value: unknown): string { assert.ok(isRecord(value)&&typeof value.id==='string'); return value.id; }

async function prepare(inputDir: string) {
  await json(join(inputDir, "documents.json"), corpus);
  const index = new MiniSearch(options);
  index.addAll(corpus);
  await json(join(inputDir, "index.json"), index.toJSON());
}
async function load(inputDir: string) {
  return MiniSearch.loadJSON(
    await readFile(join(inputDir, "index.json"), "utf8"),
    options,
  );
}
const corpusSummary = {
  documents: 4,
  questions: 3,
  citations: 3,
  unknownResults: 0,
};
async function corpusRun(inputDir: string) {
  const index = await load(inputDir);
  const queries: [string, string][] = [
    ["filesystem restore", "snapshot"],
    ["credentials keys", "secrets"],
    ["dependency versions", "build"],
  ];
  const results = queries.map(([query, expected]) => {
    const r = document(index.search(query, { combineWith: "AND" })[0]);
    assert.equal(r.id, expected);
    return {
      query,
      id: r.id,
      source: r.source,
      section: r.section,
      quote: r.text,
    };
  });
  assert.equal(index.search("interstellar mango").length, 0);
  return results;
}
async function verifyCorpus({ inputDir, outputDir }: RecipeContext) {
  const results = await read(join(outputDir, "citations.json"));
  assert.deepEqual(results, await corpusRun(inputDir));
  assert.ok(Array.isArray(results));
  const rawDocuments = await read(join(inputDir, "documents.json")); assert.ok(Array.isArray(rawDocuments));
  const documents = rawDocuments.map(document);
  for (const value of results) {
    assert.ok(isRecord(value) && typeof value.id === 'string' && typeof value.quote === 'string' && typeof value.source === 'string');
    const doc = documents.find(x => x.id === value.id); assert.ok(doc);
    assert.equal(doc.text,value.quote); assert.equal(doc.source,value.source);
  }
  return corpusSummary;
}
const rankingSummary = {
  documents: 4,
  filteredResults: 2,
  fuzzyMatches: 1,
  removedMatches: 0,
  addedMatches: 1,
};
async function rankingRun(inputDir: string) {
  const index = await load(inputDir);
  const filtered = index
    .search(MiniSearch.wildcard, { filter: (r) => r.category === "security" })
    .map(resultId)
    .sort();
  assert.deepEqual(filtered, ["network", "secrets"]);
  const fuzzy = index.search("credentals", { fuzzy: 0.2 }).map(resultId);
  assert.deepEqual(fuzzy, ["secrets"]);
  index.discard("build");
  const removed = index.search("dependency").map(resultId);
  assert.deepEqual(removed, []);
  index.add({
    id: "new",
    title: "Dependency maintenance",
    text: "Audit pinned dependency changes.",
    source: "fixture://guide/maintenance",
    section: "audit",
    category: "build",
  });
  const added = index.search("dependency").map(resultId);
  assert.deepEqual(added, ["new"]);
  return { filtered, fuzzy, removed, added, index: index.toJSON() };
}
async function verifyRanking({ inputDir, outputDir }: RecipeContext) {
  const actual = await read(join(outputDir, "ranking.json"));
  const expected = await rankingRun(inputDir);
  assert.deepEqual(actual, {
    filtered: expected.filtered,
    fuzzy: expected.fuzzy,
    removed: expected.removed,
    added: expected.added,
  });
  const loaded = MiniSearch.loadJSON(
    await readFile(join(outputDir, "updated-index.json"), "utf8"),
    options,
  );
  assert.deepEqual(
    loaded.search("dependency").map(resultId),
    ["new"],
  );
  return rankingSummary;
}
export const scenarios: ScenarioMap = {
  "rag-corpus": {
    expectedSummary: corpusSummary,
    artifacts: ["citations.json"],
    prepare,
    async run(ctx) {
      await json(
        join(ctx.outputDir, "citations.json"),
        await corpusRun(ctx.inputDir),
      );
      return verifyCorpus(ctx);
    },
    verify: verifyCorpus,
  },
  "search-ranking-workbench": {
    expectedSummary: rankingSummary,
    artifacts: ["ranking.json", "updated-index.json"],
    prepare,
    async run(ctx) {
      const { index, ...result } = await rankingRun(ctx.inputDir);
      await json(join(ctx.outputDir, "ranking.json"), result);
      await json(join(ctx.outputDir, "updated-index.json"), index);
      return verifyRanking(ctx);
    },
    verify: verifyRanking,
  },
};
