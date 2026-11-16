import type {RecipeContext, ScenarioMap} from "/opt/render/runtime/contracts.ts";
import {jsonArray,jsonObject,jsonString,jsonNumber} from "/opt/render/runtime/contracts.ts";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
const json = async (p:string, x:unknown) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
const read = async (p:string):Promise<unknown> => JSON.parse(await readFile(p, "utf8"));
const sha = (s:string) => createHash("sha256").update(s).digest("hex");
function documents(value:unknown){return jsonArray(value).map(value=>{const row=jsonObject(value);return {id:jsonString(row.id),text:jsonString(row.text),source:jsonString(row.source)};});}
function metadata(value:unknown){const row=jsonObject(value),loc=jsonObject(row.loc),lines=jsonObject(loc.lines);return {documentId:jsonString(row.documentId),source:jsonString(row.source),loc:{lines:{from:jsonNumber(lines.from),to:jsonNumber(lines.to)}}};}
type Chunk={id:string;text:string;metadata:ReturnType<typeof metadata>};
const docs = ["snapshot", "network", "database"].map((id, i) => ({
  id,
  source: `fixture://manual/${id}`,
  text: [
    `${id} section one explains the initial synthetic setup and its requirements.`,
    `${id} section two describes a reproducible operation and its expected outcome.`,
    `${id} section three records cleanup and verification of the synthetic state.`,
  ].join("\n\n"),
}));
async function prepare(inputDir:string) {
  await json(join(inputDir, "documents.json"), docs);
  await json(join(inputDir, "questions.json"), [
    "snapshot operation",
    "unknown astronomy",
  ]);
}
async function split(inputDir:string) {
  const original = documents(await read(join(inputDir, "documents.json")));
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 120,
    chunkOverlap: 0,
    separators: ["\n\n"],
  });
  const result:Chunk[] = [];
  for (const doc of original) {
    const chunks = await splitter.splitDocuments([
      new Document({
        pageContent: doc.text,
        metadata: { documentId: doc.id, source: doc.source },
      }),
    ]);
    chunks.forEach((chunk, i) =>
      result.push({
        id: doc.id + ":" + i,
        text: chunk.pageContent,
        metadata: metadata(chunk.metadata),
      }),
    );
  }
  return result;
}
const chunkSummary = {
  documents: 3,
  chunks: 9,
  maxCharacters: 120,
  citationsPreserved: 9,
};
async function verifyChunks({ inputDir, outputDir }:RecipeContext) {
  const original = documents(await read(join(inputDir, "documents.json")));
  const chunks = await split(inputDir);
  assert.equal(chunks.length, 9);
  assert.deepEqual(await read(join(outputDir, "chunks.json")),chunks);
  for (const chunk of chunks) {
    const doc = original.find((d) => d.id === chunk.metadata.documentId);
    assert.ok(doc);
    assert.equal(chunk.metadata.source, doc.source);
    assert.ok(doc.text.includes(chunk.text));
    assert.ok(chunk.text.length <= 120);
    assert.ok(chunk.metadata.loc.lines.from >= 1);
  }
  assert.deepEqual(
    await read(join(outputDir, "source-manifest.json")),
    original.map((d) => ({ id: d.id, source: d.source, sha256: sha(d.text) })),
  );
  return {
    documents: original.length,
    chunks: chunks.length,
    maxCharacters: 120,
    citationsPreserved: chunks.length,
  };
}
// Deliberately scripted one-hot vectors validate interfaces and context plumbing;
// they are not learned embeddings and make no semantic-retrieval quality claim.
class FixtureEmbeddings extends Embeddings {
  constructor() {
    super({ maxConcurrency: 1 });
  }
  vector(text:string) {
    return ["snapshot", "network", "database"].map((word) =>
      text.toLowerCase().includes(word) ? 1 : 0,
    );
  }
  async embedDocuments(texts:string[]) {
    return texts.map((x) => this.vector(x));
  }
  async embedQuery(text:string) {
    return this.vector(text);
  }
}
const contextSummary = {
  questions: 2,
  citations: 2,
  unknownCitations: 0,
  scriptedEmbeddings: true,
};
async function assemble(inputDir:string) {
  const chunks = await split(inputDir);
  const embeddings = new FixtureEmbeddings();
  const vectors = await embeddings.embedDocuments(chunks.map((c) => c.text));
  const retrieve = RunnableLambda.from(async (query:string) => {
    const q = await embeddings.embedQuery(query);
    const ranked = chunks
      .map((c, i) => ({
        ...c,
        score: q.reduce<number>((sum, x, j) => sum + x * vectors[i]![j]!, 0),
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return { query, chunks: ranked.slice(0, 2) };
  });
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Answer only from the supplied context. If empty, say insufficient evidence.",
    ],
    ["human", "Question: {question}\nContext:\n{context}"],
  ]);
  const format = RunnableLambda.from(async ({ query, chunks }:{query:string;chunks:Chunk[]}) => {
    const context = chunks.map((c) => `[${c.id}] ${c.text}`).join("\n");
    assert.ok(context.length <= 250);
    const messages = await prompt.formatMessages({ question: query, context });
    return {
      query,
      context,
      citations: chunks.map((c) => ({
        id: c.id,
        source: c.metadata.source,
        quote: c.text,
      })),
      messages: messages.map((m) => ({ role: m.getType(), text: m.content })),
    };
  });
  const pipeline = RunnableSequence.from([retrieve, format]);
  return pipeline.batch(jsonArray(await read(join(inputDir, "questions.json"))).map(jsonString));
}
async function verifyContext({ inputDir, outputDir }:RecipeContext) {
  const result = await assemble(inputDir);
  assert.deepEqual(await read(join(outputDir, "contexts.json")),result);
  assert.deepEqual(
    result[0]!.citations.map((c) => c.id),
    ["snapshot:0", "snapshot:1"],
  );
  assert.equal(result[1]!.citations.length, 0);
  assert.equal(result[1]!.context, "");
  for (const citation of result[0]!.citations) {
    const source = (documents(await read(join(inputDir, "documents.json")))).find(
      (d) => d.source === citation.source,
    );
    assert.ok(source);
    assert.ok(source.text.includes(citation.quote));
  }
  return {
    questions: result.length,
    citations: result[0]!.citations.length,
    unknownCitations: result[1]!.citations.length,
    scriptedEmbeddings: true,
  };
}
export const scenarios: ScenarioMap = {
  "rag-chunking-workbench": {
    expectedSummary: chunkSummary,
    artifacts: ["chunks.json", "source-manifest.json"],
    prepare,
    async run(ctx) {
      const originals = documents(await read(join(ctx.inputDir, "documents.json")));
      await json(join(ctx.outputDir, "chunks.json"), await split(ctx.inputDir));
      await json(
        join(ctx.outputDir, "source-manifest.json"),
        originals.map((d) => ({
          id: d.id,
          source: d.source,
          sha256: sha(d.text),
        })),
      );
      return verifyChunks(ctx);
    },
    verify: verifyChunks,
  },
  "rag-context-assembly": {
    expectedSummary: contextSummary,
    artifacts: ["contexts.json"],
    prepare,
    async run(ctx) {
      await json(
        join(ctx.outputDir, "contexts.json"),
        await assemble(ctx.inputDir),
      );
      return verifyContext(ctx);
    },
    verify: verifyContext,
  },
};
