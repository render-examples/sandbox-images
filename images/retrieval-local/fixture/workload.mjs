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
const json = async (p, x) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
async function prepare(inputDir) {
  await json(join(inputDir, "documents.json"), corpus);
  const index = new MiniSearch(options);
  index.addAll(corpus);
  await json(join(inputDir, "index.json"), index.toJSON());
}
async function load(inputDir) {
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
async function corpusRun(inputDir) {
  const index = await load(inputDir);
  const queries = [
    ["filesystem restore", "snapshot"],
    ["credentials keys", "secrets"],
    ["dependency versions", "build"],
  ];
  const results = queries.map(([query, expected]) => {
    const r = index.search(query, { combineWith: "AND" })[0];
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
async function verifyCorpus({ inputDir, outputDir }) {
  const results = await read(join(outputDir, "citations.json"));
  assert.deepEqual(results, await corpusRun(inputDir));
  for (const r of results) {
    const doc = (await read(join(inputDir, "documents.json"))).find(
      (x) => x.id === r.id,
    );
    assert.equal(doc.text, r.quote);
    assert.equal(doc.source, r.source);
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
async function rankingRun(inputDir) {
  const index = await load(inputDir);
  const filtered = index
    .search(MiniSearch.wildcard, { filter: (r) => r.category === "security" })
    .map((r) => r.id)
    .sort();
  assert.deepEqual(filtered, ["network", "secrets"]);
  const fuzzy = index.search("credentals", { fuzzy: 0.2 }).map((r) => r.id);
  assert.deepEqual(fuzzy, ["secrets"]);
  index.discard("build");
  const removed = index.search("dependency").map((r) => r.id);
  assert.deepEqual(removed, []);
  index.add({
    id: "new",
    title: "Dependency maintenance",
    text: "Audit pinned dependency changes.",
    source: "fixture://guide/maintenance",
    section: "audit",
    category: "build",
  });
  const added = index.search("dependency").map((r) => r.id);
  assert.deepEqual(added, ["new"]);
  return { filtered, fuzzy, removed, added, index: index.toJSON() };
}
async function verifyRanking({ inputDir, outputDir }) {
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
    loaded.search("dependency").map((r) => r.id),
    ["new"],
  );
  return rankingSummary;
}
export const scenarios = {
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
